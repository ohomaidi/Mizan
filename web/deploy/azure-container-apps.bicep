// Mizan — Azure Container Apps one-click deployment.
//
// Uses NFS 4.1 for Azure Files so the deploy works under tight governance
// (MCA-managed subscriptions, any tenant with `StorageAccount_DisableLocalAuth_Modify`
// or similar Azure Policy). NFS is auth'd by network rules + a private endpoint,
// so shared-key access stays disabled and nothing gets silently reverted by policy.
//
// Resources provisioned:
//   - Log Analytics workspace (ACA env requirement)
//   - Virtual network with two subnets (ACA-delegated + private-endpoint)
//   - Premium FileStorage account (allowSharedKeyAccess=false; NFS enabled)
//   - NFS file share (100GB, Premium minimum)
//   - Private DNS zone privatelink.file.core.windows.net + VNet link
//   - Private endpoint to the storage account's file subresource
//   - VNet-integrated ACA managed environment
//   - Managed environment NFS storage mount
//   - Container App pulling the public Mizan image and mounting /data

@description('Region for all resources. Defaults to the RG region.')
param location string = resourceGroup().location

@description('Container image (registry/repo), no tag.')
param containerImage string = 'ghcr.io/ohomaidi/mizan'

@description('Image tag. Use a semver (e.g. 1.0.2) for production, latest for pilots.')
param imageTag string = 'latest'

@description('Public base URL for the dashboard. Leave empty and the app self-discovers its URL from the incoming request.')
param appBaseUrl string = ''

@secure()
param syncSecret string = ''

param cpuCores string = '1.0'
param memoryGi string = '2Gi'

@description('VNet CIDR. /23 minimum for the ACA subnet; /24 here leaves /24 for the PE subnet.')
param vnetAddressPrefix string = '10.60.0.0/16'
param acaSubnetPrefix string = '10.60.0.0/23'
param peSubnetPrefix string = '10.60.2.0/28'

var namePrefix = 'mizan'
var uniq = uniqueString(resourceGroup().id)
var storageName = '${namePrefix}${uniq}'
var shareName = 'mizan-data'

// -------------------- Log Analytics --------------------
resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${namePrefix}-law-${uniq}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// -------------------- VNet + subnets --------------------
resource vnet 'Microsoft.Network/virtualNetworks@2024-01-01' = {
  name: '${namePrefix}-vnet-${uniq}'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [vnetAddressPrefix]
    }
    subnets: [
      {
        name: 'aca'
        properties: {
          addressPrefix: acaSubnetPrefix
          delegations: [
            {
              name: 'aca-delegation'
              properties: {
                serviceName: 'Microsoft.App/environments'
              }
            }
          ]
          serviceEndpoints: [
            {
              service: 'Microsoft.Storage'
              locations: [location]
            }
          ]
        }
      }
      {
        name: 'pe'
        properties: {
          addressPrefix: peSubnetPrefix
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

// -------------------- Storage: Premium FileStorage with NFS --------------------
resource storage 'Microsoft.Storage/storageAccounts@2024-01-01' = {
  name: storageName
  location: location
  kind: 'FileStorage'
  sku: {
    name: 'Premium_LRS'
  }
  properties: {
    // Explicitly disabled — satisfies the governance policy.
    allowSharedKeyAccess: false
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    // NFS 4.1 isn't HTTPS-based; "Secure transfer required" blocks it at the
    // server with `mount.nfs: access denied by server`. Must be false for NFS.
    // Only SMB/REST traffic is affected by this flag — not relevant since
    // publicNetworkAccess is already Disabled and we mount only over NFS.
    supportsHttpsTrafficOnly: false
    // Lock down to VNet + PE only.
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
    }
    largeFileSharesState: 'Enabled'
  }
}

resource fileService 'Microsoft.Storage/storageAccounts/fileServices@2024-01-01' = {
  parent: storage
  name: 'default'
  properties: {
    protocolSettings: {
      smb: {}
    }
  }
}

resource share 'Microsoft.Storage/storageAccounts/fileServices/shares@2024-01-01' = {
  parent: fileService
  name: shareName
  properties: {
    shareQuota: 100
    enabledProtocols: 'NFS'
    rootSquash: 'NoRootSquash'
  }
}

// -------------------- Private DNS + Private Endpoint --------------------
resource pdnsFile 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.file.core.windows.net'
  location: 'global'
  properties: {}
}

resource pdnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: pdnsFile
  name: 'vnet-link'
  location: 'global'
  properties: {
    virtualNetwork: {
      id: vnet.id
    }
    registrationEnabled: false
  }
}

