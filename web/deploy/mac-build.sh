#!/usr/bin/env bash
# Builds a signed .pkg installer for macOS that drops the dashboard into
# /usr/local/posture-dashboard/ and registers a LaunchAgent.
#
# Prereqs on the build machine:
#   - Node 22 (for bundling)
#   - pkgbuild, productbuild (ship with macOS)
#   - Apple Developer ID for signing + notarization (optional, uncomment below)
#
# Output: dist/posture-dashboard-<version>.pkg
#
# What gets installed on the target Mac:
#   /usr/local/posture-dashboard/            — dashboard source + .next build
#   ~/Library/Application Support/posture-dashboard/   — DATA_DIR (SQLite + uploaded logo)
#   ~/Library/LaunchAgents/com.postureDashboard.plist   — starts the app on login
#   ~/Library/Logs/posture-dashboard.{out,err}.log      — log output

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${VERSION:-1.0.0}"
IDENTIFIER="com.postureDashboard"
OUT_DIR="${ROOT}/deploy/dist"
STAGE_DIR="$(mktemp -d)/posture-dashboard"
PKG_ROOT="${STAGE_DIR}/pkg-root"
SCRIPTS_DIR="${STAGE_DIR}/scripts"

mkdir -p "${OUT_DIR}" "${PKG_ROOT}/usr/local/posture-dashboard" "${SCRIPTS_DIR}"

echo "==> Building production bundle..."
( cd "${ROOT}" && npm ci && npm run build )

echo "==> Staging artifacts..."
for item in .next node_modules public package.json package-lock.json; do
    cp -R "${ROOT}/${item}" "${PKG_ROOT}/usr/local/posture-dashboard/"
done
# schema.sql is read at runtime via path.resolve(process.cwd(), "lib/db/schema.sql"),
# so we have to recreate the lib/db/ directory tree under the staging root.
mkdir -p "${PKG_ROOT}/usr/local/posture-dashboard/lib/db"
cp "${ROOT}/lib/db/schema.sql" "${PKG_ROOT}/usr/local/posture-dashboard/lib/db/schema.sql"

cat > "${SCRIPTS_DIR}/postinstall" <<'SHELL'
#!/bin/bash
# Drop a LaunchAgent so the app starts on login for the installing user.
TARGET_USER="${USER}"
PLIST="/Users/${TARGET_USER}/Library/LaunchAgents/com.postureDashboard.plist"
DATA_DIR="/Users/${TARGET_USER}/Library/Application Support/posture-dashboard"
mkdir -p "${DATA_DIR}"
mkdir -p "/Users/${TARGET_USER}/Library/Logs"
mkdir -p "$(dirname "${PLIST}")"
cat > "${PLIST}" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.postureDashboard</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/usr/local/posture-dashboard/node_modules/.bin/next</string>
        <string>start</string>
        <string>-H</string><string>127.0.0.1</string>
        <string>-p</string><string>8787</string>
    </array>
    <key>WorkingDirectory</key><string>/usr/local/posture-dashboard</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>DATA_DIR</key><string>${DATA_DIR}</string>
        <!-- APP_BASE_URL intentionally unset. The app derives its own URL from
             the request's Host header at runtime (lib/config/base-url.ts), so
             the install works on localhost, behind a tunnel, or with a reverse
             proxy — no per-host tweak to the LaunchAgent. -->
        <key>NODE_ENV</key><string>production</string>
    </dict>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>/Users/${TARGET_USER}/Library/Logs/posture-dashboard.out.log</string>
    <key>StandardErrorPath</key><string>/Users/${TARGET_USER}/Library/Logs/posture-dashboard.err.log</string>
</dict>
</plist>
PLIST_EOF
chown "${TARGET_USER}" "${PLIST}"
sudo -u "${TARGET_USER}" launchctl bootstrap "gui/$(id -u "${TARGET_USER}")" "${PLIST}" || true

# Print access + bootstrap instructions.
cat > "/Users/${TARGET_USER}/Desktop/posture-dashboard-CREDENTIALS.txt" <<CREDS_EOF
Posture & Maturity Dashboard — first-run instructions

Open this URL in your browser:
    http://localhost:8787

The first-run wizard walks you through:
    1. Organization name + logo
    2. Graph-signals Entra app (reads posture from each entity tenant)
    3. User-sign-in Entra app (Council staff sign-in)
    4. Bootstrap admin — the first account that completes sign-in becomes admin

Logs:
    ~/Library/Logs/posture-dashboard.{out,err}.log
Data directory:
    ${DATA_DIR}
Uninstall: run /usr/local/posture-dashboard/uninstall.sh
CREDS_EOF
chown "${TARGET_USER}" "/Users/${TARGET_USER}/Desktop/posture-dashboard-CREDENTIALS.txt"
open "/Users/${TARGET_USER}/Desktop/posture-dashboard-CREDENTIALS.txt" || true
SHELL
chmod +x "${SCRIPTS_DIR}/postinstall"

echo "==> Building .pkg..."
pkgbuild \
    --root "${PKG_ROOT}" \
    --identifier "${IDENTIFIER}" \
    --version "${VERSION}" \
    --scripts "${SCRIPTS_DIR}" \
    --install-location "/" \
    "${OUT_DIR}/posture-dashboard-${VERSION}-component.pkg"

productbuild \
    --package "${OUT_DIR}/posture-dashboard-${VERSION}-component.pkg" \
    "${OUT_DIR}/posture-dashboard-${VERSION}.pkg"

rm "${OUT_DIR}/posture-dashboard-${VERSION}-component.pkg"

echo "==> Done: ${OUT_DIR}/posture-dashboard-${VERSION}.pkg"
echo
echo "To sign + notarize for distribution:"
echo "  productsign --sign \"Developer ID Installer: Your Name\" \\"
echo "      \"${OUT_DIR}/posture-dashboard-${VERSION}.pkg\" \\"
echo "      \"${OUT_DIR}/posture-dashboard-${VERSION}-signed.pkg\""
echo "  xcrun notarytool submit --wait ..."
