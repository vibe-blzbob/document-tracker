# DocTrack LGU - Windows Release & Single-File Installer Packaging Script
$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Create-FastZipArchive($sourceDir, $destZip) {
    if (Test-Path $destZip) {
        Remove-Item -Force $destZip
    }
    # Brief yield for any file copy handles to clear
    Start-Sleep -Milliseconds 250
    [System.IO.Compression.ZipFile]::CreateFromDirectory($sourceDir, $destZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  DocTrack LGU - Single-File Installer Packaging Pipeline" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Build Client Frontend
Write-Host "[1/6] Building React client production bundle (dist/)..." -ForegroundColor Yellow
npm run build:client

# 2. Bundle Server with esbuild into a standalone file
Write-Host "[2/6] Bundling backend server (dist-server/index.js)..." -ForegroundColor Yellow
npx esbuild server/index.ts --bundle --platform=node --format=esm --external:node:* --outfile=dist-server/index.js

# 3. Compile Native Windows Launcher Executable
Write-Host "[3/6] Compiling native Windows GUI launcher (DocTrack-LGU.exe)..." -ForegroundColor Yellow
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    $csc = "csc.exe"
}
& $csc /target:winexe /out:DocTrack-LGU.exe windows-launcher\Program.cs

# 4. Assemble Release Payload Directory
Write-Host "[4/6] Assembling standalone distribution files..." -ForegroundColor Yellow
$ReleaseDir = Join-Path $ProjectRoot "release\DocTrack-LGU"
if (Test-Path $ReleaseDir) {
    Remove-Item -Recurse -Force $ReleaseDir
}
New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ReleaseDir "uploads") | Out-Null

Copy-Item -Path "DocTrack-LGU.exe" -Destination $ReleaseDir
Copy-Item -Path "DocTrack-LGU.bat" -Destination $ReleaseDir
Copy-Item -Path "DocTrack-LGU.vbs" -Destination $ReleaseDir
Copy-Item -Path "Install-Desktop-Shortcut.bat" -Destination $ReleaseDir
Copy-Item -Path "create-desktop-shortcut.ps1" -Destination $ReleaseDir
Copy-Item -Path "dist" -Destination $ReleaseDir -Recurse
Copy-Item -Path "dist-server" -Destination $ReleaseDir -Recurse

# Embed node.exe so target machine requires ZERO pre-installed runtimes
$NodeSource = $null
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($NodeCmd -and (Test-Path $NodeCmd.Source)) {
    $NodeSource = $NodeCmd.Source
} elseif (Test-Path "C:\Program Files\nodejs\node.exe") {
    $NodeSource = "C:\Program Files\nodejs\node.exe"
} elseif (Test-Path "C:\Program Files (x86)\nodejs\node.exe") {
    $NodeSource = "C:\Program Files (x86)\nodejs\node.exe"
}

if ($NodeSource) {
    Write-Host "      Embedding Node.js runtime from $NodeSource..." -ForegroundColor Gray
    Copy-Item -Path $NodeSource -Destination (Join-Path $ReleaseDir "node.exe")
} else {
    Write-Host "      [Warning] node.exe not found to embed; launcher will rely on system PATH." -ForegroundColor DarkYellow
}

# Write README.txt for end users
$ReadmeContent = @"
========================================================================
  DocTrack LGU - Document Tracking & Routing Information System
  Local Government Unit Edition (LAN-Only / Zero Cloud Dependency)
========================================================================

HOW TO RUN:
1. Double-click "DocTrack-LGU.exe".
   - Automatically starts the offline background server on port 3001.
   - Automatically opens a dedicated desktop application window.

2. LOCAL NETWORK (LAN) ACCESS:
   - Any municipal workstation, tablet, or mobile phone on the same
     office Wi-Fi or Ethernet network can open DocTrack LGU via:
     http://<HOST_LAN_IP>:3001
   - The Host LAN IP is displayed in the bottom-left of the application header.

DEFAULT SEED ACCOUNTS:
- System Administrator:    PIN: 1234  (Admin: edit dropdowns & manage users)
- Mayor's Executive Staff: PIN: 1111  (Office of the Mayor)
- Records Custodian:       PIN: 2222  (Records & Archives Management)
- Sanggunian Secretary:    PIN: 3333  (Sangguniang Bayan / Panlungsod)
- City Treasurer:          PIN: 4444  (City Treasurer)
- BPLO Licensing:          PIN: 5555  (Business Permits & Licensing)
- Building Official:       PIN: 6666  (City Engineering & Building Official)

REQUIREMENTS:
- Windows 10 or Windows 11 (64-bit)
- No internet connection or cloud service required. 100% self-contained.
========================================================================
"@
Set-Content -Path (Join-Path $ReleaseDir "README.txt") -Value $ReadmeContent -Encoding UTF8

# 5. Compress Payload into Temporary ZIP for Installer Embedding
Write-Host "[5/6] Creating application payload archive (release\payload.zip)..." -ForegroundColor Yellow
$PayloadZip = Join-Path $ProjectRoot "release\payload.zip"
Create-FastZipArchive $ReleaseDir $PayloadZip

# 6. Compile Self-Contained Single-File Setup Installer
Write-Host "[6/6] Compiling single-file Windows setup wizard (DocTrack-LGU-Setup.exe)..." -ForegroundColor Yellow
$InstallerExe = Join-Path $ProjectRoot "release\DocTrack-LGU-Setup.exe"
if (Test-Path $InstallerExe) {
    Remove-Item -Force $InstallerExe
}

$compileArgs = @(
    "/target:winexe",
    "/r:System.Windows.Forms.dll",
    "/r:System.Drawing.dll",
    "/r:System.IO.Compression.dll",
    "/r:System.IO.Compression.FileSystem.dll",
    "/resource:$PayloadZip,payload.zip",
    "/out:$InstallerExe",
    "installer\Installer.cs"
)

& $csc $compileArgs

# Also create portable zip distribution archive
$ZipPath = Join-Path $ProjectRoot "release\DocTrack-LGU-v1.0.0-windows.zip"
Create-FastZipArchive $ReleaseDir $ZipPath

# Cleanup intermediate payload.zip
if (Test-Path $PayloadZip) {
    Remove-Item -Force $PayloadZip
}

$SetupItem = Get-Item $InstallerExe
$SetupSizeMB = [math]::Round($SetupItem.Length / 1MB, 2)

$ZipItem = Get-Item $ZipPath
$ZipSizeMB = [math]::Round($ZipItem.Length / 1MB, 2)

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " SUCCESS! Everything packaged into Single-File Installer " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host " Setup Installer: $InstallerExe ($SetupSizeMB MB)" -ForegroundColor Cyan
Write-Host " Portable ZIP:    $ZipPath ($ZipSizeMB MB)" -ForegroundColor Cyan
Write-Host " Staged Folder:   $ReleaseDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "DEPLOYMENT READY:" -ForegroundColor White
Write-Host "  Copy DocTrack-LGU-Setup.exe to any Windows 10/11 computer and run." -ForegroundColor White
Write-Host "  - GUI Mode: Double-click to open setup wizard with desktop shortcut option." -ForegroundColor White
Write-Host "  - Silent Mode: Run 'DocTrack-LGU-Setup.exe /S' for silent background install." -ForegroundColor White
Write-Host "  No Node.js, no Git, and no prerequisites needed on target machines." -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green
