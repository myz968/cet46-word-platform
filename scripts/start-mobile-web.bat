@echo off
chcp 65001 >nul
REM =====================================================================
REM 手机版（H5）打包并启动本地服务
REM 用途：把网页打包成静态文件，用手机真机打开验证
REM   1. 自动 npm run build 生成 dist
REM   2. 起本地服务 5180，并打印「手机可访问的局域网地址」
REM 手机要求：和电脑连同一个 WiFi
REM =====================================================================
cd /d "%~dp0..\mobile"

if not exist node_modules (
  echo 没找到 node_modules，正在安装依赖（只需一次）...
  call npm install
  if errorlevel 1 (
    echo 安装失败，请先执行：npm install --registry=https://registry.npmmirror.com
    pause
    exit /b 1
  )
)

echo [1/2] 打包网页...
call npm run build
if errorlevel 1 (
  echo 打包失败，请查看上面的错误信息
  pause
  exit /b 1
)

echo.
echo [2/2] 启动本地服务，注意看下面打印的手机地址
echo 如果手机打不开，多半是 Windows 防火墙拦了 5180 端口，弹窗时要点「允许访问」
echo.
call npm run serve
pause
