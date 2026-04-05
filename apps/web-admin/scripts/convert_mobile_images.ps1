# Builds mob_*.webp for the landing: high-quality downscale (Lanczos) so the site does not load
# 1378x2796 assets and blur them in the browser.
#
# Source: PNG in public (full resolution) preferred; if missing, uses existing webp (re-encode; prefer PNG).
# Requires ImageMagick 7+ (`magick` on PATH).
#
#   powershell -ExecutionPolicy Bypass -File apps/web-admin/scripts/convert_mobile_images.ps1
#   powershell -ExecutionPolicy Bypass -File apps/web-admin/scripts/convert_mobile_images.ps1 -Scale 6

param(
  [ValidateRange(2, 12)]
  [int] $Scale = 6
)

$ErrorActionPreference = "Stop"
$publicPath = (Resolve-Path (Join-Path (Join-Path $PSScriptRoot "..") "public")).Path
$pct = 100.0 / $Scale

$pairs = @(
  @{ SrcPng = "mob_en.PNG"; SrcWebp = "mob_en.webp"; Dst = "mob_en.webp" },
  @{ SrcPng = "mob_ru.PNG"; SrcWebp = "mob_ru.webp"; Dst = "mob_ru.webp" }
)

foreach ($pair in $pairs) {
  $srcPng = Join-Path $publicPath $pair.SrcPng
  $srcWebp = Join-Path $publicPath $pair.SrcWebp
  $dst = Join-Path $publicPath $pair.Dst

  $inputPath = $null
  if (Test-Path -LiteralPath $srcPng) {
    $inputPath = $srcPng
  }
  elseif (Test-Path -LiteralPath $srcWebp) {
    $inputPath = $srcWebp
    Write-Warning "PNG missing; using $($pair.SrcWebp) (re-encode; use PNG when possible)."
  }
  else {
    Write-Warning "Skip: neither $($pair.SrcPng) nor $($pair.SrcWebp) found."
    continue
  }

  $tmp = Join-Path $env:TEMP ("mob_convert_{0}.tmp.webp" -f [Guid]::NewGuid().ToString("n"))

  try {
    # Lanczos: sharp downscale for UI screenshots
    & magick @(
      $inputPath,
      "-filter", "Lanczos",
      "-resize", "${pct}%",
      "-strip",
      "-quality", "95",
      "-define", "webp:method=6",
      $tmp
    )

    if (-not (Test-Path -LiteralPath $tmp)) {
      throw "ImageMagick did not produce output file."
    }

    Move-Item -LiteralPath $tmp -Destination $dst -Force
    Write-Host ("OK: {0} (from {1}, scale 1/{2})" -f $dst, (Split-Path $inputPath -Leaf), $Scale)
  }
  finally {
    if (Test-Path -LiteralPath $tmp) {
      Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
  }
}

Write-Host "Done."
