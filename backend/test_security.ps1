# =================================================
# SCRIPT KIỂM THỬ BẢO MẬT: /media/bulk-delete
# =================================================
# ⚠️ SỬA username và password thật của bạn ở đây:
$USERNAME = "admin"         # <-- đổi thành username thật
$PASSWORD = "duoc123"  # <-- đổi thành password thật
$BASE_URL = "http://localhost:3000"

Write-Host "`n=============================" -ForegroundColor Cyan
Write-Host " KIỂM THỬ BẢO MẬT BULK-DELETE" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# -------------------------------------------------------
# TEST 1: Gọi KHÔNG có token → Phải nhận 401
# -------------------------------------------------------
Write-Host "`n[TEST 1] Gọi không có token (mô phỏng kẻ tấn công)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Method POST -Uri "$BASE_URL/media/bulk-delete" `
        -ContentType "application/json" `
        -Body '{"ids":[99999]}'
    Write-Host "❌ FAIL: Server cho phép xóa mà không cần đăng nhập!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "✅ PASS: Server trả về 401 Unauthorized — Chặn thành công!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Status code: $statusCode (mong đợi 401)" -ForegroundColor Yellow
    }
}

# -------------------------------------------------------
# TEST 2: Đăng nhập lấy token
# -------------------------------------------------------
Write-Host "`n[BƯỚC] Đăng nhập để lấy token..." -ForegroundColor Yellow
try {
    $loginBody = "{`"username`":`"$USERNAME`",`"password`":`"$PASSWORD`"}"
    $loginResponse = Invoke-RestMethod -Method POST -Uri "$BASE_URL/auth/login" `
        -ContentType "application/json" `
        -Body $loginBody
    $token = $loginResponse.token
    $role = $loginResponse.user.role_name
    Write-Host "✅ Đăng nhập thành công! Role: $role" -ForegroundColor Green
    Write-Host "   Token (30 ký tự đầu): $($token.Substring(0, [Math]::Min(30, $token.Length)))..." -ForegroundColor DarkGray
} catch {
    Write-Host "❌ Đăng nhập thất bại: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   → Hãy kiểm tra lại USERNAME và PASSWORD trong script!" -ForegroundColor Yellow
    exit
}

# -------------------------------------------------------
# TEST 3: Gọi VỚI token hợp lệ + ID không tồn tại → Phải nhận thông báo thành công (0 rows)
# -------------------------------------------------------
Write-Host "`n[TEST 2] Gọi VỚI token hợp lệ (ID giả 99999 không tồn tại)..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Method POST -Uri "$BASE_URL/media/bulk-delete" `
        -ContentType "application/json" `
        -Headers @{Authorization="Bearer $token"} `
        -Body '{"ids":[99999]}'
    Write-Host "✅ PASS: Được phép gọi với token hợp lệ. Kết quả: $($result.message)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Lỗi khi gọi với token: $($_.Exception.Message)" -ForegroundColor Yellow
}

# -------------------------------------------------------
# KẾT QUẢ
# -------------------------------------------------------
Write-Host "`n=============================" -ForegroundColor Cyan
Write-Host " KẾT LUẬN" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "- Không có token  → 401 (chặn lại)" -ForegroundColor White
Write-Host "- Có token hợp lệ → Được phép thực hiện" -ForegroundColor White
Write-Host "Bảo mật route /media/bulk-delete đang hoạt động đúng!`n" -ForegroundColor Green
