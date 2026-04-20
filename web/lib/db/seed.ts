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
function seedDemoBrandingIfAbsent(db: Database.Database): void {
  const existing = db
    .prepare("SELECT 1 FROM app_config WHERE key = 'branding'")
    .get() as { 1: number } | undefined;
  if (existing) return;
  const demo = {
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
  db.prepare(
    "INSERT INTO app_config (key, value_json) VALUES ('branding', ?)",
  ).run(JSON.stringify(demo));
}

export function seedDemoTenantsIfEmpty(db: Database.Database): void {
  // Seeding is **off by default** so a clean customer install stays clean.
  // Set SCSC_SEED_DEMO=true in `.env.local` (dev / demo) to opt in.
  if ((process.env.SCSC_SEED_DEMO ?? "false").toLowerCase() !== "true") return;

  // Demo installs also default to Sharjah Cybersecurity Council branding so the
  // dashboard looks unchanged from its old pre-productization baseline. A user
  // who edits branding via Settings won't have it reverted here.
  // Written inline to avoid a client<-seed<-branding<-config-store<-client cycle.
  seedDemoBrandingIfAbsent(db);
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

  tx(DEMO);
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
  const staleCA = Math.max(0, Math.round((100 - e.index) * 0.08));
  const oauthGrants = Math.max(0, Math.round(Math.random() * 4));
  return [
    {
      packId: "pack.failedAdminSignIns",
      name: "Failed admin sign-ins (last 24h)",
      rowCount: failedSignIns,
      schema: [
        { name: "UserPrincipalName", type: "string" },
        { name: "IPAddress", type: "string" },
        { name: "ResultType", type: "int" },
        { name: "count_", type: "long" },
      ],
      rows: Array.from({ length: Math.min(failedSignIns, 5) }, (_, i) => ({
        UserPrincipalName: `admin${i + 1}@${e.domain}`,
        IPAddress: `185.220.${Math.round(Math.random() * 255)}.${Math.round(Math.random() * 255)}`,
        ResultType: 50126,
        count_: Math.round(5 + Math.random() * 40),
      })),
      executedAt: nowIso,
      error: null,
    },
    {
      packId: "pack.staleCaPolicies",
      name: "Conditional Access policies not modified in 180 days",
      rowCount: staleCA,
      schema: [
        { name: "PolicyId", type: "string" },
        { name: "last_modified", type: "datetime" },
      ],
      rows: Array.from({ length: Math.min(staleCA, 5) }, (_, i) => ({
        PolicyId: `${crypto.randomBytes(8).toString("hex")}-ca-${i}`,
        last_modified: new Date(Date.now() - (200 + Math.round(Math.random() * 500)) * 86_400_000).toISOString(),
      })),
      executedAt: nowIso,
      error: null,
    },
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
    const ago = (i * 37 + 11) % (60 * 24 * 30); // within last 30 days
    out.push({
      id: `ru-${i.toString(16)}-${first[0].toLowerCase()}${last[0].toLowerCase()}`,
      userPrincipalName: upn,
      displayName: `${first} ${last}`,
      riskLevel: level,
      riskState: state,
      riskLastUpdatedDateTime: new Date(Date.now() - ago * 60_000).toISOString(),
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
    createdDateTime: string;
    lastUpdateDateTime: string;
    alertCount: number | null;
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
    out.push({
      id: `inc-${i.toString(16).padStart(5, "0")}`,
      displayName: pick(INCIDENT_TEMPLATES, i * 17 + 3),
      severity: sev,
      status,
      classification: status === "resolved" ? pick(["truePositive", "informationalExpectedActivity", "falsePositive"], i * 7) : null,
      createdDateTime: new Date(Date.now() - createdMinsAgo * 60_000).toISOString(),
      lastUpdateDateTime: new Date(Date.now() - updatedMinsAgo * 60_000).toISOString(),
      alertCount: 1 + (i * 3 + 1) % 5,
    });
  }
  return out;
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
