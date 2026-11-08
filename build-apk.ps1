# Rebuilds the web app, syncs Capacitor, and drops a debug APK at the project root.
# Usage: powershell -ExecutionPolicy Bypass -File .\build-apk.ps1
$root = $PSScriptRoot
try {
    Push-Location $root
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "Web build failed with exit code $LASTEXITCODE." }

    & npx.cmd cap sync android
    if ($LASTEXITCODE -ne 0) { throw "Capacitor sync failed with exit code $LASTEXITCODE." }

    Push-Location "$root\android"
    try {
        & .\gradlew.bat assembleDebug --no-daemon --console=plain
        if ($LASTEXITCODE -ne 0) { throw "Android build failed with exit code $LASTEXITCODE." }
    } finally {
        Pop-Location
    }

    Copy-Item "$root\android\app\build\outputs\apk\debug\app-debug.apk" "$root\OLT-Core-Manager.apk" -Force
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "APK ready: $root\OLT-Core-Manager.apk"
