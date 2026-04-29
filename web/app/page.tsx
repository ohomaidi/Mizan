import { redirect } from "next/navigation";
import { isExecutiveDeployment } from "@/lib/config/deployment-kind";

/**
 * Root entry point.
 *
 *   - Council mode (default) → `/maturity` Council overview, the
 *     multi-tenant landing page.
 *
 *   - Executive mode → `/today` daily-driver home for the single-org
 *     CISO. v2.6.1: was `/entities/{id}` in v2.6.0 but that left
 *     users without a clear "home" — Today is now the home, with
 *     hero · risks · incidents · scorecard · 7-day change feed all
 *     on one scroll.
 *
 * v2.6.1.
 */
export default function Home() {
  if (isExecutiveDeployment()) {
    redirect("/today");
  }
  redirect("/maturity");
}
