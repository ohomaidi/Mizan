import "server-only";
import { graphFetch } from "@/lib/graph/fetch";
import { getTenant } from "@/lib/db/tenants";

/**
 * Per-tenant "reference data" read helpers the custom-policy wizard uses
 * when building a tenant-scoped draft: specific users / groups to target,
 * named locations for CA conditions, Terms of Use to reference in the
 * grant, custom authentication strengths beyond the three built-ins.
 *
 * Each helper takes the Mizan tenant id (not the Entra GUID directly so
 * we can gate on consent + demo mode consistently). On demo tenants we
 * synthesize a plausible small dataset so the wizard is still clickable
 * without a live Graph call.
 */

export type RefUser = { id: string; displayName: string; userPrincipalName: string };
export type RefGroup = { id: string; displayName: string; memberCount?: number };
export type RefNamedLocation = {
  id: string;
  displayName: string;
  kind: "ip" | "countryOrRegion" | "other";
  isTrusted: boolean;
};
export type RefTermsOfUse = {
  id: string;
  displayName: string;
  isEnabled: boolean;
};
export type RefAuthStrength = {
  id: string;
  displayName: string;
  description: string;
  /** true = the 3 Microsoft-published strengths, which the wizard already exposes. */
  isBuiltIn: boolean;
};

// ------------------------------------------------------------------
// Demo synthesis — keeps the wizard flow testable on scscdemo/descdemo.
// Hard-coded but distinct per tenant so the picker feels real.
// ------------------------------------------------------------------

function demoUsers(tenantId: string): RefUser[] {
  const base = tenantId.replace(/[^a-z0-9]/gi, "").slice(0, 6) || "demo";
  return [
    { id: `sim-user-1-${base}`, displayName: "Ali Al Mansoori", userPrincipalName: `ali@${base}.local` },
    { id: `sim-user-2-${base}`, displayName: "Fatima Al Suwaidi", userPrincipalName: `fatima@${base}.local` },
    { id: `sim-user-3-${base}`, displayName: "Omar Hassan", userPrincipalName: `omar@${base}.local` },
    { id: `sim-user-4-${base}`, displayName: "Mariam Khalifa", userPrincipalName: `mariam@${base}.local` },
    { id: `sim-user-5-${base}`, displayName: "Hamad Al Nuaimi", userPrincipalName: `hamad@${base}.local` },
  ];
}

function demoGroups(tenantId: string): RefGroup[] {
  const base = tenantId.replace(/[^a-z0-9]/gi, "").slice(0, 6) || "demo";
  return [
    { id: `sim-group-finance-${base}`, displayName: "Finance", memberCount: 42 },
    { id: `sim-group-hr-${base}`, displayName: "Human Resources", memberCount: 18 },
    { id: `sim-group-it-${base}`, displayName: "IT Operations", memberCount: 23 },
    { id: `sim-group-execs-${base}`, displayName: "Executive Leadership", memberCount: 7 },
  ];
}

function demoNamedLocations(tenantId: string): RefNamedLocation[] {
  const base = tenantId.replace(/[^a-z0-9]/gi, "").slice(0, 6) || "demo";
  return [
    {
      id: `sim-loc-hq-${base}`,
      displayName: "HQ public IP range",
      kind: "ip",
      isTrusted: true,
    },
    {
      id: `sim-loc-uae-${base}`,
      displayName: "United Arab Emirates",
      kind: "countryOrRegion",
      isTrusted: false,
    },
    {
      id: `sim-loc-blocked-${base}`,
      displayName: "Sanctioned-country block list",
      kind: "countryOrRegion",
      isTrusted: false,
    },
  ];
}

function demoTermsOfUse(tenantId: string): RefTermsOfUse[] {
  const base = tenantId.replace(/[^a-z0-9]/gi, "").slice(0, 6) || "demo";
  return [
    {
      id: `sim-tou-standard-${base}`,
      displayName: "Acceptable Use Policy",
      isEnabled: true,
    },
    {
      id: `sim-tou-privileged-${base}`,
      displayName: "Privileged Access Acknowledgement",
      isEnabled: true,
    },
  ];
}

