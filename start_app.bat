@echo off
title AI Legal Assist - Web App Launcher
echo ========================================================
echo        Starting AI Legal Assist Web Application
echo ========================================================
echo.

echo [1/2] Starting Django Backend on http://localhost:8000 ...
start "AI Legal Assist - Backend" cmd /k "cd /d \"%~dp0project\" && ..\myworld\Scripts\python.exe manage.py runserver 8000"

echo [2/2] Starting Vite Frontend on http://localhost:5173 ...
start "AI Legal Assist - Frontend" cmd /k "cd /d \"%~dp0frontend\" && npm run dev -- --open"

echo.
echo Both services have been launched!
echo - Backend API: http://localhost:8000
echo - Frontend Web App: http://localhost:5173
echo.
echo Your default browser will open automatically.
pause
