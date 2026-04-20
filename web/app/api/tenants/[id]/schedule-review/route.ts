import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getTenant, setScheduledReview } from "@/lib/db/tenants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// scheduledFor is either an ISO date (YYYY-MM-DD) or null to clear.
const Schema = z.object({
  scheduledFor: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
    .nullable(),
  note: z.string().trim().max(500).nullable().optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const tenant = getTenant(id);
  if (!tenant) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const note = parsed.data.note ?? null;
  setScheduledReview(id, parsed.data.scheduledFor, note && note.length > 0 ? note : null);
  return NextResponse.json({
    ok: true,
    scheduledFor: parsed.data.scheduledFor,
    note,
  });
}
