import "server-only";

/**
 * Microsoft 365 license-SKU detection — maps service-plan IDs reported on
 * `/subscribedSkus` to the security tools they unlock. Used by the Phase 16
 * Workload Coverage card to answer "is this tool licensed at the entity?"
 * for the workloads where API-side configuration introspection isn't
 * possible (MDO, MDCA, full DLP, etc.).
 *
 * Service-plan IDs are stable across all Microsoft tenants worldwide
 * (Microsoft publishes the canonical mapping at
 * https://learn.microsoft.com/en-us/azure/active-directory/enterprise-users/licensing-service-plan-reference).
 * IDs below were drawn from that reference and cross-checked against
 * the Defender / Purview / Intune product team's licensing matrices.
 *
 * **Why service-plan IDs and not SKU names?** A SKU like `SPE_E5`
 * (Microsoft 365 E5) bundles ~40 service plans — including MDE P2, MDO P2,
 * MDI, MCAS, AIP P2, Intune, and DLP. We need to know which specific
 * tool is included, not just "they have E5". So we read each SKU's
 * `servicePlans[]` and check service-plan IDs.
 */

export type WorkloadLicense = {
  /** True if at least one matching service plan is enabled on the tenant. */
  licensed: boolean;
  /**
   * The matching service plan that proved the entitlement. Useful for the
   * "Licensed via SPE_E5" hover hint in the UI.
   */
  via: string | null;
  /** Total seats the tenant has paid for, summed across SKUs that include this plan. */
  totalSeats: number;
  /** Total seats currently consumed (assigned to a user). */
  consumedSeats: number;
};

/**
 * Microsoft tools whose deployment we surface on the Workload Coverage
 * card. The label is what we render; the catalog below maps each label
 * to one or more service-plan GUIDs that prove the tool is in the
 * entity's licensing pool.
 */
export type WorkloadKey =
  | "intune"
  | "mde"
  | "mdi"
  | "mdo"
  | "mdca"
  | "labels"
  | "dlp";

/**
 * Service-plan GUIDs that prove a given workload is licensed. Multiple
 * IDs per workload because Microsoft has rebranded / split / replaced
 * plans repeatedly:
 *
 *   - Intune: stand-alone (`INTUNE_A`) + plan-bundled variants
 *   - MDE: P1 (`MDE_LITE`) + P2 (`WINDEFATP`) + Server SKU
 *   - MDI: stand-alone (`ATA`) + bundled (`ATP_ENTERPRISE_FACULTY`)
 *   - MDO: P1 (`ATP_ENTERPRISE`) + P2 (`THREAT_INTELLIGENCE`)
 *   - MDCA: full (`ADALLOM_S_STANDALONE`) + Discovery-only (`ADALLOM_FOR_AADP1`)
 *   - Sensitivity Labels: AIP P1 (`RMS_S_ENTERPRISE`) + P2 (`RMS_S_PREMIUM`)
 *   - DLP: included with E3 (`MIP_S_CLP1`) and full DLP with E5 (`MIP_S_CLP2`)
 *
 * If Microsoft adds a new service-plan ID for any of these tools (e.g.
 * "Defender for Endpoint Plan 3"), append the GUID to the matching
 * array — no other code change needed.
 */
