@echo off
chcp 65001 >nul
REM =====================================================================
REM 一键打包 exe：后端 jar -> 前端 dist -> 精简 JRE -> electron-builder
REM 运行前请确认：
REM   1. 已安装 JDK17（默认 C:\Program Files\Java\jdk-17，按你的实际路径改）
REM   2. 已安装 Node.js 18+
REM   3. 已执行过 frontend 与 desktop 的 npm install
REM =====================================================================
setlocal
set PROJECT=%~dp0..
set "JDK_HOME=C:\Program Files\Java\jdk-17"

echo ========== 1/4 构建后端 jar ==========
cd /d "%PROJECT%\backend"
set JAVA_HOME=%JDK_HOME%
call mvn -B -DskipTests clean package
if errorlevel 1 goto :fail

echo ========== 2/4 构建前端 dist ==========
cd /d "%PROJECT%\frontend"
call npm install --no-audit --no-fund
call npm run build
if errorlevel 1 goto :fail

echo ========== 3/4 生成精简 JRE ==========
call "%PROJECT%\scripts\build-jre.bat" silent
if not exist "%PROJECT%\desktop\runtime\jre\bin\javaw.exe" goto :fail

echo ========== 4/4 打包安装程序 ==========
cd /d "%PROJECT%\desktop"
call npm install --no-audit --no-fund
call npm run dist
if errorlevel 1 goto :fail

echo.
echo 全部完成！安装包在：%PROJECT%\desktop\release
dir /b "%PROJECT%\desktop\release\*.exe"
pause
exit /b 0

:fail
echo.
echo [失败] 上一步执行出错，请查看上方日志
pause
exit /b 1
