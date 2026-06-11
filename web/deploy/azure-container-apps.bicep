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
//   - Azure Key Vault (RBAC, public network disabled, purge protection on)
//   - Private DNS zone privatelink.vaultcore.azure.net + VNet link
//   - Private endpoint to the Key Vault
//   - 9 pre-seeded placeholder secrets (overwritten by the setup wizard)
//   - VNet-integrated ACA managed environment
//   - Managed environment NFS storage mount
//   - User-assigned managed identity (UAMI) — stable principalId
//     across Container App rebuilds, used for KV reads + writes,
//     self-upgrade ARM calls, and post-rotation revision restarts
//   - Container App pulling the public Mizan image and mounting /data
//     plus 9 secretRefs sourced from Key Vault via the UAMI
//   - Role assignments on the UAMI: Key Vault Secrets Officer on the
//     vault and Container Apps Contributor on the resource group

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

@description('When true, the Container App ingress is internal-only (no public IP, reachable only from the VNet via a peered network, VPN, or ExpressRoute). When false (default), the Container App has a public HTTPS FQDN accessible from the open internet — gate it with Cloudflare Access, Front Door, or an identity-aware proxy.')
param internalOnly bool = false

@description('Prefix used to derive resource names. Customers with a landing-zone naming convention typically override this (e.g. "dm-mizan", "contoso-prod-mizan"). Per-resource overrides below take precedence over this prefix.')
param namePrefix string = 'mizan'

@description('Suffix used to derive resource names. Empty → `uniqueString(resourceGroup().id)` (deterministic per RG ID). Override when the landing zone requires a specific suffix; per-resource overrides below take precedence.')
param nameSuffix string = ''

// ---- Per-resource name overrides ----
// Each parameter defaults to '' and falls back to the auto-generated name
// pattern. Set the ones your governance requires explicitly named.

@description('Override the Container App name. Default: <namePrefix>-app-<suffix>.')
param containerAppName string = ''

@description('Override the Key Vault name (3-24 chars, alphanumeric + hyphens, globally unique). Default: <namePrefix>-kv-<suffix> truncated to 24.')
param keyVaultName string = ''

@description('Override the ACA managed environment name. Default: <namePrefix>-env-<suffix>.')
param managedEnvironmentName string = ''

@description('Override the user-assigned managed identity name. Default: <namePrefix>-uami-<suffix>.')
param userAssignedIdentityName string = ''

@description('Override the storage account name (3-24 chars, lowercase alphanumeric only — no hyphens, no uppercase). Default: <namePrefix><suffix> with hyphens stripped, truncated to 24.')
param storageAccountName string = ''

@description('Override the Log Analytics workspace name. Default: <namePrefix>-law-<suffix>.')
param logAnalyticsName string = ''

@description('Override the VNet name. Default: <namePrefix>-vnet-<suffix>.')
param vnetName string = ''

@description('Override the FileStorage private endpoint name. Default: <namePrefix>-pe-file-<suffix>.')
param storagePrivateEndpointName string = ''

@description('Override the Key Vault private endpoint name. Default: <namePrefix>-pe-kv-<suffix>.')
param keyVaultPrivateEndpointName string = ''

var uniq = empty(nameSuffix) ? uniqueString(resourceGroup().id) : nameSuffix

// Resolve the actual resource names — explicit override wins, otherwise
// the namePrefix + uniq pattern. Storage accounts are special: only
// lowercase alphanumeric, 3-24 chars, no hyphens. Key Vault has a
// 24-char limit too.
var actualLawName = empty(logAnalyticsName) ? '${namePrefix}-law-${uniq}' : logAnalyticsName
var actualVnetName = empty(vnetName) ? '${namePrefix}-vnet-${uniq}' : vnetName
var actualStorageName = empty(storageAccountName) ? take(toLower(replace('${namePrefix}${uniq}', '-', '')), 24) : storageAccountName
var actualKvName = empty(keyVaultName) ? take('${namePrefix}-kv-${uniq}', 24) : keyVaultName
var actualUamiName = empty(userAssignedIdentityName) ? '${namePrefix}-uami-${uniq}' : userAssignedIdentityName
var actualEnvName = empty(managedEnvironmentName) ? '${namePrefix}-env-${uniq}' : managedEnvironmentName
var actualAppName = empty(containerAppName) ? '${namePrefix}-app-${uniq}' : containerAppName
var actualStoragePeName = empty(storagePrivateEndpointName) ? '${namePrefix}-pe-file-${uniq}' : storagePrivateEndpointName
var actualKvPeName = empty(keyVaultPrivateEndpointName) ? '${namePrefix}-pe-kv-${uniq}' : keyVaultPrivateEndpointName
var shareName = 'mizan-data'

