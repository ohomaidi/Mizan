import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { ensureFontsRegistered } from "../fonts";
import { sanitizeArabic } from "../sanitize-ar";

ensureFontsRegistered();

/** Strip Arabic Tatweel-next-to-Latin sequences that crash @react-pdf's bidi reorder.
 *  Walks any React child tree and sanitizes string leaves. Non-string children pass
 *  through unchanged. Applied automatically inside H1 / H2 / P / Bullet / NumBullet /
 *  Note / Callout / Code in this layout. */
function sanitizeChildren(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string") return sanitizeArabic(node);
  if (Array.isArray(node)) return node.map((n, i) => <React.Fragment key={i}>{sanitizeChildren(n)}</React.Fragment>);
  return node;
}

/**
 * Returns the customer's uploaded logo as a data URI — or null if none has
 * been uploaded. Read on every render so mid-session uploads show up in the
 * next PDF without a restart. Inline import to avoid a module-init cycle.
 */
function getEmblemDataUri(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readLogoDataUri } = require("@/lib/branding/logo-store") as {
    readLogoDataUri: () => string | null;
  };
  return readLogoDataUri();
}

export const PALETTE = {
  ink: "#0B1220",
  ink2: "#475569",
  ink3: "#8592A3",
  council: "#0D6B63",
  councilDark: "#0B5651",
  accent: "#A37121",
  border: "#E1E6EF",
  borderStrong: "#C4CCD9",
  soft: "#F5F7FA",
  softer: "#FAFBFC",
  posSoft: "#EEF8EC",
  posBorder: "#BFE3B6",
  negSoft: "#FEF0F0",
  negBorder: "#F3C2C2",
  warnSoft: "#FFF7EB",
  warnBorder: "#F0D6A6",
};

export const FF_EN = "Inter";
export const FF_AR = "NotoKufiArabic";

export type DocLang = "en" | "ar";

export type DocLabels = {
  page: (n: number, total: number) => string;
  toc: string;
  version: string;
  issued: string;
  confidential: string;
};

/**
 * Canonical labels are now produced by `buildLabels()` below, which reads the
 * current branding to fill in the customer name in the confidentiality footer.
 * These exports are kept so callers can still import a static baseline without
 * needing to pass branding explicitly; the confidentiality string here uses a
 * neutral placeholder.
 */
export const LABELS_EN: DocLabels = {
  page: (n, t) => `Page ${n} / ${t}`,
  toc: "Contents",
  version: "Version",
  issued: "Issued",
  confidential: "Confidential · in partnership with Microsoft Security",
};

export const LABELS_AR: DocLabels = {
  page: (n, t) => `صفحة ${n} / ${t}`,
  toc: "المحتويات",
  version: "الإصدار",
  issued: "تاريخ الإصدار",
  confidential: "سري · بالشراكة مع Microsoft Security",
};

export function buildLabels(
  lang: DocLang,
  branding: { nameEn: string; nameAr: string },
): DocLabels {
  const base = lang === "ar" ? LABELS_AR : LABELS_EN;
  const name = lang === "ar" ? branding.nameAr : branding.nameEn;
  return {
    ...base,
    confidential:
      lang === "ar"
        ? `سري · ${name} · بالشراكة مع Microsoft Security`
        : `Confidential · ${name} · in partnership with Microsoft Security`,
  };
}

