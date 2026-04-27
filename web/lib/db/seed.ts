import "server-only";
import crypto from "node:crypto";
import type Database from "better-sqlite3";

/**
 * Demo seed — 12 representative Sharjah government entities with realistic but fabricated
 * posture signals. Inserted when the DB is empty and `SCSC_SEED_DEMO` is not explicitly "false".
 *
 * Demo tenants are flagged `is_demo = 1` so the sync orchestrator skips them (their tenant GUIDs
 * are fake; any real Graph call would fail). Their numbers come from pre-baked signal_snapshots
 * so the UI renders a populated dashboard out-of-the-box for demos.
 */

type DemoEntity = {
  id: string;
  tenant_id: string;
  name_en: string;
  name_ar: string;
  cluster: string;
  domain: string;
  ciso: string;
  ciso_email: string;
  // Pre-baked values used to synthesize signal snapshots below.
  index: number;
  openIncidents: number;
  riskyUsers: number;
  deviceCompliancePct: number;
  controlsPassingPct: number;
  syncMinsAgo: number;
  connectionHealth: "green" | "amber" | "red";
};

const DEMO: DemoEntity[] = [
  {
    id: "shj-police-ghq",
    tenant_id: "a1c7e4b0-0001-4a10-9b12-0e2fa49c0001",
    name_en: "Sharjah Police General HQ",
    name_ar: "القيادة العامة لشرطة الشارقة",
    cluster: "police",
    domain: "shjpolice.gov.ae",
    ciso: "Maj. Khalid Al Suwaidi",
    ciso_email: "ciso@shjpolice.gov.ae",
    index: 87,
    openIncidents: 3,
    riskyUsers: 4,
    deviceCompliancePct: 97,
    controlsPassingPct: 92,
    syncMinsAgo: 4,
    connectionHealth: "green",
  },
  {
    id: "shj-traffic-licensing",
    tenant_id: "a1c7e4b0-0002-4a10-9b12-0e2fa49c0002",
    name_en: "Traffic & Licensing Department",
    name_ar: "إدارة المرور والترخيص",
    cluster: "police",
    domain: "traffic.shjpolice.gov.ae",
    ciso: "Capt. Noura Al Mahri",
    ciso_email: "security@traffic.shjpolice.gov.ae",
    index: 78,
    openIncidents: 6,
    riskyUsers: 9,
    deviceCompliancePct: 88,
    controlsPassingPct: 84,
    syncMinsAgo: 11,
    connectionHealth: "green",
  },
  {
    id: "shj-health-authority",
    tenant_id: "a1c7e4b0-0003-4a10-9b12-0e2fa49c0003",
    name_en: "Sharjah Health Authority",
    name_ar: "هيئة الشارقة الصحية",
    cluster: "health",
    domain: "sha.gov.ae",
    ciso: "Dr. Fatma Al Zaabi",
    ciso_email: "ciso@sha.gov.ae",
    index: 76,
    openIncidents: 11,
    riskyUsers: 18,
    deviceCompliancePct: 79,
    controlsPassingPct: 82,
    syncMinsAgo: 7,
    connectionHealth: "green",
  },
  {
    id: "uhs",
    tenant_id: "a1c7e4b0-0004-4a10-9b12-0e2fa49c0004",
    name_en: "University Hospital Sharjah",
    name_ar: "مستشفى جامعة الشارقة",
    cluster: "health",
    domain: "uhs.ae",
    ciso: "Eng. Omar Al Khoury",
    ciso_email: "it.security@uhs.ae",
    index: 72,
    openIncidents: 8,
    riskyUsers: 14,
    deviceCompliancePct: 76,
    controlsPassingPct: 78,
    syncMinsAgo: 47,
    connectionHealth: "amber",
  },
  {
    id: "shj-edu-council",
    tenant_id: "a1c7e4b0-0005-4a10-9b12-0e2fa49c0005",
    name_en: "Sharjah Education Council",
    name_ar: "مجلس الشارقة للتعليم",
    cluster: "edu",
    domain: "spea.shj.ae",
    ciso: "Dr. Ahmed Al Hashmi",
    ciso_email: "ciso@spea.shj.ae",
    index: 66,
    openIncidents: 14,
    riskyUsers: 27,
    deviceCompliancePct: 64,
    controlsPassingPct: 71,
    syncMinsAgo: 22,
    connectionHealth: "amber",
  },
  {
    id: "aus",
    tenant_id: "a1c7e4b0-0006-4a10-9b12-0e2fa49c0006",
    name_en: "American University of Sharjah",
    name_ar: "الجامعة الأمريكية بالشارقة",
    cluster: "edu",
    domain: "aus.edu",
    ciso: "Prof. Laila Othman",
    ciso_email: "infosec@aus.edu",
    index: 72,
    openIncidents: 5,
    riskyUsers: 21,
    deviceCompliancePct: 83,
    controlsPassingPct: 80,
    syncMinsAgo: 6,
    connectionHealth: "green",
  },
  {
    id: "shj-city-municipality",
    tenant_id: "a1c7e4b0-0007-4a10-9b12-0e2fa49c0007",
    name_en: "Sharjah City Municipality",
    name_ar: "بلدية مدينة الشارقة",
    cluster: "municipality",
    domain: "shjmun.gov.ae",
    ciso: "Eng. Saleh Al Ketbi",
    ciso_email: "security@shjmun.gov.ae",
    index: 73,
    openIncidents: 9,
    riskyUsers: 16,
    deviceCompliancePct: 81,
    controlsPassingPct: 79,
    syncMinsAgo: 9,
    connectionHealth: "green",
  },
  {
    id: "shj-central-municipality",
    tenant_id: "a1c7e4b0-0008-4a10-9b12-0e2fa49c0008",
    name_en: "Central Region Municipality",
    name_ar: "بلدية المنطقة الوسطى",
    cluster: "municipality",
    domain: "crm.shj.gov.ae",
    ciso: "Mr. Rashid Al Naqbi",
    ciso_email: "it@crm.shj.gov.ae",
    index: 68,
    openIncidents: 7,
    riskyUsers: 19,
    deviceCompliancePct: 70,
    controlsPassingPct: 72,
    syncMinsAgo: 61,
    connectionHealth: "amber",
  },
  {
    id: "sewa",
    tenant_id: "a1c7e4b0-0009-4a10-9b12-0e2fa49c0009",
    name_en: "Sharjah Electricity, Water & Gas Authority",
    name_ar: "هيئة كهرباء ومياه وغاز الشارقة",
    cluster: "utilities",
    domain: "sewa.gov.ae",
    ciso: "Eng. Hamda Al Serkal",
    ciso_email: "ciso@sewa.gov.ae",
    index: 82,
    openIncidents: 4,
    riskyUsers: 8,
    deviceCompliancePct: 93,
    controlsPassingPct: 89,
    syncMinsAgo: 3,
    connectionHealth: "green",
  },
  {
    id: "beeah",
    tenant_id: "a1c7e4b0-0010-4a10-9b12-0e2fa49c0010",
    name_en: "Bee'ah",
    name_ar: "بيئة",
    cluster: "utilities",
    domain: "beeah.ae",
    ciso: "Mr. Yousef Al Tamimi",
    ciso_email: "cyber@beeah.ae",
    index: 76,
    openIncidents: 6,
    riskyUsers: 11,
    deviceCompliancePct: 87,
    controlsPassingPct: 84,
    syncMinsAgo: 13,
    connectionHealth: "green",
  },
  {
    id: "srta",
    tenant_id: "a1c7e4b0-0011-4a10-9b12-0e2fa49c0011",
    name_en: "Sharjah Roads & Transport Authority",
    name_ar: "هيئة الطرق والمواصلات بالشارقة",
    cluster: "transport",
    domain: "srta.shj.ae",
    ciso: "Eng. Mariam Al Mulla",
    ciso_email: "security@srta.shj.ae",
    index: 61,
    openIncidents: 13,
    riskyUsers: 31,
    deviceCompliancePct: 58,
    controlsPassingPct: 66,
    syncMinsAgo: 182,
    connectionHealth: "red",
  },
  {
    id: "shj-airport",
    tenant_id: "a1c7e4b0-0012-4a10-9b12-0e2fa49c0012",
    name_en: "Sharjah Airport Authority",
    name_ar: "هيئة مطار الشارقة",
    cluster: "transport",
    domain: "sharjahairport.ae",
    ciso: "Capt. Ibrahim Al Marri",
    ciso_email: "soc@sharjahairport.ae",
    index: 68,
    openIncidents: 10,
    riskyUsers: 17,
    deviceCompliancePct: 79,
    controlsPassingPct: 74,
    syncMinsAgo: 18,
    connectionHealth: "green",
  },
];

/**
 * DESC (Dubai Electronic Security Center) demo entities — 14 Dubai Government
 * bodies the regulator would oversee. Tenant GUIDs are synthesized and flagged
 * is_demo = 1 so the sync orchestrator never tries to reach them.
 *
 * Deliberately spread across clusters to match the DESC scope, with 3 high
 * performers, ~8 near target, 3 below — so the dashboard shows a realistic
 * regulator view on first load.
 */
