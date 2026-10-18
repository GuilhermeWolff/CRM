@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
  echo Instalando dependencias do frontend...
  call npm install
)

echo.
echo Interface em http://localhost:5173
echo.
call npm run dev
endlocal
