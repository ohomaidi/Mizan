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
resource app 'Microsoft.App/containerApps@2024-10-02-preview' = {
  name: '${namePrefix}-app-${uniq}'
  location: location
  properties: {
    environmentId: acaEnv.id
    workloadProfileName: 'Consumption'
    configuration: {
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
              {
                name: 'DATA_DIR'
                value: '/data'
              }
              {
                name: 'NODE_ENV'
                value: 'production'
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
              volumeName: 'data'
              mountPath: '/data'
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
        minReplicas: 1
        maxReplicas: 2
      }
      volumes: [
        {
          name: 'data'
          storageType: 'NfsAzureFile'
          storageName: envStorage.name
        }
      ]
    }
  }
}

output dashboardUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
output resourceGroup string = resourceGroup().name
