import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  listOosMarks,
  listOosMarksScoped,
  markOutOfScope,
  unmarkOutOfScope,
} from "@/lib/db/compliance-oos";
import { getActiveFramework } from "@/lib/config/compliance-framework";
import { apiRequireRole } from "@/lib/auth/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Out-of-Scope (OOS) marker registry for the active compliance framework.
 *
 * Three operations:
 *   GET    [?tenantId=...]              list marks (all tiers, or scoped)
 *   POST   { tenantId|null, scopeKind, scopeId, reason? }   add a mark
 *   DELETE { tenantId|null, scopeKind, scopeId }            remove a mark
 *
 * Two tiers:
 *   - tenantId: null      → GLOBAL  (every entity skips this clause/control)
 *   - tenantId: "<uuid>"  → PER-ENTITY (only that tenant skips it)
 *
 * Both POST and DELETE are idempotent. The framework_id is always derived
 * server-side from the active branding so an operator can't accidentally
 * mark a clause OOS in a framework they're not actually using.
 *
 * Permission: analyst+ for writes (admin not strictly required — this is
 * scoring config, not a destructive action). Reads open to all signed-in.
 */

const PostSchema = z.object({
  tenantId: z.string().nullable(),
  scopeKind: z.enum(["clause", "control"]),
  scopeId: z.string().min(1),
  reason: z.string().max(500).nullable().optional(),
});

const DeleteSchema = z.object({
  tenantId: z.string().nullable(),
  scopeKind: z.enum(["clause", "control"]),
  scopeId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const gate = await apiRequireRole("viewer");
  if (!gate.ok) return gate.response;
  const { frameworkId } = getActiveFramework();
  const url = new URL(req.url);
  const scopeParam = url.searchParams.get("tenantId");
  // `?tenantId=` (empty) is treated as "global tier only".
  // No param at all = "every mark on this framework, both tiers".
  if (scopeParam === null) {
    return NextResponse.json({
      frameworkId,
      marks: listOosMarks(frameworkId),
    });
  }
  const tenantId = scopeParam.length === 0 ? null : scopeParam;
  return NextResponse.json({
    frameworkId,
    marks: listOosMarksScoped(frameworkId, tenantId),
  });
}

export async function POST(req: NextRequest) {
  const gate = await apiRequireRole("analyst");
  if (!gate.ok) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { frameworkId } = getActiveFramework();
  const mark = markOutOfScope({
    tenantId: parsed.data.tenantId,
    frameworkId,
    scopeKind: parsed.data.scopeKind,
    scopeId: parsed.data.scopeId,
    reason: parsed.data.reason ?? null,
    markedByUserId: gate.user?.id ?? null,
  });
  return NextResponse.json({ frameworkId, mark });
}

export async function DELETE(req: NextRequest) {
  const gate = await apiRequireRole("analyst");
  if (!gate.ok) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { frameworkId } = getActiveFramework();
  const removed = unmarkOutOfScope({
    tenantId: parsed.data.tenantId,
    frameworkId,
    scopeKind: parsed.data.scopeKind,
    scopeId: parsed.data.scopeId,
  });
  return NextResponse.json({ frameworkId, removed });
}
