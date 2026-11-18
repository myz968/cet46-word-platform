@echo off
chcp 65001 >nul
REM =====================================================================
REM 只启动后端（SpringBoot，端口 8080）
REM 单独拿这个脚本测试接口：http://127.0.0.1:8080/api/health
REM =====================================================================
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "PROJECT=%~dp0.."

cd /d "%PROJECT%\backend"
echo 正在启动后端，首次启动会建库并导入词库，请稍等...
echo 就绪后访问：http://127.0.0.1:8080/api/health
echo 关闭本窗口即可停止后端。
echo.
java -jar "%PROJECT%\backend\target\cet46-word-platform.jar"
echo.
echo 后端已退出。
pause
