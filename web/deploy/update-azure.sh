#!/usr/bin/env bash
# update-azure.sh — update a Mizan Azure Container App to a new image tag.
#
# Mizan v1.1 introduced an in-app "Check for updates" feature that surfaces
# new releases from GitHub, but applying the update still needs a CLI roll
# because the Container App revision has to be re-created with the new image.
# Run this from a shell with `az` installed and `az login` completed.
#
# Usage:
#   ./update-azure.sh                                    # pull :latest
#   ./update-azure.sh --tag 1.1.2                        # pin a specific version
#   ./update-azure.sh --rg <name> --app <name> --tag 1.1.2
#   ./update-azure.sh --base-url https://posture.example.com --tag 1.1.2
#
# The script is idempotent — running it twice with the same tag is a no-op
# (Azure skips revision creation when image + env are unchanged).

set -euo pipefail

# ---- Defaults --------------------------------------------------------------
RG=""
APP=""
TAG="latest"
BASE_URL=""
IMAGE_REPO="ghcr.io/ohomaidi/mizan"

# ---- Parse arguments -------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --rg|--resource-group)    RG="$2"; shift 2 ;;
    --app|--name)             APP="$2"; shift 2 ;;
    --tag|--version)          TAG="$2"; shift 2 ;;
    --base-url|--app-base-url) BASE_URL="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *) echo "Unknown argument: $1" >&2; exit 64 ;;
  esac
done

# ---- Auto-discover the container app if not specified ---------------------
if [[ -z "$APP" || -z "$RG" ]]; then
  echo "→ Auto-discovering Mizan Container App in this subscription..."
  DISCOVERED="$(az containerapp list \
    --query "[?contains(properties.template.containers[0].image, 'mizan')] | [0].{name: name, rg: resourceGroup}" \
    -o json 2>/dev/null || echo '{}')"
  if [[ "$DISCOVERED" == "{}" || "$DISCOVERED" == "null" ]]; then
    echo "  ✗ Could not auto-discover. Pass --rg <group> --app <name>." >&2
    exit 1
  fi
  APP="${APP:-$(echo "$DISCOVERED" | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')}"
  RG="${RG:-$(echo "$DISCOVERED" | python3 -c 'import json,sys; print(json.load(sys.stdin)["rg"])')}"
  echo "  ✓ Found $APP in $RG"
fi

# ---- Derive APP_BASE_URL from the app's FQDN if not provided --------------
if [[ -z "$BASE_URL" ]]; then
  FQDN="$(az containerapp show -n "$APP" -g "$RG" \
    --query 'properties.configuration.ingress.fqdn' -o tsv 2>/dev/null || true)"
  if [[ -n "$FQDN" ]]; then
    BASE_URL="https://$FQDN"
    echo "→ Derived APP_BASE_URL=$BASE_URL from Container App ingress FQDN."
  else
    echo "  ! No FQDN found; skipping APP_BASE_URL. Redirects will fall back to x-forwarded-host."
  fi
fi

IMAGE="${IMAGE_REPO}:${TAG}"

# ---- Show what we're about to do ------------------------------------------
cat <<SUMMARY

────────────────────────────────────────────────────────────
  Update Mizan Container App
────────────────────────────────────────────────────────────
  Resource group : $RG
  Container App  : $APP
  New image      : $IMAGE
  APP_BASE_URL   : ${BASE_URL:-<unset — will use x-forwarded-host>}
────────────────────────────────────────────────────────────

SUMMARY

# ---- Apply update ---------------------------------------------------------
ARGS=(--name "$APP" --resource-group "$RG" --image "$IMAGE")
if [[ -n "$BASE_URL" ]]; then
  ARGS+=(--set-env-vars "APP_BASE_URL=$BASE_URL")
fi

echo "→ Running az containerapp update..."
az containerapp update "${ARGS[@]}" --output table

# ---- Surface the dashboard URL so the user can smoke-test -----------------
NEW_FQDN="$(az containerapp show -n "$APP" -g "$RG" \
  --query 'properties.configuration.ingress.fqdn' -o tsv)"
echo
echo "✓ Update applied. Dashboard URL: https://$NEW_FQDN"
echo "  Give it 30–60s for the new revision to become active, then refresh."
echo
echo "Smoke-check:"
echo "  curl -sI https://$NEW_FQDN/api/auth/me | head -2"
echo "  curl -sI https://$NEW_FQDN/vulnerabilities | head -2"