export function buildDocStyles(lang: DocLang) {
  const isAr = lang === "ar";
  const align = isAr ? "right" : "left";
  const ff = isAr ? FF_AR : FF_EN;
  return {
    s: StyleSheet.create({
      page: {
        backgroundColor: "#FFFFFF",
        paddingTop: 68,
        paddingBottom: 58,
        paddingHorizontal: 52,
        color: PALETTE.ink,
        fontSize: 10,
        lineHeight: 1.55,
        fontFamily: ff,
      },
      topStripe: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        backgroundColor: PALETTE.council,
      },
      topAccent: {
        position: "absolute",
        top: 6,
        left: isAr ? undefined : 0,
        right: isAr ? 0 : undefined,
        width: 120,
        height: 2,
        backgroundColor: PALETTE.accent,
      },
      header: {
        flexDirection: isAr ? "row-reverse" : "row",
        alignItems: "center",
        paddingBottom: 10,
        marginBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.borderStrong,
      },
      emblem: {
        width: 46,
        height: 46,
        marginLeft: isAr ? 12 : 0,
        marginRight: isAr ? 0 : 12,
      },
      headerLockup: { flex: 1 },
      headerCouncil: {
        fontSize: 12,
        fontWeight: 700,
        color: PALETTE.councilDark,
        textAlign: align,
      },
      headerTagline: {
        fontSize: 9,
        color: PALETTE.ink2,
        marginTop: 2,
        textAlign: align,
      },
      coverPage: {
        justifyContent: "center",
      },
      coverInner: {
        marginTop: 40,
        borderTopWidth: 3,
        borderTopColor: PALETTE.council,
        paddingTop: 28,
      },
      coverEyebrow: {
        fontSize: 10,
        letterSpacing: 2,
        color: PALETTE.ink3,
        textTransform: "uppercase",
        marginBottom: 10,
        textAlign: align,
      },
      coverTitle: {
        fontSize: 24,
        fontWeight: 700,
        color: PALETTE.ink,
        marginBottom: 10,
        textAlign: align,
        lineHeight: 1.25,
      },
      coverSubtitle: {
        fontSize: 13,
        color: PALETTE.ink2,
        textAlign: align,
        marginBottom: 28,
        lineHeight: 1.5,
      },
      coverMetaRow: {
        flexDirection: isAr ? "row-reverse" : "row",
        gap: 24,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: PALETTE.border,
      },
      coverMetaItem: {
        flex: 1,
      },
      coverMetaLabel: {
        fontSize: 8,
        letterSpacing: 1.2,
        color: PALETTE.ink3,
        textTransform: "uppercase",
        textAlign: align,
      },
      coverMetaValue: {
        fontSize: 11,
        color: PALETTE.ink,
        marginTop: 3,
        textAlign: align,
      },

      h1: {
        fontSize: 15,
        fontWeight: 700,
        color: PALETTE.council,
        marginTop: 18,
        marginBottom: 8,
        paddingBottom: 5,
        borderBottomWidth: 0.75,
        borderBottomColor: PALETTE.borderStrong,
        textAlign: align,
      },
      h2: {
        fontSize: 12,
        fontWeight: 700,
        color: PALETTE.ink,
        marginTop: 12,
        marginBottom: 5,
        textAlign: align,
      },
      p: {
        fontSize: 10,
        marginBottom: 6,
        textAlign: align,
        color: PALETTE.ink,
      },
      strongInline: {
        fontWeight: 700,
      },
      bullet: {
        fontSize: 10,
        marginBottom: 3,
        textAlign: align,
        color: PALETTE.ink,
        paddingLeft: isAr ? 0 : 12,
        paddingRight: isAr ? 12 : 0,
      },
      numBullet: {
        fontSize: 10,
        marginBottom: 4,
        textAlign: align,
        color: PALETTE.ink,
      },
      note: {
        fontSize: 9,
        marginTop: 4,
        marginBottom: 8,
        textAlign: align,
        color: PALETTE.ink2,
      },
      code: {
        fontSize: 8.5,
        marginTop: 4,
        marginBottom: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: PALETTE.border,
        borderRadius: 4,
        backgroundColor: PALETTE.soft,
        fontFamily: FF_EN,
        color: PALETTE.ink,
      },
      callout: {
        marginTop: 6,
        marginBottom: 10,
        padding: 10,
        borderLeftWidth: isAr ? 0 : 3,
        borderRightWidth: isAr ? 3 : 0,
        borderLeftColor: PALETTE.council,
        borderRightColor: PALETTE.council,
        borderTopWidth: 1,
        borderTopColor: PALETTE.border,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.border,
        backgroundColor: PALETTE.softer,
      },
      calloutTitle: {
        fontSize: 9,
        letterSpacing: 1.1,
        textTransform: "uppercase",
        color: PALETTE.council,
        marginBottom: 4,
        fontWeight: 700,
        textAlign: align,
      },
      calloutBody: {
        fontSize: 10,
        color: PALETTE.ink,
        textAlign: align,
      },
      tocRow: {
        flexDirection: isAr ? "row-reverse" : "row",
        marginBottom: 4,
      },
      tocNumber: {
        width: 24,
        fontSize: 10,
        color: PALETTE.ink3,
        textAlign: align,
      },
      tocTitle: {
        flex: 1,
        fontSize: 10.5,
        color: PALETTE.ink,
        textAlign: align,
      },

      table: {
        marginTop: 6,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: PALETTE.border,
        borderRadius: 4,
      },
      tableHeader: {
        flexDirection: isAr ? "row-reverse" : "row",
        backgroundColor: PALETTE.soft,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.border,
      },
      tableRow: {
        flexDirection: isAr ? "row-reverse" : "row",
        borderBottomWidth: 0.5,
        borderBottomColor: PALETTE.border,
      },
      tableRowLast: {
        flexDirection: isAr ? "row-reverse" : "row",
      },
      th: {
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 8,
        fontSize: 9,
        letterSpacing: 0.8,
        textTransform: "uppercase",
        color: PALETTE.ink3,
        fontWeight: 700,
        textAlign: align,
      },
      td: {
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 8,
        fontSize: 9.5,
        color: PALETTE.ink,
        textAlign: align,
      },
      tdMono: {
        fontFamily: FF_EN,
      },

      footer: {
        position: "absolute",
        bottom: 24,
        left: 52,
        right: 52,
        flexDirection: isAr ? "row-reverse" : "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: PALETTE.border,
        fontSize: 8,
        color: PALETTE.ink3,
      },
    }),
    align,
    ff,
    isAr,
  };
}

