@echo off
:: Script para registrar a tarefa agendada de importacao - requer executar como Administrador
title NJTransportes - Configurar Agendamento

echo =========================================================
echo    NJTRANSPORTES - CONFIGURAR IMPORTACAO AUTOMATICA
echo =========================================================
echo.
echo Este script criara uma tarefa no Agendador de Tarefas do
echo Windows para importar os abastecimentos da planilha
echo automaticamente todo dia as 07:00.
echo.

:: Detecta o caminho do node.exe
for /f "tokens=*" %%i in ('where node') do set NODE_PATH=%%i

:: Define o diretorio do projeto (relativo ao local deste script)
set PROJECT_DIR=%~dp0
:: Remove a barra final
if "%PROJECT_DIR:~-1%"=="\" set PROJECT_DIR=%PROJECT_DIR:~0,-1%

set SCRIPT_PATH=%PROJECT_DIR%\scripts\import_fuelings.js
set TASK_NAME=NJTransportes - Importar Abastecimentos

echo Node.js encontrado em: %NODE_PATH%
echo Projeto em: %PROJECT_DIR%
echo.

:: Remove tarefa antiga se existir
schtasks /Delete /TN "%TASK_NAME%" /F >nul 2>&1

:: Cria a nova tarefa agendada
schtasks /Create ^
  /TN "%TASK_NAME%" ^
  /TR "\"%NODE_PATH%\" \"%SCRIPT_PATH%\"" ^
  /SC DAILY ^
  /ST 07:00 ^
  /SD 01/01/2025 ^
  /RL HIGHEST ^
  /RU "%USERNAME%" ^
  /F ^
  /Z

IF %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Tarefa agendada criada com sucesso!
    echo      Nome: %TASK_NAME%
    echo      Horario: Diariamente as 07:00
    echo.
    echo Para ver a tarefa: Abra o Agendador de Tarefas do Windows
    echo Para executar agora: schtasks /Run /TN "%TASK_NAME%"
) ELSE (
    echo.
    echo [ERRO] Nao foi possivel criar a tarefa.
    echo        Execute este script como Administrador (clique com o botao direito, 
    echo        "Executar como administrador").
)

echo.
pause
