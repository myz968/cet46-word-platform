@echo off
REM ===================================================================
REM  CET46 H5 mobile LAN access - Windows Firewall repair
REM
REM  WHY: The WLAN "xju_5.8G" is classified as a PUBLIC network, and
REM       Windows has an auto-generated "node.exe" INBOUND BLOCK rule
REM       for the Public profile (port = Any). In Windows Firewall a
REM       BLOCK rule always beats an ALLOW rule, so adding only an allow
REM       rule does nothing. This script does all three required steps.
REM
REM  This script self-elevates via UAC. Right-click > Run as admin also works.
REM  It only changes firewall rules. It does NOT touch any H5 / PWA code.
REM
REM  TO UNDO:
REM    netsh advfirewall firewall delete rule name="CET46 H5 TCP 5180 Inbound (Private)"
REM    netsh advfirewall firewall delete rule name="CET46 H5 TCP 5180 Inbound (Public)"
REM    Enable-NetFirewallRule -DisplayName "node.exe"   (in admin PowerShell)
REM ===================================================================

net session >nul 2>&1
if %errorLevel% neq 0 (
  echo Requesting administrator privileges. Please click "Yes" in the UAC dialog...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo [1/3] Inbound ALLOW : TCP 5180 / Private profile  (as requested)
netsh advfirewall firewall delete rule name="CET46 H5 TCP 5180 Inbound (Private)" >nul 2>&1
netsh advfirewall firewall add rule name="CET46 H5 TCP 5180 Inbound (Private)" dir=in action=allow protocol=TCP localport=5180 profile=private
echo.
echo [2/3] Inbound ALLOW : TCP 5180 / Public profile   (WLAN is actually Public)
netsh advfirewall firewall delete rule name="CET46 H5 TCP 5180 Inbound (Public)" >nul 2>&1
netsh advfirewall firewall add rule name="CET46 H5 TCP 5180 Inbound (Public)" dir=in action=allow protocol=TCP localport=5180 profile=public
echo.
echo [3/3] Disable the auto-generated "node.exe" TCP Public BLOCK rule
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetFirewallRule -Direction Inbound -Action Block -Enabled True | Where-Object { $_.DisplayName -eq 'node.exe' -and $_.Profile -eq 'Public' -and (($_ | Get-NetFirewallPortFilter).Protocol -eq 'TCP') } | ForEach-Object { Disable-NetFirewallRule -InputObject $_; Write-Host ('disabled: ' + $_.Name) }"

echo.
echo === Relevant firewall rules now ===
powershell -NoProfile -Command "Get-NetFirewallRule | Where-Object { $_.DisplayName -like 'CET46 H5*' -or $_.DisplayName -eq 'node.exe' } | Select-Object DisplayName,Direction,Action,Enabled,Profile | Format-Table -AutoSize"

echo.
echo Done. On the phone, open:  http://10.107.154.126:5180
echo NOTE: Do NOT use 172.24.224.1 (that is an emulator virtual adapter).
echo If it still fails, the campus WiFi likely has AP/client isolation:
echo share a mobile hotspot from the phone and retry with the new IP.
echo.
pause