export type DocumentMeta = {
  docTitleEn: string;
  docTitleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  version: string;
  issueDate: string;
  councilEn: string;
  councilAr: string;
  taglineEn: string;
  taglineAr: string;
  audienceEn: string;
  audienceAr: string;
};

export type BrandingLike = {
  nameEn: string;
  nameAr: string;
  taglineEn?: string;
  taglineAr?: string;
};

/**
 * Builds the shared meta fields (council name, tagline, version, date) from
 * the active branding so every doc-PDF header inherits the current customer's
 * identity. Callers layer their doc-specific title/subtitle/audience on top.
 */
export function buildDefaultMeta(
  branding: BrandingLike,
): Omit<
  DocumentMeta,
  | "docTitleEn"
  | "docTitleAr"
  | "subtitleEn"
  | "subtitleAr"
  | "audienceEn"
  | "audienceAr"
> {
  return {
    version: "1.0",
    issueDate: new Date().toISOString().slice(0, 10),
    councilEn: branding.nameEn,
    councilAr: branding.nameAr,
    taglineEn:
      branding.taglineEn ?? "Posture & Maturity Dashboard",
    taglineAr: branding.taglineAr ?? "لوحة الوضع الأمني والنضج",
  };
}

type DocPageProps = {
  lang: DocLang;
  meta: DocumentMeta;
  children: React.ReactNode;
};

export function Chrome({ lang, meta, children }: DocPageProps) {
  const { s } = buildDocStyles(lang);
  // Use the branding-aware labels so the "Confidential · <org>" footer
  // always reflects the current customer name.
  const labels = buildLabels(lang, { nameEn: meta.councilEn, nameAr: meta.councilAr });
  const emblem = getEmblemDataUri();
  const isAr = lang === "ar";
  return (
    <>
      <View style={s.topStripe} fixed />
      <View style={s.topAccent} fixed />
      <View style={s.header} fixed>
        {emblem ? <Image src={emblem} style={s.emblem} /> : null}
        <View style={s.headerLockup}>
          <Text style={s.headerCouncil}>{isAr ? meta.councilAr : meta.councilEn}</Text>
          <Text style={s.headerTagline}>
            {isAr ? meta.docTitleAr : meta.docTitleEn} · v{meta.version}
          </Text>
        </View>
      </View>
      {children}
      <View style={s.footer} fixed>
        <Text>{labels.confidential}</Text>
        <Text
          render={({ pageNumber, totalPages }) =>
            labels.page(pageNumber, totalPages)
          }
        />
      </View>
    </>
  );
}

type Section = { titleEn: string; titleAr: string };

export function Cover({
  lang,
  meta,
  sections,
}: {
  lang: DocLang;
  meta: DocumentMeta;
  sections: Section[];
}) {
  const { s } = buildDocStyles(lang);
  const labels = buildLabels(lang, { nameEn: meta.councilEn, nameAr: meta.councilAr });
  const isAr = lang === "ar";
  const title = isAr ? meta.docTitleAr : meta.docTitleEn;
  const subtitle = isAr ? meta.subtitleAr : meta.subtitleEn;
  const audience = isAr ? meta.audienceAr : meta.audienceEn;
  return (
    <View style={s.coverInner}>
      <Text style={s.coverEyebrow}>
        {isAr ? meta.councilAr : meta.councilEn}
      </Text>
      <Text style={s.coverTitle}>{title}</Text>
      <Text style={s.coverSubtitle}>{subtitle}</Text>

      <View style={s.coverMetaRow}>
        <View style={s.coverMetaItem}>
          <Text style={s.coverMetaLabel}>{labels.version}</Text>
          <Text style={s.coverMetaValue}>{meta.version}</Text>
        </View>
        <View style={s.coverMetaItem}>
          <Text style={s.coverMetaLabel}>{labels.issued}</Text>
          <Text style={s.coverMetaValue}>{meta.issueDate}</Text>
        </View>
        <View style={s.coverMetaItem}>
          <Text style={s.coverMetaLabel}>
            {isAr ? "الجمهور المستهدف" : "Audience"}
          </Text>
          <Text style={s.coverMetaValue}>{audience}</Text>
        </View>
      </View>

      <Text style={[s.h1, { marginTop: 40 }]}>{labels.toc}</Text>
      {sections.map((sec, i) => (
        <View key={i} style={s.tocRow}>
          <Text style={s.tocNumber}>{toLocaleNum(i + 1, isAr)}.</Text>
          <Text style={s.tocTitle}>{isAr ? sec.titleAr : sec.titleEn}</Text>
        </View>
      ))}
    </View>
  );
}

