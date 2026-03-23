# Script để chạy Streamlit Web UI cho Xiaozhi RAG Chat
# Tự động kích hoạt virtual environment và khởi động Streamlit

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Xiaozhi RAG Chat - Streamlit UI" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra xem virtual environment có tồn tại không
if (Test-Path ".\venv\Scripts\Activate.ps1") {
    Write-Host "[1/4] Kích hoạt virtual environment..." -ForegroundColor Yellow
    & .\venv\Scripts\Activate.ps1
    Write-Host "✓ Virtual environment đã được kích hoạt" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⚠ Không tìm thấy virtual environment tại .\venv" -ForegroundColor Red
    Write-Host "Vui lòng tạo virtual environment trước:" -ForegroundColor Yellow
    Write-Host "  python -m venv venv" -ForegroundColor Cyan
    Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor Cyan
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Cyan
    exit 1
}

# Kiểm tra xem Streamlit đã được cài đặt chưa
Write-Host "[2/4] Kiểm tra Streamlit..." -ForegroundColor Yellow
$streamlitInstalled = pip list | Select-String "streamlit"

if (-not $streamlitInstalled) {
    Write-Host "⚠ Streamlit chưa được cài đặt" -ForegroundColor Red
    Write-Host "Đang cài đặt Streamlit..." -ForegroundColor Yellow
    pip install -r requirements_streamlit.txt
    Write-Host "✓ Streamlit đã được cài đặt" -ForegroundColor Green
} else {
    Write-Host "✓ Streamlit đã được cài đặt" -ForegroundColor Green
}
Write-Host ""

# Kiểm tra xem Ollama có đang chạy không
Write-Host "[3/4] Kiểm tra Ollama server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✓ Ollama server đang chạy" -ForegroundColor Green
} catch {
    Write-Host "⚠ Không thể kết nối với Ollama server" -ForegroundColor Red
    Write-Host "Vui lòng đảm bảo Ollama đang chạy:" -ForegroundColor Yellow
    Write-Host "  - Khởi động Ollama" -ForegroundColor Cyan
    Write-Host "  - Hoặc chạy: ollama serve" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Bạn có muốn tiếp tục không? (Y/N)" -ForegroundColor Yellow
    $continue = Read-Host
    if ($continue -ne "Y" -and $continue -ne "y") {
        exit 1
    }
}
Write-Host ""

# Khởi động Streamlit
Write-Host "[4/4] Khởi động Streamlit Web UI..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Server đang khởi động..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📡 Web UI sẽ được mở tự động tại:" -ForegroundColor Yellow
Write-Host "   http://localhost:8501" -ForegroundColor Cyan
Write-Host ""
Write-Host "Nhấn Ctrl+C để dừng server" -ForegroundColor Gray
Write-Host ""

# Chạy Streamlit với cấu hình tối ưu
streamlit run streamlit_app.py `
    --server.port=8501 `
    --server.address=localhost `
    --server.headless=true `
    --browser.gatherUsageStats=false `
    --theme.primaryColor="#667eea" `
    --theme.backgroundColor="#0e1117" `
    --theme.secondaryBackgroundColor="#262730" `
    --theme.textColor="#fafafa"
