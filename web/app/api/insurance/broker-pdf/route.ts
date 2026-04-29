import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { listAnswers } from "@/lib/db/insurance";
import { AVIATION_QUESTIONNAIRE } from "@/lib/insurance/aviation";
import {
  evaluateAutoSignal,
  type AutoSignalKind,
} from "@/lib/insurance/auto-eval";
import { getBranding } from "@/lib/config/branding";
import { currentPeriod } from "@/lib/db/board-report";
import { resolveExecutiveTenant } from "@/lib/today/data";
import {
  InsuranceBrokerPdf,
  type BrokerPdfData,
  type BrokerPdfQuestion,
} from "@/lib/insurance/broker-pdf";
import { apiRequireRole } from "@/lib/auth/rbac";

/**
 * GET /api/insurance/broker-pdf
 *
 * One-shot questionnaire export the CISO emails to a cyber-insurance
 * broker. Reuses the `/insurance` page's enrichment logic (auto-eval
 * + persisted answers, effective value, evidence) and renders to a
 * brand-coloured A4 PDF with one page per category.
 *
 * Streamed back as `application/pdf`. No persistence — every request
 * re-renders from current state. v2.7.0.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await apiRequireRole("viewer");
  if (!auth.ok) return auth.response;

  const stored = listAnswers();
  const storedById = new Map(stored.map((a) => [a.question_id, a]));

  const questions: BrokerPdfQuestion[] = AVIATION_QUESTIONNAIRE.questions.map(
    (q) => {
      const auto = q.autoFromSignal
        ? evaluateAutoSignal(q.autoFromSignal as AutoSignalKind)
        : null;
      const persisted = storedById.get(q.id) ?? null;

      // Resolve effective answer + evidence + source. Persisted
      // operator answers always win over the auto-eval. If neither
      // is present, "unanswered" with no evidence — broker sees the
      // gap explicitly rather than a misleading blank.
      let effective: BrokerPdfQuestion["effective"] = "unanswered";
      let evidence: string | null = null;
      let source: BrokerPdfQuestion["source"] = null;
      let answeredAt: string | null = null;

      if (persisted) {
        effective = persisted.value as BrokerPdfQuestion["effective"];
        evidence = persisted.evidence ?? null;
        source = "operator";
        answeredAt = persisted.answered_at;
      } else if (auto) {
        effective = auto.value as BrokerPdfQuestion["effective"];
        evidence = auto.evidence ?? null;
        source = "auto-eval";
      }

      return {
        id: q.id,
        category: q.category,
        question: q.question,
        hint: q.hint ?? null,
        effective,
        evidence,
        source,
        answeredAt,
      };
    },
  );

  // Summary KPIs match what the dashboard insurance page shows.
  const total = questions.length;
  const answered = questions.filter((q) => q.effective !== "unanswered").length;
  const yes = questions.filter((q) => q.effective === "yes").length;
  const no = questions.filter((q) => q.effective === "no").length;
  const completionPct = Math.round((answered / total) * 1000) / 10;

  const branding = getBranding();
  const tenant = resolveExecutiveTenant();
  const orgName = tenant?.name_en ?? branding.nameEn;

  const data: BrokerPdfData = {
    org: { nameEn: orgName },
    branding: {
      nameEn: branding.nameEn,
      shortEn: branding.shortEn,
      accentColor: branding.accentColor,
      accentColorStrong: branding.accentColorStrong,
    },
    period: currentPeriod(),
    generatedAt: new Date().toISOString(),
    questionnaireTitle:
      AVIATION_QUESTIONNAIRE.id === "aviation"
        ? "Aviation cyber-insurance template"
        : AVIATION_QUESTIONNAIRE.id,
    questionnaireSource: AVIATION_QUESTIONNAIRE.source,
    summary: { total, answered, yes, no, completionPct },
    questions,
  };

  // renderToBuffer's React typing is overly strict against the
  // @react-pdf component tree; cast through `as never` to bypass.
  const buffer = await renderToBuffer(
    InsuranceBrokerPdf({ data }) as never,
  );
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="insurance-broker-${data.period}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
