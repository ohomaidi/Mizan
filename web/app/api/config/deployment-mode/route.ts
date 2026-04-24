import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  getDeploymentMode,
  isDeploymentModeLocked,
  setDeploymentMode,
} from "@/lib/config/deployment-mode";
import { getSetupState } from "@/lib/config/setup-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  mode: z.enum(["observation", "directive"]),
});

export async function GET() {
  return NextResponse.json({
    mode: getDeploymentMode(),
    locked: isDeploymentModeLocked(),
  });
}

export async function POST(req: NextRequest) {
  // Two guards so the mode cannot be flipped after install:
  //   1. If the DB already has a value, reject. Idempotent for repeated
  //      calls with the same value during a wizard redo.
  //   2. If setup is already marked complete, reject. No post-setup path
  //      should be touching this.
  if (isDeploymentModeLocked()) {
    return NextResponse.json(
      {
        error: "locked",
        message:
          "Deployment mode was set during install and cannot be changed. Redeploy to change it.",
      },
      { status: 409 },
    );
  }
  if (getSetupState().completed) {
    return NextResponse.json(
      { error: "setup_already_complete" },
      { status: 409 },
    );
  }
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
  setDeploymentMode(parsed.data.mode);
  return NextResponse.json({ mode: parsed.data.mode, locked: true });
}
