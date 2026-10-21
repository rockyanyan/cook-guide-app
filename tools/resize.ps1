Add-Type -AssemblyName System.Drawing
$map = Get-Content -Path "C:\Desktop\菜单\CookApp\imgmap.txt" -Encoding UTF8
$out = "C:\Desktop\菜单\CookApp\app\src\main\assets\www\img"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]78)
$n = 0
foreach ($line in $map) {
  if (-not $line.Trim()) { continue }
  $parts = $line.Split("`t")
  $id = $parts[0]
  $src = $parts[1]
  try {
    $img = [System.Drawing.Image]::FromFile($src)
    $maxW = 720
    $ratio = [Math]::Min(1.0, $maxW / $img.Width)
    $w = [int]($img.Width * $ratio)
    $h = [int]($img.Height * $ratio)
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $w, $h)
    $bmp.Save("$out\$id.jpg", $codec, $ep)
    $g.Dispose()
    $bmp.Dispose()
    $img.Dispose()
    $n++
  } catch { Write-Output "FAIL $src : $_" }
}
Write-Output "done $n"
