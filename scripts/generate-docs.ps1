<#!
.SYNOPSIS
  Genera las capturas de la entrega y, opcionalmente, el informe PDF.
.EXAMPLE
  .\scripts\generate-docs.ps1
  .\scripts\generate-docs.ps1 -SkipScreens -SkipPdf
#>
param(
  [switch]$SkipScreens,
  [switch]$SkipPdf
)

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
Set-Location $project

if (-not $SkipScreens) {
  $edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
  $profile = Join-Path $env:TEMP 'rutaia-edge-profile'

  Write-Host 'Compilando el cliente…'
  npm --prefix client run build

  Write-Host 'Iniciando preview en 127.0.0.1:4173…'
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile',
    '-Command',
    "Set-Location '$project'; npm --prefix client run preview -- --host 127.0.0.1 --port 4173"
  )

  # Perfil aislado de QA: --disable-web-security evita el bloqueo del navegador
  # al llamar de 127.0.0.1 a localhost en modo headless.
  Start-Process -FilePath $edge -ArgumentList @(
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    "--user-data-dir=$profile",
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-web-security',
    'http://127.0.0.1:4173'
  )

  Start-Sleep -Seconds 5

  Write-Host 'Capturando la interfaz web…'
  node scripts/qa-frontend.mjs

  Write-Host 'Capturando analítica y Power BI…'
  node scripts/qa-analytics-ui.mjs
  node scripts/qa-powerbi-ui.mjs

  Write-Host 'Capturando Swagger…'
  node scripts/qa-swagger.mjs
  node scripts/qa-swagger-analytics.mjs

  Write-Host 'Copiando capturas a docs/capturas…'
  node scripts/collect-docs.mjs
}

if (-not $SkipPdf) {
  Write-Host 'Generando el informe PDF…'
  python docs/generate-pdf.py
}

Write-Host 'Documentación actualizada.'
