# Capturas generadas por scripts/qa-frontend.mjs con datos de demostración.
# Requisitos: Edge/Chrome con depuración remota en 9222 y el preview del cliente
# en http://127.0.0.1:4173.

$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$profile = Join-Path $env:TEMP 'rutaia-edge-profile'
$project = $PWD

npm --prefix client run build

Start-Process -FilePath 'powershell.exe' -ArgumentList @(
  '-NoProfile',
  '-Command',
  "Set-Location '$project'; npm --prefix client run preview -- --host 127.0.0.1 --port 4173"
)

# --disable-web-security solo se usa en este perfil aislado de QA porque el navegador
# bloquea las peticiones de 127.0.0.1 a localhost en el entorno headless.
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

Start-Sleep -Seconds 4

node scripts/qa-frontend.mjs
node scripts/qa-admin-crud.mjs
