@echo off
echo ============================
echo  Deploy KangBanGaming
echo ============================
cd /d "%~dp0"
del .git\index.lock 2>nul

git add -A

git diff --cached --quiet
if %errorlevel%==0 (
  echo Rien a commiter - tout est deja a jour.
) else (
  git commit -m "update: %date% %time%"
  git push
  echo.
  echo Pousse ! Redeploi dans Coolify.
)
pause
