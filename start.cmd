@echo off
rem CppForge 啟動器
rem 需要 Node.js 20+（本機為 v24）。第一次使用請在 UI 內按「安裝工具鏈」。
setlocal
cd /d "%~dp0"

rem 若使用者目錄含非 ASCII 字元（例如中文），MinGW 的 ld.exe 會無法連結，
rem 必須改用純英文路徑。取消下面這行的註解並改成你想要的磁碟機：
rem set CPPFORGE_HOME=C:\CppForge

echo 啟動 CppForge ...  瀏覽器請開 http://127.0.0.1:4173
node app\server\index.mjs
if errorlevel 1 pause
