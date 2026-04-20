import { NextResponse } from "next/server";
import { closeCurrentSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await closeCurrentSession();
  return NextResponse.json({ ok: true });
}
