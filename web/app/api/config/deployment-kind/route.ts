import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  getDeploymentKind,
  isDeploymentKindLocked,
  setDeploymentKind,
} from "@/lib/config/deployment-kind";
import { getSetupState } from "@/lib/config/setup-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  kind: z.enum(["council", "executive"]),
});

export async function GET() {
  return NextResponse.json({
    kind: getDeploymentKind(),
    locked: isDeploymentKindLocked(),
  });
}

export async function POST(req: NextRequest) {
  // Same lock semantics as deployment-mode: cannot be flipped post-install.
  if (isDeploymentKindLocked()) {
    return NextResponse.json(
      {
        error: "locked",
        message:
          "Deployment kind was set during install and cannot be changed. Redeploy to change it.",
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
  setDeploymentKind(parsed.data.kind);
  return NextResponse.json({ kind: parsed.data.kind, locked: true });
}
