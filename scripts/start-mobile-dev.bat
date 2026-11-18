@echo off
chcp 65001 >nul
REM =====================================================================
REM 手机版（H5）开发模式启动：http://localhost:5174
REM 用途：在电脑上改代码、看效果；热更新，保存即生效
REM 前提：已经在本目录执行过 npm install
REM 注意：不需要启动后端，手机版是纯前端离线应用
REM =====================================================================
cd /d "%~dp0..\mobile"

if not exist node_modules (
  echo 没找到 node_modules，正在安装依赖（只需一次）...
  call npm install
  if errorlevel 1 (
    echo.
    echo 安装失败。可以试试国内镜像：
    echo   npm install --registry=https://registry.npmmirror.com
    pause
    exit /b 1
  )
)

echo.
echo 启动中... 稍等几秒
echo 浏览器打开：http://localhost:5174
echo 按 Ctrl+C 停止
echo.
call npm run dev
pause