const DESC_DEMO: DemoEntity[] = [
  {
    id: "dubai-police",
    tenant_id: "b2d8f5c1-1001-4b20-9c23-1f3gb5ad1001",
    name_en: "Dubai Police",
    name_ar: "شرطة دبي",
    cluster: "police",
    domain: "dubaipolice.gov.ae",
    ciso: "Maj. Gen. Abdullah Al Marri",
    ciso_email: "ciso@dubaipolice.gov.ae",
    index: 89,
    openIncidents: 4,
    riskyUsers: 6,
    deviceCompliancePct: 96,
    controlsPassingPct: 93,
    syncMinsAgo: 3,
    connectionHealth: "green",
  },
  {
    id: "dubai-civil-defence",
    tenant_id: "b2d8f5c1-1002-4b20-9c23-1f3gb5ad1002",
    name_en: "General Directorate of Civil Defence",
    name_ar: "الإدارة العامة للدفاع المدني بدبي",
    cluster: "police",
    domain: "dcd.gov.ae",
    ciso: "Brig. Ali Hassan Al Mutawa",
    ciso_email: "security@dcd.gov.ae",
    index: 82,
    openIncidents: 5,
    riskyUsers: 8,
    deviceCompliancePct: 91,
    controlsPassingPct: 86,
    syncMinsAgo: 7,
    connectionHealth: "green",
  },
  {
    id: "dha",
    tenant_id: "b2d8f5c1-1003-4b20-9c23-1f3gb5ad1003",
    name_en: "Dubai Health Authority",
    name_ar: "هيئة الصحة بدبي",
    cluster: "health",
    domain: "dha.gov.ae",
    ciso: "Dr. Mariam Al Jalahma",
    ciso_email: "ciso@dha.gov.ae",
    index: 78,
    openIncidents: 9,
    riskyUsers: 15,
    deviceCompliancePct: 84,
    controlsPassingPct: 81,
    syncMinsAgo: 12,
    connectionHealth: "green",
  },
  {
    id: "mbru",
    tenant_id: "b2d8f5c1-1004-4b20-9c23-1f3gb5ad1004",
    name_en: "Mohammed Bin Rashid University of Medicine",
    name_ar: "جامعة محمد بن راشد للطب والعلوم الصحية",
    cluster: "health",
    domain: "mbru.ac.ae",
    ciso: "Prof. Samir Banerjee",
    ciso_email: "security@mbru.ac.ae",
    index: 72,
    openIncidents: 7,
    riskyUsers: 11,
    deviceCompliancePct: 82,
    controlsPassingPct: 77,
    syncMinsAgo: 19,
    connectionHealth: "green",
  },
  {
    id: "khda",
    tenant_id: "b2d8f5c1-1005-4b20-9c23-1f3gb5ad1005",
    name_en: "Knowledge and Human Development Authority",
    name_ar: "هيئة المعرفة والتنمية البشرية",
    cluster: "education",
    domain: "khda.gov.ae",
    ciso: "Dr. Abdulla Al Karam",
    ciso_email: "ciso@khda.gov.ae",
    index: 75,
    openIncidents: 6,
    riskyUsers: 9,
    deviceCompliancePct: 85,
    controlsPassingPct: 79,
    syncMinsAgo: 15,
    connectionHealth: "green",
  },
  {
    id: "dubai-municipality",
    tenant_id: "b2d8f5c1-1006-4b20-9c23-1f3gb5ad1006",
    name_en: "Dubai Municipality",
    name_ar: "بلدية دبي",
    cluster: "municipality",
    domain: "dm.gov.ae",
    ciso: "Eng. Dawoud Al Hajri",
    ciso_email: "ciso@dm.gov.ae",
    index: 71,
    openIncidents: 11,
    riskyUsers: 16,
    deviceCompliancePct: 80,
    controlsPassingPct: 74,
    syncMinsAgo: 21,
    connectionHealth: "green",
  },
  {
    id: "dld",
    tenant_id: "b2d8f5c1-1007-4b20-9c23-1f3gb5ad1007",
    name_en: "Dubai Land Department",
    name_ar: "دائرة الأراضي والأملاك",
    cluster: "municipality",
    domain: "dubailand.gov.ae",
    ciso: "Mr. Marwan Ahmed Bin Ghalita",
    ciso_email: "security@dubailand.gov.ae",
    index: 74,
    openIncidents: 6,
    riskyUsers: 10,
    deviceCompliancePct: 86,
    controlsPassingPct: 78,
    syncMinsAgo: 13,
    connectionHealth: "green",
  },
  {
    id: "dewa",
    tenant_id: "b2d8f5c1-1008-4b20-9c23-1f3gb5ad1008",
    name_en: "Dubai Electricity and Water Authority",
    name_ar: "هيئة كهرباء ومياه دبي",
    cluster: "utilities",
    domain: "dewa.gov.ae",
    ciso: "Mr. Saeed Mohammed Al Tayer",
    ciso_email: "ciso@dewa.gov.ae",
    index: 88,
    openIncidents: 3,
    riskyUsers: 5,
    deviceCompliancePct: 95,
    controlsPassingPct: 91,
    syncMinsAgo: 4,
    connectionHealth: "green",
  },
  {
    id: "rta",
    tenant_id: "b2d8f5c1-1009-4b20-9c23-1f3gb5ad1009",
    name_en: "Roads and Transport Authority",
    name_ar: "هيئة الطرق والمواصلات",
    cluster: "transport",
    domain: "rta.ae",
    ciso: "Eng. Mattar Al Tayer",
    ciso_email: "ciso@rta.ae",
    index: 84,
    openIncidents: 5,
    riskyUsers: 8,
    deviceCompliancePct: 92,
    controlsPassingPct: 87,
    syncMinsAgo: 6,
    connectionHealth: "green",
  },
  {
    id: "dubai-airports",
    tenant_id: "b2d8f5c1-1010-4b20-9c23-1f3gb5ad1010",
    name_en: "Dubai Airports",
    name_ar: "مطارات دبي",
    cluster: "transport",
    domain: "dubaiairports.ae",
    ciso: "Mr. Paul Griffiths",
    ciso_email: "security@dubaiairports.ae",
    index: 80,
    openIncidents: 6,
    riskyUsers: 9,
    deviceCompliancePct: 90,
    controlsPassingPct: 85,
    syncMinsAgo: 9,
    connectionHealth: "green",
  },
  {
    id: "dubai-customs",
    tenant_id: "b2d8f5c1-1011-4b20-9c23-1f3gb5ad1011",
    name_en: "Dubai Customs",
    name_ar: "جمارك دبي",
    cluster: "other",
    domain: "dubaicustoms.gov.ae",
    ciso: "Mr. Ahmed Mahboob Musabih",
    ciso_email: "ciso@dubaicustoms.gov.ae",
    index: 77,
    openIncidents: 7,
    riskyUsers: 12,
    deviceCompliancePct: 87,
    controlsPassingPct: 80,
    syncMinsAgo: 14,
    connectionHealth: "green",
  },
  {
    id: "dubai-courts",
    tenant_id: "b2d8f5c1-1012-4b20-9c23-1f3gb5ad1012",
    name_en: "Dubai Courts",
    name_ar: "محاكم دبي",
    cluster: "other",
    domain: "dc.gov.ae",
    ciso: "Judge Dr. Saif Ghanem Al Suwaidi",
    ciso_email: "security@dc.gov.ae",
    index: 68,
    openIncidents: 12,
    riskyUsers: 19,
    deviceCompliancePct: 78,
    controlsPassingPct: 71,
    syncMinsAgo: 27,
    connectionHealth: "amber",
  },
  {
    id: "dsc",
    tenant_id: "b2d8f5c1-1013-4b20-9c23-1f3gb5ad1013",
    name_en: "Dubai Statistics Center",
    name_ar: "مركز دبي للإحصاء",
    cluster: "other",
    domain: "dsc.gov.ae",
    ciso: "Mr. Arif Obaid Al Muhairi",
    ciso_email: "ciso@dsc.gov.ae",
    index: 66,
    openIncidents: 9,
    riskyUsers: 14,
    deviceCompliancePct: 76,
    controlsPassingPct: 69,
    syncMinsAgo: 32,
    connectionHealth: "amber",
  },
  {
    id: "dff",
    tenant_id: "b2d8f5c1-1014-4b20-9c23-1f3gb5ad1014",
    name_en: "Dubai Future Foundation",
    name_ar: "مؤسسة دبي للمستقبل",
    cluster: "other",
    domain: "dubaifuture.gov.ae",
    ciso: "Mr. Khalfan Belhoul",
    ciso_email: "security@dubaifuture.gov.ae",
    index: 64,
    openIncidents: 8,
    riskyUsers: 13,
    deviceCompliancePct: 74,
    controlsPassingPct: 68,
    syncMinsAgo: 22,
    connectionHealth: "green",
  },
];

/** Customer variant for the demo seed. Selected via `SCSC_SEED_CUSTOMER`. */
type SeedCustomer = "sharjah" | "desc";

function resolveSeedCustomer(): SeedCustomer {
  const raw = (process.env.SCSC_SEED_CUSTOMER ?? "sharjah").toLowerCase().trim();
  return raw === "desc" ? "desc" : "sharjah";
}

function entitiesForCustomer(c: SeedCustomer): DemoEntity[] {
  return c === "desc" ? DESC_DEMO : DEMO;
}

