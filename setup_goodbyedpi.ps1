# GoodbyeDPI Auto-Installer & Starter
# This script downloads GoodbyeDPI and sets it up to bypass ISP blocks

$url = "https://github.com/ValdikSS/GoodbyeDPI/releases/download/0.2.2/goodbyedpi-0.2.2.zip"
$output = "h:\Smart\goodbyedpi.zip"
$extractPath = "h:\Smart\goodbyedpi"

Write-Host "--- Downloading GoodbyeDPI ---" -ForegroundColor Cyan
Invoke-WebRequest -Uri $url -OutFile $output

Write-Host "--- Extracting ---" -ForegroundColor Cyan
Expand-Archive -Path $output -DestinationPath $extractPath -Force

Write-Host "--- Cleaning up zip ---"
Remove-Item $output

Write-Host "--- Starting GoodbyeDPI (Russia Blacklist Mode) ---" -ForegroundColor Green
Write-Host "Keep this window open while browsing!" -ForegroundColor Yellow

# Start the x86_64 version with standard Russia bypass flags
# -e 1 (fragmentation) -q (QUIC) --desync-any-protocol
Start-Process "$extractPath\goodbyedpi-0.2.2\x86_64\goodbyedpi.exe" -ArgumentList "-e 1 -q --desync-any-protocol"

Write-Host "If it works, you can install it as a service later."
Pause
