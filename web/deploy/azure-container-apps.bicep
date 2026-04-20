// Azure Container Apps deployment for the Mizan — Posture & Maturity Dashboard.
//
// This template is resource-group-scoped so the "Deploy to Azure" portal
// button works out of the box (no subscription-level permissions needed).
//
// What this provisions:
//   - Log Analytics workspace (required by the ACA environment)
//   - Storage account + Azure Files share for persistent DATA_DIR
//   - ACA managed environment
//   - Container App running the published ghcr.io image, mounted on the share
//
// CLI usage:
//   az group create -n mizan-rg -l uaenorth
//   az deployment group create \
//       -g mizan-rg \
//       --template-file azure-container-apps.bicep \
//       --parameters containerImage=ghcr.io/ohomaidi/mizan imageTag=latest \
//                    appBaseUrl=https://posture.<customer>.example.com

@description('Region. Defaults to the resource group region; override to pin a specific one (e.g. uaenorth).')
param location string = resourceGroup().location

@description('Container image (registry/repo), without the tag. Defaults to the public Mizan image on ghcr.io.')
param containerImage string = 'ghcr.io/ohomaidi/mizan'

@description('Image tag. Pin to a semver (e.g. 1.0.0) for production; "latest" is fine for pilots.')
param imageTag string = 'latest'

@description('Public base URL the dashboard will be served on — used for the OIDC redirect. Leave empty to let the one-click deploy finish; after Azure assigns the ingress FQDN you update this env var and flip on auth enforcement. If you already have a custom domain, put it here.')
param appBaseUrl string = ''

@description('Optional sync shared secret. Set this if you wire an Azure Function / Logic App to POST /api/sync daily.')
@secure()
param syncSecret string = ''

@description('Container compute: cores and memory. ACA minimums are 0.25/0.5Gi.')
param cpuCores string = '1.0'
param memoryGi string = '2Gi'

var namePrefix = 'mizan'
var uniq = uniqueString(resourceGroup().id)

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

resource storage 'Microsoft.Storage/storageAccounts@2024-01-01' = {
  name: '${namePrefix}${uniq}'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource fileService 'Microsoft.Storage/storageAccounts/fileServices@2024-01-01' = {
  parent: storage
  name: 'default'
}

resource share 'Microsoft.Storage/storageAccounts/fileServices/shares@2024-01-01' = {
  parent: fileService
  name: 'mizan-data'
  properties: {
    shareQuota: 50
  }
}

resource acaEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
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
  }
}

resource envStorage 'Microsoft.App/managedEnvironments/storages@2024-03-01' = {
  parent: acaEnv
  name: 'mizandata'
  properties: {
    azureFile: {
      accountName: storage.name
      accountKey: storage.listKeys().keys[0].value
      shareName: share.name
      accessMode: 'ReadWrite'
    }
  }
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-app-${uniq}'
  location: location
  properties: {
    managedEnvironmentId: acaEnv.id
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
              initialDelaySeconds: 20
              periodSeconds: 30
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
          storageType: 'AzureFile'
          storageName: envStorage.name
        }
      ]
    }
  }
}

output dashboardUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
