import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { ensureFontsRegistered } from "./fonts";
import type { DiscoveryTemplate } from "@/lib/config/discovery-template";

ensureFontsRegistered();

function getEmblemDataUri(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readLogoDataUri } = require("@/lib/branding/logo-store") as {
    readLogoDataUri: () => string | null;
  };
  return readLogoDataUri();
}

export type DiscoveryLetterProps = {
  lang: "en" | "ar";
  template: DiscoveryTemplate;
  issueDate: string;
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
  stage: string;
  whyTitle: string;
  stepsTitle: string;
  sendBackTitle: string;
  nextTitle: string;
  whatLabel: string;
  whereLabel: string;
  contact: string;
  email: string;
  phone: string;
  page: (n: number, t: number) => string;
};

const LABELS_EN: Labels = {
  issued: "ISSUED",
  stage: "STAGE 1 OF 2",
  whyTitle: "Why you're reading this",
  stepsTitle: "Please send us the following",
  sendBackTitle: "How to send the information back",
  nextTitle: "What happens next",
  whatLabel: "WHAT",
  whereLabel: "WHERE TO FIND IT",
  contact: "CONTACT",
  email: "EMAIL",
  phone: "PHONE",
  page: (n, t) => `Page ${n} / ${t}`,
};

const LABELS_AR: Labels = {
  issued: "تاريخ الإصدار",
  stage: "المرحلة ١ من ٢",
  whyTitle: "سبب وصول هذه الرسالة إليكم",
  stepsTitle: "نرجو إرسال المعلومات التالية",
  sendBackTitle: "كيفية إرسال المعلومات",
  nextTitle: "الخطوات التالية",
  whatLabel: "المطلوب",
  whereLabel: "أين تجدها",
  contact: "جهة الاتصال",
  email: "البريد",
  phone: "الهاتف",
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
      stageChip: {
        fontSize: 8,
        color: PALETTE.accent,
        borderColor: PALETTE.accent,
        borderWidth: 1,
        borderRadius: 3,
        paddingHorizontal: 5,
        paddingVertical: 1,
        letterSpacing: 1,
        marginTop: 4,
      },
      title: {
        fontSize: 16,
        fontWeight: 700,
        color: PALETTE.ink,
        textAlign: align,
        marginBottom: 4,
      },
      subtitle: {
        fontSize: 10.5,
        color: PALETTE.ink2,
        textAlign: align,
        marginBottom: 16,
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
      p: { fontSize: 10, marginBottom: 8, textAlign: align, color: PALETTE.ink },
      stepBox: {
        borderWidth: 1,
        borderColor: PALETTE.border,
        borderLeftWidth: isAr ? 0 : 3,
        borderRightWidth: isAr ? 3 : 0,
        borderLeftColor: PALETTE.council,
        borderRightColor: PALETTE.council,
        borderRadius: 4,
        backgroundColor: PALETTE.softer,
        padding: 12,
        marginBottom: 10,
      },
      stepTitle: {
        fontSize: 11.5,
        fontWeight: 700,
        color: PALETTE.ink,
        textAlign: align,
        marginBottom: 6,
      },
      stepEyebrow: {
        fontSize: 8,
        letterSpacing: 1,
        color: PALETTE.ink3,
        textTransform: "uppercase",
        textAlign: align,
        marginTop: 6,
        marginBottom: 2,
      },
      stepBody: {
        fontSize: 10,
        color: PALETTE.ink,
        textAlign: align,
        marginBottom: 2,
      },
      pathBody: {
        fontSize: 9.5,
        color: PALETTE.ink2,
        textAlign: align,
      },
      // Forces Latin font on short Latin-only snippets when embedded inside an Arabic layout
      // (e.g. "portal.azure.com") — avoids bidi shaper crashes on mixed-script runs.
      ltrBody: {
        fontSize: 9.5,
        color: PALETTE.ink2,
        textAlign: align,
        fontFamily: FF_EN,
      },
      contactBox: {
        marginTop: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: PALETTE.borderStrong,
        borderRadius: 4,
        backgroundColor: PALETTE.soft,
        flexDirection: isAr ? "row-reverse" : "row",
        gap: 12,
      },
      contactCell: { flex: 1 },
      contactLabel: {
        fontSize: 8,
        letterSpacing: 1,
        color: PALETTE.ink3,
        textTransform: "uppercase",
        textAlign: align,
        marginBottom: 2,
      },
      contactValue: {
        fontSize: 10,
        color: PALETTE.ink,
        textAlign: align,
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
    isAr,
  };
}

export function DiscoveryLetter({ lang, template, issueDate }: DiscoveryLetterProps) {
  const emblem = getEmblemDataUri();
  const labels = lang === "ar" ? LABELS_AR : LABELS_EN;
  const { s, isAr } = buildStyles(lang);

  const tplTitle = isAr ? template.titleAr : template.titleEn;
  const tplSubtitle = isAr ? template.subtitleAr : template.subtitleEn;
  const tplCouncil = isAr ? template.councilAr : template.councilEn;
  const tplTagline = isAr ? template.taglineAr : template.taglineEn;
  const tplOverview = isAr ? template.overviewAr : template.overviewEn;
  const tplSendBack = isAr ? template.sendBackAr : template.sendBackEn;
  const tplNext = isAr ? template.nextAr : template.nextEn;
  const tplFooter = isAr ? template.footerAr : template.footerEn;

  return (
    <Document
      title={`Onboarding request — ${template.councilEn}`}
      author={template.councilEn}
      subject="Pre-onboarding checklist for Posture Dashboard"
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
            <Text style={s.headerValue}>{issueDate}</Text>
            <Text style={s.stageChip}>{labels.stage}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={s.title}>{tplTitle}</Text>
        <Text style={s.subtitle}>{tplSubtitle}</Text>

        {/* Overview */}
        <Text style={s.sectionTitle}>{labels.whyTitle}</Text>
        <Text style={s.p}>{tplOverview}</Text>

        {/* Steps */}
        <Text style={s.sectionTitle}>{labels.stepsTitle}</Text>
        {template.steps.map((step, i) => (
          <View key={i} style={s.stepBox} wrap={false}>
            <Text style={s.stepTitle}>{isAr ? step.titleAr : step.titleEn}</Text>
            <Text style={s.stepEyebrow}>{labels.whatLabel}</Text>
            <Text style={s.stepBody}>{isAr ? step.whatAr : step.whatEn}</Text>
            <Text style={s.stepEyebrow}>{labels.whereLabel}</Text>
            <Text style={s.pathBody}>{isAr ? step.whereAr : step.whereEn}</Text>
          </View>
        ))}

        {/* Send back */}
        <Text style={s.sectionTitle}>{labels.sendBackTitle}</Text>
        <Text style={s.p}>{tplSendBack}</Text>
        <View style={s.contactBox}>
          <View style={s.contactCell}>
            <Text style={s.contactLabel}>{labels.contact}</Text>
            <Text style={s.contactValue}>{template.contactName}</Text>
          </View>
          <View style={s.contactCell}>
            <Text style={s.contactLabel}>{labels.email}</Text>
            <Text style={s.contactValue}>{template.contactEmail}</Text>
          </View>
          {template.contactPhone ? (
            <View style={s.contactCell}>
              <Text style={s.contactLabel}>{labels.phone}</Text>
              <Text style={s.contactValue}>{template.contactPhone}</Text>
            </View>
          ) : null}
        </View>

        {/* Next */}
        <Text style={s.sectionTitle}>{labels.nextTitle}</Text>
        <Text style={s.p}>{tplNext}</Text>

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
