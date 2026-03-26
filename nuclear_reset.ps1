# NUCLEAR NETWORK RESET (AUTO-ELEVATE)
# RUN THIS SCRIPT NORMALLY - IT WILL ASK FOR ADMIN PERMISSION

# Check for Admin rights
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Elevating privileges..."
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "--- ADMIN RIGHTS GRANTED. STARTING CLEANUP ---"

# 1. Resetting stack
netsh winsock reset
netsh int ip reset

# 2. Flush DNS and routes
ipconfig /flushdns
route -f

# 3. GLOBAL RESET of all interfaces
netcfg -d

# 4. Cleanup proxy settings
$proxyPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
if (Test-Path $proxyPath) {
    Set-ItemProperty -Path $proxyPath -Name ProxyEnable -Value 0
    Remove-ItemProperty -Path $proxyPath -Name ProxyServer -Value ""
}
netsh winhttp reset proxy

# 5. Restore HOSTS file to default
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$defaultHosts = "# Default Hosts`n127.0.0.1 localhost`n::1 localhost"
try {
    Set-Content -Path $hostsPath -Value $defaultHosts -ErrorAction Stop
    Write-Host "Hosts file restored successfully."
} catch {
    Write-Host "Could not write to Hosts file. Check your Antivirus!" -ForegroundColor Red
}

Write-Host ""
Write-Host "--- ALL DONE. PC WILL REBOOT IN 30 SECONDS ---" -ForegroundColor Green

# Reboot in 30 seconds
shutdown /r /t 30