const WORKLOAD_SERVICE_PLANS: Record<WorkloadKey, readonly string[]> = {
  intune: [
    // INTUNE_A (Microsoft Intune Plan 1)
    "c1ec4a95-1f05-45b3-a911-aa3fa01094f5",
    // INTUNE_O365 (Mobile Device Management for Office 365)
    "882e1d05-acd1-4ccb-8708-6ee03664b117",
    // INTUNE_P2 (Intune Plan 2)
    "b3c26516-8073-46a4-bd29-3e4d6d82ee99",
    // INTUNE_EDU
    "da24caf9-af8e-485c-b7c8-e73336da2693",
  ],
  mde: [
    // WINDEFATP (Microsoft Defender for Endpoint Plan 2 — full)
    "871d91ec-ec1a-452b-a83f-bd76c7d770ef",
    // MDE_LITE (Plan 1)
    "292cc034-7b7c-4950-aaf5-943befd3f1d4",
    // MDATP_Server (Defender for Servers)
    "feda9f17-acea-46ec-9e28-e4eb3e4bb0ee",
    // MDATP_Plan2 alternate ID (some tenants)
    "b1188c4c-1b36-4018-b48b-ee07604f6feb",
  ],
  mdi: [
    // ATA (Microsoft Defender for Identity — Advanced Threat Analytics legacy)
    "14ab5db5-e6c4-4b20-b4bc-13e36fd2227f",
    // ATP_ENTERPRISE (some bundles include MDI under this plan)
    "f20fedf3-f3c3-43c3-8267-2bfdd51c0939",
  ],
  mdo: [
    // ATP_ENTERPRISE (Defender for Office 365 P1)
    "f20fedf3-f3c3-43c3-8267-2bfdd51c0939",
    // THREAT_INTELLIGENCE (Defender for Office 365 P2 — adds Threat Explorer + Attack Sim)
    "8e0c0a52-6a6c-4d40-8370-dd62790dcd70",
  ],
  mdca: [
    // ADALLOM_S_STANDALONE (Defender for Cloud Apps)
    "2e2ddb96-6af9-4b1d-a3f0-d6ecfd22edb2",
    // ADALLOM_S_O365 (App Governance — subset of MDCA)
    "8c098270-9dd4-4350-9b30-ba4703f3b36b",
    // ADALLOM_FOR_AADP1 (Cloud App Discovery only — limited)
    "932ad362-64a8-4783-9106-97849a1a30b9",
  ],
  labels: [
    // RMS_S_ENTERPRISE (Azure Information Protection P1)
    "bea4c11e-220a-4e6d-8eb8-8ea15d019f90",
    // RMS_S_PREMIUM (AIP P2 — auto-labeling, classification)
    "5689bec4-755d-4753-8b61-40975025187c",
    // INFORMATION_PROTECTION_COMPLIANCE (Microsoft Information Protection)
    "61ec51c0-fd2b-4cb1-893d-fd9cfa4f6ce8",
  ],
  dlp: [
    // MIP_S_CLP1 (basic DLP — Exchange / SharePoint / OneDrive)
    "5136a095-5cf0-4aff-bec3-e84448b38ea5",
    // MIP_S_CLP2 (full DLP — Endpoint DLP + Teams DLP + advanced classification)
    "efb0351d-3b08-4503-993d-383af8de41e3",
    // INFO_GOVERNANCE
    "e26c2fcc-ab91-4a61-b35c-03cdc8dddf66",
  ],
};

/**
 * The shape /subscribedSkus returns. Trimmed to fields we actually read.
 */
export type SubscribedSku = {
  skuId: string;
  skuPartNumber: string;
  prepaidUnits?: { enabled?: number; suspended?: number; warning?: number };
  consumedUnits?: number;
  servicePlans: Array<{
    servicePlanId: string;
    servicePlanName: string;
    provisioningStatus: string; // "Success" | "Disabled" | "PendingProvisioning" | ...
    appliesTo: string; // "User" | "Company"
  }>;
};

/**
 * Classify each watched workload by walking the tenant's SKUs once.
 * Returns the per-workload entitlement record consumed by the
 * Workload Coverage UI card.
 *
 * A plan counts as licensed when at least one SKU has it with
 * provisioningStatus="Success". Disabled/Suspended plans are
 * intentionally NOT counted — the entity has the SKU on paper but
 * the workload was turned off (e.g. an admin disabled MDO under E5).
 */
export function classifyWorkloadLicenses(
  skus: SubscribedSku[],
): Record<WorkloadKey, WorkloadLicense> {
  const result: Record<WorkloadKey, WorkloadLicense> = {
    intune: empty(),
    mde: empty(),
    mdi: empty(),
    mdo: empty(),
    mdca: empty(),
    labels: empty(),
    dlp: empty(),
  };

  for (const sku of skus) {
    const enabled = sku.prepaidUnits?.enabled ?? 0;
    const consumed = sku.consumedUnits ?? 0;
    for (const plan of sku.servicePlans ?? []) {
      if (plan.provisioningStatus !== "Success") continue;
      for (const [key, planIds] of Object.entries(WORKLOAD_SERVICE_PLANS) as Array<
        [WorkloadKey, readonly string[]]
      >) {
        if (!planIds.includes(plan.servicePlanId)) continue;
        const r = result[key];
        r.licensed = true;
        r.totalSeats += enabled;
        r.consumedSeats += consumed;
        r.via = r.via ?? `${sku.skuPartNumber} / ${plan.servicePlanName}`;
      }
    }
  }
  return result;
}

function empty(): WorkloadLicense {
  return { licensed: false, via: null, totalSeats: 0, consumedSeats: 0 };
}
