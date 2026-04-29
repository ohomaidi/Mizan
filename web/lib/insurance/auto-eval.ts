import "server-only";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshot } from "@/lib/db/signals";
import { computeForTenant } from "@/lib/compute/maturity";
import type {
  DevicesPayload,
  SensitivityLabelsPayload,
  AttackSimulationPayload,
  VulnerabilitiesPayload,
} from "@/lib/graph/signals";
import type { WorkloadCoveragePayload } from "@/lib/graph/workload-coverage";

/**
 * Auto-evaluator for insurance questionnaire signals. Each kind maps
 * to a yes/no/na decision based on the latest snapshot. Returns the
 * evidence string (a one-line human summary of WHY) so the answer
 * card can show the operator the data the auto-eval used.
 *
 * If the signal isn't available (no data, license gap), returns
 * { value: "na" } so the operator can answer manually.
 *
 * v2.6.0.
 */

export type AutoEvalResult = {
  value: "yes" | "no" | "na";
  evidence: string;
  signalSnapshot: string;
};

export type AutoSignalKind =
  | "mfaAdmins"
  | "mdeOnboarded"
  | "intuneCompliance"
  | "labelsActive"
  | "incidentResponseDataAvailable"
  | "vulnerabilityScanning"
  | "phishingTraining";

export function evaluateAutoSignal(
  kind: AutoSignalKind,
): AutoEvalResult | null {
  const tenants = listTenants().filter(
    (t) => t.consent_status === "consented" || t.is_demo === 1,
  );
  if (tenants.length === 0) return null;

  switch (kind) {
    case "mfaAdmins": {
      // Use Maturity identity sub-score as a proxy; >= 95 = effectively
      // 100% MFA on admins (the Mizan sub-score has a minor decay even
      // for full coverage). < 70 = clear gap.
      const ids = tenants
        .map((t) => computeForTenant(t.id))
        .filter((m) => m.hasData)
        .map((m) => m.subScores.identity);
      if (ids.length === 0) return null;
      const mean =
        Math.round(
          (ids.reduce((a, b) => a + b, 0) / ids.length) * 10,
        ) / 10;
      const value = mean >= 95 ? "yes" : "no";
      return {
        value,
        evidence: `Identity sub-score across ${ids.length} tenant(s): ${mean}%. ${value === "yes" ? "Coverage looks complete." : "Gaps detected — review the Identity tab for which admins lack MFA."}`,
        signalSnapshot: JSON.stringify({ identityMean: mean, tenants: ids.length }),
      };
    }
    case "mdeOnboarded": {
      let onboarded = 0;
      let total = 0;
      for (const t of tenants) {
        const w = getLatestSnapshot<WorkloadCoveragePayload>(
          t.id,
          "workloadCoverage",
        );
        const mde = w?.payload?.mde;
        if (!mde) continue;
        onboarded += mde.onboardedDevices ?? 0;
        // Use Intune total as a proxy for expected total — Workload
        // Coverage card already does this correlation.
        const intune = w?.payload?.intune;
        total += intune?.enrolledDevices ?? mde.onboardedDevices ?? 0;
      }
      if (total === 0) return null;
      const pct = Math.round((onboarded / total) * 1000) / 10;
      const value = pct >= 99 ? "yes" : "no";
      return {
        value,
        evidence: `MDE onboarded: ${onboarded} / ${total} devices (${pct}%). ${value === "yes" ? "Coverage at parity with Intune enrollment." : "Onboarding gap — see Workload Coverage card."}`,
        signalSnapshot: JSON.stringify({ onboarded, total, pct }),
      };
    }
    case "intuneCompliance": {
      let comp = 0;
      let total = 0;
      for (const t of tenants) {
        const d = getLatestSnapshot<DevicesPayload>(t.id, "devices");
        if (!d?.payload) continue;
        comp += d.payload.compliant;
        total += d.payload.total;
      }
      if (total === 0) return null;
      const pct = Math.round((comp / total) * 1000) / 10;
      const value = pct >= 90 ? "yes" : "no";
      return {
        value,
        evidence: `Compliant devices: ${comp} / ${total} (${pct}%) per Intune compliance policies.`,
        signalSnapshot: JSON.stringify({ compliant: comp, total, pct }),
      };
    }
    case "labelsActive": {
      let totalLabels = 0;
      for (const t of tenants) {
        const l = getLatestSnapshot<SensitivityLabelsPayload>(
          t.id,
          "sensitivityLabels",
        );
        totalLabels += l?.payload?.labels?.length ?? 0;
      }
      const value = totalLabels >= 3 ? "yes" : "no";
      return {
        value,
        evidence: `${totalLabels} sensitivity label(s) defined across the tenant(s). ${value === "yes" ? "At least a basic Confidential/Restricted/Public taxonomy is in place." : "Fewer than 3 labels — most insurers expect at minimum a 3-tier classification (Public/Internal/Confidential)."}`,
        signalSnapshot: JSON.stringify({ totalLabels }),
      };
    }
    case "incidentResponseDataAvailable":
      // No direct signal yet — falls through to manual.
      return null;
    case "vulnerabilityScanning": {
      let any = 0;
      for (const t of tenants) {
        const v = getLatestSnapshot<VulnerabilitiesPayload>(
          t.id,
          "vulnerabilities",
        );
        if (v?.payload?.error == null && (v?.payload?.total ?? 0) > 0) any++;
      }
      const value = any > 0 ? "yes" : "na";
      return {
        value,
        evidence:
          value === "yes"
            ? `Defender Vulnerability Management is returning live findings on ${any} tenant(s).`
            : "No vulnerability data flowing — confirm Defender for Endpoint P2 / Defender Vulnerability Management add-on is licensed.",
        signalSnapshot: JSON.stringify({ tenantsWithData: any }),
      };
    }
    case "phishingTraining": {
      let total = 0;
      for (const t of tenants) {
        const a = getLatestSnapshot<AttackSimulationPayload>(
          t.id,
          "attackSimulations",
        );
        total += a?.payload?.simulations ?? 0;
      }
      const value = total > 0 ? "yes" : "no";
      return {
        value,
        evidence: `${total} Microsoft Attack Simulation campaign(s) on file. ${value === "yes" ? "Phishing-simulation training in active use." : "No campaigns logged — confirm training program is running."}`,
        signalSnapshot: JSON.stringify({ totalSimulations: total }),
      };
    }
  }
}