function demoAuthStrengths(tenantId: string): RefAuthStrength[] {
  const base = tenantId.replace(/[^a-z0-9]/gi, "").slice(0, 6) || "demo";
  return [
    {
      id: "00000000-0000-0000-0000-000000000001",
      displayName: "Multifactor authentication",
      description: "Any MFA method — built-in.",
      isBuiltIn: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      displayName: "Passwordless MFA",
      description: "Windows Hello / passkey / CBA — built-in.",
      isBuiltIn: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      displayName: "Phishing-resistant MFA",
      description: "FIDO2 / Hello / CBA only — built-in.",
      isBuiltIn: true,
    },
    {
      id: `sim-strength-smartcard-${base}`,
      displayName: "Smart card + PIN (custom)",
      description: "Custom strength: Certificate-based auth with smart card only.",
      isBuiltIn: false,
    },
  ];
}

// ------------------------------------------------------------------
// Public API — each helper decides demo-vs-real based on tenant flag.
// ------------------------------------------------------------------

type Ids = { tenant_id: string; id: string };

async function graphList<T>(tenant: Ids, path: string): Promise<T[]> {
  const r = await graphFetch<{ value: T[] }>({
    tenantGuid: tenant.tenant_id,
    ourTenantId: tenant.id,
    method: "GET",
    path,
  });
  return r.value ?? [];
}

export async function searchUsers(
  mizanTenantId: string,
  query: string,
): Promise<RefUser[]> {
  const tenant = getTenant(mizanTenantId);
  if (!tenant) return [];
  if (tenant.is_demo === 1) {
    const q = query.trim().toLowerCase();
    return demoUsers(mizanTenantId).filter(
      (u) =>
        !q ||
        u.displayName.toLowerCase().includes(q) ||
        u.userPrincipalName.toLowerCase().includes(q),
    );
  }
  const enc = encodeURIComponent(query.replace(/'/g, "''"));
  const filter = `startswith(displayName,'${enc}') or startswith(userPrincipalName,'${enc}')`;
  const rows = await graphList<RefUser>(
    tenant,
    `/users?$select=id,displayName,userPrincipalName&$filter=${encodeURIComponent(filter)}&$top=25`,
  );
  return rows;
}

export async function searchGroups(
  mizanTenantId: string,
  query: string,
): Promise<RefGroup[]> {
  const tenant = getTenant(mizanTenantId);
  if (!tenant) return [];
  if (tenant.is_demo === 1) {
    const q = query.trim().toLowerCase();
    return demoGroups(mizanTenantId).filter(
      (g) => !q || g.displayName.toLowerCase().includes(q),
    );
  }
  const enc = encodeURIComponent(query.replace(/'/g, "''"));
  const filter = `startswith(displayName,'${enc}')`;
  return graphList<RefGroup>(
    tenant,
    `/groups?$select=id,displayName&$filter=${encodeURIComponent(filter)}&$top=25`,
  );
}

export async function listNamedLocations(
  mizanTenantId: string,
): Promise<RefNamedLocation[]> {
  const tenant = getTenant(mizanTenantId);
  if (!tenant) return [];
  if (tenant.is_demo === 1) return demoNamedLocations(mizanTenantId);
  // Graph returns heterogeneous objects via @odata.type discriminator.
  type Raw = {
    id: string;
    displayName: string;
    isTrusted?: boolean;
    "@odata.type"?: string;
  };
  const rows = await graphList<Raw>(
    tenant,
    `/identity/conditionalAccess/namedLocations?$select=id,displayName,isTrusted`,
  );
  return rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    isTrusted: !!r.isTrusted,
    kind:
      r["@odata.type"]?.includes("ip") === true
        ? ("ip" as const)
        : r["@odata.type"]?.includes("country") === true
          ? ("countryOrRegion" as const)
          : ("other" as const),
  }));
}

export async function listTermsOfUse(
  mizanTenantId: string,
): Promise<RefTermsOfUse[]> {
  const tenant = getTenant(mizanTenantId);
  if (!tenant) return [];
  if (tenant.is_demo === 1) return demoTermsOfUse(mizanTenantId);
  return graphList<RefTermsOfUse>(
    tenant,
    `/identityGovernance/termsOfUse/agreements?$select=id,displayName,isEnabled`,
  );
}

export async function listAuthStrengths(
  mizanTenantId: string,
): Promise<RefAuthStrength[]> {
  const tenant = getTenant(mizanTenantId);
  if (!tenant) return [];
  if (tenant.is_demo === 1) return demoAuthStrengths(mizanTenantId);
  type Raw = {
    id: string;
    displayName: string;
    description?: string;
    policyType?: "builtIn" | "custom";
  };
  const rows = await graphList<Raw>(
    tenant,
    `/policies/authenticationStrengthPolicies?$select=id,displayName,description,policyType`,
  );
  return rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    description: r.description ?? "",
    isBuiltIn: r.policyType === "builtIn",
  }));
}
