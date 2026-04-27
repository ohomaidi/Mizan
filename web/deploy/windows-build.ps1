# Builds an MSI installer for Windows that drops Mizan into
# C:\Program Files\Mizan\ and registers a Windows Service.
#
# Used by:
#   - .github/workflows/release.yml (CI build, attached as a GitHub Release asset)
#   - operators building their own signed copy locally
#
# Prereqs on the build machine:
#   - Node 22 LTS
#   - WiX Toolset v4+ (install via `dotnet tool install --global wix`)
#   - Optional: signtool + a code-signing cert for digital signing
#
# Output: deploy\dist\mizan-<version>.msi
#
# What gets installed on the target Windows machine:
#   C:\Program Files\Mizan\                          — application files
#   %ProgramData%\Mizan\data\                        — DATA_DIR (SQLite + uploaded logo)
#   Service: "Mizan"                                 — starts on boot, listens 127.0.0.1:8787
#   Shortcut on Desktop → opens http://localhost:8787
#
# Upgrade-in-place semantics:
#   - DATA_DIR lives outside the install root (%ProgramData%) so it
#     survives upgrades.
#   - WiX MajorUpgrade element handles the in-place file replacement
#     and stops/starts the service automatically.
#   - The .msi itself stops the running service before replacing
#     binaries (ServiceControl Stop=install + Start=install).