function brandingForCustomer(c: SeedCustomer) {
  if (c === "desc") {
    return {
      nameEn: "Dubai Electronic Security Center",
      nameAr: "مركز دبي للأمن الإلكتروني",
      shortEn: "DESC",
      shortAr: "مركز دبي",
      taglineEn: "Cybersecurity regulation and oversight across Dubai Government",
      taglineAr: "تنظيم الأمن السيبراني والإشراف عليه في حكومة دبي",
      // Dubai government red identity (close to the DESC shield red).
      accentColor: "#B8192F",
      accentColorStrong: "#D41F38",
      logoPath: null,
      logoBgRemoved: true,
      frameworkId: "dubai-isr",
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    nameEn: "Sharjah Cybersecurity Council",
    nameAr: "مجلس الأمن السيبراني - الشارقة",
    shortEn: "SCSC",
    shortAr: "المجلس",
    taglineEn: "Unified security oversight across Sharjah government entities",
    taglineAr: "إشراف أمني موحّد عبر جهات حكومة الشارقة",
    accentColor: "#0d6b63",
    accentColorStrong: "#0d9488",
    logoPath: null,
    logoBgRemoved: true,
    frameworkId: "nesa",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Stamps setup.completed=true so the first-run wizard stays out of the demo's
 * way. Idempotent — an operator who's already run the wizard won't be reset.
 */
function markSetupCompletedIfAbsent(db: Database.Database): void {
  const existing = db
    .prepare("SELECT 1 FROM app_config WHERE key = 'setup'")
    .get();
  if (existing) return;
  db.prepare("INSERT INTO app_config (key, value_json) VALUES ('setup', ?)").run(
    JSON.stringify({ completed: true, completedAt: new Date().toISOString() }),
  );
}

/**
 * Seeds the branding row with Sharjah Cybersecurity Council values, but only
 * if no branding config has been stored yet. Inlined here (rather than imported
 * from lib/config/branding.ts) to avoid a client<->seed<->branding<->config-store
 * require cycle.
 */
function seedDemoBrandingIfAbsent(
  db: Database.Database,
  customer: SeedCustomer,
): void {
  const existing = db
    .prepare("SELECT 1 FROM app_config WHERE key = 'branding'")
    .get() as { 1: number } | undefined;
  if (existing) return;
  db.prepare(
    "INSERT INTO app_config (key, value_json) VALUES ('branding', ?)",
  ).run(JSON.stringify(brandingForCustomer(customer)));
}

/**
 * Seed the deployment mode that matches each demo customer so the demo lands
 * with the right Directive surfaces lit (or dark). SCSC = observation. DESC =
 * directive. Idempotent: won't clobber a mode already set by /setup wizard.
 */
function seedDeploymentModeIfAbsent(
  db: Database.Database,
  customer: SeedCustomer,
): void {
  const existing = db
    .prepare("SELECT 1 FROM app_config WHERE key = 'deployment.mode'")
    .get() as { 1: number } | undefined;
  if (existing) return;
  const mode = customer === "desc" ? "directive" : "observation";
  db.prepare(
    "INSERT INTO app_config (key, value_json) VALUES ('deployment.mode', ?)",
  ).run(JSON.stringify({ mode, setAt: new Date().toISOString() }));
}

export function seedDemoTenantsIfEmpty(db: Database.Database): void {
  // Seeding is **off by default** so a clean customer install stays clean.
  // Set SCSC_SEED_DEMO=true in `.env.local` (dev / demo) to opt in.
  if ((process.env.SCSC_SEED_DEMO ?? "false").toLowerCase() !== "true") return;

  // Customer variant — `SCSC_SEED_CUSTOMER=sharjah` (default) or `desc`. Each
  // demo deployment (scscdemo vs descdemo) sets its own env and seeds the
  // matching brand + entity list.
  const customer = resolveSeedCustomer();

  // Demo installs default to the variant's brand so the dashboard looks right
  // on first boot. A user who edits branding via Settings won't have it
  // reverted — the check below is idempotent.
  seedDemoBrandingIfAbsent(db, customer);
  seedDeploymentModeIfAbsent(db, customer);
  markSetupCompletedIfAbsent(db);

  // Only check for existing DEMO tenants. If real tenants have been onboarded but
  // demos got purged, we still want to re-seed the demos alongside them.
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM tenants WHERE is_demo = 1")
    .get() as { n: number };
  if (row.n > 0) return;

  const insertTenant = db.prepare(
    `INSERT INTO tenants (id, tenant_id, name_en, name_ar, cluster, domain, ciso, ciso_email,
                          consent_status, consented_at, consent_state, last_sync_at, last_sync_ok,
                          is_demo)
     VALUES (@id, @tenant_id, @name_en, @name_ar, @cluster, @domain, @ciso, @ciso_email,
             'consented', datetime('now','-30 days'), @consent_state, @last_sync_at, @last_sync_ok, 1)`,
  );

  const insertSnap = db.prepare(
    `INSERT INTO signal_snapshots (tenant_id, signal_type, ok, http_status, payload)
     VALUES (@tenant_id, @signal_type, 1, 200, @payload)`,
  );

  // For historical demo data — explicit fetched_at so Δ7d / Δ30d compute against real rows.
  const insertSnapDated = db.prepare(
    `INSERT INTO signal_snapshots (tenant_id, signal_type, ok, http_status, payload, fetched_at)
     VALUES (@tenant_id, @signal_type, 1, 200, @payload, @fetched_at)`,
  );

  const insertHealth = db.prepare(
    `INSERT INTO endpoint_health (tenant_id, endpoint, last_success_at, call_count_24h, throttle_count_24h)
     VALUES (@tenant_id, @endpoint, @last_success_at, 24, 0)`,
  );

  const isoMinsAgo = (m: number) =>
    new Date(Date.now() - m * 60_000).toISOString().replace("T", " ").slice(0, 19);

  const tx = db.transaction((entities: DemoEntity[]) => {
    for (const e of entities) {
      const lastSyncAt = isoMinsAgo(e.syncMinsAgo);
      const last_sync_ok = e.connectionHealth === "red" ? 0 : 1;
      insertTenant.run({
        id: e.id,
        tenant_id: e.tenant_id,
        name_en: e.name_en,
        name_ar: e.name_ar,
        cluster: e.cluster,
        domain: e.domain,
        ciso: e.ciso,
        ciso_email: e.ciso_email,
        consent_state: crypto.randomBytes(16).toString("hex"),
        last_sync_at: lastSyncAt,
        last_sync_ok,
      });

      // Secure Score — pulled from the Council-curated catalog below. Each tenant sees the
      // same control catalog; pass/partial/fail pattern is weighted by e.index so high-maturity
      // tenants show mostly greens and low-maturity tenants show mostly reds.
      //
      // We also write two backdated historical snapshots so Δ7d / Δ30d deltas compute
      // naturally and the "Biggest movers" card has real values to sort against.
      // Historical scores are slightly lower than current to show positive movement — the
      // Council is meant to look like it's making progress.
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "secureScore",
        payload: JSON.stringify(generateSecureScore(e)),
      });
      const iso = (daysAgo: number) =>
        new Date(Date.now() - daysAgo * 86_400_000)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19);
      // 7 days ago: drop index by 1–4 points (tenant-specific, deterministic).
      const rng7 = seedRandom(`${e.id}:7d`);
      const delta7 = 1 + Math.floor(rng7() * 4);
      insertSnapDated.run({
        tenant_id: e.id,
        signal_type: "secureScore",
        payload: JSON.stringify(
          generateSecureScore({ ...e, index: Math.max(0, e.index - delta7) }),
        ),
        fetched_at: iso(7),
      });
      // 30 days ago: drop index by 3–8 points.
      const rng30 = seedRandom(`${e.id}:30d`);
      const delta30 = 3 + Math.floor(rng30() * 6);
      insertSnapDated.run({
        tenant_id: e.id,
        signal_type: "secureScore",
        payload: JSON.stringify(
          generateSecureScore({ ...e, index: Math.max(0, e.index - delta30) }),
        ),
        fetched_at: iso(30),
      });
      // QTD (90 days ago): drop index by 6–12 points.
      const rng90 = seedRandom(`${e.id}:90d`);
      const delta90 = 6 + Math.floor(rng90() * 7);
      insertSnapDated.run({
        tenant_id: e.id,
        signal_type: "secureScore",
        payload: JSON.stringify(
          generateSecureScore({ ...e, index: Math.max(0, e.index - delta90) }),
        ),
        fetched_at: iso(90),
      });
      // YTD (180 days ago): drop index by 10–18 points — big "look how far we've come" swing.
      const rng180 = seedRandom(`${e.id}:180d`);
      const delta180 = 10 + Math.floor(rng180() * 9);
      insertSnapDated.run({
        tenant_id: e.id,
        signal_type: "secureScore",
        payload: JSON.stringify(
          generateSecureScore({ ...e, index: Math.max(0, e.index - delta180) }),
        ),
        fetched_at: iso(180),
      });

      // Conditional Access — strong posture: 14 total, 13 enabled, 11 require MFA, legacy blocked.
      // Identity sub-score comes out ~89 (before risky-user penalty).
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "conditionalAccess",
        payload: JSON.stringify({
          total: 14,
          enabledCount: 13,
          reportOnlyCount: 1,
          disabledCount: 0,
          requiresMfaCount: 11,
          blocksLegacyAuthCount: 1,
          policies: [],
        }),
      });

      // Risky users — full list of individual users with realistic names and risk levels.
      const riskyUsers = generateRiskyUsers(e.riskyUsers, e.domain);
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "riskyUsers",
        payload: JSON.stringify({
          total: riskyUsers.length,
          highRisk: riskyUsers.filter((u) => u.riskLevel === "high").length,
          mediumRisk: riskyUsers.filter((u) => u.riskLevel === "medium").length,
          lowRisk: riskyUsers.filter((u) => u.riskLevel === "low").length,
          atRisk: riskyUsers.filter(
            (u) => u.riskState === "atRisk" || u.riskState === "confirmedCompromised",
          ).length,
          users: riskyUsers,
        }),
      });

      // Devices — full list of individual managed devices.
      const devices = generateDevices(400, e.deviceCompliancePct, e.domain);
      const counts = countDevices(devices);
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "devices",
        payload: JSON.stringify({
          total: devices.length,
          compliant: counts.compliant,
          nonCompliant: counts.nonCompliant,
          inGracePeriod: counts.inGracePeriod,
          error: counts.error,
          unknown: counts.unknown,
          compliancePct: e.deviceCompliancePct,
          byOs: counts.byOs,
          devices,
        }),
      });

      // Incidents — full list with severity/status/classification.
      const incidents = generateIncidents(e.openIncidents);
      const bySev = incidents.reduce<Record<string, number>>((acc, i) => {
        acc[i.severity] = (acc[i.severity] ?? 0) + 1;
        return acc;
      }, {});
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "incidents",
        payload: JSON.stringify({
          total: incidents.length,
          active: incidents.filter((i) => i.status !== "resolved").length,
          resolved: incidents.filter((i) => i.status === "resolved").length,
          bySeverity: bySev,
          incidents,
        }),
      });

      // ————————————————————————————————————
      // Phase 3 read signals — Purview + Defender depth.
      // Volumes scale loosely with entity size so larger tenants show more activity.
      // ————————————————————————————————————
      const scale = Math.max(0.5, Math.min(2.5, e.riskyUsers / 10));

      // DLP alerts — modest volume; entities with lower maturity show more.
      const dlpAlerts = generateAlerts(
        Math.round(6 + (100 - e.index) * 0.15 * scale),
        "dlp",
      );
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "dlpAlerts",
        payload: JSON.stringify(summarizeAlerts(dlpAlerts)),
      });

      // Insider Risk alerts — rarer, weighted toward high-severity.
      const irmAlerts = generateAlerts(
        Math.round(2 + (100 - e.index) * 0.06 * scale),
        "irm",
      );
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "irmAlerts",
        payload: JSON.stringify(summarizeAlerts(irmAlerts)),
      });

      // Communication Compliance — rarer still.
      const commCompAlerts = generateAlerts(
        Math.round(1 + (100 - e.index) * 0.04 * scale),
        "commComp",
      );
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "commCompAlerts",
        payload: JSON.stringify(summarizeAlerts(commCompAlerts)),
      });

      // Subject Rights Requests.
      const srrs = generateSrrs(Math.max(0, Math.round(Math.random() * 4)));
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "subjectRightsRequests",
        payload: JSON.stringify({
          total: srrs.length,
          active: srrs.filter((s) => s.status !== "closed").length,
          closed: srrs.filter((s) => s.status === "closed").length,
          overdue: srrs.filter(
            (s) =>
              !s.closedDateTime &&
              s.dueDateTime &&
              Date.parse(s.dueDateTime) < Date.now(),
          ).length,
          byType: srrs.reduce<Record<string, number>>((acc, s) => {
            acc[s.type] = (acc[s.type] ?? 0) + 1;
            return acc;
          }, {}),
          requests: srrs,
        }),
      });

      // Retention labels — catalog shared across the Council baseline, slight entity variation.
      const retentionLabels = generateRetentionLabels();
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "retentionLabels",
        payload: JSON.stringify({
          total: retentionLabels.length,
          recordLabels: retentionLabels.filter((l) => l.isRecordLabel).length,
          labels: retentionLabels,
        }),
      });

      // Sensitivity labels.
      const sensitivityLabels = generateSensitivityLabels();
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "sensitivityLabels",
        payload: JSON.stringify({
          total: sensitivityLabels.length,
          activeCount: sensitivityLabels.filter((l) => l.isActive).length,
          labels: sensitivityLabels,
        }),
      });

      // External sharing posture.
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "sharepointSettings",
        payload: JSON.stringify({
          sharingCapability:
            e.index > 80
              ? "existingExternalUserSharingOnly"
              : e.index > 65
                ? "externalUserSharingOnly"
                : "externalUserAndGuestSharing",
          allowedDomainListForSyncApp: 0,
          excludedFileExtensionsForSyncApp: 3,
          isSitesStorageLimitAutomatic: true,
          isSyncButtonHiddenOnPersonalSite: false,
          deletedUserPersonalSiteRetentionPeriodInDays: 30,
        }),
      });

      // PIM sprawl — privileged role sprawl inversely correlated with maturity.
      const pimActive = Math.max(2, Math.round((100 - e.index) * 0.12));
      const pimEligible = Math.round(pimActive * 1.8);
      const pimPrivileged = Math.max(1, Math.round(pimActive * 0.4));
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "pimSprawl",
        payload: JSON.stringify({
          activeAssignments: pimActive,
          eligibleAssignments: pimEligible,
          privilegedRoleAssignments: pimPrivileged,
          byRole: {
            "Global Administrator": { active: pimPrivileged, eligible: Math.round(pimEligible * 0.2) },
            "Security Administrator": { active: Math.max(1, Math.round(pimActive * 0.3)), eligible: Math.round(pimEligible * 0.25) },
            "User Administrator": { active: Math.max(0, Math.round(pimActive * 0.2)), eligible: Math.round(pimEligible * 0.3) },
            "Application Administrator": { active: Math.max(0, Math.round(pimActive * 0.1)), eligible: Math.round(pimEligible * 0.25) },
          },
        }),
      });

      // Defender for Identity sensor health.
      const dfiUnhealthy = e.index > 80 ? 0 : e.index > 70 ? 1 : 2;
      const dfiHealthy = 6 - dfiUnhealthy;
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "dfiSensorHealth",
        payload: JSON.stringify({
          total: dfiHealthy + dfiUnhealthy,
          healthy: dfiHealthy,
          unhealthy: dfiUnhealthy,
          bySeverity: dfiUnhealthy > 0 ? { medium: dfiUnhealthy } : {},
          issues: Array.from({ length: dfiUnhealthy }, (_, i) => ({
            id: `dfi-${e.id}-${i}`,
            displayName: i === 0 ? "Sensor service not running" : "Sensor agent version outdated",
            severity: "medium",
            status: "open",
            category: i === 0 ? "Availability" : "Configuration",
            createdDateTime: isoMinsAgo(Math.round(Math.random() * 1440)),
          })),
        }),
      });

      // Attack Simulation — phish click-rate inversely proportional to maturity.
      const clickRate = Math.max(2, Math.min(35, Math.round(40 - e.index * 0.3)));
      const targeted = 200 + Math.round(Math.random() * 400);
      const clicks = Math.round((targeted * clickRate) / 100);
      const reported = Math.round(targeted * (e.index / 100) * 0.3);
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "attackSimulations",
        payload: JSON.stringify({
          simulations: 3,
          totalAttempts: targeted,
          clicks,
          clickRatePct: clickRate,
          reported,
          simulationsList: [
            {
              id: `sim-${e.id}-1`,
              displayName: "Q2 Credential Harvesting Campaign",
              status: "succeeded",
              createdDateTime: isoMinsAgo(60 * 24 * 30),
              clickRatePct: clickRate + 2,
            },
            {
              id: `sim-${e.id}-2`,
              displayName: "Q1 Link Drill",
              status: "succeeded",
              createdDateTime: isoMinsAgo(60 * 24 * 90),
              clickRatePct: clickRate + 5,
            },
            {
              id: `sim-${e.id}-3`,
              displayName: "Annual Baseline",
              status: "succeeded",
              createdDateTime: isoMinsAgo(60 * 24 * 200),
              clickRatePct: clickRate + 8,
            },
          ],
        }),
      });

      // Threat Intelligence — shared articles, all entities see the same feed.
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "threatIntelligence",
        payload: JSON.stringify({
          articles: 5,
          recentArticles: DEMO_TI_ARTICLES,
        }),
      });

      // Advanced Hunting — 3 KQL packs, demo rows shaped like real MDE hunting results.
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "advancedHunting",
        payload: JSON.stringify({
          total: 3,
          packs: generateKqlPackResults(e),
        }),
      });

      // Defender Vulnerability Management — realistic CVE fixtures scaled by
      // the entity's maturity index. We thread in the Intune device list so
      // `byDevice` uses the *same* device names Intune reports — this is
      // what makes the Devices-tab drill-down actually find matching CVEs
      // on the same host entry (vs. the names drifting apart).
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "vulnerabilities",
        payload: JSON.stringify(generateVulnerabilities(e, devices)),
      });

      // Workload Coverage — Phase 16. Synthesizes the multi-tool rollup
      // shown at the top of the entity overview page. Numbers correlate
      // with the entity's overall maturity index so the demo looks
      // coherent (a 92-index entity has 100% Intune+MDE coverage and an
      // 18-index entity has gaps everywhere). The Intune-vs-MDE coverage
      // gap is computed live from the synthesized counts so the headline
      // callout strip works without further wiring.
      {
        const totalDevices = devices.length;
        const intuneEnrolled = Math.round(
          totalDevices * (0.85 + Math.random() * 0.12),
        );
        const mdeOnboarded = Math.round(
          intuneEnrolled * (0.65 + (e.index / 100) * 0.3),
        );
        const compliantPct = Math.round(60 + (e.index / 100) * 35);
        const compliantDevices = Math.round(
          intuneEnrolled * (compliantPct / 100),
        );
        const platformSplit = {
          windows: Math.round(intuneEnrolled * 0.6),
          ios: Math.round(intuneEnrolled * 0.18),
          android: Math.round(intuneEnrolled * 0.16),
          macOS: Math.round(intuneEnrolled * 0.06),
        };
        const osSplit = {
          Windows10: Math.round(mdeOnboarded * 0.45),
          Windows11: Math.round(mdeOnboarded * 0.4),
          WindowsServer2019: Math.round(mdeOnboarded * 0.07),
          WindowsServer2022: Math.round(mdeOnboarded * 0.05),
          Other: Math.round(mdeOnboarded * 0.03),
        };
        const dcCount = Math.max(2, Math.round(2 + Math.random() * 4));
        const mdiOpenIssues = e.index < 60 ? Math.round(2 + Math.random() * 6) : 0;
        const mdiCriticalIssues = e.index < 50 && Math.random() > 0.5 ? 1 : 0;
        const labelEventsLast30d = Math.round(
          150 + (e.index / 100) * 800 + Math.random() * 100,
        );
        const mdoAlerts = Math.round(2 + Math.random() * 18);
        const submissions = Math.round(Math.random() * 8);
        const mdcaAlerts = Math.round(Math.random() * 12);
        const dlpAlerts = Math.round(4 + Math.random() * 22);
        const seatBase = Math.max(50, totalDevices + 20);
        insertSnap.run({
          tenant_id: e.id,
          signal_type: "workloadCoverage",
          payload: JSON.stringify({
            collectedAt: lastSyncAt,
            mdmAuthority: "intune",
            tenantUserCountFloor: seatBase,
            intune: {
              available: "live",
              license: {
                licensed: true,
                via: "ENTERPRISEPACKPLUS / INTUNE_A",
                totalSeats: seatBase + 20,
                consumedSeats: seatBase,
              },
              enrolledDevices: intuneEnrolled,
              devicesByPlatform: platformSplit,
              devicesByCompliance: {
                compliant: compliantDevices,
                noncompliant: intuneEnrolled - compliantDevices,
              },
              percentCompliant: compliantPct,
              compliancePolicyCount: 7 + Math.round(Math.random() * 4),
              configurationProfileCount: 12 + Math.round(Math.random() * 6),
              settingsCatalogProfileCount: 4 + Math.round(Math.random() * 3),
              error: null,
            },
            mde: {
              available: "live",
              license: {
                licensed: true,
                via: "M365_E5 / WINDEFATP",
                totalSeats: seatBase + 20,
                consumedSeats: seatBase,
              },
              onboardedDevices: mdeOnboarded,
              activeLast7Days: Math.round(mdeOnboarded * 0.92),
              staleOver30Days: Math.round(mdeOnboarded * 0.04),
              devicesByOs: osSplit,
              devicesByHealth: {
                Active: Math.round(mdeOnboarded * 0.92),
                Inactive: Math.round(mdeOnboarded * 0.05),
                ImpairedCommunication: Math.round(mdeOnboarded * 0.02),
                NoSensorData: Math.round(mdeOnboarded * 0.01),
              },
              intuneCoverageGap: Math.max(0, intuneEnrolled - mdeOnboarded),
              error: null,
            },
            mdi: {
              available: "beta",
              license: {
                licensed: e.index >= 30,
                via: e.index >= 30 ? "M365_E5 / ATA" : null,
                totalSeats: e.index >= 30 ? seatBase + 20 : 0,
                consumedSeats: e.index >= 30 ? seatBase : 0,
              },
              sensorCount: e.index >= 30 ? dcCount : null,
              openHealthIssues: e.index >= 30 ? mdiOpenIssues : null,
              criticalHealthIssues: e.index >= 30 ? mdiCriticalIssues : null,
              error: null,
            },
            labels: {
              available: "live",
              license: {
                licensed: true,
                via: "ENTERPRISEPACKPLUS / RMS_S_ENTERPRISE",
                totalSeats: seatBase + 20,
                consumedSeats: seatBase,
              },
              publishedLabelCount: 4,
              labelNames: ["Public", "Internal", "Confidential", "Highly Confidential"],
              labelEventsLast30d,
              error: null,
            },
            mdo: {
              available: "coming_soon",
              license: {
                licensed: true,
                via: "M365_E5 / ATP_ENTERPRISE",
                totalSeats: seatBase + 20,
                consumedSeats: seatBase,
              },
              alertsLast30d: mdoAlerts,
              submissionsLast30d: submissions,
              error: null,
            },
            mdca: {
              available: "coming_soon",
              license: {
                licensed: e.index >= 50,
                via: e.index >= 50 ? "M365_E5 / ADALLOM_S_STANDALONE" : null,
                totalSeats: e.index >= 50 ? seatBase + 20 : 0,
                consumedSeats: e.index >= 50 ? seatBase : 0,
              },
              alertsLast30d: e.index >= 50 ? mdcaAlerts : 0,
              error: null,
            },
            dlp: {
              available: "coming_soon",
              license: {
                licensed: true,
                via: "M365_E5 / MIP_S_CLP2",
                totalSeats: seatBase + 20,
                consumedSeats: seatBase,
              },
              policyCountBeta: 5 + Math.round(Math.random() * 4),
              alertsLast30d: dlpAlerts,
              error: null,
            },
          }),
        });
      }

      // Label adoption — synthesized from sensitivity label mix scaled by entity size.
      const adoptionEvents = Math.round(
        200 + Math.random() * 400 + e.index * 3,
      );
      const byLabel = {
        Public: Math.round(adoptionEvents * 0.35),
        Internal: Math.round(adoptionEvents * 0.4),
        Confidential: Math.round(adoptionEvents * 0.18),
        "Highly Confidential": Math.round(adoptionEvents * 0.07),
      };
      insertSnap.run({
        tenant_id: e.id,
        signal_type: "labelAdoption",
        payload: JSON.stringify({
          total: adoptionEvents,
          byLabel,
          byRecordType: {
            MIPLabel: Math.round(adoptionEvents * 0.6),
            SensitivityLabelAction: Math.round(adoptionEvents * 0.3),
            SensitivityLabeledFileAction: Math.round(adoptionEvents * 0.1),
          },
          sampleRecords: [],
          queryStatus: "succeeded",
          queryAgeHours: 18,
        }),
      });

      // Endpoint health — one row per surface so Connection Health view has data.
      for (const ep of [
        "/security/secureScores",
        "/identity/conditionalAccess/policies",
        "/identityProtection/riskyUsers",
        "/deviceManagement/managedDevices",
        "/security/incidents",
        "/security/alerts_v2",
        "/security/subjectRightsRequests",
        "/security/labels/retentionLabels",
        "/security/informationProtection/sensitivityLabels",
        "/admin/sharepoint/settings",
        "/roleManagement/directory/roleAssignmentSchedules",
        "/security/identities/healthIssues",
        "/security/attackSimulation/simulations",
        "/security/threatIntelligence/articles",
        "/security/runHuntingQuery",
      ]) {
        insertHealth.run({
          tenant_id: e.id,
          endpoint: ep,
          last_success_at: lastSyncAt,
        });
      }
    }
  });

  tx(entitiesForCustomer(customer));

  // Also backfill 90 days of maturity snapshots so the trend chart on
  // Entity Detail lands populated on fresh installs.
  seedDemoMaturityTrend(db);
}

