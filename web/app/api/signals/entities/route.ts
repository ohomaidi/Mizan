import { NextResponse } from "next/server";
import { loadEntities } from "@/lib/compute/aggregate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ entities: loadEntities() });
}