// All Mizan secrets live under one vault. Names use the `mizan-` prefix
// so multi-tenant deployments can share a vault later (not the current
// pattern, but cheap to preserve).
var secretGraphClientSecret = 'mizan-graph-client-secret'
var secretGraphCertPem = 'mizan-graph-cert-pem'
var secretGraphCertThumbprint = 'mizan-graph-cert-thumbprint'
var secretGraphCertChain = 'mizan-graph-cert-chain'
var secretAuthClientSecret = 'mizan-auth-client-secret'
var secretAuthCertPem = 'mizan-auth-cert-pem'
var secretAuthCertThumbprint = 'mizan-auth-cert-thumbprint'
var secretAuthCertChain = 'mizan-auth-cert-chain'
var secretSyncSecret = 'mizan-sync-secret'

// Pre-seeded sentinel value. Key Vault rejects empty secret bodies, so
// every placeholder starts as 'unset'. The runtime read path treats
// 'unset' as "not configured" and the setup wizard overwrites with real
// values during /setup Step 3 / Step 4.
var placeholderSecret = 'unset'

// Built-in role definition: Key Vault Secrets Officer. Can list, get,
// set, and delete secrets. Required because the runtime needs to write
// new client_secrets / cert PEMs during rotation, not only read them at
// startup.
var kvSecretsOfficerRoleId = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'

// Built-in role: Container Apps Contributor. Granted on the RG so the
// runtime self-upgrade flow can PATCH the Container App's image tag.
var containerAppsContributorRoleId = '358470bc-b998-42bd-ab17-a7e34c199c0f'

// -------------------- Log Analytics --------------------
resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: actualLawName
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
  name: actualVnetName
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
  name: actualStorageName
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
  name: actualStoragePeName
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

// -------------------- User-assigned managed identity --------------------
// v2.7.16: every privileged action — reading + writing Key Vault
// secrets, PATCHing the Container App image tag for self-upgrade,
// restarting revisions after a secret rotation — flows through this
// single user-assigned managed identity. Three reasons UAMI beats the
// historical system-assigned pattern:
//
//   1. **Stable principalId across redeploys.** System-assigned
//      identities are tied to the Container App resource's lifetime;
//      if Azure decides the Container App needs replacement (immutable
//      property changed, region migration, manual delete + recreate),
//      the principalId rolls. Role assignments keyed on
//      `app.identity.principalId` were already created with the OLD
//      principalId — Azure refuses to mutate that field — so the new
//      identity is unauthorized and every KV deref / ARM call returns
//      403. UAMI is a separate resource with a lifetime independent of
//      the Container App; its principalId is stable.
//
//   2. **principalId is deploy-time computable.** Bicep's BCP120
//      diagnostic rejects `app.identity.principalId` in any expression
//      that contributes to a role assignment's `name` (which has to be
//      a deterministic guid). UAMI's `properties.principalId` is
//      computable at deploy time because the UAMI resource is provisioned
//      before the role assignments and the Container App, so Bicep can
//      validate ordering at template-parse time.
//
//   3. **Belt-and-suspenders for KV deref.** ACA's secret resolver
//      reads KV using whichever identity the `configuration.secrets`
//      block names. Pinning that to the UAMI (rather than 'system')
//      means the secret resolution and the runtime read both go through
//      the same identity, simplifying the failure model: if the role
//      assignment is correct on the UAMI, both work; if not, both fail
//      identically.
resource uami 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: actualUamiName
  location: location
}