// ————————————————————————————————————————
// Purview + Defender depth demo generators
// ————————————————————————————————————————

const DLP_TITLES = [
  "Credit card number shared via email",
  "UAE passport number in SharePoint file",
  "Emirates ID scan uploaded to OneDrive",
  "Banking data sent to external recipient",
  "Sensitive file shared with anonymous link",
  "DLP policy match: Confidential label override",
];

const IRM_TITLES = [
  "User downloaded 1,200 files in 10 minutes",
  "Exfiltration pattern detected — USB",
  "Anomalous access to HR documents",
  "Leaving employee printing sensitive content",
];

const COMM_COMP_TITLES = [
  "Policy violation in Teams channel message",
  "Sensitive info disclosed in chat",
  "Harassment policy match",
];

function generateAlerts(
  n: number,
  kind: "dlp" | "irm" | "commComp",
): Array<{
  id: string;
  title: string;
  severity: string;
  status: string;
  createdDateTime: string;
  lastUpdateDateTime: string;
  category: string | null;
}> {
  const pool = kind === "dlp" ? DLP_TITLES : kind === "irm" ? IRM_TITLES : COMM_COMP_TITLES;
  const severities = kind === "irm"
    ? ["high", "high", "medium", "medium", "low"]
    : ["medium", "medium", "low", "high", "low"];
  const out: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    createdDateTime: string;
    lastUpdateDateTime: string;
    category: string | null;
  }> = [];
  for (let i = 0; i < n; i++) {
    const hoursAgo = Math.round(Math.random() * 24 * 14);
    const active = Math.random() < 0.55;
    out.push({
      id: `${kind}-${crypto.randomBytes(4).toString("hex")}-${i}`,
      title: pool[i % pool.length],
      severity: severities[i % severities.length],
      status: active ? "new" : "resolved",
      createdDateTime: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
      lastUpdateDateTime: new Date(Date.now() - Math.max(0, hoursAgo - 2) * 3_600_000).toISOString(),
      category: null,
    });
  }
  return out;
}

function summarizeAlerts(
  rows: Array<{ severity: string; status: string }>,
): {
  total: number;
  active: number;
  resolved: number;
  bySeverity: Record<string, number>;
  alerts: typeof rows;
} {
  const bySeverity: Record<string, number> = {};
  let active = 0;
  let resolved = 0;
  for (const r of rows) {
    bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + 1;
    if (r.status === "resolved") resolved++;
    else active++;
  }
  return { total: rows.length, active, resolved, bySeverity, alerts: rows };
}

function generateSrrs(n: number): Array<{
  id: string;
  displayName: string;
  type: string;
  status: string;
  createdDateTime: string;
  dueDateTime: string | null;
  closedDateTime: string | null;
}> {
  const types = ["access", "deletion", "export"];
  const out: Array<{
    id: string;
    displayName: string;
    type: string;
    status: string;
    createdDateTime: string;
    dueDateTime: string | null;
    closedDateTime: string | null;
  }> = [];
  for (let i = 0; i < n; i++) {
    const daysAgo = Math.round(Math.random() * 40);
    const closed = Math.random() < 0.4 && daysAgo > 20;
    const created = new Date(Date.now() - daysAgo * 86_400_000);
    out.push({
      id: `srr-${crypto.randomBytes(4).toString("hex")}`,
      displayName: `Subject Rights Request #${1000 + i}`,
      type: types[i % types.length],
      status: closed ? "closed" : daysAgo > 30 ? "stalled" : "inProgress",
      createdDateTime: created.toISOString(),
      dueDateTime: new Date(created.getTime() + 30 * 86_400_000).toISOString(),
      closedDateTime: closed
        ? new Date(created.getTime() + (20 + Math.random() * 5) * 86_400_000).toISOString()
        : null,
    });
  }
  return out;
}

function generateRetentionLabels(): Array<{
  id: string;
  displayName: string;
  behaviorDuringRetentionPeriod: string | null;
  retentionDuration: string | null;
  isRecordLabel: boolean;
}> {
  return [
    { id: "rl-1", displayName: "Public — retain 1 year", behaviorDuringRetentionPeriod: "retain", retentionDuration: "365d", isRecordLabel: false },
    { id: "rl-2", displayName: "Internal — retain 3 years", behaviorDuringRetentionPeriod: "retainAsRecord", retentionDuration: "1095d", isRecordLabel: true },
    { id: "rl-3", displayName: "Confidential — retain 7 years", behaviorDuringRetentionPeriod: "retainAsRegulatoryRecord", retentionDuration: "2555d", isRecordLabel: true },
    { id: "rl-4", displayName: "Legal Hold — indefinite", behaviorDuringRetentionPeriod: "retainAsRecord", retentionDuration: null, isRecordLabel: true },
    { id: "rl-5", displayName: "Transitory — delete after 30 days", behaviorDuringRetentionPeriod: "delete", retentionDuration: "30d", isRecordLabel: false },
  ];
}

function generateSensitivityLabels(): Array<{
  id: string;
  name: string;
  description: string | null;
  sensitivity: number | null;
  isActive: boolean;
}> {
  return [
    { id: "sl-1", name: "Public", description: "Information approved for public release", sensitivity: 0, isActive: true },
    { id: "sl-2", name: "Internal", description: "For Council / entity internal use only", sensitivity: 1, isActive: true },
    { id: "sl-3", name: "Confidential", description: "Sensitive government data", sensitivity: 2, isActive: true },
    { id: "sl-4", name: "Highly Confidential", description: "National security / legally privileged", sensitivity: 3, isActive: true },
    { id: "sl-5", name: "Restricted (legacy)", description: "Deprecated tier — use Confidential", sensitivity: 2, isActive: false },
  ];
}

