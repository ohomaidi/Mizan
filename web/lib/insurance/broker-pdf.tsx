import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { ensureFontsRegistered } from "@/lib/pdf/fonts";

ensureFontsRegistered();

/**
 * Insurance broker questionnaire export.
 *
 * One-shot PDF the CISO emails to a cyber-insurance broker as
 * pre-filled answers to the application questionnaire. Mirrors what
 * the operator sees on the dashboard `/insurance` page but in a
 * print-friendly format with evidence inline + auto-eval source
 * citations.
 *
 * Page layout:
 *   1. Cover — org branding + period + completion KPIs
 *   2..N. Questions, grouped by category, with answer chip + evidence
 *
 * v2.7.0.
 */

function getEmblemDataUri(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readLogoDataUri } = require("@/lib/branding/logo-store") as {
    readLogoDataUri: () => string | null;
  };
  return readLogoDataUri();
}

const PALETTE = {
  ink: "#0B1220",
  ink2: "#475569",
  ink3: "#8592A3",
  border: "#E1E6EF",
  surface: "#F8FAFB",
  pos: "#16A34A",
  warn: "#D97706",
  neg: "#DC2626",
};

type Branding = {
  nameEn: string;
  shortEn?: string | null;
  accentColor?: string | null;
  accentColorStrong?: string | null;
};

