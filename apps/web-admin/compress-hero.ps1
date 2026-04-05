# compress-hero.ps1
# Конвертирует hero.mp4 в формат WebM (кодек VP9), который дает намного 
# лучшее соотношение качество/размер специально для веба.

$inputFile = ".\public\hero.mp4"
$outputFile = ".\public\hero_compressed.webm"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host "Ошибка: FFmpeg не установлен." -ForegroundColor Red
    exit
}

Write-Host "Начинаем сжатие видео (MP4 -> WebM VP9). Это займёт немного больше времени..." -ForegroundColor Cyan

# Мы ставим кодек libvpx-vp9, убираем аудио (-an), 
# и указываем -crf 35, что для WebM означает "отличное качество при сильном сжатии".
# Разрешение ограничиваем высотой 720p (-vf scale=-2:720).
ffmpeg -i $inputFile -c:v libvpx-vp9 -crf 35 -b:v 0 -an -vf scale=-2:720 -y $outputFile

Write-Host "Готово! Файл сохранен как: $outputFile" -ForegroundColor Green
Write-Host "Теперь в файле landing-page.tsx поменяйте src=`/hero.mp4` на src=`/hero_compressed.webm`"
