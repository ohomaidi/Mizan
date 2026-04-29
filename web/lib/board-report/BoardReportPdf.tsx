import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { ensureFontsRegistered } from "@/lib/pdf/fonts";
import type { BoardReportData } from "./data";

ensureFontsRegistered();

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

/**
 * Pull the deployment's brand accent (a hex like `#1E2761` for Dubai
 * Airports). v2.6.2 lets the cover page actually feel branded — was
 * just black-on-white before. Falls back to the Mizan ink colour so
 * Council deployments without a custom accent stay readable.
 */
function getBrandAccent(data: BoardReportData): string {
  // BoardReportData carries `branding.accentColorStrong` when the
  // operator has set a brand on /setup. Tolerate absence cleanly.
  const a =
    (data.branding as unknown as {
      accentColorStrong?: string;
      accentColor?: string;
    }) ?? {};
  return a.accentColorStrong || a.accentColor || PALETTE.ink;
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
  coverAccentBar: {
    height: 6,
    width: 120,
    marginBottom: 28,
  },
  coverTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 4,
  },
  // Bumped from 80×40 to 120×60 so the customer logo reads on the
  // cover at A4 viewing distance. objectFit:"contain" preserves
  // aspect for non-square assets.
  logo: { width: 120, height: 60, objectFit: "contain" },
  coverBrandText: { fontSize: 16, fontWeight: 600, letterSpacing: 0.2 },
  coverTitle: {
    fontSize: 44,
    fontWeight: 700,
    marginTop: 28,
    letterSpacing: -0.6,
    lineHeight: 1.1,
    color: PALETTE.ink,
  },
  coverSubtitle: {
    fontSize: 16,
    color: PALETTE.ink2,
    marginTop: 12,
    fontWeight: 500,
  },
  coverPeriod: {
    fontSize: 11,
    color: PALETTE.ink3,
    marginTop: 36,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  coverGenerated: {
    fontSize: 9,
    color: PALETTE.ink3,
    marginTop: 4,
  },
  coverFooterAccent: {
    height: 2,
    width: 80,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 2,
    // Overridden inline at use-site to the brand accent so the title
    // underlines pick up the deployment's colour. Default is ink2
    // for non-branded installs.
    borderBottomColor: PALETTE.ink2,
    letterSpacing: -0.2,
  },
  para: { fontSize: 10.5, lineHeight: 1.5, marginBottom: 6 },
  kpiRow: { flexDirection: "row", gap: 8, marginVertical: 6 },
  kpiTile: {
    flex: 1,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 4,
    padding: 8,
  },
  kpiLabel: {
    fontSize: 8,
    color: PALETTE.ink3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiValue: { fontSize: 18, fontWeight: 700, marginTop: 2 },
  table: { marginTop: 6, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 4 },
  tHeader: {
    flexDirection: "row",
    backgroundColor: PALETTE.surface,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
    padding: 6,
  },
  tRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
    padding: 6,
  },
  th: { fontSize: 8, fontWeight: 700, color: PALETTE.ink3, textTransform: "uppercase" },
  td: { fontSize: 9.5, color: PALETTE.ink },
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

export function BoardReportPdf({ data }: { data: BoardReportData }) {
  const logo = getEmblemDataUri();
  const accent = getBrandAccent(data);
  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <View>
            <View
              style={[styles.coverAccentBar, { backgroundColor: accent }]}
            />
            <View style={styles.coverTop}>
              {logo ? <Image style={styles.logo} src={logo} /> : null}
              <View>
                <Text style={styles.coverBrandText}>{data.branding.nameEn}</Text>
                {data.org.nameEn !== data.branding.nameEn ? (
                  <Text style={{ fontSize: 10, color: PALETTE.ink3 }}>
                    {data.org.nameEn}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text style={styles.coverTitle}>
              Board{"\n"}cybersecurity report
            </Text>
            <Text style={styles.coverSubtitle}>{data.org.nameEn}</Text>
            <Text style={styles.coverPeriod}>Period · {data.period}</Text>
            <Text style={styles.coverGenerated}>
              Generated {data.generatedAt.slice(0, 10)}
            </Text>
          </View>
          <View>
            <View
              style={[styles.coverFooterAccent, { backgroundColor: accent }]}
            />
            <Text style={{ fontSize: 9, color: PALETTE.ink3 }}>
              Confidential · For board use only · Generated by Mizan
            </Text>
          </View>
        </View>
      </Page>

      {/* Executive summary */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { borderBottomColor: accent }]}>Executive summary</Text>
        <Text style={styles.para}>
          This report summarizes {data.org.nameEn}'s cybersecurity posture for {data.period}, drawn live from
          Microsoft 365 telemetry. Headline indicators below; detailed sections follow.
        </Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Maturity Index</Text>
            <Text style={styles.kpiValue}>
              {data.posture.maturityIndex !== null ? `${data.posture.maturityIndex}%` : "—"}
            </Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Critical CVEs</Text>
            <Text style={[styles.kpiValue, { color: data.vulnerabilities.critical > 0 ? PALETTE.neg : PALETTE.pos }]}>
              {data.vulnerabilities.critical}
            </Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Active high-severity incidents</Text>
            <Text style={[styles.kpiValue, { color: data.incidents.activeHigh > 0 ? PALETTE.warn : PALETTE.pos }]}>
              {data.incidents.activeHigh}
            </Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Open risks</Text>
            <Text style={[styles.kpiValue, { color: data.risks.open > 0 ? PALETTE.warn : PALETTE.pos }]}>
              {data.risks.open}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { borderBottomColor: accent }]}>Posture sub-scores</Text>
        {data.posture.subScores ? (
          <View style={{ marginTop: 4 }}>
            {Object.entries(data.posture.subScores).map(([k, v]) => (
              <View key={k} style={{ flexDirection: "row", marginBottom: 3 }}>
                <Text style={[styles.td, { width: 130 }]}>{k}</Text>
                <Text style={[styles.td, { fontWeight: 700 }]}>{Math.round(v)}%</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.para}>No posture data available yet.</Text>
        )}

        <Text style={[styles.sectionTitle, { borderBottomColor: accent }]}>CISO scorecard</Text>
        {data.scorecard.length === 0 ? (
          <Text style={styles.para}>No KPIs pinned. Pin KPIs from the dashboard to surface them in this report.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tHeader}>
              <Text style={[styles.th, { width: "40%" }]}>KPI</Text>
              <Text style={[styles.th, { width: "20%" }]}>Target</Text>
              <Text style={[styles.th, { width: "20%" }]}>Current</Text>
              <Text style={[styles.th, { width: "20%" }]}>Status</Text>
            </View>
            {data.scorecard.map((s, i) => (
              <View key={i} style={styles.tRow}>
                <Text style={[styles.td, { width: "40%" }]}>{s.label}</Text>
                <Text style={[styles.td, { width: "20%" }]}>{s.target}</Text>
                <Text style={[styles.td, { width: "20%" }]}>{s.current ?? "—"}</Text>
                <Text
                  style={[
                    styles.td,
                    {
                      width: "20%",
                      color:
                        s.status === "met"
                          ? PALETTE.pos
                          : s.status === "atRisk"
                            ? PALETTE.warn
                            : s.status === "missed"
                              ? PALETTE.neg
                              : PALETTE.ink3,
                      fontWeight: 700,
                    },
                  ]}
                >
                  {s.status}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text>{data.branding.nameEn} · Board report · {data.period}</Text>
          <Text>Page 2</Text>
        </View>
      </Page>

      {/* Risks + vulnerabilities */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { borderBottomColor: accent }]}>Top risks</Text>
        {data.risks.topByRating.length === 0 ? (
          <Text style={styles.para}>No risks in the register yet.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tHeader}>
              <Text style={[styles.th, { width: "10%" }]}>#</Text>
              <Text style={[styles.th, { width: "60%" }]}>Title</Text>
              <Text style={[styles.th, { width: "15%" }]}>Owner</Text>
              <Text style={[styles.th, { width: "15%" }]}>Status</Text>
            </View>
            {data.risks.topByRating.map((r) => (
              <View key={r.id} style={styles.tRow}>
                <Text style={[styles.td, { width: "10%", fontWeight: 700 }]}>{r.rating}</Text>
                <Text style={[styles.td, { width: "60%" }]}>{r.title}</Text>
                <Text style={[styles.td, { width: "15%" }]}>{r.owner ?? "—"}</Text>
                <Text style={[styles.td, { width: "15%" }]}>{r.status}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { borderBottomColor: accent }]}>Top vulnerabilities</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Total CVEs</Text>
            <Text style={styles.kpiValue}>{data.vulnerabilities.totalCves}</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Critical</Text>
            <Text style={[styles.kpiValue, { color: PALETTE.neg }]}>{data.vulnerabilities.critical}</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>High</Text>
            <Text style={[styles.kpiValue, { color: PALETTE.warn }]}>{data.vulnerabilities.high}</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Zero-day</Text>
            <Text style={[styles.kpiValue, { color: data.vulnerabilities.zeroDay > 0 ? PALETTE.neg : PALETTE.pos }]}>
              {data.vulnerabilities.zeroDay}
            </Text>
          </View>
        </View>
        {data.vulnerabilities.topCves.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tHeader}>
              <Text style={[styles.th, { width: "20%" }]}>CVE</Text>
              <Text style={[styles.th, { width: "15%" }]}>Severity</Text>
              <Text style={[styles.th, { width: "20%" }]}>Affected</Text>
              <Text style={[styles.th, { width: "45%" }]}>Recommended fix</Text>
            </View>
            {data.vulnerabilities.topCves.map((c) => (
              <View key={c.cveId} style={styles.tRow}>
                <Text style={[styles.td, { width: "20%" }]}>{c.cveId}</Text>
                <Text style={[styles.td, { width: "15%" }]}>{c.severity}</Text>
                <Text style={[styles.td, { width: "20%" }]}>
                  {c.affectedDevices} device{c.affectedDevices === 1 ? "" : "s"}
                </Text>
                <Text style={[styles.td, { width: "45%" }]}>{c.recommendedFix ?? "—"}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text>{data.branding.nameEn} · Board report · {data.period}</Text>
          <Text>Page 3</Text>
        </View>
      </Page>

      {/* Insurance + planned actions */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { borderBottomColor: accent }]}>Cyber insurance readiness</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Completion</Text>
            <Text style={styles.kpiValue}>{data.insurance.completionPct}%</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Yes</Text>
            <Text style={[styles.kpiValue, { color: PALETTE.pos }]}>{data.insurance.yes}</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>No</Text>
            <Text style={[styles.kpiValue, { color: PALETTE.neg }]}>{data.insurance.no}</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Open gaps</Text>
            <Text
              style={[
                styles.kpiValue,
                {
                  color:
                    data.insurance.total - data.insurance.answered === 0
                      ? PALETTE.pos
                      : PALETTE.warn,
                },
              ]}
            >
              {data.insurance.total - data.insurance.answered}
            </Text>
          </View>
        </View>
        {data.insurance.gaps.length > 0 ? (
          <>
            <Text style={[styles.para, { fontWeight: 700, marginTop: 8 }]}>
              Open gaps:
            </Text>
            {data.insurance.gaps.map((g, i) => (
              <Text key={i} style={[styles.para, { marginLeft: 6 }]}>
                · [{g.category}] {g.question}
              </Text>
            ))}
          </>
        ) : null}

        <Text style={[styles.sectionTitle, { borderBottomColor: accent }]}>Planned actions next quarter</Text>
        <Text style={styles.para}>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          [Editable section — replace with the CISO's narrative on what the team will deliver next quarter, what board approval is needed, and any escalations.]
        </Text>

        <View style={styles.footer}>
          <Text>{data.branding.nameEn} · Board report · {data.period}</Text>
          <Text>Page 4</Text>
        </View>
      </Page>
    </Document>
  );
}
