@echo off
chcp 65001 >nul
REM =====================================================================
REM 用 jlink 生成精简 JRE（只保留 SpringBoot 运行需要的模块）
REM 产物：<仓库根>\desktop\runtime\jre
REM 这样安装包里自带 Java 运行时，对方电脑不需要装 JDK
REM =====================================================================
setlocal

set "JDK_HOME=C:\Program Files\Java\jdk-17"
set PROJECT=%~dp0..
set OUTPUT=%PROJECT%\desktop\runtime\jre

if not exist "%JDK_HOME%\bin\jlink.exe" (
  echo [错误] 没找到 jlink：%JDK_HOME%\bin\jlink.exe
  echo        请把本脚本第 10 行的 JDK_HOME 改成你自己的 JDK17 路径
  pause
  exit /b 1
)

if exist "%OUTPUT%" (
  echo [信息] 已存在旧 JRE，先删除...
  rmdir /s /q "%OUTPUT%"
)

echo [1/2] 正在生成精简 JRE ...
"%JDK_HOME%\bin\jlink.exe" ^
  --add-modules java.base,java.logging,java.naming,java.sql,java.desktop,java.management,java.instrument,java.security.jgss,java.xml,jdk.unsupported ^
  --strip-debug --no-header-files --no-man-pages --compress=2 ^
  --output "%OUTPUT%"

if errorlevel 1 (
  echo [错误] jlink 执行失败
  pause
  exit /b 1
)

echo [2/2] 完成，输出目录：%OUTPUT%
dir /s /-c "%OUTPUT%\bin\javaw.exe"
echo.
echo 精简 JRE 生成成功，大小约 40-60MB，随 electron-builder 一起打进安装包。
REM 被 build-exe.bat 调用时传入 silent 参数，此时不要停下来等按键
if /i not "%~1"=="silent" pause