resource peFile 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: '${namePrefix}-pe-file-${uniq}'
  location: location
  properties: {
    subnet: {
      id: '${vnet.id}/subnets/pe'
    }
    privateLinkServiceConnections: [
      {
        name: 'file-connection'
        properties: {
          privateLinkServiceId: storage.id
          groupIds: ['file']
        }
      }
    ]
  }
}

resource peFileDns 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: peFile
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'privatelink-file-core-windows-net'
        properties: {
          privateDnsZoneId: pdnsFile.id
        }
      }
    ]
  }
}

// -------------------- ACA Managed Environment (VNet-integrated) --------------------
// Preview API version required: `nfsAzureFile` storage type + `NfsAzureFile`
// volume type landed in 2024-08-02-preview and aren't in the 2024-03-01 GA API.
// Using the same version for env + storages + app so they stay in sync.
resource acaEnv 'Microsoft.App/managedEnvironments@2024-10-02-preview' = {
  name: '${namePrefix}-env-${uniq}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: law.properties.customerId
        sharedKey: law.listKeys().primarySharedKey
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: '${vnet.id}/subnets/aca'
      internal: false
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

// -------------------- ACA env mounts the NFS share --------------------
resource envStorage 'Microsoft.App/managedEnvironments/storages@2024-10-02-preview' = {
  parent: acaEnv
  name: 'mizandata'
  properties: {
    nfsAzureFile: {
      server: '${storage.name}.file.core.windows.net'
      accessMode: 'ReadWrite'
      shareName: '/${storage.name}/${shareName}'
    }
  }
  dependsOn: [
    share
    peFileDns
    pdnsLink
  ]
}

// -------------------- Container App --------------------
// System-assigned managed identity is enabled so the dashboard can
// upgrade itself in-place via the ARM API. The identity is granted the
// "Container Apps Contributor" role on this resource group below; that
// role is the minimum scope required to PATCH a container app's image
// tag (see /api/updates/apply). MIZAN_AZURE_RESOURCE_ID is injected as
// an env var so the running app knows which resource to PATCH.
resource app 'Microsoft.App/containerApps@2024-10-02-preview' = {
  name: '${namePrefix}-app-${uniq}'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    environmentId: acaEnv.id
    workloadProfileName: 'Consumption'
    configuration: {
      // v2.5.16: 'Single' mode is REQUIRED for SQLite-on-NFS deployments.
      // In 'Multiple' mode (the historical default for older api versions),
      // ACA could keep the previous revision running alongside the new one
      // for traffic-shifting. Two pods with SQLite open on the same NFS
      // mount = WAL shared-memory drift = corruption. 'Single' mode kills
      // the old revision when the new one becomes active — short blip
      // (~5s), no overlap, no concurrent writers.
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8787
        transport: 'auto'
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      secrets: empty(syncSecret)
        ? []
        : [
            {
              name: 'sync-secret'
              value: syncSecret
            }
          ]
    }
    template: {
      containers: [
        {
          name: 'dashboard'
          image: '${containerImage}:${imageTag}'
          resources: {
            cpu: json(cpuCores)
            memory: memoryGi
          }
          env: concat(
            [
              {
                name: 'APP_BASE_URL'
                value: appBaseUrl
              }
              // v2.5.17 split: DATA_DIR keeps the persistent NFS mount for
              // long-lived files (uploaded logos, branding assets). The
              // SQLite database moves to /local-data (EmptyDir, fast local
              // disk) via SCSC_DB_PATH. MIZAN_DB_BACKUP_DIR points the
              // backup loop at /data so the DB is snapshotted to NFS every
              // 5 minutes + on graceful shutdown. Boot-time restore copies
              // the latest snapshot back to local disk if the EmptyDir
              // volume was wiped (which happens on every revision swap).
              {
                name: 'DATA_DIR'
                value: '/data'
              }
              {
                name: 'SCSC_DB_PATH'
                value: '/local-data/scsc.sqlite'
              }
              {
                name: 'MIZAN_DB_BACKUP_DIR'
                value: '/data'
              }
              {
                name: 'NODE_ENV'
                value: 'production'
              }
              // v2.5.6+: full ARM resource ID of this container app, so
              // the dashboard's /api/updates/apply endpoint knows which
              // resource to PATCH for self-upgrade. Resolved at deploy
              // time from this Bicep template's resourceId() function.
              {
                name: 'MIZAN_AZURE_RESOURCE_ID'
                value: resourceId(
                  'Microsoft.App/containerApps',
                  '${namePrefix}-app-${uniq}'
                )
              }
            ],
            empty(syncSecret)
              ? []
              : [
                  {
                    name: 'SCSC_SYNC_SECRET'
                    secretRef: 'sync-secret'
                  }
                ]
          )
          volumeMounts: [
            {
              // Persistent NFS mount — uploaded logos, branding assets,
              // and the SQLite backup target (`MIZAN_DB_BACKUP_DIR`).
              // Survives revision swaps and pod restarts.
              volumeName: 'data'
              mountPath: '/data'
            }
            {
              // v2.5.17: ephemeral fast-local volume for the live SQLite
              // file (`SCSC_DB_PATH`). EmptyDir is wiped on every
              // revision swap; the boot-time restore + 5-minute backup
              // loop in lib/db/client.ts keep the database durable.
              volumeName: 'local-data'
              mountPath: '/local-data'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/auth/me'
                port: 8787
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              timeoutSeconds: 5
              failureThreshold: 5
            }
          ]
        }
      ]
      scale: {
        // v2.5.16: pinned to exactly one replica. SQLite is single-writer
        // by design — two replicas writing to the same DB file (even on
        // local disk, but especially on NFS where WAL semantics break)
        // corrupts the database. Mizan's write workload is modest (a few
        // writes per sync cycle, single-customer per deployment) so 1
        // replica is more than enough headroom. If a future scale-out is
        // needed, that's the moment to migrate from SQLite to Postgres
        // (see backlog) — horizontal scale + SQLite is fundamentally
        // incompatible.
        minReplicas: 1
        maxReplicas: 1
      }
      volumes: [
        {
          // Persistent NFS Azure Files share — backups, logos, branding.
          // No longer hosts the live SQLite file (perf + corruption fix
          // in v2.5.17).
          name: 'data'
          storageType: 'NfsAzureFile'
          storageName: envStorage.name
        }
        {
          // v2.5.17: ephemeral fast-local volume for the live SQLite
          // file. ACA EmptyDir is tied to the container's lifecycle —
          // wiped on every revision swap and pod restart. The 5-minute
          // backup loop in lib/db/client.ts persists the data to the
          // /data NFS mount above so it survives swaps.
          name: 'local-data'
          storageType: 'EmptyDir'
        }
      ]
    }
  }
}

// -------------------- Self-upgrade role assignment --------------------
// Grant the container app's system-assigned identity the "Container
// Apps Contributor" role on the resource group. This is the minimum
// permission needed to PATCH the image tag of a container app via ARM,
// which is what /api/updates/apply does on the one-click upgrade path.
//
// Role definition ID is built-in: 358470bc-b998-42bd-ab17-a7e34c199c0f
// (Container Apps Contributor). Scope = the RG this template targets,
// so the identity cannot reach other RGs in the subscription.
resource selfUpgradeRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, app.id, 'container-apps-contributor')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '358470bc-b998-42bd-ab17-a7e34c199c0f'
    )
    principalId: app.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output dashboardUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
output resourceGroup string = resourceGroup().name
output containerAppPrincipalId string = app.identity.principalId
