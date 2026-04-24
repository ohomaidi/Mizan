import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import {
  createCustomPolicy,
  listCustomPolicies,
} from "@/lib/directive/custom-policies/store";
import { CustomCaPolicySpecSchema } from "@/lib/directive/custom-policies/types";
import { inferRiskTier } from "@/lib/directive/custom-policies/builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  spec: CustomCaPolicySpecSchema.optional(),
});

/**
 * GET /api/directive/custom-policies — list drafts.
 * POST /api/directive/custom-policies — create a new draft. Body may omit
 * the full spec; we'll seed one with safe defaults.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  const rows = listCustomPolicies({ status: "draft", limit: 500 });
  return NextResponse.json({
    policies: rows.map((r) => {
      let spec: ReturnType<typeof CustomCaPolicySpecSchema.parse> | null = null;
      try {
        spec = CustomCaPolicySpecSchema.parse(JSON.parse(r.spec_json));
      } catch {
        spec = null;
      }
      return {
        id: r.id,
        ownerUserId: r.owner_user_id,
        name: r.name,
        description: r.description,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        riskTier: spec ? inferRiskTier(spec) : "low",
        usersKind: spec?.users.include.kind ?? "all",
        appsTarget: spec?.apps.target ?? "all",
        grantKind: spec?.grant.kind ?? "grantWithRequirements",
        state: spec?.state ?? "enabledForReportingButNotEnforced",
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const gate = await gateDirectiveRoute("admin");
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Seed a default spec if none provided — gives the wizard a clean
  // starting point (All users, All apps, require MFA, report-only).
  const defaultSpec = CustomCaPolicySpecSchema.parse({
    name: parsed.data.name,
    state: "enabledForReportingButNotEnforced",
    users: {
      include: { kind: "all", roleIds: [], guestTypes: [], externalTenantMembershipKind: "all" },
      exclude: { roleIds: [], excludeGlobalAdmins: true },
    },
    apps: { target: "all", includeAppIds: [], excludeAppIds: [] },
    conditions: {
      userRiskLevels: [],
      signInRiskLevels: [],
      platforms: [],
      clientAppTypes: [],
      locations: "any",
    },
    grant: {
      kind: "grantWithRequirements",
      operator: "OR",
      requireMfa: true,
      requireCompliantDevice: false,
      requireHybridJoinedDevice: false,
      requireApprovedClientApp: false,
      requireCompliantApplication: false,
      requirePasswordChange: false,
    },
    session: {
      signInFrequency: { enabled: false, type: "hours", value: 4 },
      persistentBrowser: "default",
      applicationEnforcedRestrictions: false,
    },
  });

  const id = createCustomPolicy({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    spec: parsed.data.spec ?? defaultSpec,
    ownerUserId: gate.user?.id ?? null,
  });

  return NextResponse.json({ id }, { status: 201 });
}