const DEMO_TI_ARTICLES = [
  {
    id: "ti-1",
    title: "Emerging phishing kit targeting Gulf governments",
    createdDateTime: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    summary: "Kit impersonates Microsoft Entra sign-in; observed using Emirates-themed lures.",
  },
  {
    id: "ti-2",
    title: "APT actor adds Arabic-language decoys",
    createdDateTime: new Date(Date.now() - 8 * 86_400_000).toISOString(),
    summary: "Middle-Eastern spear-phish campaign now ships bilingual decoy documents.",
  },
  {
    id: "ti-3",
    title: "MOVEit-style exploit wave in regional ISPs",
    createdDateTime: new Date(Date.now() - 14 * 86_400_000).toISOString(),
    summary: "Managed file-transfer CVE exploited — patch guidance in the article.",
  },
  {
    id: "ti-4",
    title: "Azure OpenAI API abuse tradecraft",
    createdDateTime: new Date(Date.now() - 21 * 86_400_000).toISOString(),
    summary: "Stolen keys observed selling on dark markets; rotate if you suspect leak.",
  },
  {
    id: "ti-5",
    title: "OAuth consent phishing via multi-tenant apps",
    createdDateTime: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    summary: "Review consent grants in your tenant for unexpected first-party apps.",
  },
];

/**
 * Synthesize a realistic Defender Vulnerability Management payload for a
 * demo entity. The CVE catalog intentionally overlaps across entities so
 * cross-tenant correlation on the /vulnerabilities roll-up surfaces real
 * shared threats (e.g. CVE-2024-38063 affecting >1 entity), not just
 * per-tenant noise.
 *
 * Severity distribution scales inversely with `e.index` (low-maturity
 * entities get more criticals / more exploitable CVEs).
 */
const CVE_CATALOG = [
  // Critical — actively exploited / known-public POCs.
  { cveId: "CVE-2024-38063", severity: "Critical" as const, cvssScore: 9.8, hasExploit: true, published: "2024-08-13", product: "Windows TCP/IP" },
  { cveId: "CVE-2024-26169", severity: "Critical" as const, cvssScore: 9.8, hasExploit: true, published: "2024-03-12", product: "Windows Error Reporting" },
  { cveId: "CVE-2023-36884", severity: "Critical" as const, cvssScore: 9.3, hasExploit: true, published: "2023-07-11", product: "Office / Windows HTML RCE" },
  { cveId: "CVE-2024-21412", severity: "Critical" as const, cvssScore: 8.1, hasExploit: true, published: "2024-02-13", product: "Defender SmartScreen" },
  { cveId: "CVE-2023-24932", severity: "Critical" as const, cvssScore: 6.7, hasExploit: true, published: "2023-05-09", product: "Secure Boot (BlackLotus)" },
  // High.
  { cveId: "CVE-2024-30088", severity: "High" as const, cvssScore: 7.0, hasExploit: false, published: "2024-06-11", product: "Windows Kernel EoP" },
  { cveId: "CVE-2024-38080", severity: "High" as const, cvssScore: 7.8, hasExploit: true, published: "2024-07-09", product: "Hyper-V EoP" },
  { cveId: "CVE-2024-29988", severity: "High" as const, cvssScore: 8.8, hasExploit: true, published: "2024-04-09", product: "SmartScreen Prompt Bypass" },
  { cveId: "CVE-2024-30078", severity: "High" as const, cvssScore: 8.8, hasExploit: false, published: "2024-06-11", product: "Wi-Fi Driver RCE" },
  { cveId: "CVE-2024-38178", severity: "High" as const, cvssScore: 7.5, hasExploit: true, published: "2024-08-13", product: "Scripting Engine Type Confusion" },
  { cveId: "CVE-2024-37085", severity: "High" as const, cvssScore: 6.8, hasExploit: false, published: "2024-06-25", product: "VMware ESXi Auth Bypass" },
  { cveId: "CVE-2023-44487", severity: "High" as const, cvssScore: 7.5, hasExploit: true, published: "2023-10-10", product: "HTTP/2 Rapid Reset" },
  // Medium.
  { cveId: "CVE-2024-35250", severity: "Medium" as const, cvssScore: 6.4, hasExploit: false, published: "2024-06-11", product: "Windows Mobile Broadband" },
  { cveId: "CVE-2023-38545", severity: "Medium" as const, cvssScore: 5.3, hasExploit: false, published: "2023-10-11", product: "curl SOCKS5 heap overflow" },
  { cveId: "CVE-2024-23334", severity: "Medium" as const, cvssScore: 5.9, hasExploit: false, published: "2024-01-28", product: "aiohttp path traversal" },
  { cveId: "CVE-2024-27198", severity: "Medium" as const, cvssScore: 6.8, hasExploit: true, published: "2024-03-04", product: "TeamCity auth bypass" },
  { cveId: "CVE-2023-50164", severity: "Medium" as const, cvssScore: 6.2, hasExploit: false, published: "2023-12-07", product: "Apache Struts upload traversal" },
  { cveId: "CVE-2024-4577", severity: "Medium" as const, cvssScore: 6.4, hasExploit: true, published: "2024-06-06", product: "PHP-CGI argument injection" },
  // Low.
  { cveId: "CVE-2024-28121", severity: "Low" as const, cvssScore: 3.5, hasExploit: false, published: "2024-03-12", product: "Windows Installer info leak" },
  { cveId: "CVE-2023-21709", severity: "Low" as const, cvssScore: 3.6, hasExploit: false, published: "2023-08-08", product: "Exchange info disclosure" },
];

const OS_PLATFORMS = ["Windows11", "Windows10", "Windows Server 2019", "Windows Server 2022", "macOS", "iOS"];

type SeedVulnCve = {
  cveId: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Unknown";
  cvssScore: number | null;
  affectedDevices: number;
  remediatedDevices: number;
  hasExploit: boolean;
  publishedDateTime: string | null;
};

type SeedVulnDevice = {
  deviceId: string;
  deviceName: string;
  osPlatform: string | null;
  cveCount: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  maxCvss: number | null;
  cveIds: string[];
};

function generateVulnerabilities(
  e: DemoEntity,
  intuneDevices: ReturnType<typeof generateDevices>,
): {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  exploitable: number;
  affectedDevices: number;
  remediationTracked: boolean;
  byDevice: SeedVulnDevice[];
  topCves: SeedVulnCve[];
  error: null;
} {
  const rng = seedRandom(`${e.id}:vulns`);
  // Maturity inverse — low-index entities have more criticals + more devices affected.
  const scale = Math.max(0.3, (100 - e.index) / 100);
  // Remediation ratio — high-maturity entities patch faster. Range ~0.1–0.5.
  const remediationRatio = Math.min(0.6, 0.1 + (e.index / 100) * 0.4);

  // Pick a subset of CVEs weighted by scale.
  const cveCountTarget = Math.floor(8 + scale * 20 + rng() * 6); // 8–34
  const chosenCves = CVE_CATALOG.slice(
    0,
    Math.min(CVE_CATALOG.length, cveCountTarget),
  )
    .slice()
    .sort(() => rng() - 0.5)
    .slice(0, cveCountTarget);

  // Pull a subset of Intune devices — typically noncompliant + error first
  // (those are the ones you'd expect unpatched CVEs on). This keeps device
  // names aligned with the Intune payload so the Devices-tab drill-down
  // actually matches.
  const intuneSorted = intuneDevices.slice().sort((a, b) => {
    const rank = (s: string) =>
      s === "noncompliant" ? 3 : s === "error" ? 2 : s === "inGracePeriod" ? 1 : 0;
    return rank(b.complianceState) - rank(a.complianceState);
  });
  const deviceCount = Math.min(
    intuneSorted.length,
    Math.max(1, Math.floor(6 + scale * 18 + rng() * 4)),
  ); // 6–28 of the real Intune devices
  const byDevice: SeedVulnDevice[] = [];
  // Track which devices are affected by each CVE for accurate roll-up.
  const devicesByCve = new Map<string, string[]>();

  for (let i = 0; i < deviceCount; i++) {
    const src = intuneSorted[i];
    const picked = Math.floor(2 + rng() * 7); // 2–8 CVEs per device
    const assigned = chosenCves
      .slice()
      .sort(() => rng() - 0.5)
      .slice(0, picked);
    const critical = assigned.filter((c) => c.severity === "Critical").length;
    const high = assigned.filter((c) => c.severity === "High").length;
    const medium = assigned.filter((c) => c.severity === "Medium").length;
    const low = assigned.filter((c) => c.severity === "Low").length;
    const maxCvss = assigned.reduce((m, c) => Math.max(m, c.cvssScore), 0);
    byDevice.push({
      deviceId: src.id,
      deviceName: src.deviceName,
      osPlatform: src.operatingSystem,
      cveCount: assigned.length,
      critical,
      high,
      medium,
      low,
      maxCvss: maxCvss || null,
      cveIds: assigned.map((c) => c.cveId),
    });
    for (const c of assigned) {
      const arr = devicesByCve.get(c.cveId) ?? [];
      arr.push(src.deviceName);
      devicesByCve.set(c.cveId, arr);
    }
  }
  byDevice.sort(
    (a, b) => b.critical - a.critical || b.high - a.high || b.cveCount - a.cveCount,
  );

  // Build CVE list with per-CVE exposed + remediated counts. Remediated is
  // a fraction of the "would-have-been" exposed population — representing
  // hosts that used to have this CVE and were patched. So exposed + remediated
  // together make up the universe; remediationRatio controls the mix.
  const topCves: SeedVulnCve[] = chosenCves.map((c) => {
    const exposed = devicesByCve.get(c.cveId)?.length ?? 0;
    // Imagine the "pre-remediation" population was larger by the ratio.
    const simulatedUniverse = Math.max(
      exposed,
      Math.round(exposed / Math.max(0.01, 1 - remediationRatio)),
    );
    const remediated = simulatedUniverse - exposed;
    return {
      cveId: c.cveId,
      severity: c.severity,
      cvssScore: c.cvssScore,
      affectedDevices: exposed,
      remediatedDevices: remediated,
      hasExploit: c.hasExploit,
      publishedDateTime: c.published + "T00:00:00Z",
    };
  });

  const critical = topCves.filter((c) => c.severity === "Critical").length;
  const high = topCves.filter((c) => c.severity === "High").length;
  const medium = topCves.filter((c) => c.severity === "Medium").length;
  const low = topCves.filter((c) => c.severity === "Low").length;
  const exploitable = topCves.filter((c) => c.hasExploit).length;

  return {
    total: topCves.length,
    critical,
    high,
    medium,
    low,
    exploitable,
    affectedDevices: byDevice.length,
    remediationTracked: true,
    byDevice: byDevice.slice(0, 50),
    topCves: topCves
      .sort(
        (a, b) =>
          b.affectedDevices - a.affectedDevices ||
          (b.cvssScore ?? 0) - (a.cvssScore ?? 0),
      )
      .slice(0, 50),
    error: null,
  };
}

function generateKqlPackResults(e: DemoEntity): Array<{
  packId: string;
  name: string;
  rowCount: number;
  schema: Array<{ name: string; type: string }>;
  rows: Array<Record<string, unknown>>;
  executedAt: string;
  error: string | null;
}> {
  const nowIso = new Date().toISOString();
  const failedSignIns = Math.max(0, Math.round((100 - e.index) * 0.4));
  const oauthGrants = Math.max(0, Math.round(Math.random() * 4));
  return [
    {
      // v2.5.19: schema matches the real MDE-native query (IdentityLogonEvents) —
      // AccountUpn / IPAddress / FailureReason / FailedAttempts. Previous
      // demo data used the Sentinel-shape (UserPrincipalName / ResultType)
      // which would have rendered differently from real-tenant rows.
      packId: "pack.failedAdminSignIns",
      name: "Failed admin sign-ins (last 24h)",
      rowCount: failedSignIns,
      schema: [
        { name: "AccountUpn", type: "string" },
        { name: "IPAddress", type: "string" },
        { name: "FailureReason", type: "string" },
        { name: "FailedAttempts", type: "long" },
      ],
      rows: Array.from({ length: Math.min(failedSignIns, 5) }, (_, i) => ({
        AccountUpn: `admin${i + 1}@${e.domain}`,
        IPAddress: `185.220.${Math.round(Math.random() * 255)}.${Math.round(Math.random() * 255)}`,
        FailureReason: "Invalid username or password",
        FailedAttempts: Math.round(5 + Math.random() * 40),
      })),
      executedAt: nowIso,
      error: null,
    },
    // pack.staleCaPolicies removed in v2.5.19 — see lib/graph/signals.ts
    // for rationale (no MDE Advanced Hunting equivalent for the
    // AADAuditPolicyEvents Sentinel table the prior query depended on).
    {
      packId: "pack.oauthConsentSprawl",
      name: "OAuth consent grants (last 7 days)",
      rowCount: oauthGrants,
      schema: [
        { name: "TimeGenerated", type: "datetime" },
        { name: "InitiatedBy", type: "string" },
        { name: "TargetResources", type: "string" },
      ],
      rows: Array.from({ length: oauthGrants }, (_, i) => ({
        TimeGenerated: new Date(Date.now() - Math.round(Math.random() * 7) * 86_400_000).toISOString(),
        InitiatedBy: `user${i + 1}@${e.domain}`,
        TargetResources: `(SaaS app: ${["Zoom", "Slack", "Asana", "Dropbox"][i % 4]})`,
      })),
      executedAt: nowIso,
      error: null,
    },
  ];
}

