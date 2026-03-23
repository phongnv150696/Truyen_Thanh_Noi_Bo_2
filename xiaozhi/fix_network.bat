@echo off
echo ========================================================
echo FIX MANG WIFI TU NGAT KHI KHONG CO INTERNET
echo ========================================================
echo.
echo 1. Tat tinh nang "Active Probing" (tranh Windows tu ngat khi khong ping duoc MS)
reg add "HKLM\SYSTEM\CurrentControlSet\Services\NlaSvc\Parameters\Internet" /v EnableActiveProbing /t REG_DWORD /d 0 /f

echo 2. Chuyen Power Plan sang High Performance (hieu suat cao)
powercfg /s 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c

echo 3. Tat "Power Saving Mode" cho Wireless Adapter
powercfg /change monitor-timeout-ac 0
powercfg /change monitor-timeout-dc 0
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 0

echo.
echo ========================================================
echo DA THUC HIEN XONG!
echo Hay khoi dong lai may tinh de ap dung thay doi.
echo ========================================================
pause
