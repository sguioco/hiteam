# Windows Network Fixer
# Run as Administrator

Write-Host "--- NETWORK STATUS RESET ---" -ForegroundColor Cyan

Write-Host "1. Flush DNS cache..."
ipconfig /flushdns

Write-Host "2. Resetting Winsock catalog..."
netsh winsock reset

Write-Host "3. Resetting IP protocol stack..."
netsh int ip reset

Write-Host "4. Resetting Firewall..."
netsh advfirewall reset

Write-Host "5. Setting TCP autotuning to normal..."
netsh interface tcp set global autotuninglevel=normal

Write-Host ""
Write-Host "--- DONE! Please REBOOT your computer. ---" -ForegroundColor Green
Write-Host ""
Pause
