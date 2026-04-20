import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { ensureFontsRegistered } from "./fonts";
import type { PdfTemplate } from "@/lib/config/pdf-template";

ensureFontsRegistered();

function getEmblemDataUri(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readLogoDataUri } = require("@/lib/branding/logo-store") as {
    readLogoDataUri: () => string | null;
  };
  return readLogoDataUri();
}

export type OnboardingLetterProps = {
  /** Which language to render. Each call produces a monolingual PDF. */
  lang: "en" | "ar";
  entity: {
    id: string;
    nameEn: string;
    nameAr: string;
    tenantId: string;
    domain: string;
    ciso: string;
    cisoEmail: string;
    consentState: string;
  };
  council: {
    contactName?: string;
    contactEmail?: string;
    issueDate: string;
  };
  consentUrl: string | null;
  appId: string;
  dashboardUrl: string;
  template: PdfTemplate;
};

const PALETTE = {
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
};

const FF_EN = "Inter";
const FF_AR = "NotoKufiArabic";

type Labels = {
  issued: string;
  ref: string;
  preparedFor: string;
  tenantId: string;
  domain: string;
  ciso: string;
  contact: string;
  adminConsentUrl: string;
  signoffTitle: string;
  page: (n: number, total: number) => string;
};

const LABELS_EN: Labels = {
  issued: "ISSUED",
  ref: "REF",
  preparedFor: "PREPARED FOR",
  tenantId: "Tenant ID",
  domain: "Domain",
  ciso: "CISO",
  contact: "Contact",
  adminConsentUrl: "ADMIN CONSENT URL",
  signoffTitle: "5. Sign-off",
  page: (n, t) => `Page ${n} / ${t}`,
};

const LABELS_AR: Labels = {
  issued: "تاريخ الإصدار",
  ref: "مرجع",
  preparedFor: "مُعدّ إلى",
  tenantId: "معرّف المستأجر",
  domain: "النطاق",
  ciso: "مسؤول أمن المعلومات",
  contact: "جهة الاتصال",
  adminConsentUrl: "رابط موافقة المسؤول",
  signoffTitle: "٥. التوقيع والاعتماد",
  page: (n, t) => `صفحة ${n} / ${t}`,
};

