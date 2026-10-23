@echo off
echo ========================================================
echo Running RetailSense Comprehensive Pytest Test Suite...
echo ========================================================
cd /d "%~dp0backend"
py -m pytest -v
pause
