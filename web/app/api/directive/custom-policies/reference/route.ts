import { NextResponse } from "next/server";
import { gateDirectiveRoute } from "@/lib/directive/engine";
import {
  DIRECTORY_ROLE_TEMPLATES,
  KNOWN_APPS,
  BUILT_IN_AUTH_STRENGTHS,
  GUEST_OR_EXTERNAL_USER_TYPES,
} from "@/lib/directive/custom-policies/reference-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/directive/custom-policies/reference — feeds the wizard its
 * pickers. Everything returned here is cross-tenant-stable (role template
 * IDs, Microsoft-published app GUIDs, built-in authentication strengths)
 * so the data does not depend on which entity is being targeted.
 */
export async function GET() {
  const gate = await gateDirectiveRoute("viewer");
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    roles: DIRECTORY_ROLE_TEMPLATES,
    apps: KNOWN_APPS,
    authStrengths: BUILT_IN_AUTH_STRENGTHS,
    guestTypes: GUEST_OR_EXTERNAL_USER_TYPES,
  });
}
