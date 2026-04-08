[CmdletBinding()]
param(
  [string]$InputPath,
  [string]$OutputPath,
  [switch]$ReplaceOriginal
)

$ErrorActionPreference = 'Stop'

$scriptRoot = if ($PSScriptRoot) {
  $PSScriptRoot
} else {
  Split-Path -Parent $MyInvocation.MyCommand.Path
}

if ([string]::IsNullOrWhiteSpace($InputPath)) {
  $InputPath = Join-Path $scriptRoot 'hero.webm'
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $scriptRoot 'hero.rotated.webm'
}

$ffmpeg = Get-Command ffmpeg -ErrorAction Stop

$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)

if ($resolvedInput -eq $resolvedOutput) {
  throw 'InputPath and OutputPath must be different. Use -ReplaceOriginal to overwrite the source safely.'
}

$tempOutput = if ($ReplaceOriginal) {
  Join-Path ([System.IO.Path]::GetDirectoryName($resolvedInput)) 'hero.rotated.tmp.webm'
} else {
  $resolvedOutput
}

$ffmpegArgs = @(
  '-y'
  '-i'
  $resolvedInput
  '-vf'
  'hflip,vflip'
  '-an'
  '-c:v'
  'libvpx-vp9'
  '-crf'
  '30'
  '-b:v'
  '0'
  '-deadline'
  'good'
  '-cpu-used'
  '4'
  '-pix_fmt'
  'yuv420p'
  $tempOutput
)

Write-Host "Rotating video 180 degrees: $resolvedInput"
& $ffmpeg.Source @ffmpegArgs

if ($LASTEXITCODE -ne 0) {
  throw "ffmpeg failed with exit code $LASTEXITCODE"
}

if ($ReplaceOriginal) {
  $backupPath = "$resolvedInput.bak"

  if (Test-Path -LiteralPath $backupPath) {
    Remove-Item -LiteralPath $backupPath -Force
  }

  Move-Item -LiteralPath $resolvedInput -Destination $backupPath -Force
  Move-Item -LiteralPath $tempOutput -Destination $resolvedInput -Force

  Write-Host "Replaced original video. Backup saved to: $backupPath"
} else {
  Write-Host "Rotated video written to: $tempOutput"
}
