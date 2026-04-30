import { redirect } from "next/navigation";
import { resolveExecutiveTenant } from "@/lib/today/data";

/**
 * `/posture` — Executive Mode posture view.
 *
 * v2.6.1 shipped this as a thin tabbed page with summary KPIs + drill
 * links. v2.7.2 replaced that with a redirect to the existing rich
 * entity-detail surface (`/entities/[id]`) for the deployment's
 * primary tenant.
 *
 * The Council `/entities/[id]` page already carries 11 sub-tabs of
 * deep posture detail (Overview, Controls, Incidents, Identity,
 * Data, Devices, Governance, Framework, Vulnerabilities, Attack
 * Simulation, Connection). Re-creating a thinner subset on `/posture`
 * was the v2.6.1 IA mistake — operators couldn't find the rich view
 * because it was hidden under `/entities`, which Executive's sidebar
 * had hidden too.
 *
 * Preserves the `?tab=` query param across the redirect when the
 * caller passed one (e.g. `/today` change-feed events linking
 * `/posture?tab=identity`). The entity-detail page accepts the same
 * tab keys (identity / devices / data / vulnerabilities / governance)
 * so deep-links continue to work.
 *
 * v2.7.2.
 */
export const dynamic = "force-dynamic";

export default async function PosturePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[]; from?: string | string[] }>;
}) {
  const tenant = resolveExecutiveTenant();
  if (!tenant) {
    // No tenant onboarded yet — fall back to the home page so the
    // operator sees the empty-state CTA there instead of a 404.
    redirect("/today");
  }

  const sp = await searchParams;
  const tab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;

  // Tab key compatibility:
  //   /posture?tab=threats  → /entities/[id]?tab=incidents
  //   (entity-detail uses "incidents" for what posture called "threats";
  //    the underlying signals are the same.)
  const mappedTab =
    tab === "threats" ? "incidents" : tab && tab.length > 0 ? tab : null;

  const target = mappedTab
    ? `/entities/${tenant.id}?tab=${encodeURIComponent(mappedTab)}`
    : `/entities/${tenant.id}`;
  redirect(target);
}
