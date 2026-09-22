@echo off
echo ========================================================
echo        🚀 Starting CodeMentorAI Full-Stack App
echo ========================================================
echo.
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start cmd /k "python run_backend.py"
echo.
echo [2/2] Starting React Vite Frontend on http://localhost:5173 ...
cd frontend
start cmd /k "npm run dev"
echo.
echo Both servers are launching! Open http://localhost:5173 in your browser.
echo ========================================================
