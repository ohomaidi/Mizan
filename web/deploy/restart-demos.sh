#!/usr/bin/env bash
# restart-demos.sh — pull latest, rebuild once, restart both scscdemo + descdemo
# LaunchAgents. Designed for the Mac Mini that hosts both demo environments
# (scscdemo.zaatarlabs.com on :8787, desc.zaatarlabs.com on :8788).
#
# Usage:
#   bash deploy/restart-demos.sh             # pull + build + restart
#   bash deploy/restart-demos.sh --no-pull   # skip git pull (ship from working tree)
#
# Both demos share the same checkout and the same .next build. They differ
# only in env vars (MIZAN_DEPLOYMENT_MODE, DATA_DIR) set by their respective
# LaunchAgent plists.

set -euo pipefail

REPO="/Users/zaatarlabs/Projects/Sharjah-Council-Dashboard"
WEB="$REPO/web"
SCSC_PLIST="/Users/zaatarlabs/Library/LaunchAgents/com.zaatarlabs.scscdemo.plist"
DESC_PLIST="/Users/zaatarlabs/Library/LaunchAgents/com.zaatarlabs.descdemo.plist"
SCSC_SYNC_PLIST="/Users/zaatarlabs/Library/LaunchAgents/com.zaatarlabs.scscdemo.sync.plist"
DESC_SYNC_PLIST="/Users/zaatarlabs/Library/LaunchAgents/com.zaatarlabs.descdemo.sync.plist"

PULL=1
for arg in "$@"; do
  case "$arg" in
    --no-pull) PULL=0 ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "Unknown flag: $arg" >&2; exit 64 ;;
  esac
done

echo "→ Repo: $REPO"

if [[ $PULL -eq 1 ]]; then
  echo "→ git pull"
  cd "$REPO"
  git pull --ff-only
fi

cd "$WEB"
echo "→ npm ci"
npm ci --silent

echo "→ unload LaunchAgents"
launchctl unload "$SCSC_PLIST" 2>/dev/null || true
launchctl unload "$DESC_PLIST" 2>/dev/null || true
launchctl unload "$SCSC_SYNC_PLIST" 2>/dev/null || true
launchctl unload "$DESC_SYNC_PLIST" 2>/dev/null || true

echo "→ kill any stray next processes"
pkill -9 -f "next start" 2>/dev/null || true
sleep 3

echo "→ wipe .next"
rm -rf "$WEB/.next"

echo "→ next build"
cd "$WEB"
npx next build > /tmp/restart-demos-build.log 2>&1
tail -3 /tmp/restart-demos-build.log

echo "→ load LaunchAgents"
launchctl load "$SCSC_PLIST"
launchctl load "$SCSC_SYNC_PLIST"
launchctl load "$DESC_PLIST"
launchctl load "$DESC_SYNC_PLIST"

echo "→ wait 10s for first-paint"
sleep 10

echo "→ probe both"
SCSC=$(curl -sS -o /dev/null -w "%{http_code}" "http://127.0.0.1:8787/api/auth/me" --connect-timeout 5)
DESC=$(curl -sS -o /dev/null -w "%{http_code}" "http://127.0.0.1:8788/api/auth/me" --connect-timeout 5)
echo "  scscdemo :8787 → $SCSC"
echo "  descdemo :8788 → $DESC"

if [[ "$SCSC" == "200" && "$DESC" == "200" ]]; then
  echo "✓ both demos healthy"
  exit 0
fi

echo "✗ at least one demo is NOT healthy — check logs:"
echo "  ~/Library/Logs/scscdemo.{out,err}.log"
echo "  ~/Library/Logs/descdemo.{out,err}.log"
exit 1
