#!/usr/bin/env bash
# Builds a macOS .pkg installer for Mizan that drops the dashboard into
# /usr/local/posture-dashboard/ and registers a LaunchAgent.
#
# Used by:
#   - .github/workflows/release.yml (CI build, attached as a GitHub Release asset)
#   - operators building their own signed copy locally
#
# Prereqs on the build machine:
#   - Node 22 LTS (for bundling)
#   - pkgbuild, productbuild (ship with macOS / Xcode CLT)
#   - Apple Developer ID for signing + notarization (optional; see bottom)
#
# Output: deploy/dist/mizan-<version>.pkg
#
# What gets installed on the target Mac:
#   /usr/local/posture-dashboard/                      — dashboard runtime + .next build
#   ~/Library/Application Support/posture-dashboard/   — DATA_DIR (SQLite + uploaded logo)
#   ~/Library/LaunchAgents/com.postureDashboard.plist  — starts the app on login
#   ~/Library/Logs/posture-dashboard.{out,err}.log     — log output
#
# Upgrade-in-place semantics:
#   - DATA_DIR lives outside the install root, so it survives upgrades.
#   - The postinstall calls `launchctl bootout` + `bootstrap` so the running
#     LaunchAgent picks up the new code without a manual restart.
#   - The install root is overwritten in place; pkgbuild handles file diffs.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${VERSION:-$(node -p "require('${ROOT}/package.json').version" 2>/dev/null || echo 1.0.0)}"
IDENTIFIER="com.postureDashboard"
OUT_DIR="${ROOT}/deploy/dist"
STAGE_DIR="$(mktemp -d)/posture-dashboard"
PKG_ROOT="${STAGE_DIR}/pkg-root"
SCRIPTS_DIR="${STAGE_DIR}/scripts"

mkdir -p "${OUT_DIR}" "${PKG_ROOT}/usr/local/posture-dashboard" "${SCRIPTS_DIR}"

echo "==> Building production bundle (version ${VERSION})..."
( cd "${ROOT}" && npm ci && npm run build )

echo "==> Staging artifacts..."
# Top-level runtime payload mirrored from the Dockerfile's runtime stage.
# Adding/removing here = bug. Keep this list in lockstep with web/Dockerfile.
for item in .next node_modules public package.json package-lock.json; do
    cp -R "${ROOT}/${item}" "${PKG_ROOT}/usr/local/posture-dashboard/"
done

# schema.sql is read at runtime via path.resolve(process.cwd(), "lib/db/schema.sql"),
# so we have to recreate the lib/db/ directory tree under the staging root.
mkdir -p "${PKG_ROOT}/usr/local/posture-dashboard/lib/db"
cp "${ROOT}/lib/db/schema.sql" "${PKG_ROOT}/usr/local/posture-dashboard/lib/db/schema.sql"

# v2.5.7+ — PDF font assets. lib/pdf/fonts.ts reads these via process.cwd()+
# assets/fonts/...  at request time. Without them every PDF endpoint 500s.
# Same bug we fixed in the Dockerfile. Mirror it here.
mkdir -p "${PKG_ROOT}/usr/local/posture-dashboard/assets/fonts"
cp -R "${ROOT}/assets/fonts/." "${PKG_ROOT}/usr/local/posture-dashboard/assets/fonts/"

# Drop a small uninstall.sh next to the binaries so the postinstall can
# point operators at it. Tears down the LaunchAgent + install root +
# leaves DATA_DIR alone (operator deletes manually if they really want
# to nuke their data).
cat > "${PKG_ROOT}/usr/local/posture-dashboard/uninstall.sh" <<'UNINSTALL'
#!/usr/bin/env bash
# Mizan uninstaller. Run with: bash /usr/local/posture-dashboard/uninstall.sh
set -e
USER_NAME="${USER:-$(whoami)}"
PLIST="/Users/${USER_NAME}/Library/LaunchAgents/com.postureDashboard.plist"
echo "==> Stopping LaunchAgent..."
launchctl bootout "gui/$(id -u "${USER_NAME}")" "${PLIST}" 2>/dev/null || true
rm -f "${PLIST}"
echo "==> Removing install root..."
sudo rm -rf /usr/local/posture-dashboard
echo "==> Done. Your data directory at ~/Library/Application Support/posture-dashboard/ is intact — delete it manually if you want a full wipe."
UNINSTALL
chmod +x "${PKG_ROOT}/usr/local/posture-dashboard/uninstall.sh"