// ————————————————————————————————————————
// Demo record generators
// ————————————————————————————————————————

const FIRST_NAMES = [
  "Ahmed","Fatima","Khalid","Noura","Omar","Maryam","Yousef","Layla","Saleh","Hessa",
  "Ibrahim","Aisha","Mohammed","Sara","Hamad","Amna","Ali","Shamma","Hassan","Mira",
  "Abdulla","Huda","Rashid","Sheikha","Saif","Moza","Majid","Salama","Tariq","Reem",
];
const LAST_NAMES = [
  "Al Suwaidi","Al Mahri","Al Zaabi","Al Khoury","Al Hashmi","Othman","Al Ketbi",
  "Al Naqbi","Al Serkal","Al Tamimi","Al Mulla","Al Marri","Al Falasi","Al Qasimi",
];
const DEVICE_PREFIXES = ["LAPTOP","DESKTOP","MBP","IPAD","IPHONE","SURF"];
const OS_LIST = ["Windows", "iOS", "macOS", "Android"];
const OS_WEIGHTS = [0.70, 0.20, 0.07, 0.03];

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}
function pickWeighted<T>(arr: readonly T[], weights: readonly number[], seed: number): T {
  let r = (seed % 1000) / 1000;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

const DEMO_RISK_EVENTS = [
  {
    type: "unfamiliarFeatures",
    detail: "Sign-in properties (device, browser, ASN) the user hasn't used before",
  },
  {
    type: "atypicalTravel",
    detail: "Sign-in from a location unusual for this user given their recent activity",
  },
  {
    type: "maliciousIPAddress",
    detail: "Sign-in attempted from an IP flagged in Microsoft threat intel feeds",
  },
  {
    type: "leakedCredentials",
    detail: "The user's credentials were found in a public leaked-password dump",
  },
  {
    type: "passwordSpray",
    detail: "Account targeted by a password-spray attack pattern",
  },
  {
    type: "anonymousIPAddress",
    detail: "Sign-in from a Tor / anonymising proxy IP",
  },
  {
    type: "impossibleTravel",
    detail: "Two successful sign-ins from geographically far-apart locations within a short window",
  },
  {
    type: "suspiciousInboxManipulation",
    detail: "Post-compromise mailbox-rule behaviour observed (auto-forward, auto-delete)",
  },
];
const DEMO_COUNTRIES = [
  { city: "Istanbul", country: "Turkey" },
  { city: "Minsk", country: "Belarus" },
  { city: "Lagos", country: "Nigeria" },
  { city: "Caracas", country: "Venezuela" },
  { city: "Moscow", country: "Russia" },
  { city: "Pyongyang", country: "DPR Korea" },
  { city: "Tehran", country: "Iran" },
  { city: "Manila", country: "Philippines" },
];
function rndIp(seed: number): string {
  const a = ((seed * 31 + 17) % 254) + 1;
  const b = ((seed * 47 + 5) % 254) + 1;
  const c = ((seed * 59 + 3) % 254) + 1;
  const d = ((seed * 13 + 11) % 254) + 1;
  return `${a}.${b}.${c}.${d}`;
}

function generateRiskyUsers(atRiskCount: number, domain: string) {
  // Total list = atRiskCount active + some history of resolved/dismissed.
  const historical = Math.max(5, Math.round(atRiskCount * 1.3));
  const total = atRiskCount + historical;
  const out: Array<{
    id: string;
    userPrincipalName: string;
    displayName: string | null;
    riskLevel: string;
    riskState: string;
    riskLastUpdatedDateTime: string;
    detections: Array<{
      id: string;
      riskEventType: string;
      riskDetail: string | null;
      riskLevel: string;
      source: string | null;
      activity: string | null;
      ipAddress: string | null;
      city: string | null;
      countryOrRegion: string | null;
      detectedDateTime: string;
    }>;
  }> = [];
  for (let i = 0; i < total; i++) {
    const first = pick(FIRST_NAMES, i * 7 + 11);
    const last = pick(LAST_NAMES, i * 13 + 3);
    const upn = `${first.toLowerCase()}.${last.toLowerCase().replace(/\s+/g, "")}@${domain}`;
    const atRisk = i < atRiskCount;
    const lvlSeed = i * 17 + 5;
    const level = atRisk
      ? (lvlSeed % 10 < 2 ? "high" : lvlSeed % 10 < 5 ? "medium" : "low")
      : "low";
    const state = atRisk ? "atRisk" : lvlSeed % 10 < 7 ? "remediated" : "dismissed";
    const lastUpdatedMs = Date.now() - ((i * 37 + 11) % (60 * 24 * 30)) * 60_000;

    // Detections only for atRisk users — remediated / dismissed have no
    // pending evidence, just history.
    const detections: typeof out[number]["detections"] = [];
    if (atRisk) {
      const nDet = (lvlSeed % 3) + 1; // 1–3 detections per at-risk user
      for (let d = 0; d < nDet; d++) {
        const ev = DEMO_RISK_EVENTS[(i * 5 + d * 13 + 2) % DEMO_RISK_EVENTS.length];
        const loc = DEMO_COUNTRIES[(i * 3 + d * 7 + 5) % DEMO_COUNTRIES.length];
        const detAgo = (i * 11 + d * 17 + 5) % (60 * 24 * 7); // within 7 days
        detections.push({
          id: `rd-${i.toString(16)}-${d}`,
          riskEventType: ev.type,
          riskDetail: ev.detail,
          riskLevel:
            ev.type === "leakedCredentials" || ev.type === "maliciousIPAddress"
              ? "high"
              : ev.type === "atypicalTravel" || ev.type === "impossibleTravel"
                ? "medium"
                : "low",
          source: "IdentityProtection",
          activity: "signin",
          ipAddress: rndIp(i * 7 + d * 11),
          city: loc.city,
          countryOrRegion: loc.country,
          detectedDateTime: new Date(
            lastUpdatedMs - detAgo * 60_000,
          ).toISOString(),
        });
      }
    }

    out.push({
      id: `ru-${i.toString(16)}-${first[0].toLowerCase()}${last[0].toLowerCase()}`,
      userPrincipalName: upn,
      displayName: `${first} ${last}`,
      riskLevel: level,
      riskState: state,
      riskLastUpdatedDateTime: new Date(lastUpdatedMs).toISOString(),
      detections,
    });
  }
  return out;
}

function generateDevices(count: number, compliancePct: number, domain: string) {
  const list: Array<{
    id: string;
    deviceName: string;
    operatingSystem: string;
    osVersion: string | null;
    complianceState: string;
    userPrincipalName: string | null;
    lastSyncDateTime: string | null;
    isEncrypted: boolean | null;
  }> = [];
  for (let i = 0; i < count; i++) {
    const os = pickWeighted(OS_LIST, OS_WEIGHTS, i * 3 + 1);
    const osVersion =
      os === "Windows" ? "11 23H2" : os === "iOS" ? "18.2" : os === "macOS" ? "15.1" : "14";
    const prefix = pick(DEVICE_PREFIXES, i * 5 + 2);
    const owner =
      `${pick(FIRST_NAMES, i * 7 + 13).toLowerCase()}.${pick(LAST_NAMES, i * 11 + 5)
        .toLowerCase()
        .replace(/\s+/g, "")}@${domain}`;
    const roll = (i * 19 + 3) % 100;
    let complianceState: string;
    if (roll < compliancePct) complianceState = "compliant";
    else if (roll < compliancePct + 2) complianceState = "inGracePeriod";
    else if (roll < compliancePct + 3) complianceState = "error";
    else complianceState = "noncompliant";
    list.push({
      id: `dev-${i.toString(16).padStart(4, "0")}`,
      deviceName: `${prefix}-${(i + 101).toString(16).toUpperCase()}`,
      operatingSystem: os,
      osVersion,
      complianceState,
      userPrincipalName: owner,
      lastSyncDateTime: new Date(Date.now() - ((i * 23 + 7) % (60 * 24 * 3)) * 60_000).toISOString(),
      isEncrypted: complianceState !== "noncompliant",
    });
  }
  return list;
}

function countDevices(devices: ReturnType<typeof generateDevices>) {
  let compliant = 0;
  let nonCompliant = 0;
  let inGracePeriod = 0;
  let error = 0;
  let unknown = 0;
  const byOs: Record<string, number> = {};
  for (const d of devices) {
    switch (d.complianceState) {
      case "compliant":
        compliant++;
        break;
      case "noncompliant":
        nonCompliant++;
        break;
      case "inGracePeriod":
        inGracePeriod++;
        break;
      case "error":
        error++;
        break;
      default:
        unknown++;
    }
    byOs[d.operatingSystem] = (byOs[d.operatingSystem] ?? 0) + 1;
  }
  return { compliant, nonCompliant, inGracePeriod, error, unknown, byOs };
}

const INCIDENT_TEMPLATES = [
  "Suspicious sign-in activity detected",
  "Phishing email campaign against users",
  "Malware alert on endpoint",
  "Unusual token issuance for service principal",
  "Impossible travel sign-in",
  "Anonymous IP address sign-in",
  "Password spray attempt",
  "Risky user with privileged role",
  "Unfamiliar sign-in properties",
  "OAuth consent from non-verified app",
  "Legacy authentication attempt",
  "Atypical travel sign-in",
];
const SEVERITIES = ["low", "medium", "high"] as const;
const STATUSES = ["active", "inProgress", "resolved"] as const;

const INCIDENT_DETERMINATIONS = [
  "apt",
  "malware",
  "phishing",
  "unwantedSoftware",
  "compromisedAccount",
  "maliciousUserActivity",
  "insufficientInformation",
];
const INCIDENT_ANALYSTS = [
  "khalid.almaktoum@council.local",
  "noura.alzaabi@council.local",
  "ahmed.alsuwaidi@council.local",
];
const INCIDENT_TAGS = [
  "priority-review",
  "after-hours",
  "external-source",
  "privileged-account",
  "phishing-campaign",
  "malware-detected",
];

function generateIncidents(activeCount: number) {
  // Active + roughly 5x resolved history.
  const resolvedCount = Math.max(activeCount, Math.round(activeCount * 5.67));
  const total = activeCount + resolvedCount;
  const out: Array<{
    id: string;
    displayName: string;
    severity: string;
    status: string;
    classification: string | null;
    determination: string | null;
    createdDateTime: string;
    lastUpdateDateTime: string;
    alertCount: number | null;
    assignedTo: string | null;
    tags: string[];
    incidentWebUrl: string | null;
  }> = [];
  for (let i = 0; i < total; i++) {
    const active = i < activeCount;
    const sevSeed = i * 11 + 7;
    const sev = active
      ? sevSeed % 10 < 2 ? "high" : sevSeed % 10 < 6 ? "medium" : "low"
      : SEVERITIES[sevSeed % SEVERITIES.length];
    const status = active
      ? sevSeed % 10 < 3 ? "inProgress" : "active"
      : "resolved";
    const createdMinsAgo = active
      ? (i * 41 + 13) % (60 * 24 * 7)
      : (i * 53 + 23) % (60 * 24 * 30);
    const updatedMinsAgo = active ? Math.floor(createdMinsAgo / 2) : createdMinsAgo;
    const classification =
      status === "resolved"
        ? pick(["truePositive", "informationalExpectedActivity", "falsePositive"], i * 7)
        : null;
    const determination =
      classification === "truePositive"
        ? pick(INCIDENT_DETERMINATIONS, i * 23 + 5)
        : classification === "falsePositive"
          ? "other"
          : null;
    const tagCount = sevSeed % 4; // 0-3 tags
    const tags: string[] = [];
    for (let k = 0; k < tagCount; k++) {
      const tag = INCIDENT_TAGS[(i * 13 + k * 7 + 3) % INCIDENT_TAGS.length];
      if (!tags.includes(tag)) tags.push(tag);
    }
    const id = `inc-${i.toString(16).padStart(5, "0")}`;
    out.push({
      id,
      displayName: pick(INCIDENT_TEMPLATES, i * 17 + 3),
      severity: sev,
      status,
      classification,
      determination,
      createdDateTime: new Date(Date.now() - createdMinsAgo * 60_000).toISOString(),
      lastUpdateDateTime: new Date(Date.now() - updatedMinsAgo * 60_000).toISOString(),
      alertCount: 1 + (i * 3 + 1) % 5,
      assignedTo:
        status === "active" || status === "inProgress"
          ? pick(INCIDENT_ANALYSTS, i * 19 + 3)
          : null,
      tags,
      incidentWebUrl: `https://security.microsoft.com/incident2/${encodeURIComponent(id)}/summary`,
    });
  }
  return out;
}

/**
 * Backfill 90 days of maturity snapshots for every demo tenant so the new
 * Entity Detail trend card shows realistic shape immediately instead of a
 * flat line. Idempotent — skips any tenant that already has snapshots.
 *
 * Story we encode: slight upward movement over 90 days (~5 points total)
 * plus small deterministic jitter so the chart doesn't look synthetic.
 * Sub-scores track the overall with offsets derived per sub-domain so
 * they stay internally consistent (device compliance roughly leads, data
 * protection roughly lags, etc.).
 */
export function seedDemoMaturityTrend(db: Database.Database): number {
  const demoTenants = db
    .prepare(
      "SELECT id, tenant_id FROM tenants WHERE is_demo = 1",
    )
    .all() as Array<{ id: string; tenant_id: string }>;
  if (demoTenants.length === 0) return 0;

  const insert = db.prepare(
    `INSERT INTO maturity_snapshots
       (tenant_id, captured_at, overall, secure_score, identity, device, data, threat, compliance)
     VALUES
       (@tenant_id, @captured_at, @overall, @secure_score, @identity, @device, @data, @threat, @compliance)`,
  );
  const hasAny = db.prepare(
    "SELECT 1 FROM maturity_snapshots WHERE tenant_id = ? LIMIT 1",
  );

  const DAYS = 90;
  const RAMP = 5; // total upward movement across the window
  let totalRows = 0;

  const tx = db.transaction(() => {
    for (const t of demoTenants) {
      if (hasAny.get(t.id)) continue;

      // Find this tenant's baseline index. Try both demo catalogs (Sharjah
      // and DESC) since the same function runs in either customer variant.
      // If a tenant isn't in either catalog we skip gracefully.
      const meta =
        DEMO.find((d) => d.id === t.id) ??
        DESC_DEMO.find((d) => d.id === t.id);
      if (!meta) continue;
      const latest = meta.index;
      const earliest = Math.max(0, latest - RAMP);

      const rng = seedRandom(`${t.id}:trend`);

      // Sub-score deltas from overall — hand-tuned so charts look coherent.
      // Device usually leads (Intune is well-deployed), data usually lags
      // (Purview rollout is partial), compliance near-middle.
      const offsets = {
        secureScore: -2,
        identity: -1,
        device: 4,
        data: -6,
        threat: 2,
        compliance: 0,
      };

      for (let i = DAYS - 1; i >= 0; i--) {
        // Linear interpolation earliest → latest, plus tiny jitter.
        const pct = (DAYS - 1 - i) / (DAYS - 1);
        const overall = clamp(earliest + RAMP * pct + (rng() - 0.5) * 1.6);
        const sub = (offset: number) =>
          clamp(overall + offset + (rng() - 0.5) * 2.2);
        const capturedAt = new Date(
          Date.now() - i * 86_400_000,
        ).toISOString();

        insert.run({
          tenant_id: t.id,
          captured_at: capturedAt,
          overall: round1(overall),
          secure_score: round1(sub(offsets.secureScore)),
          identity: round1(sub(offsets.identity)),
          device: round1(sub(offsets.device)),
          data: round1(sub(offsets.data)),
          threat: round1(sub(offsets.threat)),
          compliance: round1(sub(offsets.compliance)),
        });
        totalRows++;
      }
    }
  });
  tx();
  return totalRows;
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Remove all demo tenants (is_demo=1) + their snapshots + health. Safe next to real tenants.
 * Returns the number of rows deleted.
 */
export function purgeDemoTenants(db: Database.Database): number {
  const demoIds = (
    db.prepare("SELECT id FROM tenants WHERE is_demo = 1").all() as Array<{ id: string }>
  ).map((r) => r.id);
  if (demoIds.length === 0) return 0;

  const placeholders = demoIds.map(() => "?").join(",");
  const tx = db.transaction(() => {
    // FK ON DELETE CASCADE already drops snapshots + endpoint_health.
    db.prepare(`DELETE FROM tenants WHERE id IN (${placeholders})`).run(...demoIds);
  });
  tx();
  return demoIds.length;
}

// ————————————————————————————————————————
// Secure Score control catalog for demo tenants.
// Thirty representative Microsoft Secure Score controls with real IDs, titles, maxScore,
// user impact, implementation cost, tier, service, and threat tags — same shape the real
// /security/secureScoreControlProfiles endpoint returns. Per-tenant, we randomize pass /
// partial / fail based on entity maturity so the demo looks like a credible production
// fleet across the full posture spectrum.
// ————————————————————————————————————————

type SeedControl = {
  id: string;
  title: string;
  category: "Identity" | "Apps" | "Data" | "Device";
  maxScore: number;
  userImpact: "Low" | "Moderate" | "High";
  implementationCost: "Low" | "Moderate" | "High";
  tier: "Core" | "Bonus" | "Defense in Depth";
  service: string;
  threats: string[];
  passStatus: string;
  partialStatus: string;
  failStatus: string;
};

const SECURE_SCORE_CATALOG: SeedControl[] = [
  // ——— Identity (12 controls)
  {
    id: "AdminMFAV2",
    title: "Ensure multifactor authentication is enabled for all users in administrative roles",
    category: "Identity",
    maxScore: 10,
    userImpact: "Low",
    implementationCost: "Low",
    tier: "Core",
    service: "Azure AD",
    threats: ["Account Breach"],
    passStatus: "MFA is enforced for all users in administrative roles.",
    partialStatus: "MFA is enforced for most admin roles but not all (2 admins missing enforcement).",
    failStatus: "MFA is not enforced for admin roles. Admin accounts are the highest-value targets.",
  },
  {
    id: "MFARegistrationV2",
    title: "Ensure all users can complete multifactor authentication for secure access",
    category: "Identity",
    maxScore: 9,
    userImpact: "Low",
    implementationCost: "Low",
    tier: "Core",
    service: "Azure AD",
    threats: ["Account Breach"],
    passStatus: "All users have registered at least one MFA method.",
    partialStatus: "82% of users have registered MFA. 18% still use password-only sign-in.",
    failStatus: "Less than 50% of users have registered MFA. Significant account breach exposure.",
  },
  {
    id: "BlockLegacyAuthentication",
    title: "Ensure that legacy authentication protocols are blocked",
    category: "Identity",
    maxScore: 8,
    userImpact: "Moderate",
    implementationCost: "Low",
    tier: "Core",
    service: "Azure AD",
    threats: ["Account Breach"],
    passStatus: "Legacy authentication is blocked for all users via Conditional Access.",
    partialStatus: "Legacy authentication is blocked in report-only mode; not yet enforced.",
    failStatus: "Legacy authentication remains enabled. Password spray and brute-force attacks are possible.",
  },
  {
    id: "OneAdmin",
    title: "Ensure Global Administrator role is limited to 2-4 users",
    category: "Identity",
    maxScore: 5,
    userImpact: "Low",
    implementationCost: "Low",
    tier: "Core",
    service: "Azure AD",
    threats: ["Elevation of Privilege"],
    passStatus: "3 Global Administrators configured, within the recommended range.",
    partialStatus: "5 Global Administrators configured, slightly above the recommended maximum of 4.",
    failStatus: "12 Global Administrators configured. Far exceeds the recommended maximum of 4.",
  },
  {
    id: "SelfServicePasswordReset",
    title: "Ensure self-service password reset is enabled",
    category: "Identity",
    maxScore: 4,
    userImpact: "Low",
    implementationCost: "Low",
    tier: "Bonus",
    service: "Azure AD",
    threats: ["Account Breach"],
    passStatus: "Self-service password reset enabled for all users.",
    partialStatus: "Self-service password reset enabled for a subset of groups only.",
    failStatus: "Self-service password reset is disabled. Helpdesk load is higher than necessary.",
  },
  {
    id: "PWAgePolicyNew",
    title: "Ensure password policy is configured to never expire",
    category: "Identity",
    maxScore: 3,
    userImpact: "Low",
    implementationCost: "Low",
    tier: "Bonus",
    service: "Azure AD",
    threats: ["Account Breach"],
    passStatus: "Password expiration is disabled (per NIST 800-63B guidance).",
    partialStatus: "Password expiration is set to 180 days. Consider disabling per current NIST guidance.",
    failStatus: "Passwords expire every 90 days. Outdated practice that encourages weak password patterns.",
  },
  {
    id: "ConditionalAccessPolicies",
    title: "Ensure Conditional Access policies are configured to enforce MFA and block risky sign-ins",
    category: "Identity",
    maxScore: 8,
    userImpact: "Moderate",
    implementationCost: "Moderate",
    tier: "Core",
    service: "Azure AD",
    threats: ["Account Breach"],
    passStatus: "14 Conditional Access policies enforced, covering MFA + legacy auth + device compliance.",
    partialStatus: "8 Conditional Access policies enforced. Coverage gaps on privileged roles and legacy auth.",
    failStatus: "Only 2 Conditional Access policies enforced. Significant coverage gaps.",
  },
  {
    id: "PrivilegedIdentityManagement",
    title: "Ensure Privileged Identity Management (PIM) is used for admin role activation",
    category: "Identity",
    maxScore: 7,
    userImpact: "Moderate",
    implementationCost: "Moderate",
    tier: "Core",
    service: "Azure AD",
    threats: ["Elevation of Privilege"],
    passStatus: "All admin roles require PIM activation with approval workflow.",
    partialStatus: "PIM is enabled but 4 admin roles have standing assignments bypassing just-in-time activation.",
    failStatus: "PIM is not configured. All admin assignments are standing (always-on).",
  },
  {
    id: "RiskBasedConditionalAccess",
    title: "Enable Conditional Access policies based on sign-in risk",
    category: "Identity",
    maxScore: 6,
    userImpact: "Low",
    implementationCost: "Moderate",
    tier: "Core",
    service: "Azure AD",
    threats: ["Account Breach"],
    passStatus: "Sign-in risk policy blocks high-risk sign-ins; medium-risk requires MFA.",
    partialStatus: "Sign-in risk policy is in report-only mode.",
    failStatus: "No risk-based Conditional Access policies configured.",
  },
  {
    id: "UserRiskConditionalAccess",
    title: "Enable Conditional Access policies based on user risk",
    category: "Identity",
    maxScore: 6,
    userImpact: "Low",
    implementationCost: "Moderate",
    tier: "Core",
    service: "Azure AD",
    threats: ["Account Breach"],
    passStatus: "User-risk policy forces password change + MFA on high-risk users.",
    partialStatus: "User-risk policy enabled but set to report-only.",
    failStatus: "No user-risk Conditional Access policies configured.",
  },
  {
    id: "GuestInviteRestrictions",
    title: "Restrict which users can invite external guests",
    category: "Identity",
    maxScore: 4,
    userImpact: "Moderate",
    implementationCost: "Low",
    tier: "Bonus",
    service: "Azure AD",
    threats: ["Data Exfiltration"],
    passStatus: "Only users in the GuestInviter role can invite external guests.",
    partialStatus: "Member users can invite guests. Consider restricting to the GuestInviter role.",
    failStatus: "Anyone, including guests, can invite other guests. High data-sharing exposure.",
  },
  {
    id: "BreakGlassAccounts",
    title: "Ensure break-glass (emergency access) accounts are configured and monitored",
    category: "Identity",
    maxScore: 5,
    userImpact: "Low",
    implementationCost: "Low",
    tier: "Core",
    service: "Azure AD",
    threats: ["Account Breach", "Availability"],
    passStatus: "2 break-glass accounts configured, excluded from CA, with alert on sign-in.",
    partialStatus: "Break-glass accounts configured but no alerting on their sign-ins.",
    failStatus: "No break-glass accounts configured. Risk of tenant lockout during Entra outage.",
  },

  // ——— Apps (10 controls)
  {
    id: "mdo_safelinks",
    title: "Ensure Safe Links for Office applications is enabled",
    category: "Apps",
    maxScore: 5,
    userImpact: "Low",
    implementationCost: "Low",
    tier: "Core",
    service: "Defender for Office 365",
    threats: ["Phishing"],
    passStatus: "Safe Links is enabled for Office apps and Teams.",
    partialStatus: "Safe Links is enabled for email only; Office apps and Teams not covered.",
    failStatus: "Safe Links is disabled. URLs in email and documents are not checked in real time.",
  },
  {
    id: "mdo_safeattachments",
    title: "Ensure Safe Attachments is enabled and set to Dynamic Delivery",
    category: "Apps",
    maxScore: 5,
    userImpact: "Low",
    implementationCost: "Low",
    tier: "Core",
    service: "Defender for Office 365",
    threats: ["Malware"],
    passStatus: "Safe Attachments enabled with Dynamic Delivery for all mailboxes.",
    partialStatus: "Safe Attachments enabled but policy covers a subset of users.",
    failStatus: "Safe Attachments is disabled. Attachments are not scanned in a sandbox before delivery.",
  },
  {
    id: "mdo_antiphishing",
    title: "Configure anti-phishing policies with user impersonation protection",
    category: "Apps",
    maxScore: 5,
    userImpact: "Low",
    implementationCost: "Moderate",
    tier: "Core",
    service: "Defender for Office 365",
    threats: ["Phishing"],
    passStatus: "Anti-phishing policy covers all users, mailbox intelligence on, impersonation protection on.",
    partialStatus: "Anti-phishing policy is applied but impersonation protection thresholds are below the recommended baseline.",
    failStatus: "100% of users are affected by policies that are configured less securely than is recommended.",
  },
  {
    id: "exo_blockmailforward",
    title: "Block external email forwarding via transport rule",
    category: "Apps",
    maxScore: 5,
    userImpact: "Moderate",
    implementationCost: "Low",
    tier: "Core",
    service: "Exchange Online",
    threats: ["Data Exfiltration"],
    passStatus: "External auto-forwarding is blocked for all users.",
    partialStatus: "External forwarding is restricted to specific domains only.",
    failStatus: "External auto-forwarding is allowed. Compromised mailboxes can quietly exfiltrate mail.",
  },
  {
    id: "exo_modernauth",
    title: "Ensure modern authentication is enabled for Exchange Online",
    category: "Apps",
    maxScore: 5,
    userImpact: "Low",
    implementationCost: "Low",
    tier: "Core",
    service: "Exchange Online",
    threats: ["Account Breach"],
    passStatus: "Modern authentication for Exchange Online is enabled.",
    partialStatus: "Modern authentication is enabled but legacy protocols (POP, IMAP) remain on.",
    failStatus: "Modern authentication is disabled for Exchange Online.",
  },
  {
    id: "exo_outlookaddins",
    title: "Restrict users from installing Outlook add-ins",
    category: "Apps",
    maxScore: 3,
    userImpact: "Moderate",
    implementationCost: "Low",
    tier: "Bonus",
    service: "Exchange Online",
    threats: ["Malware"],
    passStatus: "Installing Outlook add-ins is restricted to administrator approval.",
    partialStatus: "Add-in policy allows Microsoft-published add-ins but not third-party.",
    failStatus: "Installing Outlook add-ins is allowed for all users without admin approval.",
  },
  {
    id: "exo_individualsharing",
    title: "Disable individual sharing for calendar and external mail tips",
    category: "Apps",
    maxScore: 3,
    userImpact: "Moderate",
    implementationCost: "Low",
    tier: "Bonus",
    service: "Exchange Online",
    threats: ["Data Exfiltration"],
    passStatus: "Individual sharing is disabled at the tenant level.",
    partialStatus: "Individual sharing is enabled but restricted to internal domains.",
    failStatus: "Individual sharing to external recipients is unrestricted.",
  },
  {
    id: "meeting_restrictanonymousjoin",
    title: "Restrict anonymous users from joining Teams meetings",
    category: "Apps",
    maxScore: 3,
    userImpact: "Moderate",
    implementationCost: "Low",
    tier: "Bonus",
    service: "Microsoft Teams",
    threats: ["Data Exfiltration"],
    passStatus: "Anonymous users cannot join Teams meetings without lobby approval.",
    partialStatus: "Anonymous users can join but are placed in the lobby by default.",
    failStatus: "Anonymous users can join meetings directly without lobby.",
  },
  {
    id: "meeting_externalrequestcontrol",
    title: "Control external access requests in Teams",
    category: "Apps",
    maxScore: 3,
    userImpact: "Moderate",
    implementationCost: "Low",
    tier: "Bonus",
    service: "Microsoft Teams",
    threats: ["Data Exfiltration"],
    passStatus: "External access is restricted to specific allowed domains.",
    partialStatus: "External access is enabled with no domain allowlist.",
    failStatus: "External access is unrestricted. Any external domain can contact internal users.",
  },
  {
    id: "mdo_connectionfilter",
    title: "Configure the connection filter policy with allowed IP addresses",
    category: "Apps",
    maxScore: 3,
    userImpact: "Low",
    implementationCost: "Low",
    tier: "Bonus",
    service: "Defender for Office 365",
    threats: ["Phishing"],
    passStatus: "Connection filter allow-list configured with approved partner IPs.",
    partialStatus: "Connection filter exists but uses the default catch-all.",
    failStatus: "The allowed IP addresses list in the connection filter policy is empty.",
  },

  // ——— Data (5 controls)
  {
    id: "dlp_datalossprevention",
    title: "Configure data loss prevention policies for sensitive information types",
    category: "Data",
    maxScore: 5,
    userImpact: "Low",
    implementationCost: "High",
    tier: "Core",
    service: "Microsoft Purview",
    threats: ["Data Exfiltration"],
    passStatus: "DLP policies are enabled for Emirates ID, passport, and financial data across M365 locations.",
    partialStatus: "DLP policies exist for payment card data only; PII and government ID types not covered.",
    failStatus: "No DLP policies are configured. Sensitive data can flow out of the tenant freely.",
  },
  {
    id: "mip_purviewlabelconsent",
    title: "Ensure sensitivity labels are published and enforced",
    category: "Data",
    maxScore: 5,
    userImpact: "Low",
    implementationCost: "Moderate",
    tier: "Core",
    service: "Microsoft Purview",
    threats: ["Data Exfiltration"],
    passStatus: "4 sensitivity labels published with mandatory labelling on SharePoint and OneDrive.",
    partialStatus: "Sensitivity labels are published but not enforced. Users can skip labelling.",
    failStatus: "Sensitivity labels are not published. Data classification is not in use.",
  },
  {
    id: "CustomerLockBoxEnabled",
    title: "Enable Customer Lockbox for admin access approvals",
    category: "Data",
    maxScore: 3,
    userImpact: "Low",
    implementationCost: "Low",
    tier: "Defense in Depth",
    service: "Microsoft 365",
    threats: ["Data Exfiltration"],
    passStatus: "Customer Lockbox is enabled. Microsoft engineers require tenant approval to access data.",
    partialStatus: "Customer Lockbox is enabled for some workloads only.",
    failStatus: "Customer Lockbox is not enabled. Microsoft support access to tenant data is unmonitored.",
  },
  {
    id: "AuditLogSearch",
    title: "Ensure unified audit log search is enabled",
    category: "Data",
    maxScore: 4,
    userImpact: "Low",
    implementationCost: "Low",
    tier: "Core",
    service: "Microsoft Purview",
    threats: ["Data Exfiltration", "Insider Threat"],
    passStatus: "Unified audit log is enabled; 180-day retention configured.",
    partialStatus: "Unified audit log is enabled with default 90-day retention.",
    failStatus: "Unified audit log is disabled. Investigations have no telemetry trail.",
  },
  {
    id: "RetentionLabelsPublished",
    title: "Publish retention labels for records management",
    category: "Data",
    maxScore: 4,
    userImpact: "Low",
    implementationCost: "Moderate",
    tier: "Defense in Depth",
    service: "Microsoft Purview",
    threats: ["Compliance"],
    passStatus: "5 retention labels published covering 1yr/3yr/7yr/indefinite tiers.",
    partialStatus: "Retention labels are published but only 1 tier is in active use.",
    failStatus: "No retention labels published. All content is retained indefinitely by default.",
  },

  // ——— Device (3 controls)
  {
    id: "IntuneCompliancePolicies",
    title: "Ensure device compliance policies are assigned to all users",
    category: "Device",
    maxScore: 5,
    userImpact: "Moderate",
    implementationCost: "Moderate",
    tier: "Core",
    service: "Microsoft Intune",
    threats: ["Malware", "Data Exfiltration"],
    passStatus: "Compliance policies assigned to all Windows, macOS, iOS, and Android devices.",
    partialStatus: "Compliance policies assigned to Windows only; mobile device OSes are unmanaged.",
    failStatus: "No device compliance policies assigned. Device posture is unenforced.",
  },
  {
    id: "BitLockerRequired",
    title: "Require BitLocker disk encryption on managed Windows devices",
    category: "Device",
    maxScore: 4,
    userImpact: "Low",
    implementationCost: "Low",
    tier: "Core",
    service: "Microsoft Intune",
    threats: ["Data Exfiltration"],
    passStatus: "BitLocker is required on 100% of Windows devices. 94% report compliant.",
    partialStatus: "BitLocker is required but 23% of Windows devices have not yet enrolled recovery keys.",
    failStatus: "BitLocker is not required. Laptops can be imaged and data extracted if lost.",
  },
  {
    id: "AATP_DefenderForIdentity",
    title: "Deploy Microsoft Defender for Identity sensors on domain controllers",
    category: "Device",
    maxScore: 5,
    userImpact: "Moderate",
    implementationCost: "High",
    tier: "Defense in Depth",
    service: "Defender for Identity",
    threats: ["Elevation of Privilege", "Malware"],
    passStatus: "Defender for Identity sensors deployed on all 6 domain controllers; all healthy.",
    partialStatus: "Defender for Identity deployed on 4 of 6 domain controllers.",
    failStatus: "Defender for Identity is not installed. Lateral movement detection gap.",
  },
];

function generateSecureScore(e: DemoEntity): unknown {
  // Per-control pass probability proportional to entity maturity.
  const passProb = e.index / 100;
  // Use deterministic randomness seeded by entity id so re-seeds produce the same pattern
  // (makes the demo reproducible for screenshots + screen recordings).
  const rng = seedRandom(e.id);

  const controls = SECURE_SCORE_CATALOG.map((c) => {
    const roll = rng();
    let score: number;
    let status: string;
    if (roll < passProb * 0.85) {
      score = c.maxScore;
      status = c.passStatus;
    } else if (roll < passProb * 0.85 + 0.25) {
      score = Math.max(1, Math.floor(c.maxScore * (0.4 + rng() * 0.3)));
      status = c.partialStatus;
    } else {
      score = 0;
      status = c.failStatus;
    }
    return {
      id: c.id,
      title: c.title,
      category: c.category,
      score,
      maxScore: c.maxScore,
      implementationStatus: status,
      state: "Default",
      userImpact: c.userImpact,
      implementationCost: c.implementationCost,
      tier: c.tier,
      service: c.service,
      threats: c.threats,
    };
  });

  const currentScore = controls.reduce((n, c) => n + c.score, 0);
  const maxScore = controls.reduce((n, c) => n + c.maxScore, 0);
  const percent = maxScore
    ? Math.round((currentScore / maxScore) * 1000) / 10
    : 0;

  return {
    currentScore,
    maxScore,
    percent,
    licensedUserCount: 800,
    activeUserCount: 720,
    enabledServices: ["AAD", "Exchange", "SharePoint", "Intune", "Purview"],
    controls,
    fetchedAt: new Date(Date.now() - e.syncMinsAgo * 60_000).toISOString(),
  };
}

/**
 * Deterministic PRNG seeded by a string. Simple but stable — we just need reproducible
 * per-tenant randomness so the same demo tenant always shows the same control pattern
 * across reseeds. Not cryptographically secure; doesn't need to be.
 */
function seedRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  };
}
