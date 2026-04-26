import { NextResponse } from "next/server";
import { APP_VERSION, CONTAINER_IMAGE, GITHUB_REPO } from "@/lib/version";
import { apiRequireRole } from "@/lib/auth/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/updates/apply — one-click self-upgrade for Azure Container Apps.
 *
 * Triggers an in-place image swap on the container app this dashboard is
 * running inside, using the container app's system-assigned managed
 * identity to authenticate against Azure Resource Manager. The upgrade
 * itself is non-blocking: ARM accepts the PATCH, ACA spins up a new
 * revision with the new image, and traffic shifts when the new revision
 * passes its readiness probe (~1–2 minutes typically).
 *
 *   Sequence:
 *     1. Auth: caller must be admin in Mizan's RBAC (sign-in required).
 *     2. Resolve runtime: `CONTAINER_APP_NAME` + `MIZAN_AZURE_RESOURCE_ID`
 *        + `IDENTITY_ENDPOINT` must all be present. If any is missing,
 *        return 412 with a hint pointing at docs/15-self-upgrade.md.
 *     3. Pick the target version: caller-supplied `version` in the body,
 *        or fall back to the latest tagged release on GitHub.
 *     4. Refuse to "upgrade" sideways: target must be strictly greater
 *        than the running version.
 *     5. Mint an ARM token via the container app's Identity service
 *        (IMDS for ACA — `IDENTITY_ENDPOINT` + `IDENTITY_HEADER`
 *        injected by the runtime).
 *     6. PATCH the container app's `properties.template.containers[0]
 *        .image` to `${CONTAINER_IMAGE}:${target}` via ARM. ACA does the
 *        rest — pull, spin up new revision, shift traffic.
 *     7. Return 202 with the operation handle so the UI can poll.
 *
 * Failure modes the UI must handle gracefully:
 *   - 401 unauthenticated, 403 not admin
 *   - 412 self-upgrade pre-conditions not met (managed identity off,
 *     resource id not injected, etc.)
 *   - 502 IMDS / ARM token failure (managed identity not assigned the
 *     `Container Apps Contributor` role on its own RG — common for
 *     deployments that enabled MI but didn't grant the role)
 *   - 502 ARM PATCH failure (image not pullable, quota, etc.)
 *
 * This endpoint is ONLY callable on ACA deployments. Self-hosted Docker
 * deployments must use the manual `docker pull + recreate` path; that
 * surface keeps showing the snippet in the AboutPanel.
 */

const ARM_API_VERSION = "2024-03-01";
const ARM_RESOURCE = "https://management.azure.com";

type ApplyRequest = {
  /** Tag to upgrade to. Defaults to latest GitHub Release if omitted. */
  version?: string;
};

type ApplyOk = {
  ok: true;
  from: string;
  to: string;
  image: string;
  /** ARM operation status URL — UI can poll for revision rollout state. */
  asyncOperation: string | null;
  /** Container app resource name, surfaced for display. */
  containerApp: string;
};

type ApplyErr = {
  ok: false;
  reason: string;
  detail?: string;
};

function compareSemver(a: string, b: string): number {
  const clean = (v: string) => v.replace(/^v/i, "").split("-")[0];
  const pa = clean(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = clean(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * Resolve the latest tagged release on GitHub. Used when the caller
 * doesn't pass an explicit version — they just clicked "Upgrade".
 * Returns null if GitHub is unreachable; the route then 412s rather
 * than blindly upgrading to nothing.
 */
async function resolveLatestVersion(): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": `Mizan/${APP_VERSION}`,
    };
    const token = process.env.GITHUB_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers, cache: "no-store" },
    );
    if (!r.ok) return null;
    const body = (await r.json()) as { tag_name?: string };
    return (body.tag_name ?? "").replace(/^v/i, "") || null;
  } catch {
    return null;
  }
}

/**
 * Get an Azure Resource Manager bearer token from the container app's
 * managed identity. ACA exposes IMDS via `IDENTITY_ENDPOINT` +
 * `IDENTITY_HEADER` env vars (different from VM IMDS). The
 * `api-version=2019-08-01` is required.
 */
async function getArmToken(): Promise<{ token: string } | { error: string }> {
  const endpoint = process.env.IDENTITY_ENDPOINT;
  const header = process.env.IDENTITY_HEADER;
  if (!endpoint || !header) {
    return {
      error:
        "Managed identity not enabled on this container app — IDENTITY_ENDPOINT / IDENTITY_HEADER not present.",
    };
  }
  try {
    const url = new URL(endpoint);
    url.searchParams.set("resource", ARM_RESOURCE);
    url.searchParams.set("api-version", "2019-08-01");
    const res = await fetch(url.toString(), {
      headers: { "X-IDENTITY-HEADER": header },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        error: `Failed to mint ARM token (HTTP ${res.status}): ${text.slice(0, 200)}`,
      };
    }
    const body = (await res.json()) as { access_token?: string };
    if (!body.access_token) {
      return { error: "ARM token response missing access_token field." };
    }
    return { token: body.access_token };
  } catch (err) {
    return { error: `IMDS unreachable: ${(err as Error).message}` };
  }
}

export async function POST(req: Request): Promise<NextResponse<ApplyOk | ApplyErr>> {
  const gate = await apiRequireRole("admin");
  if (!gate.ok) return gate.response as NextResponse<ApplyErr>;

  // Pre-conditions — fail fast with actionable hints.
  const containerAppName = process.env.CONTAINER_APP_NAME;
  const resourceId = process.env.MIZAN_AZURE_RESOURCE_ID;
  if (!containerAppName) {
    return NextResponse.json<ApplyErr>(
      {
        ok: false,
        reason: "not_aca",
        detail:
          "Self-upgrade is only available on Azure Container Apps deployments. Self-hosted Docker / Kubernetes deployments must use the manual upgrade path documented in the dashboard.",
      },
      { status: 412 },
    );
  }
  if (!resourceId) {
    return NextResponse.json<ApplyErr>(
      {
        ok: false,
        reason: "missing_resource_id",
        detail:
          "MIZAN_AZURE_RESOURCE_ID env var not injected. Re-deploy with the latest azure-container-apps.bicep template, or set it manually to the container app's full ARM resource ID.",
      },
      { status: 412 },
    );
  }

  // Body — optional explicit target version.
  let body: ApplyRequest = {};
  try {
    body = (await req.json()) as ApplyRequest;
  } catch {
    /* no body / invalid JSON — fine, fall through to "latest". */
  }

  const target = (body.version ?? (await resolveLatestVersion()) ?? "").replace(
    /^v/i,
    "",
  );
  if (!target) {
    return NextResponse.json<ApplyErr>(
      {
        ok: false,
        reason: "no_target",
        detail:
          "Could not resolve a target version. Either pass `version` in the request body, or ensure GitHub Releases is reachable.",
      },
      { status: 412 },
    );
  }
  if (compareSemver(target, APP_VERSION) <= 0) {
    return NextResponse.json<ApplyErr>(
      {
        ok: false,
        reason: "not_an_upgrade",
        detail: `Target ${target} is not newer than the running version ${APP_VERSION}.`,
      },
      { status: 409 },
    );
  }

  // Mint an ARM token via the container app's managed identity.
  const tokenRes = await getArmToken();
  if ("error" in tokenRes) {
    return NextResponse.json<ApplyErr>(
      {
        ok: false,
        reason: "arm_token_failed",
        detail: tokenRes.error,
      },
      { status: 502 },
    );
  }

  // GET the current container app spec — we PATCH only the image field
  // back, but ACA's PATCH semantics require sending the full template
  // when changing containers, so fetch first.
  const armUrl = `${ARM_RESOURCE}${resourceId}?api-version=${ARM_API_VERSION}`;
  let getRes: Response;
  try {
    getRes = await fetch(armUrl, {
      headers: { Authorization: `Bearer ${tokenRes.token}` },
      cache: "no-store",
    });
  } catch (err) {
    return NextResponse.json<ApplyErr>(
      {
        ok: false,
        reason: "arm_unreachable",
        detail: (err as Error).message,
      },
      { status: 502 },
    );
  }

  if (!getRes.ok) {
    const text = await getRes.text().catch(() => "");
    return NextResponse.json<ApplyErr>(
      {
        ok: false,
        reason: "arm_get_failed",
        detail: `ARM GET ${getRes.status}: ${text.slice(0, 300)}`,
      },
      { status: 502 },
    );
  }

  type ContainerAppShape = {
    location: string;
    properties: {
      template: {
        containers: Array<{
          name: string;
          image: string;
          [k: string]: unknown;
        }>;
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  const current = (await getRes.json()) as ContainerAppShape;

  const newImage = `${CONTAINER_IMAGE}:${target}`;
  // Update every container that's running the Mizan image. Multi-container
  // ACA pods are uncommon but supported; we only swap containers whose
  // image already starts with the Mizan image prefix so a sidecar
  // (e.g. cloudflared) is left alone.
  let swapped = 0;
  const containers = current.properties.template.containers.map((c) => {
    if (c.image && c.image.startsWith(CONTAINER_IMAGE + ":")) {
      swapped += 1;
      return { ...c, image: newImage };
    }
    return c;
  });

  if (swapped === 0) {
    return NextResponse.json<ApplyErr>(
      {
        ok: false,
        reason: "no_matching_container",
        detail: `No container in the app matched the expected image prefix ${CONTAINER_IMAGE}:.`,
      },
      { status: 409 },
    );
  }

  const patchBody = {
    properties: {
      template: {
        ...current.properties.template,
        containers,
      },
    },
  };

  let patchRes: Response;
  try {
    patchRes = await fetch(armUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenRes.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patchBody),
    });
  } catch (err) {
    return NextResponse.json<ApplyErr>(
      {
        ok: false,
        reason: "arm_unreachable",
        detail: (err as Error).message,
      },
      { status: 502 },
    );
  }

  if (!patchRes.ok) {
    const text = await patchRes.text().catch(() => "");
    return NextResponse.json<ApplyErr>(
      {
        ok: false,
        reason: "arm_patch_failed",
        detail: `ARM PATCH ${patchRes.status}: ${text.slice(0, 500)}`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json<ApplyOk>(
    {
      ok: true,
      from: APP_VERSION,
      to: target,
      image: newImage,
      // ACA returns 200 OK with the updated body for in-place revisions;
      // the new revision spins up asynchronously. The Location/Operation
      // headers are sometimes set, sometimes not — surface what we have.
      asyncOperation:
        patchRes.headers.get("azure-asyncoperation") ??
        patchRes.headers.get("location") ??
        null,
      containerApp: containerAppName,
    },
    { status: 202 },
  );
}