function buildStyles(lang: "en" | "ar") {
  const isAr = lang === "ar";
  const align = isAr ? "right" : "left";
  const ff = isAr ? FF_AR : FF_EN;
  return {
    s: StyleSheet.create({
      page: {
        backgroundColor: "#FFFFFF",
        paddingTop: 60,
        paddingBottom: 72,
        paddingHorizontal: 48,
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
        paddingBottom: 12,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.borderStrong,
      },
      emblem: {
        width: 54,
        height: 54,
        marginLeft: isAr ? 14 : 0,
        marginRight: isAr ? 0 : 14,
      },
      headerLockup: { flex: 1 },
      headerCouncil: {
        fontSize: 13,
        fontWeight: 700,
        color: PALETTE.councilDark,
        textAlign: align,
      },
      headerTagline: {
        fontSize: 9,
        color: PALETTE.ink2,
        marginTop: 3,
        textAlign: align,
      },
      headerRight: {
        minWidth: 130,
        alignItems: isAr ? "flex-start" : "flex-end",
      },
      headerLabel: {
        fontSize: 8,
        letterSpacing: 1.2,
        color: PALETTE.ink3,
        textTransform: "uppercase",
      },
      headerValue: { fontSize: 10, color: PALETTE.ink, marginTop: 2, marginBottom: 4 },

      title: {
        fontSize: 16,
        color: PALETTE.ink,
        fontWeight: 700,
        textAlign: align,
        marginBottom: 4,
      },
      subtitle: {
        fontSize: 10.5,
        color: PALETTE.ink2,
        textAlign: align,
        marginBottom: 16,
      },

      entityBox: {
        borderWidth: 1,
        borderColor: PALETTE.border,
        borderLeftWidth: isAr ? 0 : 3,
        borderRightWidth: isAr ? 3 : 0,
        borderLeftColor: PALETTE.council,
        borderRightColor: PALETTE.council,
        borderRadius: 4,
        backgroundColor: PALETTE.softer,
        padding: 12,
        marginBottom: 16,
      },
      entityEyebrow: {
        fontSize: 8,
        letterSpacing: 1.2,
        color: PALETTE.ink3,
        textTransform: "uppercase",
        marginBottom: 4,
        textAlign: align,
      },
      entityName: {
        fontSize: 14,
        fontWeight: 700,
        color: PALETTE.ink,
        textAlign: align,
        marginBottom: 10,
      },
      kvRow: {
        flexDirection: isAr ? "row-reverse" : "row",
        marginBottom: 3,
      },
      kvLabel: { width: 110, color: PALETTE.ink3, fontSize: 9.5, textAlign: align },
      kvValue: { flex: 1, color: PALETTE.ink, fontSize: 10, textAlign: align },
      // Pure-Latin identifiers (tenant GUID, domain, email). Explicit Latin font avoids bidi
      // crashes when Latin data is embedded in an Arabic-styled layout.
      ltrValue: {
        flex: 1,
        color: PALETTE.ink,
        fontSize: 10,
        textAlign: align,
        fontFamily: FF_EN,
      },

      sectionTitle: {
        fontSize: 12,
        fontWeight: 700,
        color: PALETTE.council,
        marginTop: 16,
        marginBottom: 6,
        paddingBottom: 5,
        borderBottomWidth: 0.75,
        borderBottomColor: PALETTE.borderStrong,
        textAlign: align,
      },

      p: { fontSize: 10, marginBottom: 6, textAlign: align, color: PALETTE.ink },
      strongInline: {
        fontSize: 10,
        marginTop: 4,
        marginBottom: 4,
        textAlign: align,
        color: PALETTE.ink,
        fontWeight: 700,
      },
      bullet: { fontSize: 10, marginBottom: 3, textAlign: align, color: PALETTE.ink },
      note: {
        fontSize: 9.5,
        marginTop: 4,
        marginBottom: 4,
        textAlign: align,
        color: PALETTE.ink2,
      },

      linkBox: {
        marginTop: 6,
        marginBottom: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: PALETTE.borderStrong,
        borderRadius: 4,
        backgroundColor: PALETTE.soft,
      },
      linkLabel: {
        fontSize: 8,
        letterSpacing: 1,
        color: PALETTE.ink3,
        textTransform: "uppercase",
        textAlign: align,
        marginBottom: 4,
      },
      linkText: { color: PALETTE.council, fontWeight: 700, fontSize: 9.5 },

      sigBox: {
        marginTop: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: PALETTE.border,
        borderRadius: 4,
      },
      sigRow: { flexDirection: "row", marginTop: 4 },
      sigCell: { flex: 1, paddingHorizontal: 6, paddingTop: 6 },
      sigLine: {
        borderBottomWidth: 0.5,
        borderBottomColor: PALETTE.ink2,
        marginTop: 22,
        marginBottom: 4,
      },
      sigSub: { fontSize: 8, color: PALETTE.ink3, textAlign: align },
      sigRole: {
        fontSize: 9.5,
        fontWeight: 700,
        color: PALETTE.ink,
        textAlign: align,
        marginBottom: 4,
      },

      footer: {
        position: "absolute",
        bottom: 28,
        left: 48,
        right: 48,
        flexDirection: isAr ? "row-reverse" : "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 8,
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

export function OnboardingLetter(props: OnboardingLetterProps) {
  const { lang, entity, council, consentUrl, template } = props;
  const emblem = getEmblemDataUri();
  const labels = lang === "ar" ? LABELS_AR : LABELS_EN;
  const { s, isAr } = buildStyles(lang);

  // Pick language-appropriate strings from the bilingual template.
  const tplTitle = isAr ? template.titleAr : template.titleEn;
  const tplSubtitle = isAr ? template.subtitleAr : template.subtitleEn;
  const tplCouncil = isAr ? template.councilAr : template.councilEn;
  const tplTagline = isAr ? template.taglineAr : template.taglineEn;
  const tplFooter = isAr ? template.footerAr : template.footerEn;
  const entityName = isAr ? entity.nameAr : entity.nameEn;
  const contactName = council.contactName ?? template.contactName;
  const contactEmail = council.contactEmail ?? template.contactEmail;

  return (
    <Document
      title={`${tplTitle} — ${entity.nameEn}`}
      author={template.councilEn}
      subject="Entity onboarding for Posture Dashboard"
    >
      <Page size="A4" style={s.page} wrap>
        <View style={s.topStripe} fixed />
        <View style={s.topAccent} fixed />

        {/* Header */}
        <View style={s.header}>
          {emblem ? <Image src={emblem} style={s.emblem} /> : null}
          <View style={s.headerLockup}>
            <Text style={s.headerCouncil}>{tplCouncil}</Text>
            <Text style={s.headerTagline}>{tplTagline}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerLabel}>{labels.issued}</Text>
            <Text style={s.headerValue}>{council.issueDate}</Text>
            <Text style={s.headerLabel}>{labels.ref}</Text>
            <Text style={[s.headerValue, { fontSize: 8, color: PALETTE.ink2 }]}>
              {entity.consentState || "—"}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={s.title}>{tplTitle}</Text>
        <Text style={s.subtitle}>{tplSubtitle}</Text>

        {/* Entity identity */}
        <View style={s.entityBox}>
          <Text style={s.entityEyebrow}>{labels.preparedFor}</Text>
          <Text style={s.entityName}>{entityName}</Text>
          <View style={s.kvRow}>
            <Text style={s.kvLabel}>{labels.tenantId}</Text>
            <Text style={s.ltrValue}>{entity.tenantId}</Text>
          </View>
          <View style={s.kvRow}>
            <Text style={s.kvLabel}>{labels.domain}</Text>
            <Text style={s.ltrValue}>{entity.domain}</Text>
          </View>
          {entity.ciso ? (
            <View style={s.kvRow}>
              <Text style={s.kvLabel}>{labels.ciso}</Text>
              <Text style={s.kvValue}>{entity.ciso}</Text>
            </View>
          ) : null}
          {entity.cisoEmail ? (
            <View style={s.kvRow}>
              <Text style={s.kvLabel}>{labels.contact}</Text>
              <Text style={s.ltrValue}>{entity.cisoEmail}</Text>
            </View>
          ) : null}
        </View>

        {/* Sections */}
        {template.sections.map((sec, i) => {
          const title = isAr ? sec.titleAr : sec.titleEn;
          const body = isAr ? sec.ar : sec.en;
          const bulletsTitle = isAr ? sec.bulletsTitleAr : sec.bulletsTitleEn;
          const note = isAr ? sec.noteAr : sec.noteEn;
          return (
            <View key={i} wrap={false}>
              <Text style={s.sectionTitle}>{title}</Text>
              <Text style={s.p}>{body}</Text>

              {bulletsTitle ? <Text style={s.strongInline}>{bulletsTitle}</Text> : null}
              {sec.bullets
                ? sec.bullets.map((b, bi) => (
                    <Text key={bi} style={s.bullet}>
                      • {isAr ? b.ar : b.en}
                    </Text>
                  ))
                : null}

              {i === 1 ? (
                <View style={s.linkBox}>
                  <Text style={s.linkLabel}>{labels.adminConsentUrl}</Text>
                  {consentUrl ? (
                    <Link src={consentUrl} style={[s.linkText, { fontFamily: FF_EN }]}>
                      {consentUrl}
                    </Link>
                  ) : (
                    <Text style={{ color: PALETTE.ink3 }}>—</Text>
                  )}
                </View>
              ) : null}

              {i === 2 ? (
                <>
                  <View style={s.kvRow}>
                    <Text style={s.kvLabel}>{labels.contact}</Text>
                    <Text style={s.kvValue}>{contactName}</Text>
                  </View>
                  <View style={s.kvRow}>
                    <Text style={s.kvLabel}> </Text>
                    <Text style={s.ltrValue}>{contactEmail}</Text>
                  </View>
                </>
              ) : null}

              {note ? <Text style={s.note}>{note}</Text> : null}
            </View>
          );
        })}

        {/* Sign-off */}
        <Text style={s.sectionTitle}>{labels.signoffTitle}</Text>
        <View style={s.sigBox}>
          <View style={s.sigRow}>
            {template.sigRoles.map((roles, i) => (
              <View key={i} style={s.sigCell}>
                <Text style={s.sigRole}>{isAr ? roles[1] : roles[0]}</Text>
                <Text style={s.sigSub}>
                  {isAr ? "الاسم والتوقيع" : "Name & Signature"}
                </Text>
                <View style={s.sigLine} />
                <Text style={s.sigSub}>{isAr ? "التاريخ" : "Date"}</Text>
                <View style={s.sigLine} />
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>{tplFooter}</Text>
          <Text
            render={({ pageNumber, totalPages }) => labels.page(pageNumber, totalPages)}
          />
        </View>
      </Page>
    </Document>
  );
}
