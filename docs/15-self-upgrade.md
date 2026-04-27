# Self-Upgrade — One-click upgrades across every supported platform

**Shipped:** v2.5.6 — ACA self-upgrade (2026-04-27). v2.5.8 — Mac installer download (2026-04-27). v2.5.14 — Windows support dropped (2026-04-27).
**Applies to:** Mizan deployments on **Azure Container Apps** and **macOS (.pkg)**.
**Goal:** an admin can upgrade the dashboard from one Mizan version to another with a single click in `Settings → About & updates` — no shell access required for the common path.

This is the canonical reference for how the one-click upgrade works on each platform, what each requires, how to enable it on an existing deployment, and how to debug it when it doesn't.

## Platform matrix

| Runtime              | Detection signal                     | Upgrade UX                              | Self-upgrade-ready? |
|----------------------|--------------------------------------|-----------------------------------------|---------------------|
| Azure Container Apps | `CONTAINER_APP_NAME` env var         | **Upgrade now** button → ARM PATCH      | yes (v2.5.6+ Bicep) |
| macOS .pkg install   | `MIZAN_RUNTIME=mac` (LaunchAgent env)| **Download Mizan-X.Y.Z.pkg** button     | always              |
| Self-hosted Docker   | none of the above                    | Manual `docker pull` + recreate snippet | no — by design      |
| **Windows**          | n/a                                  | **Not supported** (v2.5.14+ — run inside Docker Desktop or WSL2) | n/a                 |

---

## 1. How the upgrade works

### 1A. Azure Container Apps

When the operator clicks **Upgrade to vX.Y.Z**:

1. The browser POSTs to `/api/updates/apply` (admin-only).
2. The endpoint reads two env vars Azure injects on every container app:
   - `IDENTITY_ENDPOINT` + `IDENTITY_HEADER` — the Identity service the runtime exposes when **system-assigned managed identity** is enabled.
   - `MIZAN_AZURE_RESOURCE_ID` — the full ARM resource ID of the container app (set by the deployment template).
3. Mints an ARM bearer token from the identity service for the resource `https://management.azure.com`.
4. `GET /subscriptions/.../containerApps/{name}` to read the current spec.
5. Locates every container in the template whose image starts with `ghcr.io/ohomaidi/mizan:` and rewrites its image tag to the new version.
6. `PATCH` the container app with the modified spec.
7. ACA spins up a new revision with the new image, runs its readiness probe, and shifts traffic when it passes (typically 1–2 minutes).
8. The browser shows "Upgrade requested — vX.Y.Z → vX.Y.Z+1. Refresh in 1–2 minutes."

The PATCH is in-place — there's no downtime if the new revision passes its readiness probe. The old revision keeps serving until the new one is ready.

### 1B. macOS .pkg install (v2.5.8+)

When the operator clicks **Download Mizan-X.Y.Z.pkg**:

1. The browser opens the GitHub Release asset URL — `https://github.com/ohomaidi/Mizan/releases/download/vX.Y.Z/mizan-X.Y.Z.pkg`. macOS recognises `.pkg` as binary and switches the navigation to a download.
2. Operator double-clicks the downloaded `.pkg` in Finder. The macOS Installer app opens.
3. The .pkg's postinstall script (`deploy/mac-build.sh`) runs as root:
   - `launchctl bootout` the currently-loaded `com.postureDashboard` LaunchAgent (kills the running node process).
   - Writes the new files to `/usr/local/posture-dashboard/`.
   - Re-writes the `~/Library/LaunchAgents/com.postureDashboard.plist` (idempotent — same plist, fresh DATA_DIR + log paths).
   - `launchctl bootstrap` the agent → fresh node process boots with the new code.
4. `DATA_DIR` lives at `~/Library/Application Support/posture-dashboard/` — outside the install root — so the SQLite database, uploaded logo, and config survive the upgrade untouched.
5. After ~5 seconds the dashboard is back at `http://localhost:8787`. Settings → About now reports the new installed version.

### 1C. Windows — not supported (v2.5.14+)

Native Windows install was briefly attempted in v2.5.8–v2.5.12 (.msi via WiX) and dropped in v2.5.14 after the build pipeline failed in CI five times in a row across three different rewrite attempts. Operators on Windows hosts run Mizan inside Docker Desktop or WSL2 — same image, same upgrade path as the self-hosted Docker section below.

