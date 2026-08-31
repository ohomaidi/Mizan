// -------------------- UAMI role assignments (module) --------------------
// Why this is a module and not two resources in the main template:
//
// A role assignment's NAME must be deploy-time computable. The main
// template can't put `uami.properties.principalId` inside a resource
// name (BCP120 — properties of a declared resource are runtime values),
// which is why v2.7.16 seeded the guid() on `uami.id` instead. That
// name survives a UAMI delete + recreate — but the recreated identity
// carries a NEW principalId, and Azure hard-refuses to repoint an
// existing role assignment (RoleAssignmentUpdateNotPermitted). This is
// exactly what a portal "select all resources → delete" cleanup causes:
// the portal's resource list does not show role assignments, so they
// survive the sweep as orphans, and every subsequent redeploy into the
// same resource group collides with them (July 2026: bricked a customer
// PoC redeploy).
//
// Routed through a module, the principalId arrives as a plain string
// parameter and IS deploy-time computable, so it can seed the guid() —
// Microsoft's documented pattern for role-assignment names. Same
// identity → same name → idempotent re-run. Recreated identity → new
// principalId → new name → fresh assignment; the orphan pointing at the
// dead principal lingers harmlessly until someone deletes it.

@description('principalId of the Mizan user-assigned managed identity.')
param principalId string

@description('Name of the Key Vault that scopes the Secrets Officer assignment.')
param keyVaultName string

@description('Built-in role definition GUID for Container Apps Contributor.')
param containerAppsContributorRoleId string

@description('Built-in role definition GUID for Key Vault Secrets Officer.')
// Not a secret — it's the well-known built-in role definition GUID
// (b86a8fe4-…). The linter flags the name because it contains
// "Secrets", which here is part of the role's title.
#disable-next-line secure-secrets-in-params
param kvSecretsOfficerRoleId string

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Container Apps Contributor on the resource group — the minimum
// permission needed to PATCH the image tag of a container app via ARM
// (the /api/updates/apply one-click upgrade path) and to issue the
// post-rotation revision restart. Scope = the RG this template targets,
// so the identity cannot reach other RGs in the subscription.
resource selfUpgradeRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, principalId, 'container-apps-contributor')
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      containerAppsContributorRoleId
    )
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

// Key Vault Secrets Officer on the vault. Officer (not Secrets User) so
// the runtime can WRITE new secrets during the /setup wizard
// auto-provision and during in-app credential rotations, not only read
// them at startup. Scope = the vault itself, so the identity cannot
// reach any other vaults that might exist in the resource group later.
resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: kv
  name: guid(kv.id, principalId, 'kv-secrets-officer')
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      kvSecretsOfficerRoleId
    )
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