// -------------------- Key Vault --------------------
// Houses every Mizan secret: Graph + user-auth client_secrets, cert PEMs,
// cert thumbprints, cert chains, and the sync trigger shared secret.
// Public network access disabled — only reachable from inside the VNet
// via the private endpoint below. RBAC authorization (not access
// policies) so the Container App system identity can be granted Secrets
// Officer in a single role assignment.
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: actualKvName
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
    }
  }
}

resource pdnsKv 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
  properties: {}
}

resource pdnsKvLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: pdnsKv
  name: 'vnet-link'
  location: 'global'
  properties: {
    virtualNetwork: {
      id: vnet.id
    }
    registrationEnabled: false
  }
}

resource peKv 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: actualKvPeName
  location: location
  properties: {
    subnet: {
      id: '${vnet.id}/subnets/pe'
    }
    privateLinkServiceConnections: [
      {
        name: 'kv-connection'
        properties: {
          privateLinkServiceId: kv.id
          groupIds: ['vault']
        }
      }
    ]
  }
}

resource peKvDns 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: peKv
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'privatelink-vaultcore-azure-net'
        properties: {
          privateDnsZoneId: pdnsKv.id
        }
      }
    ]
  }
}

// Pre-seed every secret with a placeholder so the Container App
// secretRefs below can resolve immediately at deploy time. The setup
// wizard overwrites with real values once provisioning runs.
resource kvSecretGraphClientSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: secretGraphClientSecret
  properties: {
    value: placeholderSecret
  }
}

resource kvSecretGraphCertPem 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: secretGraphCertPem
  properties: {
    value: placeholderSecret
  }
}

resource kvSecretGraphCertThumbprint 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: secretGraphCertThumbprint
  properties: {
    value: placeholderSecret
  }
}

resource kvSecretGraphCertChain 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: secretGraphCertChain
  properties: {
    value: placeholderSecret
  }
}

resource kvSecretAuthClientSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: secretAuthClientSecret
  properties: {
    value: placeholderSecret
  }
}

resource kvSecretAuthCertPem 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: secretAuthCertPem
  properties: {
    value: placeholderSecret
  }
}

resource kvSecretAuthCertThumbprint 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: secretAuthCertThumbprint
  properties: {
    value: placeholderSecret
  }
}

resource kvSecretAuthCertChain 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: secretAuthCertChain
  properties: {
    value: placeholderSecret
  }
}

resource kvSecretSync 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: secretSyncSecret
  properties: {
    value: empty(syncSecret) ? placeholderSecret : syncSecret
  }
}