(Original Windows install detail removed — kept here as a placeholder so existing links to §1C don't 404.)

---

## 2. What the deployment needs

Three things must be true for the **Upgrade** button to be interactive (rather than greyed out with "One-click upgrade not configured"):

| Requirement                         | What it does                                                                  | Where it's set                              |
|-------------------------------------|-------------------------------------------------------------------------------|---------------------------------------------|
| System-assigned managed identity    | Lets the running container request an ARM token via `IDENTITY_ENDPOINT`       | `containerApps.identity.type = SystemAssigned` |
| `Container Apps Contributor` role   | Grants the identity permission to PATCH its own container app                 | Role assignment on the RG (or app scope)    |
| `MIZAN_AZURE_RESOURCE_ID` env var   | Tells the running app which resource to PATCH                                 | Container's `env:` array in the template    |

Built-in role definition ID: `358470bc-b998-42bd-ab17-a7e34c199c0f` (Container Apps Contributor).

The `azure-container-apps.bicep` template at `web/deploy/azure-container-apps.bicep` wires all three for any new deployment in v2.5.6+.

---

## 3. Enabling on an existing deployment

If your deployment was created before v2.5.6, the **Upgrade** button shows a "One-click upgrade not configured" callout with a manual `az containerapp update ...` snippet underneath. Two ways to fix:

### Option A — Re-run the Bicep template

The template is idempotent. Re-running it on the same resource group and same `namePrefix` will:
- enable system-assigned identity on the existing container app,
- create the role assignment if it doesn't exist,
- inject `MIZAN_AZURE_RESOURCE_ID` on the next revision.

```bash
az deployment group create \
  --resource-group <your-rg> \
  --template-file web/deploy/azure-container-apps.bicep \
  --parameters \
      namePrefix=<your-prefix> \
      appBaseUrl=<your-https-url> \
      imageTag=<current-version>
```

### Option B — Patch in place (no Bicep)

Three commands:

```bash
# 1) Enable system-assigned managed identity
az containerapp identity assign \
  --name <your-app> --resource-group <your-rg> \
  --system-assigned

# 2) Capture the principal ID
PID=$(az containerapp show --name <your-app> --resource-group <your-rg> \
  --query identity.principalId -o tsv)

# 3) Grant Container Apps Contributor on the RG
az role assignment create \
  --assignee "$PID" \
  --role "Container Apps Contributor" \
  --scope $(az group show --name <your-rg> --query id -o tsv)

# 4) Inject MIZAN_AZURE_RESOURCE_ID — fetch the full id and set it
RESOURCE_ID=$(az containerapp show --name <your-app> --resource-group <your-rg> --query id -o tsv)
az containerapp update --name <your-app> --resource-group <your-rg> \
  --set-env-vars MIZAN_AZURE_RESOURCE_ID="$RESOURCE_ID"
```

After the next revision rolls, `Settings → About & updates` shows the **Upgrade now** button.

---

## 4. Operator security model

- The role grant is scoped to **the resource group**, not the subscription. The container app's identity cannot touch resources outside that RG.
- `Container Apps Contributor` allows the identity to PATCH/POST/DELETE container apps in the RG, including itself. It can NOT touch storage accounts, networks, or other Azure services.
- The dashboard endpoint (`/api/updates/apply`) is gated by Mizan's RBAC — only **admin** role can call it. Sign-in is required even on demo deployments unless `MIZAN_DEMO_MODE=true` (which auto-promotes the first sign-in).
- The endpoint refuses sideways/downgrade attempts (target must be strictly greater than the running version).
- The endpoint only swaps containers whose image already starts with `ghcr.io/ohomaidi/mizan:` — sidecars (e.g. cloudflared, Datadog agent) are left alone.

---

## 5. Failure modes the UI surfaces

| `reason`                  | Status | Meaning                                                                | Operator action                                                       |
|---------------------------|--------|------------------------------------------------------------------------|----------------------------------------------------------------------|
| `not_aca`                 | 412    | Not running in ACA. Self-upgrade endpoint is ACA-only.                 | Use manual Docker `pull + recreate` path.                            |
| `missing_resource_id`     | 412    | `MIZAN_AZURE_RESOURCE_ID` env var not set.                             | Re-run Bicep template OR set the env var manually (§3 Option B).     |
| `arm_token_failed`        | 502    | Couldn't mint ARM token. Identity not enabled or IMDS unreachable.    | Verify `az containerapp show ... --query identity.type` is SystemAssigned. |
| `arm_get_failed`          | 502    | ARM token works but read failed. Usually role missing.                | Verify the identity has `Container Apps Contributor` on the RG.      |
| `no_target`               | 412    | No version to upgrade to. GitHub unreachable + no body.version.        | Pass `version` explicitly, OR check GitHub API access.               |
| `not_an_upgrade`          | 409    | Target version ≤ running version.                                      | Already on target. Refresh the About panel.                          |
| `no_matching_container`   | 409    | No container in the spec matches `ghcr.io/ohomaidi/mizan:`.           | Manual upgrade — the template was customized.                        |
| `arm_patch_failed`        | 502    | PATCH failed. Image not pullable, quota exceeded, etc.                | Inspect the `detail` field; check ACA revision logs in Azure Portal. |

The "Upgrade failed" banner shows the `reason` code + the `detail` text from the endpoint, so the path forward is usually obvious.

---

## 6. Self-hosted (Docker) deployments

The Upgrade button is hidden on non-ACA deployments. The About panel shows the manual `docker pull` + recreate command. There is no plan to add one-click upgrade to the Docker path: the dashboard cannot reach the Docker daemon from inside its own container without mounting the host socket, which most operators rightly refuse.

---

## 7. Future work

- **Pinned versions.** Today the button always upgrades to the latest GitHub Release. A future drop will let an operator pick a specific version from a dropdown (release-channel UX), useful for staging vs production.
- **Rollback button.** If the new revision fails its readiness probe, ACA stops shifting traffic — the old revision keeps serving. We could add a "rollback to vX" button that PATCHes back. Today operators do this in the Azure Portal's Revision Management view.
- **Staged upgrades.** For large deployments, a "preview revision" PATCH that splits traffic 90/10 → 50/50 → 0/100 over a configurable window. Not yet planned.