function toLocaleNum(n: number, isAr: boolean): string {
  if (!isAr) return String(n);
  const AR = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(n).split("").map((ch) => (/[0-9]/.test(ch) ? AR[Number(ch)] : ch)).join("");
}

export function H1({ lang, children, num }: { lang: DocLang; children: React.ReactNode; num?: number }) {
  const { s, isAr } = buildDocStyles(lang);
  return (
    <Text style={s.h1}>
      {num !== undefined ? `${toLocaleNum(num, isAr)}. ` : ""}
      {sanitizeChildren(children)}
    </Text>
  );
}

export function H2({ lang, children }: { lang: DocLang; children: React.ReactNode }) {
  const { s } = buildDocStyles(lang);
  return <Text style={s.h2}>{sanitizeChildren(children)}</Text>;
}

export function P({ lang, children }: { lang: DocLang; children: React.ReactNode }) {
  const { s } = buildDocStyles(lang);
  return <Text style={s.p}>{sanitizeChildren(children)}</Text>;
}

export function Bullet({ lang, children }: { lang: DocLang; children: React.ReactNode }) {
  const { s, isAr } = buildDocStyles(lang);
  return (
    <Text style={s.bullet}>
      {isAr ? "— " : "• "}
      {sanitizeChildren(children)}
    </Text>
  );
}

export function NumBullet({
  lang,
  n,
  children,
}: {
  lang: DocLang;
  n: number;
  children: React.ReactNode;
}) {
  const { s, isAr } = buildDocStyles(lang);
  return (
    <Text style={s.numBullet}>
      <Text style={{ fontWeight: 700 }}>{toLocaleNum(n, isAr)}. </Text>
      {sanitizeChildren(children)}
    </Text>
  );
}

export function Code({ lang, children }: { lang: DocLang; children: string }) {
  const { s } = buildDocStyles(lang);
  return <Text style={s.code}>{sanitizeArabic(children)}</Text>;
}

export function Note({ lang, children }: { lang: DocLang; children: React.ReactNode }) {
  const { s } = buildDocStyles(lang);
  return <Text style={s.note}>{sanitizeChildren(children)}</Text>;
}

export function Callout({
  lang,
  title,
  children,
}: {
  lang: DocLang;
  title: string;
  children: React.ReactNode;
}) {
  const { s } = buildDocStyles(lang);
  return (
    <View style={s.callout}>
      <Text style={s.calloutTitle}>{sanitizeArabic(title)}</Text>
      <Text style={s.calloutBody}>{sanitizeChildren(children)}</Text>
    </View>
  );
}

export function SimpleTable({
  lang,
  headers,
  rows,
}: {
  lang: DocLang;
  headers: string[];
  rows: string[][];
}) {
  const { s } = buildDocStyles(lang);
  return (
    <View style={s.table}>
      <View style={s.tableHeader}>
        {headers.map((h, i) => (
          <Text key={i} style={s.th}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View
          key={ri}
          style={ri === rows.length - 1 ? s.tableRowLast : s.tableRow}
        >
          {r.map((cell, ci) => (
            <Text key={ci} style={s.td}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Shared <Document> wrapper used by every handoff doc. Renders a cover page
 * followed by body pages. Each doc supplies `sections` (for TOC) and `body`
 * as a render function that returns <Page> children.
 */
export function HandoffDocument({
  lang,
  meta,
  sections,
  Body,
}: {
  lang: DocLang;
  meta: DocumentMeta;
  sections: Section[];
  Body: () => React.ReactNode;
}) {
  const { s } = buildDocStyles(lang);
  const title = lang === "ar" ? meta.docTitleAr : meta.docTitleEn;
  return (
    <Document title={title} author={meta.councilEn}>
      <Page size="A4" style={s.page} wrap>
        <Chrome lang={lang} meta={meta}>
          <Cover lang={lang} meta={meta} sections={sections} />
        </Chrome>
      </Page>
      <Page size="A4" style={s.page} wrap>
        <Chrome lang={lang} meta={meta}>{Body()}</Chrome>
      </Page>
    </Document>
  );
}
