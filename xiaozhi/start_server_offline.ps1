# ============================================================================
# 🚀 Script khởi chạy server offline
# ============================================================================

# Set environment variables để force offline mode
$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"
$env:HF_DATASETS_OFFLINE = "1"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🔌 OFFLINE MODE ENABLED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment variables set:" -ForegroundColor Yellow
Write-Host "  ✅ HF_HUB_OFFLINE = 1" -ForegroundColor Green
Write-Host "  ✅ TRANSFORMERS_OFFLINE = 1" -ForegroundColor Green
Write-Host "  ✅ HF_DATASETS_OFFLINE = 1" -ForegroundColor Green
Write-Host ""
Write-Host "Starting server..." -ForegroundColor Yellow
Write-Host ""

# Chuyển đến thư mục server
Set-Location "C:\Users\Admin\Desktop\Xiaozhi\xiaozhi-local-chat\main\xiaozhi-server"

# Chạy server với venv
& .\venv\Scripts\python.exe app.py
