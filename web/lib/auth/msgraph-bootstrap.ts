import "server-only";

/**
 * Device-code OAuth flow against Microsoft Entra, used by the first-run setup
 * wizard to create the customer's Entra app registrations on their behalf
 * without requiring them to pre-register a bootstrap app.
 *
 * Uses the "Microsoft Graph Command Line Tools" public client ID
 * (14d82eec-204b-4c2f-b7e8-296a70dab67e) — a multi-tenant client Microsoft
 * pre-registers for tools like Azure PowerShell and the Microsoft Graph
 * CLI. Third-party use is permitted and common. For v1.0 this keeps the
 * customer setup to zero prior Entra clicks; for v1.1 we'd register a
 * Mizan-branded bootstrap client for a cleaner consent screen.
 */

export const BOOTSTRAP_CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e";

// Scopes we need for auto-provisioning:
//   Application.ReadWrite.All  — create app registrations + secrets
//   User.Read                  — lookup the operator admin's identity
//   offline_access             — long-lived refresh (not strictly needed
//                                since our flow is single-use, but harmless)
const DEFAULT_SCOPES = [
  "Application.ReadWrite.All",
  "User.Read",
  "offline_access",
];

const DEVICE_CODE_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/devicecode";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

export type DeviceCodeStart = {
  deviceCode: string; // server-only, don't expose to UI
  userCode: string; // shown to user
  verificationUri: string; // where user opens on their device
  expiresIn: number; // seconds
  interval: number; // seconds between polls
  message: string; // Microsoft's pre-formatted "go to URL, enter code" string
};

export type DevicePollResult =
  | { kind: "pending" }
  | { kind: "slow_down"; interval: number }
  | { kind: "declined" }
  | { kind: "expired" }
  | { kind: "error"; message: string }
  | { kind: "success"; accessToken: string; tokenType: string; expiresIn: number };

/**
 * Ask Microsoft for a device code + verification URL. Returns the short-lived
 * state the caller should stash server-side and poll against.
 */
export async function startDeviceCode(
  tenant: string = "common",
  scopes: string[] = DEFAULT_SCOPES,
): Promise<DeviceCodeStart> {
  const url = DEVICE_CODE_URL.replace("/common/", `/${tenant}/`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: BOOTSTRAP_CLIENT_ID,
      scope: scopes.join(" "),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`device code request failed: HTTP ${res.status} — ${body}`);
  }
  const data = (await res.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
    message: string;
  };
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn: data.expires_in,
    interval: data.interval,
    message: data.message,
  };
}

/**
 * Poll Microsoft's token endpoint once with the stored device_code. Returns
 * `pending` if the user hasn't approved yet, `success` with a Graph access
 * token once they have, or a terminal error state.
 */
export async function pollDeviceToken(
  deviceCode: string,
  tenant: string = "common",
): Promise<DevicePollResult> {
  const url = TOKEN_URL.replace("/common/", `/${tenant}/`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: BOOTSTRAP_CLIENT_ID,
      device_code: deviceCode,
    }),
  });
  const body = (await res.json()) as {
    error?: string;
    error_description?: string;
    interval?: number;
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  };
  if (res.ok && body.access_token) {
    return {
      kind: "success",
      accessToken: body.access_token,
      tokenType: body.token_type ?? "Bearer",
      expiresIn: body.expires_in ?? 3600,
    };
  }
  switch (body.error) {
    case "authorization_pending":
      return { kind: "pending" };
    case "slow_down":
      return { kind: "slow_down", interval: body.interval ?? 10 };
    case "authorization_declined":
      return { kind: "declined" };
    case "expired_token":
    case "code_expired":
      return { kind: "expired" };
    default:
      return {
        kind: "error",
        message:
          body.error_description ??
          body.error ??
          `token endpoint returned HTTP ${res.status}`,
      };
  }
}