cat > "${SCRIPTS_DIR}/postinstall" <<'SHELL'
#!/bin/bash
# Mizan postinstall. Runs as root after pkgbuild lays down the files.
# Idempotent: safe to re-run on every upgrade install.
TARGET_USER="${USER}"
# `pkgbuild` runs the postinstall as root with USER=root. Recover the
# real installing user from the SUDO_USER / loginwindow uid instead so
# DATA_DIR + the LaunchAgent land in the right home.
if [ -n "${SUDO_USER:-}" ] && [ "${SUDO_USER}" != "root" ]; then
    TARGET_USER="${SUDO_USER}"
elif [ "${USER}" = "root" ]; then
    TARGET_USER="$(stat -f '%Su' /dev/console)"
fi
TARGET_UID="$(id -u "${TARGET_USER}")"
HOME_DIR="/Users/${TARGET_USER}"
PLIST="${HOME_DIR}/Library/LaunchAgents/com.postureDashboard.plist"
DATA_DIR="${HOME_DIR}/Library/Application Support/posture-dashboard"

mkdir -p "${DATA_DIR}"
mkdir -p "${HOME_DIR}/Library/Logs"
mkdir -p "$(dirname "${PLIST}")"

# v2.5.8 — bootout any previously-loaded agent BEFORE writing the new
# plist. Without this, an upgrade install lays down new code but the
# old node process keeps serving stale files until the user manually
# restarts. `|| true` because bootout fails when nothing's loaded yet
# (fresh install case).
launchctl bootout "gui/${TARGET_UID}" "${PLIST}" 2>/dev/null || true

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
        <!-- v2.5.8+ — marker so /api/updates can detect runtime=mac and
             surface the .pkg installer download instead of a docker pull
             snippet. process.platform=darwin is enough but explicit is safer. -->
        <key>MIZAN_RUNTIME</key><string>mac</string>
    </dict>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>${HOME_DIR}/Library/Logs/posture-dashboard.out.log</string>
    <key>StandardErrorPath</key><string>${HOME_DIR}/Library/Logs/posture-dashboard.err.log</string>
</dict>
</plist>
PLIST_EOF
chown "${TARGET_USER}" "${PLIST}"
chown -R "${TARGET_USER}" "${DATA_DIR}"

# Re-bootstrap. `kickstart -k` would also work but bootstrap is the
# documented way to load a freshly-written plist.
launchctl bootstrap "gui/${TARGET_UID}" "${PLIST}" || true

# Print access + bootstrap instructions on the desktop. Skipped on
# upgrade installs (file already exists) so we don't spam the user.
CREDS="${HOME_DIR}/Desktop/posture-dashboard-CREDENTIALS.txt"
if [ ! -f "${CREDS}" ]; then
    cat > "${CREDS}" <<CREDS_EOF
Mizan — Security Posture Dashboard

Open this URL in your browser:
    http://localhost:8787

The first-run wizard walks you through:
    1. Organization name + logo
    2. Graph-signals Entra app (reads posture from each entity tenant)
    3. User-sign-in Entra app (operator staff sign-in)
    4. Bootstrap admin — the first account that completes sign-in becomes admin

Logs:
    ~/Library/Logs/posture-dashboard.{out,err}.log
Data directory:
    ${DATA_DIR}
Uninstall:
    bash /usr/local/posture-dashboard/uninstall.sh
CREDS_EOF
    chown "${TARGET_USER}" "${CREDS}"
    open "${CREDS}" || true
fi
SHELL
chmod +x "${SCRIPTS_DIR}/postinstall"

echo "==> Building .pkg..."
pkgbuild \
    --root "${PKG_ROOT}" \
    --identifier "${IDENTIFIER}" \
    --version "${VERSION}" \
    --scripts "${SCRIPTS_DIR}" \
    --install-location "/" \
    "${OUT_DIR}/mizan-${VERSION}-component.pkg"

productbuild \
    --package "${OUT_DIR}/mizan-${VERSION}-component.pkg" \
    "${OUT_DIR}/mizan-${VERSION}.pkg"

rm "${OUT_DIR}/mizan-${VERSION}-component.pkg"

echo "==> Done: ${OUT_DIR}/mizan-${VERSION}.pkg"
echo
echo "To sign + notarize for distribution:"
echo "  productsign --sign \"Developer ID Installer: Your Name\" \\"
echo "      \"${OUT_DIR}/mizan-${VERSION}.pkg\" \\"
echo "      \"${OUT_DIR}/mizan-${VERSION}-signed.pkg\""
echo "  xcrun notarytool submit --wait ..."
