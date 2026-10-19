@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1 || (echo [runner] Node.js not found in PATH. & exit /b 1)

if not exist node_modules (
  echo [runner] Installing dependencies...
  call npm install || (echo [runner] npm install failed. & exit /b 1)
)

if not exist data mkdir data

echo [runner] Applying database migrations...
call npx drizzle-kit migrate || (echo [runner] Migration failed. & exit /b 1)

echo [runner] Starting dev server on http://localhost:3000 ...
call npm run dev
