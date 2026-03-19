Add-Type -AssemblyName System.Drawing
$path = "h:\Smart\apps\mobile\assets\avatars"
$files = Get-ChildItem -Path "$path\*.jpg"

foreach ($file in $files) {
    Write-Host "Processing $($file.Name)..."
    try {
        $img = [System.Drawing.Image]::FromFile($file.FullName)
        
        $maxDim = 512
        $width = $img.Width
        $height = $img.Height
        
        if ($width -gt $maxDim -or $height -gt $maxDim) {
            if ($width -gt $height) {
                $newWidth = $maxDim
                $newHeight = [int]($height * ($maxDim / $width))
            } else {
                $newHeight = $maxDim
                $newWidth = [int]($width * ($maxDim / $height))
            }
            $newImg = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
            $g = [System.Drawing.Graphics]::FromImage($newImg)
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.DrawImage($img, 0, 0, $newWidth, $newHeight)
            $g.Dispose()
            $img.Dispose()
            $img = $newImg
        }
        
        $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq "JPEG" }
        $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 60)
        
        $tempFile = "$($file.FullName).tmp"
        $img.Save($tempFile, $encoder, $params)
        $img.Dispose()
        
        Move-Item -Path $tempFile -Destination $file.FullName -Force
        $newSize = (Get-Item $file.FullName).Length / 1KB
        Write-Host "Done! New size: $($newSize.ToString('F2')) KB"
    } catch {
        Write-Error "Failed to process $($file.Name): $($_.Exception.Message)"
    }
}
