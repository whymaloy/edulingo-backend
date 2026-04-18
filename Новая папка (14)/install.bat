@echo off
echo ==============================================
echo   EduLingo LMS - Setup Script
echo ==============================================
echo.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is NOT installed!
    echo Please download and install Node.js from:
    echo   https://nodejs.org/en/download
    echo After installing, run this script again.
    pause
    exit /b 1
)

echo [OK] Node.js found:
node -v
echo.

REM Check npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found. Please reinstall Node.js.
    pause
    exit /b 1
)

echo [OK] npm found:
npm -v
echo.

echo Installing backend dependencies...
cd backend
npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)

echo.
echo ==============================================
echo   Installation complete!
echo ==============================================
echo.
echo Next steps:
echo  1. Make sure MongoDB is running locally
echo     OR edit backend\.env with your Atlas URI
echo.
echo  2. Start the backend server:
echo     cd backend
echo     npm start
echo.
echo  3. Open frontend\index.html in your browser
echo     (or use VS Code Live Server)
echo.
pause