// -------------------- ACA Managed Environment (VNet-integrated) --------------------
// Preview API version required: `nfsAzureFile` storage type + `NfsAzureFile`
// volume type landed in 2024-08-02-preview and aren't in the 2024-03-01 GA API.
// Using the same version for env + storages + app so they stay in sync.
resource acaEnv 'Microsoft.App/managedEnvironments@2024-10-02-preview' = {
  name: actualEnvName
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
      // v2.7.20: internal-only mode uses an internal load balancer
      // with a private IP from the ACA subnet. The Container App's
      // FQDN becomes `<app>.internal.<envid>.<region>.azurecontainerapps.io`
      // and is only resolvable from inside the VNet (via VPN /
      // ExpressRoute / peering). When false, ACA provisions an
      // external load balancer with a public IP and a public FQDN.
      // This setting is IMMUTABLE on an existing environment — to
      // flip it, the managed environment must be torn down and
      // recreated.
      internal: internalOnly
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
// v2.7.16: identity flips from system-assigned to user-assigned. The
// UAMI declared at the top of the template carries every privilege
// the runtime needs — Key Vault Secrets Officer on the vault (for
// secret reads at revision activation, writes during wizard
// auto-provision, writes during in-app rotation) and Container Apps
// Contributor on the resource group (for self-upgrade and for the
// post-rotation revision restart). MIZAN_AZURE_RESOURCE_ID is
// injected as an env var so the running app knows which resource to
// PATCH; MIZAN_MANAGED_IDENTITY_CLIENT_ID is injected so the runtime
// can specify the right identity in IMDS token requests.
resource app 'Microsoft.App/containerApps@2024-10-02-preview' = {
  name: actualAppName
  location: location
  // v2.7.16: user-assigned managed identity, not system-assigned, so
  // the principalId is stable across Container App lifecycle events
  // (delete + recreate, region migrations, ARM revision rolls). All
  // role assignments target this UAMI.
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${uami.id}': {}
    }
  }
  // v2.7.16: hard-pin ordering. ACA dereferences every Key Vault
  // secret URI when the first revision activates. If the role
  // assignment or the pre-seeded secrets haven't been committed yet,
  // the deref fails with 403 / 404 and the revision enters a failed
  // state (KEDAScalerFailed → no replica → FQDN hangs). Explicit
  // dependsOn forces Bicep to finish every secret and both role
  // assignments before the Container App is created.
  dependsOn: [
    kvSecretGraphClientSecret
    kvSecretGraphCertPem
    kvSecretGraphCertThumbprint
    kvSecretGraphCertChain
    kvSecretAuthClientSecret
    kvSecretAuthCertPem
    kvSecretAuthCertThumbprint
    kvSecretAuthCertChain
    kvSecretSync
    kvRoleAssignment
    selfUpgradeRoleAssignment
  ]
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
        // v2.7.20: must agree with the managed environment's
        // `vnetConfiguration.internal` — Azure rejects mixed states.
        // Tied via the same `internalOnly` parameter so the two
        // stay in lockstep.
        external: !internalOnly
        targetPort: 8787
        transport: 'auto'
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      // Every secret resolves from Key Vault via the system identity.
      // The placeholder pre-seeds in Bicep mean these URIs already exist
      // at deploy time, so the Container App can boot. Real values land
      // when the /setup wizard provisions credentials and writes them
      // into the vault.
      secrets: [
        {
          name: 'azure-client-secret'
          keyVaultUrl: '${kv.properties.vaultUri}secrets/${secretGraphClientSecret}'
          identity: uami.id
        }
        {
          name: 'azure-client-cert-pem'
          keyVaultUrl: '${kv.properties.vaultUri}secrets/${secretGraphCertPem}'
          identity: uami.id
        }
        {
          name: 'azure-client-cert-thumbprint'
          keyVaultUrl: '${kv.properties.vaultUri}secrets/${secretGraphCertThumbprint}'
          identity: uami.id
        }
        {
          name: 'azure-client-cert-chain'
          keyVaultUrl: '${kv.properties.vaultUri}secrets/${secretGraphCertChain}'
          identity: uami.id
        }
        {
          name: 'auth-client-secret'
          keyVaultUrl: '${kv.properties.vaultUri}secrets/${secretAuthClientSecret}'
          identity: uami.id
        }
        {
          name: 'auth-client-cert-pem'
          keyVaultUrl: '${kv.properties.vaultUri}secrets/${secretAuthCertPem}'
          identity: uami.id
        }
        {
          name: 'auth-client-cert-thumbprint'
          keyVaultUrl: '${kv.properties.vaultUri}secrets/${secretAuthCertThumbprint}'
          identity: uami.id
        }
        {
          name: 'auth-client-cert-chain'
          keyVaultUrl: '${kv.properties.vaultUri}secrets/${secretAuthCertChain}'
          identity: uami.id
        }
        {
          name: 'sync-secret'
          keyVaultUrl: '${kv.properties.vaultUri}secrets/${secretSyncSecret}'
          identity: uami.id
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
          env: [
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
                actualAppName
              )
            }
            // v2.7.15: Key Vault is now the system of record for every
            // secret. MIZAN_KEY_VAULT_URL flips the runtime's secret
            // reader+writer onto the SDK path; lib/secrets/keyvault.ts
            // checks this var to decide whether writes go to KV+restart
            // or fall back to the DB-backed path used by self-hosted
            // Docker deployments.
            {
              name: 'MIZAN_KEY_VAULT_URL'
              value: kv.properties.vaultUri
            }
            {
              name: 'MIZAN_KEY_VAULT_NAME'
              value: kv.name
            }
            // v2.7.16: clientId of the user-assigned managed identity
            // that holds Key Vault Secrets Officer + Container Apps
            // Contributor. The runtime passes it to
            // ManagedIdentityCredential (KV) and to the IMDS token
            // request (self-upgrade + revision restart) so a token is
            // minted for the correct identity. Without this, IMDS picks
            // a default identity which fails when the system identity
            // is absent.
            {
              name: 'MIZAN_MANAGED_IDENTITY_CLIENT_ID'
              value: uami.properties.clientId
            }
            {
              name: 'MIZAN_MANAGED_IDENTITY_RESOURCE_ID'
              value: uami.id
            }
            // The container app name + resource ID together let the
            // runtime issue revision restarts after rotating a secret so
            // the new value is dereferenced into the next pod.
            {
              name: 'CONTAINER_APP_NAME'
              value: actualAppName
            }
            // Graph signals app credentials, sourced from Key Vault via
            // the system identity. lib/config/azure-config.ts reads
            // these env vars as the cert-or-secret fallback chain.
            {
              name: 'AZURE_CLIENT_SECRET'
              secretRef: 'azure-client-secret'
            }
            {
              name: 'AZURE_CLIENT_CERT_PRIVATE_KEY_PEM'
              secretRef: 'azure-client-cert-pem'
            }
            {
              name: 'AZURE_CLIENT_CERT_THUMBPRINT'
              secretRef: 'azure-client-cert-thumbprint'
            }
            {
              name: 'AZURE_CLIENT_CERT_CHAIN_PEM'
              secretRef: 'azure-client-cert-chain'
            }
            // User-auth Entra app credentials. v2.7.15 adds env-var
            // fallbacks in lib/config/auth-config.ts so these can come
            // from Key Vault on ACA without a DB write.
            {
              name: 'MIZAN_AUTH_CLIENT_SECRET'
              secretRef: 'auth-client-secret'
            }
            {
              name: 'MIZAN_AUTH_CERT_PRIVATE_KEY_PEM'
              secretRef: 'auth-client-cert-pem'
            }
            {
              name: 'MIZAN_AUTH_CERT_THUMBPRINT'
              secretRef: 'auth-client-cert-thumbprint'
            }
            {
              name: 'MIZAN_AUTH_CERT_CHAIN_PEM'
              secretRef: 'auth-client-cert-chain'
            }
            {
              name: 'SCSC_SYNC_SECRET'
              secretRef: 'sync-secret'
            }
          ]
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
// v2.7.16: role assignments target the user-assigned managed identity
// declared above. Both `uami.id` (for the role assignment name guid)
// and `uami.properties.principalId` (for the role assignment payload)
// are deploy-time computable, so Bicep validates the template without
// the BCP120 diagnostic that blocked the system-identity attempt. The
// UAMI's principalId never rolls, so the role assignments stay
// permanently bound to the right identity across Container App
// rebuilds.
resource selfUpgradeRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, uami.id, 'container-apps-contributor')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      containerAppsContributorRoleId
    )
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// -------------------- Key Vault role assignment --------------------
// Grant the UAMI Key Vault Secrets Officer on the vault. Officer (not
// Secrets User) so the runtime can WRITE new secrets during the
// /setup wizard auto-provision and during in-app credential rotations,
// not only read them at startup.
//
// Scope = the vault itself, so the identity cannot reach any other
// vaults that might exist in the resource group later.
resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: kv
  name: guid(kv.id, uami.id, 'kv-secrets-officer')
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      kvSecretsOfficerRoleId
    )
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output dashboardUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
output resourceGroup string = resourceGroup().name
output managedIdentityPrincipalId string = uami.properties.principalId
output managedIdentityClientId string = uami.properties.clientId
output keyVaultName string = kv.name
output keyVaultUri string = kv.properties.vaultUri
