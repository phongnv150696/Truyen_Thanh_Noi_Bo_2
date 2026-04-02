$baseUrl = "http://localhost:3000"
$report = New-Object System.Collections.Generic.List[PSCustomObject]

function Log-Test($name, $status, $details) {
    $item = [PSCustomObject]@{ Name = $name; Status = $status; Details = $details }
    $report.Add($item)
    if ($status -eq "PASS") { Write-Host "[OK] $name" -ForegroundColor Green }
    else { Write-Host "[FAIL] $name - $details" -ForegroundColor Red }
}

Write-Host "--- BẮT ĐẦU KIỂM THỬ TOÀN DIỆN V2 ---" -ForegroundColor Cyan

# 1. Health
try { Log-Test "Health Check" "PASS" "Status: $((Invoke-RestMethod "$baseUrl/health").status)" } catch { Log-Test "Health Check" "FAIL" $_.Exception.Message }

# 2. CORS
try { 
    $r = Invoke-WebRequest -Uri "$baseUrl/health" -Headers @{Origin="http://malicious.com"} -Method OPTIONS -ErrorAction SilentlyContinue
    if ($r.Headers['Access-Control-Allow-Origin'] -ne "http://localhost:5173") { Log-Test "CORS" "PASS" "Blocked" } else { Log-Test "CORS" "FAIL" "Allowed" }
} catch { Log-Test "CORS" "PASS" "Blocked" }

# 3. Strong Password & Registration Flow
$testUser = "test_user_" + (Get-Date -Format "HHmmssf")
try {
    $body = @{ username=$testUser; password="Password123!" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $body
    Log-Test "Strong Password" "PASS" "Accepted valid password"
    
    # 4. Status Check for new user
    $s = Invoke-RestMethod -Uri "$baseUrl/auth/registration-status/$testUser"
    if ($s.status -eq "pending") { Log-Test "Status API" "PASS" "User is pending" } else { Log-Test "Status API" "FAIL" "Wrong status" }
} catch {
    Log-Test "Registration Flow" "FAIL" $_.Exception.Message
}

# 5. Rate Limit
$limitReached = $false
for ($i=1; $i -le 10; $i++) {
    try { Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body (@{username="admin"; password="x"}|ConvertTo-Json) }
    catch { if ($_.Exception.Response.StatusCode.value__ -eq 429) { $limitReached = $true; break } }
}
if ($limitReached) { Log-Test "Rate Limit" "PASS" "IP blocked" } else { Log-Test "Rate Limit" "FAIL" "No block" }

Write-Host "`n--- KẾT QUẢ ---" -ForegroundColor Cyan
$report | Format-Table -AutoSize
