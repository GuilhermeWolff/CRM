@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "PG=C:\Users\wolff\tools\pgsql17"
set "DATA=C:\Users\wolff\pgdata"

"%PG%\bin\pg_ctl.exe" -D "%DATA%" stop -m fast
pause
