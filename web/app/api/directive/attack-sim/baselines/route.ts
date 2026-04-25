import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 9 Attack Simulation Training catalog — COMING SOON.
 *
 * `/security/attackSimulation` and `/security/attackSimulation/simulations`
 * are read-mostly today. Schedule + create-from-template + automatic
 * remediation training assignment are partially in beta but not in a
 * shape Mizan can promise. Catalog rendered as coming-soon; flips on
 * when Microsoft moves the create + schedule surface to GA.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    pushEnabled: false,
    coverageNote:
      "Microsoft Graph exposes Attack Simulation reads but the create + schedule surface is in beta only. Push unlocks when Microsoft GAs the simulation create + automation API.",
    baselines: [
      {
        id: "attack-sim-quarterly-phishing",
        titleKey: "attackSim.baseline.quarterlyPhishing.title",
        bodyKey: "attackSim.baseline.quarterlyPhishing.body",
        riskTier: "low" as const,
        effectSummary:
          "Schedule a phishing simulation against all licensed users every 90 days. Use Microsoft's curated payload library; randomize across credential-harvest, link-in-attachment, and malware-attachment patterns.",
      },
      {
        id: "attack-sim-new-hire-training",
        titleKey: "attackSim.baseline.newHireTraining.title",
        bodyKey: "attackSim.baseline.newHireTraining.body",
        riskTier: "low" as const,
        effectSummary:
          "Auto-enroll every newly licensed user in the Microsoft phishing-awareness training course within 30 days of license assignment.",
      },
      {
        id: "attack-sim-repeat-offender",
        titleKey: "attackSim.baseline.repeatOffender.title",
        bodyKey: "attackSim.baseline.repeatOffender.body",
        riskTier: "medium" as const,
        effectSummary:
          "Users who clicked or supplied credentials in the last simulation get a follow-up training within 7 days. Compounds across simulations — third-time offenders trigger a manager notification.",
      },
    ],
  });
}
