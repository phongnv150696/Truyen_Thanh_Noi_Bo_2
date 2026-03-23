$sourcePath = "HKLM:\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens"
$destPath = "HKLM:\SOFTWARE\Microsoft\Speech\Voices\Tokens"

# Ensure we are running in 64-bit PowerShell to access the correct registry view
if ([IntPtr]::Size -eq 4) {
    Write-Host "Detected 32-bit PowerShell. Attempting to relaunch in 64-bit..." -ForegroundColor Yellow
    $64bitPS = "$env:SystemRoot\SysNative\WindowsPowerShell\v1.0\powershell.exe"
    if (Test-Path $64bitPS) {
        & $64bitPS -ExecutionPolicy Bypass -File $PSCommandPath
        exit
    }
    else {
        Write-Host "Could not find 64-bit PowerShell. Please open 'Windows PowerShell' (not x86) manually." -ForegroundColor Red
        exit
    }
}

# Check if source exists
if (!(Test-Path $sourcePath)) {
    Write-Host "OneCore voices registry path not found." -ForegroundColor Red
    exit
}

# Get all voices in OneCore
$voices = Get-ChildItem -Path $sourcePath

foreach ($voice in $voices) {
    # Filter for Vietnamese voices (usually contain viVN or Vietnamese)
    if ($voice.Name -like "*vi-VN*" -or $voice.Name -like "*Viet*" -or $voice.Name -like "*An*" -or $voice.Name -like "*HoaiMy*") {
        $voiceName = $voice.PSChildName
        $newPath = Join-Path -Path $destPath -ChildPath $voiceName
        
        Write-Host "Found Vietnamese Voice: $voiceName" -ForegroundColor Cyan
        
        if (!(Test-Path $newPath)) {
            Write-Host "Copying to SAPI5 registry..." -ForegroundColor Yellow
            try {
                Copy-Item -Path $voice.PSPath -Destination $newPath -Recurse -Force
                Write-Host "Success! Voice is now available for pyttsx3." -ForegroundColor Green
            }
            catch {
                Write-Host "Error copying registry key. requesting Admin privileges..." -ForegroundColor Red
                Write-Host "PLEASE RUN THIS SCRIPT AS ADMINISTRATOR!" -ForegroundColor Red
            }
        }
        else {
            Write-Host "Voice already exists in SAPI5. No action needed." -ForegroundColor Green
        }
    }
}

Write-Host "Done. Please restart the server."
Pause
