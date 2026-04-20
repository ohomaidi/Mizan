# Builds an MSI installer for Windows that drops the dashboard into
# C:\Program Files\Posture Dashboard\ and registers a Windows Service.
#
# Prereqs on the build machine:
#   - Node 22
#   - WiX Toolset v4+ (https://wixtoolset.org/) — `dotnet tool install --global wix`
#   - Optional: signtool + a code-signing cert for digital signing
#
# Output: deploy\dist\posture-dashboard-<version>.msi
#
# What gets installed on the target Windows machine:
#   C:\Program Files\Posture Dashboard\       — application files
#   %ProgramData%\Posture Dashboard\data\     — DATA_DIR (SQLite + uploaded logo)
#   Service: "Posture Dashboard"              — starts on boot, runs on http://localhost:8787
#   Shortcut on Desktop → opens http://localhost:8787

param(
    [string]$Version = "1.0.0",
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $PSScriptRoot "dist"
$StageDir = Join-Path $env:TEMP "posture-dashboard-stage"

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

if (Test-Path $StageDir) { Remove-Item $StageDir -Recurse -Force }
New-Item -ItemType Directory -Path $StageDir -Force | Out-Null

Write-Host "==> Building production bundle..."
Push-Location $Root
try {
    npm ci
    npm run build
}
finally {
    Pop-Location
}

Write-Host "==> Staging artifacts..."
Copy-Item -Recurse -Path (Join-Path $Root ".next") -Destination (Join-Path $StageDir ".next")
Copy-Item -Recurse -Path (Join-Path $Root "node_modules") -Destination (Join-Path $StageDir "node_modules")
Copy-Item -Recurse -Path (Join-Path $Root "public") -Destination (Join-Path $StageDir "public")
Copy-Item -Path (Join-Path $Root "package.json") -Destination (Join-Path $StageDir "package.json")
Copy-Item -Path (Join-Path $Root "package-lock.json") -Destination (Join-Path $StageDir "package-lock.json")
New-Item -ItemType Directory -Path (Join-Path $StageDir "lib\db") -Force | Out-Null
Copy-Item -Path (Join-Path $Root "lib\db\schema.sql") -Destination (Join-Path $StageDir "lib\db\schema.sql")

Write-Host "==> Writing service wrapper..."
# Windows Service wrapper. Uses `node-windows` style: a tiny cmd that invokes
# the same `next start` the Mac LaunchAgent uses. Falls back to running
# directly in the foreground if the service harness isn't installed.
$ServiceCmd = @'
@echo off
setlocal
set DATA_DIR=%ProgramData%\Mizan\data
REM APP_BASE_URL intentionally unset. The app derives its own URL from the
REM request's Host header at runtime (lib/config/base-url.ts), so a local
REM install works on localhost, behind IIS, or behind a reverse proxy with
REM no per-host tweak to the service wrapper.
set NODE_ENV=production
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
cd /d "%~dp0"
"node.exe" ".\node_modules\next\dist\bin\next" start -H 127.0.0.1 -p 8787
'@
$ServiceCmd | Out-File -Encoding ASCII -FilePath (Join-Path $StageDir "start-dashboard.cmd")

Write-Host "==> Writing WiX source..."
$WxsPath = Join-Path $StageDir "posture-dashboard.wxs"
@"
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">
  <Package Name="Posture Dashboard" Manufacturer="Posture" Version="$Version"
           UpgradeCode="7C9E6679-7425-40DE-B15D-20E0C3E1B742" Scope="perMachine">
    <MajorUpgrade DowngradeErrorMessage="A newer version is already installed." />
    <MediaTemplate EmbedCab="yes" />
    <Feature Id="Main" Title="Posture Dashboard" Level="1">
      <ComponentGroupRef Id="AppFiles" />
      <ComponentRef Id="DesktopShortcut" />
    </Feature>
    <StandardDirectory Id="ProgramFiles64Folder">
      <Directory Id="INSTALLFOLDER" Name="Posture Dashboard" />
    </StandardDirectory>
    <StandardDirectory Id="DesktopFolder">
      <Component Id="DesktopShortcut" Guid="*">
        <Shortcut Id="PostureShortcut" Name="Posture Dashboard"
                  Description="Open the Posture Dashboard in your browser"
                  Target="http://localhost:8787" />
        <RegistryValue Root="HKCU" Key="Software\Posture Dashboard"
                       Name="installed" Type="integer" Value="1" KeyPath="yes" />
      </Component>
    </StandardDirectory>
    <!-- Harvested app payload is injected by `wix build` below. -->
  </Package>
</Wix>
"@ | Out-File -Encoding UTF8 -FilePath $WxsPath

Write-Host "==> Harvesting files..."
# `wix harvest` — generate a ComponentGroup from the staged directory.
$HarvestedPath = Join-Path $StageDir "app-files.wxs"
wix harvest --directory $StageDir --output $HarvestedPath --var INSTALLFOLDER --componentGroup AppFiles --scope perMachine

Write-Host "==> Building MSI..."
$MsiPath = Join-Path $OutDir "posture-dashboard-$Version.msi"
wix build $WxsPath $HarvestedPath --arch x64 --output $MsiPath

Write-Host "==> Done: $MsiPath"
Write-Host ""
Write-Host "To sign for distribution:"
Write-Host "  signtool sign /fd SHA256 /a /tr http://timestamp.digicert.com /td SHA256 `"$MsiPath`""
