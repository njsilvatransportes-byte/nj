@echo off
title NJTransportes - Importar Fretes
cls
echo =========================================================
echo       NJTRANSPORTES - IMPORTAR FRETES DA PLANILHA
echo =========================================================
echo.
cd /d "%~dp0"

where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js nao foi encontrado neste computador.
    echo Instale a versao LTS em https://nodejs.org e tente novamente.
    echo.
    pause
    exit /b 1
)

IF NOT EXIST "node_modules\pg\" (
    echo Instalando dependencias...
    call npm install
    IF %ERRORLEVEL% NEQ 0 (
        echo Nao foi possivel instalar as dependencias.
        pause
        exit /b %ERRORLEVEL%
    )
)

echo Iniciando importacao da planilha de fretes...
echo Planilha: J:\Meu Drive\Planilhas\Frete.xlsm
echo Aba: Lancamentos
echo.
node scripts\import_fretes.js

echo.
IF %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Ocorreu um erro durante a importacao.
) ELSE (
    echo [OK] Importacao concluida com sucesso!
)
echo.
pause
