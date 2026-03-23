# Script to create Party Congress 14 audio using Edge TTS
# Run from xiaozhi-server directory

$text = @"
Chủ đề Đại hội đại biểu toàn quốc lần thứ mười bốn của Đảng là:

Dưới lá cờ vẻ vang của Đảng, chung sức, đồng lòng thực hiện thắng lợi các mục tiêu phát triển đất nước đến năm hai nghìn không trăm ba mươi; tự chủ chiến lược, tự cường, tự tin, tiến mạnh trong kỷ nguyên vươn mình của dân tộc vì hoà bình, độc lập, dân chủ, giàu mạnh, phồn vinh, văn minh, hạnh phúc, vững bước đi lên chủ nghĩa xã hội.
"@

$output = "data\audio_static\chu_de_dai_hoi_14.wav"

Write-Host "=" * 80
Write-Host "CREATING AUDIO FOR PARTY CONGRESS 14 THEME"
Write-Host "=" * 80

# Create directory if not exists
New-Item -ItemType Directory -Force -Path "data\audio_static" | Out-Null

# Check if edge-tts is installed
try {
    $null = Get-Command edge-tts -ErrorAction Stop
    Write-Host "`n✅ edge-tts found, generating audio..."
    
    # Generate audio (Vietnamese voice)
    edge-tts --voice "vi-VN-HoaiMyNeural" --text $text --write-media $output
    
    if (Test-Path $output) {
        $size = (Get-Item $output).Length / 1MB
        Write-Host "`n✅ SUCCESS!"
        Write-Host "   File: $output"
        Write-Host "   Size: $($size.ToString('F2')) MB"
        Write-Host "`nℹ️  Restart server to use static audio"
    } else {
        Write-Host "`n❌ Failed to create file"
    }
} catch {
    Write-Host "`n⚠️  edge-tts not installed"
    Write-Host "`nInstall with: pip install edge-tts"
    Write-Host "Then run this script again"
}
