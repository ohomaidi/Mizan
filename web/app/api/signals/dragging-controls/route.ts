import { NextResponse } from "next/server";
import { listTenants } from "@/lib/db/tenants";
import { getLatestSnapshot } from "@/lib/db/signals";
import type { SecureScorePayload } from "@/lib/graph/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Council-wide aggregation of Secure Score controls that are dragging the Maturity Index
 * down. Walks the latest Secure Score snapshot for every consented entity, groups by control
 * id, ranks by total "missed score" — sum across entities of (maxScore - score). That's the
 * real math on how much Council-wide index each control is costing us.
 */
export async function GET() {
  const tenants = listTenants().filter((t) => t.consent_status === "consented");

  type Agg = {
    id: string;
    title: string;
    category: string;
    service: string;
    maxScore: number;
    missedScore: number;
    failingCount: number;
    partialCount: number;
    affectedCount: number;
    userImpact: string | null;
    implementationCost: string | null;
    tier: string | null;
  };
  const byId = new Map<string, Agg>();

  for (const t of tenants) {
    const ss = getLatestSnapshot<SecureScorePayload>(t.id, "secureScore")?.payload;
    if (!ss) continue;
    for (const c of ss.controls) {
      if (c.score == null) continue;
      const max = c.maxScore ?? 0;
      if (max === 0) continue;
      const missed = Math.max(0, max - c.score);
      const entry = byId.get(c.id) ?? {
        id: c.id,
        title: c.title ?? c.id,
        category: c.category ?? "—",
        service: c.service ?? "",
        maxScore: max,
        missedScore: 0,
        failingCount: 0,
        partialCount: 0,
        affectedCount: 0,
        userImpact: c.userImpact,
        implementationCost: c.implementationCost,
        tier: c.tier,
      };
      entry.missedScore += missed;
      if (c.score === 0) entry.failingCount++;
      else if (c.score < max) entry.partialCount++;
      if (missed > 0) entry.affectedCount++;
      // Keep the richest title / metadata (any tenant's profile catalog should agree).
      if (!entry.title || entry.title === c.id) entry.title = c.title ?? entry.title;
      if (!entry.userImpact) entry.userImpact = c.userImpact;
      if (!entry.implementationCost) entry.implementationCost = c.implementationCost;
      if (!entry.tier) entry.tier = c.tier;
      byId.set(c.id, entry);
    }
  }

  const controls = [...byId.values()]
    .filter((c) => c.missedScore > 0)
    .sort((a, b) => b.missedScore - a.missedScore)
    .slice(0, 10);

  return NextResponse.json({ controls });
}
