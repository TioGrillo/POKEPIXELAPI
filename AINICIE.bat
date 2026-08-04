@echo off
title PokePIXEL
cd /d "%~dp0"
echo === Poke PIXEL ===
echo.

echo [1/3] Buildando main...
node ./node_modules/typescript/bin/tsc -p tsconfig.main.json
if %errorlevel% neq 0 (
    echo ERRO no build main!
    pause
    exit /b 1
)

echo [2/3] Buildando preload...
node ./node_modules/typescript/bin/tsc -p tsconfig.preload.json
if %errorlevel% neq 0 (
    echo ERRO no build preload!
    pause
    exit /b 1
)

echo [3/3] Buildando renderer...
node ./node_modules/vite/bin/vite.js build
if %errorlevel% neq 0 (
    echo ERRO no build renderer!
    pause
    exit /b 1
)

echo Copiando dados compartilhados para dist/renderer...
copy /Y "src\shared\hunts_data.json" "dist\renderer\hunts_data.json" >nul
copy /Y "src\shared\poke_base_stats.json" "dist\renderer\poke_base_stats.json" >nul
copy /Y "src\shared\slug_to_dex.json" "dist\renderer\slug_to_dex.json" >nul

echo.
echo Build OK! Iniciando Electron...
node ./node_modules/electron/cli.js .
