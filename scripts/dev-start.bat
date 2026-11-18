@echo off
chcp 65001 >nul
REM =====================================================================
REM 开发模式一键启动：后端(8080) + 前端(5173)
REM 会打开两个命令行窗口，关掉窗口即停止对应服务
REM 前提：后端已执行过 mvn package，前端已执行过 npm install
REM =====================================================================
set "PROJECT=%~dp0.."

echo [1/2] 启动后端 http://127.0.0.1:8080 ...
start "cet46-backend" cmd /k "%PROJECT%\scripts\start-backend.bat"

timeout /t 5 /nobreak >nul

echo [2/2] 启动前端 http://127.0.0.1:5173 ...
start "cet46-frontend" cmd /k "cd /d %PROJECT%\frontend && npm run dev"

echo.
echo 等后端窗口出现 "Started WordPlatformApplication" 后，
echo 浏览器打开：http://127.0.0.1:5173
echo.
pause
