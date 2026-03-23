@echo off
echo =====================================
echo    FORCE RE-INDEX ALL DOCUMENTS
echo =====================================
echo.

cd /d "%~dp0"

if exist "data\document_cache.json" (
    del "data\document_cache.json"
    echo [OK] Cache deleted
) else (
    echo [INFO] No cache found
)

echo.
echo =====================================
echo    RE-INDEX SCHEDULED
echo =====================================
echo.
echo Server will re-index on next startup
echo.
echo Run: python app.py
echo.
pause
