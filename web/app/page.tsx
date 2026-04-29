import { redirect } from "next/navigation";
import { isExecutiveDeployment } from "@/lib/config/deployment-kind";
import { listTenants } from "@/lib/db/tenants";

/**
 * Root entry point. Redirects vary by `deploymentKind`:
 *
 *  - Council mode (default) → `/maturity` Council overview, the
 *    multi-tenant landing page.
 *
 *  - Executive mode → `/entities/{id}` for the single consented
 *    tenant. The "entity detail" page becomes the de-facto home for
 *    a single-org CISO. If no tenant has been onboarded yet (fresh
 *    install pre-consent), fall back to `/maturity` which renders
 *    an empty state with a clear "complete onboarding" prompt.
 *
 * v2.6.0.
 */
export default function Home() {
  if (isExecutiveDeployment()) {
    const tenants = listTenants();
    const primary = tenants.find(
      (t) => t.consent_status === "consented" || t.is_demo === 1,
    );
    if (primary) {
      redirect(`/entities/${primary.id}`);
    }
  }
  redirect("/maturity");
}