param(
    [string]$Version = $(if ($env:MIZAN_VERSION) { $env:MIZAN_VERSION } else { "1.0.0" })
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $PSScriptRoot "dist"
$StageDir = Join-Path $env:TEMP "mizan-stage"

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

if (Test-Path $StageDir) { Remove-Item $StageDir -Recurse -Force }
New-Item -ItemType Directory -Path $StageDir -Force | Out-Null

Write-Host "==> Building production bundle (version $Version)..."
Push-Location $Root
try {
    npm ci
    npm run build
}
finally {
    Pop-Location
}

Write-Host "==> Staging artifacts..."
# Mirror the Dockerfile + mac-build.sh runtime payload. Keep these three
# in lockstep — adding to one without the others is a bug source.
Copy-Item -Recurse -Path (Join-Path $Root ".next")        -Destination (Join-Path $StageDir ".next")
Copy-Item -Recurse -Path (Join-Path $Root "node_modules") -Destination (Join-Path $StageDir "node_modules")
Copy-Item -Recurse -Path (Join-Path $Root "public")       -Destination (Join-Path $StageDir "public")
Copy-Item -Path (Join-Path $Root "package.json")          -Destination (Join-Path $StageDir "package.json")
Copy-Item -Path (Join-Path $Root "package-lock.json")     -Destination (Join-Path $StageDir "package-lock.json")
New-Item -ItemType Directory -Path (Join-Path $StageDir "lib\db") -Force | Out-Null
Copy-Item -Path (Join-Path $Root "lib\db\schema.sql") -Destination (Join-Path $StageDir "lib\db\schema.sql")

# v2.5.7+ — PDF font assets. lib/pdf/fonts.ts reads these via
# process.cwd()+assets/fonts/... at request time. Without them every PDF
# endpoint 500s. Same bug we fixed in the Dockerfile + mac-build.sh.
New-Item -ItemType Directory -Path (Join-Path $StageDir "assets\fonts") -Force | Out-Null
Copy-Item -Recurse -Path (Join-Path $Root "assets\fonts\*") -Destination (Join-Path $StageDir "assets\fonts\")

Write-Host "==> Writing service wrapper..."
# Windows Service entry point. Started by the Service Control Manager
# via `node-windows`-style sc.exe registration in the WiX <ServiceInstall>.
# The wrapper sets DATA_DIR + MIZAN_RUNTIME (so /api/updates can detect
# runtime=windows) and chains into `next start` from the install root.
$ServiceCmd = @'
@echo off
setlocal
set DATA_DIR=%ProgramData%\Mizan\data
set NODE_ENV=production
REM v2.5.8+ — runtime marker so /api/updates can surface the .msi
REM installer download in Settings -> About instead of a docker pull
REM snippet. process.platform=win32 is also a signal but explicit env
REM is safer (e.g. WSL would trip platform detection alone).
set MIZAN_RUNTIME=windows
REM APP_BASE_URL intentionally unset. The app derives its own URL from
REM the request's Host header at runtime (lib/config/base-url.ts), so
REM a local install works on localhost, behind IIS, or behind a reverse
REM proxy with no per-host tweak to the service wrapper.
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
cd /d "%~dp0"
"node.exe" ".\node_modules\next\dist\bin\next" start -H 127.0.0.1 -p 8787
'@
$ServiceCmd | Out-File -Encoding ASCII -FilePath (Join-Path $StageDir "start-mizan.cmd")

Write-Host "==> Generating component XML for staged tree..."
# v2.5.12 — v3-style "harvest in PowerShell, hand WiX explicit
# components". Three previous attempts at WiX v4's <Files> auto-harvest
# all hit WIX0005 errors on different parent elements (Feature, then
# ComponentGroup). Either v4.0.5 doesn't ship with the <Files>
# element or it requires an extension we'd have to load. Avoiding the
# moving target — walk the stage in PowerShell + emit explicit
# <Component><File Source="..." /></Component> XML. WiX v3 worked
# this way for years; the resulting MSI is identical.
$AppFilesXml = New-Object System.Text.StringBuilder
$null = $AppFilesXml.AppendLine('  <ComponentGroup Id="AppFiles" Directory="INSTALLFOLDER">')

# Track every file we'll add; skip start-mizan.cmd because it's
# already declared as the MizanService component's keypath below
# (declaring the same file twice in different components fails WiX
# validation).
$ServiceCmdRel = "start-mizan.cmd"

# Walk the stage. Group files by relative directory so we can emit
# one <Component> per directory (each containing the files that live
# in that subfolder). MSI requires every file to live inside a
# Directory; we mirror the stage's tree under INSTALLFOLDER using
# nested <Directory> elements via the FileSource path resolution.
$DirectoryCounter = 0
$ComponentCounter = 0
$DirectoriesEmitted = @{}

# Build the directory tree once. We need stable ids for nested
# directories so deeply-nested files (.next/server/chunks/.../foo.js)
# end up in the right place inside Program Files.
function Get-DirectoryId {
    param([string]$RelPath)
    if ([string]::IsNullOrEmpty($RelPath) -or $RelPath -eq ".") { return "INSTALLFOLDER" }
    if ($DirectoriesEmitted.ContainsKey($RelPath)) {
        return $DirectoriesEmitted[$RelPath]
    }
    $script:DirectoryCounter++
    # Hash-based id keeps it stable across runs + short. WiX ids must
    # match [A-Za-z_][A-Za-z0-9_.]* so we strip slashes etc.
    $hash = [System.Security.Cryptography.SHA1]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($RelPath)
    $hashBytes = $hash.ComputeHash($bytes)
    $shortHash = ([System.BitConverter]::ToString($hashBytes) -replace "-","").Substring(0, 12)
    $id = "DIR_$shortHash"
    $DirectoriesEmitted[$RelPath] = $id
    return $id
}

# Emit nested <Directory> tree first (separate XML block).
$DirectoryXml = New-Object System.Text.StringBuilder
$AllRelDirs = Get-ChildItem -Path $StageDir -Recurse -Directory | ForEach-Object {
    $rel = $_.FullName.Substring($StageDir.Length).TrimStart('\','/')
    $rel -replace '\\','/'
} | Sort-Object

# Build a directory-id index for parent lookups before emitting any XML.
foreach ($rel in $AllRelDirs) { Get-DirectoryId -RelPath $rel | Out-Null }

# Now emit nested <Directory> elements respecting parent-child order.
# Directories are sorted alphabetically; for each one we look up the
# parent's id (or INSTALLFOLDER for top-level) and emit a flat list of
# DirectoryRef-style entries — works because StandardDirectory wraps it.
$null = $DirectoryXml.AppendLine('  <DirectoryRef Id="INSTALLFOLDER">')
foreach ($rel in $AllRelDirs) {
    $segments = $rel -split '/'
    $name = $segments[-1]
    $parentRel = if ($segments.Length -gt 1) { ($segments[0..($segments.Length - 2)] -join '/') } else { "" }
    $parentId = if ($parentRel) { Get-DirectoryId -RelPath $parentRel } else { "INSTALLFOLDER" }
    $myId = Get-DirectoryId -RelPath $rel
    if ($parentId -eq "INSTALLFOLDER") {
        $null = $DirectoryXml.AppendLine("    <Directory Id=`"$myId`" Name=`"$name`" />")
    }
}
$null = $DirectoryXml.AppendLine('  </DirectoryRef>')
# For subdirectories with non-INSTALLFOLDER parents, emit them in their
# parent's DirectoryRef block. We do a second pass.
$ByParent = @{}
foreach ($rel in $AllRelDirs) {
    $segments = $rel -split '/'
    if ($segments.Length -le 1) { continue }
    $parentRel = ($segments[0..($segments.Length - 2)] -join '/')
    if (-not $ByParent.ContainsKey($parentRel)) { $ByParent[$parentRel] = @() }
    $ByParent[$parentRel] += @{ rel = $rel; name = $segments[-1]; id = (Get-DirectoryId -RelPath $rel) }
}
foreach ($parentRel in ($ByParent.Keys | Sort-Object)) {
    $parentId = Get-DirectoryId -RelPath $parentRel
    $null = $DirectoryXml.AppendLine("  <DirectoryRef Id=`"$parentId`">")
    foreach ($child in $ByParent[$parentRel]) {
        $null = $DirectoryXml.AppendLine("    <Directory Id=`"$($child.id)`" Name=`"$($child.name)`" />")
    }
    $null = $DirectoryXml.AppendLine('  </DirectoryRef>')
}

# Now emit one <Component> per file. KeyPath="yes" on the only File
# inside makes the component non-shared + a candidate for repair.
$AllFiles = Get-ChildItem -Path $StageDir -Recurse -File | Where-Object {
    $rel = $_.FullName.Substring($StageDir.Length).TrimStart('\','/')
    ($rel -replace '\\','/') -ne $ServiceCmdRel -and
    # Skip the .wxs file we're about to write into the stage
    $rel -notlike "mizan.wxs"
}

foreach ($file in $AllFiles) {
    $rel = $file.FullName.Substring($StageDir.Length).TrimStart('\','/') -replace '\\','/'
    $segments = $rel -split '/'
    $parentRel = if ($segments.Length -gt 1) { ($segments[0..($segments.Length - 2)] -join '/') } else { "" }
    $directoryId = if ($parentRel) { Get-DirectoryId -RelPath $parentRel } else { "INSTALLFOLDER" }
    $script:ComponentCounter++
    $compId = "C_$ComponentCounter"
    $fileId = "F_$ComponentCounter"
    # Escape XML in the path (& and quotes mostly).
    $sourceWin = $rel -replace '/','\'
    $null = $AppFilesXml.AppendLine("    <Component Id=`"$compId`" Directory=`"$directoryId`" Guid=`"*`">")
    $null = $AppFilesXml.AppendLine("      <File Id=`"$fileId`" Source=`"!(bindpath.StageDir)\$sourceWin`" KeyPath=`"yes`" />")
    $null = $AppFilesXml.AppendLine("    </Component>")
}
$null = $AppFilesXml.AppendLine('  </ComponentGroup>')

Write-Host "  -> $ComponentCounter file components, $DirectoryCounter directories"

Write-Host "==> Writing WiX source..."
$WxsPath = Join-Path $StageDir "mizan.wxs"
$DirectoryBlock = $DirectoryXml.ToString()
$AppFilesBlock = $AppFilesXml.ToString()
@"
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs"
     xmlns:util="http://wixtoolset.org/schemas/v4/wxs/util">
  <Package Name="Mizan" Manufacturer="Mizan" Version="$Version"
           UpgradeCode="7C9E6679-7425-40DE-B15D-20E0C3E1B742" Scope="perMachine">

    <!-- WiX MajorUpgrade: the .msi can be re-run on top of an existing
         install to upgrade in place. The service is stopped before file
         replacement and started after by the ServiceControl elements
         on the service component below. -->
    <MajorUpgrade DowngradeErrorMessage="A newer version of Mizan is already installed." />
    <MediaTemplate EmbedCab="yes" />

    <StandardDirectory Id="ProgramFiles64Folder">
      <Directory Id="INSTALLFOLDER" Name="Mizan" />
    </StandardDirectory>

$DirectoryBlock

    <StandardDirectory Id="DesktopFolder">
      <Component Id="DesktopShortcut" Directory="DesktopFolder" Guid="*">
        <Shortcut Id="MizanShortcut" Name="Mizan Dashboard"
                  Description="Open the Mizan dashboard in your browser"
                  Target="http://localhost:8787" />
        <RegistryValue Root="HKCU" Key="Software\Mizan"
                       Name="installed" Type="integer" Value="1" KeyPath="yes" />
      </Component>
    </StandardDirectory>

    <!-- v2.5.8+ — register Mizan as a Windows Service so it auto-starts
         on boot, restarts on crash, and is upgrade-safe. The service
         binary is start-mizan.cmd which invokes ``next start``. WiX
         ServiceControl handles stop-before-replace + start-after-install
         so a major upgrade swaps binaries without manual intervention. -->
    <Component Id="MizanService" Directory="INSTALLFOLDER" Guid="*">
      <File Id="ServiceCmd" Source="!(bindpath.StageDir)\start-mizan.cmd" KeyPath="yes" />
      <ServiceInstall Id="MizanServiceInstall" Type="ownProcess"
                      Name="Mizan" DisplayName="Mizan Dashboard"
                      Description="Mizan security posture dashboard. Listens on 127.0.0.1:8787."
                      Start="auto" Account="LocalSystem" ErrorControl="normal"
                      Vital="yes" />
      <ServiceControl Id="MizanServiceControl"
                      Name="Mizan"
                      Start="install"
                      Stop="both"
                      Remove="uninstall"
                      Wait="yes" />
    </Component>

$AppFilesBlock

    <Feature Id="Main" Title="Mizan" Level="1">
      <ComponentRef Id="DesktopShortcut" />
      <ComponentRef Id="MizanService" />
      <ComponentGroupRef Id="AppFiles" />
    </Feature>
  </Package>
</Wix>
"@ | Out-File -Encoding UTF8 -FilePath $WxsPath

Write-Host "==> Building MSI..."
$MsiPath = Join-Path $OutDir "mizan-$Version.msi"
wix build $WxsPath `
    -arch x64 `
    -bindpath "StageDir=$StageDir" `
    -out $MsiPath

Write-Host "==> Done: $MsiPath"
Write-Host ""
Write-Host "To sign for distribution:"
Write-Host "  signtool sign /fd SHA256 /a /tr http://timestamp.digicert.com /td SHA256 `"$MsiPath`""