function getAccent(branding: Branding): string {
  return branding.accentColorStrong || branding.accentColor || PALETTE.ink;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Avenir",
    color: PALETTE.ink,
  },
  cover: {
    height: "100%",
    justifyContent: "space-between",
  },
  coverAccent: {
    height: 6,
    width: 120,
    marginBottom: 24,
  },
  coverHeader: { flexDirection: "row", alignItems: "center", gap: 16 },
  logo: { width: 110, height: 55, objectFit: "contain" },
  brandText: { fontSize: 15, fontWeight: 600 },
  title: {
    fontSize: 38,
    fontWeight: 700,
    marginTop: 28,
    letterSpacing: -0.4,
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: 13,
    color: PALETTE.ink2,
    marginTop: 10,
  },
  period: {
    fontSize: 10,
    color: PALETTE.ink3,
    marginTop: 28,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  kpiRow: { flexDirection: "row", gap: 8, marginTop: 22 },
  kpiTile: {
    flex: 1,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 4,
    padding: 9,
  },
  kpiLabel: {
    fontSize: 8,
    color: PALETTE.ink3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiValue: { fontSize: 17, fontWeight: 700, marginTop: 2 },
  // Questions pages
  categoryTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: 18,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: PALETTE.ink2,
  },
  question: {
    marginTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
  },
  qHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  qChip: {
    fontSize: 8,
    fontWeight: 700,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    color: "#FFF",
    width: 32,
    textAlign: "center",
  },
  qText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 1.4,
  },
  qHint: {
    marginTop: 3,
    fontSize: 9,
    color: PALETTE.ink3,
    fontStyle: "italic",
  },
  qEvidence: {
    marginTop: 4,
    fontSize: 9.5,
    color: PALETTE.ink2,
    lineHeight: 1.45,
  },
  qSource: {
    marginTop: 3,
    fontSize: 8,
    color: PALETTE.ink3,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: PALETTE.ink3,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const CHIP_COLOR: Record<string, string> = {
  yes: PALETTE.pos,
  no: PALETTE.neg,
  na: PALETTE.ink3,
  unanswered: PALETTE.warn,
};

export type BrokerPdfQuestion = {
  id: string;
  category: string;
  question: string;
  hint?: string | null;
  effective: "yes" | "no" | "na" | "unanswered";
  evidence: string | null;
  /** "auto-eval" | "operator" | null. */
  source: "auto-eval" | "operator" | null;
  answeredAt: string | null;
};

export type BrokerPdfData = {
  org: { nameEn: string };
  branding: Branding;
  period: string;
  generatedAt: string;
  questionnaireTitle: string;
  /** "Aviation v1.0", "Finance v1.0", etc. */
  questionnaireSource: string;
  summary: {
    total: number;
    answered: number;
    yes: number;
    no: number;
    completionPct: number;
  };
  questions: BrokerPdfQuestion[];
};

export function InsuranceBrokerPdf({ data }: { data: BrokerPdfData }) {
  const logo = getEmblemDataUri();
  const accent = getAccent(data.branding);

  // Group questions by category, preserve template order.
  const grouped: Array<{ category: string; items: BrokerPdfQuestion[] }> = [];
  const seen = new Set<string>();
  for (const q of data.questions) {
    if (!seen.has(q.category)) {
      seen.add(q.category);
      grouped.push({ category: q.category, items: [] });
    }
    grouped[grouped.length - 1].items.push(q);
  }

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <View>
            <View style={[styles.coverAccent, { backgroundColor: accent }]} />
            <View style={styles.coverHeader}>
              {logo ? <Image style={styles.logo} src={logo} /> : null}
              <View>
                <Text style={styles.brandText}>{data.branding.nameEn}</Text>
                {data.org.nameEn !== data.branding.nameEn ? (
                  <Text style={{ fontSize: 10, color: PALETTE.ink3 }}>
                    {data.org.nameEn}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text style={styles.title}>
              Cyber insurance{"\n"}questionnaire
            </Text>
            <Text style={styles.subtitle}>
              {data.questionnaireTitle} · {data.questionnaireSource}
            </Text>
            <Text style={styles.period}>Period · {data.period}</Text>
            <View style={styles.kpiRow}>
              <View style={styles.kpiTile}>
                <Text style={styles.kpiLabel}>Completion</Text>
                <Text style={styles.kpiValue}>
                  {data.summary.completionPct}%
                </Text>
              </View>
              <View style={styles.kpiTile}>
                <Text style={styles.kpiLabel}>Yes</Text>
                <Text style={[styles.kpiValue, { color: PALETTE.pos }]}>
                  {data.summary.yes}
                </Text>
              </View>
              <View style={styles.kpiTile}>
                <Text style={styles.kpiLabel}>No</Text>
                <Text style={[styles.kpiValue, { color: PALETTE.neg }]}>
                  {data.summary.no}
                </Text>
              </View>
              <View style={styles.kpiTile}>
                <Text style={styles.kpiLabel}>Open</Text>
                <Text
                  style={[
                    styles.kpiValue,
                    {
                      color:
                        data.summary.total - data.summary.answered === 0
                          ? PALETTE.pos
                          : PALETTE.warn,
                    },
                  ]}
                >
                  {data.summary.total - data.summary.answered}
                </Text>
              </View>
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 9, color: PALETTE.ink3 }}>
              Confidential · For broker use only · Generated {data.generatedAt.slice(0, 10)} by Mizan
            </Text>
          </View>
        </View>
      </Page>

      {/* Question pages */}
      {grouped.map((g, gi) => (
        <Page key={gi} size="A4" style={styles.page}>
          <Text style={[styles.categoryTitle, { borderBottomColor: accent }]}>
            {g.category}
          </Text>
          {g.items.map((q) => (
            <View key={q.id} style={styles.question}>
              <View style={styles.qHeader}>
                <Text
                  style={[
                    styles.qChip,
                    { backgroundColor: CHIP_COLOR[q.effective] },
                  ]}
                >
                  {q.effective === "unanswered"
                    ? "—"
                    : q.effective.toUpperCase()}
                </Text>
                <Text style={styles.qText}>{q.question}</Text>
              </View>
              {q.hint ? <Text style={styles.qHint}>{q.hint}</Text> : null}
              {q.evidence ? (
                <Text style={styles.qEvidence}>{q.evidence}</Text>
              ) : null}
              {q.source ? (
                <Text style={styles.qSource}>
                  Source:{" "}
                  {q.source === "auto-eval"
                    ? "Auto-evaluated from Microsoft 365 telemetry"
                    : "Operator-supplied"}
                  {q.answeredAt ? ` · ${q.answeredAt.slice(0, 10)}` : ""}
                </Text>
              ) : null}
            </View>
          ))}

          <View style={styles.footer}>
            <Text>
              {data.branding.nameEn} · Insurance questionnaire · {data.period}
            </Text>
            <Text>Page {gi + 2}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
