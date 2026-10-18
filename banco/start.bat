@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "PG=C:\Users\wolff\tools\pgsql17"
set "DATA=C:\Users\wolff\pgdata"

if not exist "%PG%\bin\pg_ctl.exe" (
  echo [ERRO] PostgreSQL nao encontrado em %PG%
  pause
  exit /b 1
)

"%PG%\bin\pg_ctl.exe" -D "%DATA%" -l "%DATA%\server.log" -o "-p 5432 -c listen_addresses=127.0.0.1" -w start
echo.
echo Banco disponivel em 127.0.0.1:5432 (base: crm)
pause
