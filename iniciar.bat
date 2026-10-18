@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo === CRM de Negociacoes de Sites ===
echo.

echo [1/3] Subindo o PostgreSQL...
call "banco\start.bat"

echo [2/3] Abrindo a API (Python + FastAPI)...
start "CRM - API" cmd /k "backend\dev.bat"

timeout /t 4 >nul

echo [3/3] Abrindo a interface (React)...
start "CRM - Interface" cmd /k "frontend\dev.bat"

echo.
echo Pronto! A interface abre sozinha em http://localhost:5173
echo Feche as duas janelas abertas para encerrar API e frontend.
timeout /t 5 >nul
