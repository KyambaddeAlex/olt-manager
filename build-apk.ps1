# Rebuilds the Android app and drops the APK at the project root.
# Usage:  powershell -ExecutionPolicy Bypass -File .\build-apk.ps1

$env:JAVA_HOME = "C:\Users\DELL\.jdks\jbr-17.0.14"
$env:PATH = "$env:JAVA_HOME\bin;C:\Program Files\nodejs;$env:PATH"

$root = $PSScriptRoot

Copy-Item "$root\index.html", "$root\style.css", "$root\main.js" -Destination "$root\www" -Force

Push-Location "$root\android"
try {
    .\gradlew.bat assembleDebug --console=plain
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Copy-Item "app\build\outputs\apk\debug\app-debug.apk" "$root\OLT-Core-Manager.apk" -Force
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "APK ready: $root\OLT-Core-Manager.apk"
