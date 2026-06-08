# Portable ADB Crash Log Retriever
$workDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $workDir

Write-Host "ADB check/download..." -ForegroundColor Cyan
if (-not (Test-Path "platform-tools.zip")) {
    Invoke-WebRequest -Uri "https://dl.google.com/android/repository/platform-tools-latest-windows.zip" -OutFile "platform-tools.zip"
}

if (-not (Test-Path "platform-tools")) {
    Write-Host "Extracting files..." -ForegroundColor Cyan
    Expand-Archive -Path "platform-tools.zip" -DestinationPath "." -Force
}

Write-Host "Checking devices..." -ForegroundColor Cyan
$adb = ".\platform-tools\adb.exe"
& $adb kill-server
& $adb start-server
Start-Sleep -Seconds 2

$devices = & $adb devices
Write-Host "Connected devices:" -ForegroundColor Green
Write-Host $devices

Write-Host "Launch the app on your phone now! Streaming logs..." -ForegroundColor Cyan
Write-Host "Press Ctrl + C to stop." -ForegroundColor Yellow

# Tailing error logs
& $adb logcat *:E | Where-Object { $_ -match "AndroidRuntime" -or $_ -match "easynihongo" -or $_ -match "cardgame" }
