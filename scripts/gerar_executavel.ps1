$ErrorActionPreference = "Stop"

$sourceDir = "I:\Meu Drive\Projetos\NJTransportes\NJTransportes - Ambiente Testes"
$buildDir = "C:\Projetos\NJTransportes-Build"

Write-Host "Criando pasta de preparacao em $buildDir..."
if (Test-Path $buildDir) {
    Remove-Item -Recurse -Force $buildDir
}
New-Item -ItemType Directory -Path $buildDir | Out-Null

Write-Host "Copiando arquivos do projeto..."
# Copia arquivos necessarios (exceto node_modules e .git)
Get-ChildItem -Path $sourceDir -Exclude "node_modules", ".git", "dist", "logs" | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $buildDir -Recurse -Force
}

Set-Location -Path $buildDir

Write-Host "Instalando dependencias no disco local C:..."
npm install --no-audit

Write-Host "Instalando electron e electron-builder..."
npm install --save-dev electron electron-builder --no-audit

Write-Host "Compilando instalador executavel Windows (.exe)..."
npx electron-builder --win nsis --x64

Write-Host "Copiando executavel gerado de volta para o projeto..."
$distDir = Join-Path $sourceDir "dist"
if (!(Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir | Out-Null
}

Copy-Item -Path "$buildDir\dist\*.exe" -Destination $distDir -Force
Get-ChildItem -Path $distDir -Filter "*.exe" | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

Write-Host "Processo concluido com sucesso!"
