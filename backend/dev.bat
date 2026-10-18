@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Criando ambiente virtual...
  py -3 -m venv .venv 2>nul || python -m venv .venv
  ".venv\Scripts\python.exe" -m pip install --upgrade pip
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
)

echo.
echo API em http://127.0.0.1:8000  ^|  documentacao: http://127.0.0.1:8000/docs
echo.
".venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000
endlocal
