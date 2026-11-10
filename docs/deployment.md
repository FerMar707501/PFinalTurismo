# Despliegue y CI/CD

## Despliegue actual (Render)

| Recurso | URL |
|---|---|
| App + API | https://rutaia-api-q3y2.onrender.com |
| Swagger | https://rutaia-api-q3y2.onrender.com/api-docs |
| Power BI | `GET /api/bi/usage` con `X-API-Key: rutaia_ce9e9b1489b894c17550d818ee956a4dcdbc0529d2c59cc7` |
| PostgreSQL | `rutaia-db` (Render, plan gratuito, Oregon) |

La app y la API viven en **un único servicio web**: Express sirve `client/dist`
y las rutas `/api`, así que comparten dominio y no hay CORS de por medio. La base
es un PostgreSQL gestionado de Render inyectado como `DATABASE_URL`.

### Secretos de GitHub necesarios

| Secreto | Valor |
|---|---|
| `RENDER_API_KEY` | API key de la cuenta de Render |
| `RENDER_SERVICE_ID` | `srv-dbpmstmc6qcc73dh49sg` |

`RENDER_API_URL` es opcional (el flujo usa la URL de producción por defecto).

---

El flujo de GitHub Actions (`.github/workflows/ci.yml`) ejecuta:

1. **Backend**: PostgreSQL 16 como servicio, esquema + seed + ingesta RAG, las 74
   pruebas con Vitest/Supertest y el arranque real en `NODE_ENV=production`.
2. **Frontend**: `npm ci`, `npm run lint`, `npm run build` y publicación del artefacto.
3. **Despliegue** (solo en `main` y tras aprobar pruebas): servicio en **Render**,
   seguido de una verificación de humo contra la URL publicada.

Todo el despliegue es opcional: si los secretos no existen, el job lo informa y no
falla.

## 1. Base de datos PostgreSQL gestionada

Opciones gratuitas compatibles:

- **Aiven for MySQL** (plan gratuito de 1 GB).
- **Railway MySQL** (crédito inicial).
- **PlanetScale** (MySQL 8 gestionado; verifica que el plan permita índices `FULLTEXT`, que el RAG necesita).

Pasos con Aiven (recomendado por conservar `FULLTEXT`):

1. Crea el servicio MySQL y una base `rutaia`.
2. Copia host, puerto, usuario, contraseña y añade tu IP a los permitidos.
3. Aplica `db/schema.sql` y `db/seed.sql` con `mysql` o con el cliente web de Aiven.
   La forma más rápida desde PowerShell:

```powershell
$env:DB_HOST = 'mysql-xxxx.aivencloud.com'
$env:DB_PORT = '12345'
$env:DB_USER = 'avnadmin'
$env:DB_PASSWORD = '<clave>'
$env:DB_NAME = 'rutaia'
$env:MYSQL_CLIENT = 'mysql'
cd server
npm run db:setup -- --force
npm run db:ingest
```

> El RAG usa `FULLTEXT` con `utf8mb4_spanish_ci`; el servidor debe ser MySQL 8 (no
> MariaDB sin adaptar el índice).

## 2. Configurar el secreto JWT

En local y en Render usa un valor largo y aleatorio:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Guárdalo como `JWT_SECRET`; nunca lo subas al repositorio.

## 3. API en Render

1. En Render: **New → Blueprint** y selecciona el repositorio; Render lee
   `render.yaml`.
2. Completa los secretos marcados como `sync: false`:
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`
   - `GROQ_API_KEY`
   - `CORS_ORIGIN` (URL de Vercel, se puede completar después)
3. Render genera `JWT_SECRET` automáticamente y valida `/api/health`.
4. Copia la URL pública (por ejemplo `https://rutaia-api.onrender.com`).

La API usa `PORT` inyectado por Render; el health check confirma MySQL y responde 503
si la base no está disponible.

### Secretos de GitHub para el despliegue automático

| Secreto | Uso |
|---|---|
| `RENDER_API_KEY` | Token de cuenta de Render |
| `RENDER_SERVICE_ID` | ID del servicio `rutaia-api` (`srv-...`) |
| `RENDER_API_URL` | URL pública de la API para la prueba de humo |
| `VERCEL_TOKEN` | Token de Vercel |
| `VERCEL_ORG_ID` | ID de la organización/equipo |
| `VERCEL_PROJECT_ID` | ID del proyecto frontend |

## 4. Frontend en Vercel

1. Importa el repositorio y selecciona la carpeta `client` como raíz.
2. Framework **Vite**; build `npm run build`; output `dist` (`client/vercel.json` ya lo
   declara).
3. Variables de entorno (Production y Preview):

```text
VITE_API_URL=https://rutaia-api.onrender.com/api
```

4. Tras el primer despliegue, vuelve a Render y actualiza `CORS_ORIGIN` con el dominio
   de Vercel (admite varios separados por coma).

El cliente navega por hash (`#/chat`, `#/analytics`, ...), por lo que cualquier hosting
estático funciona; además `vercel.json` reescribe rutas a `index.html`.

## 5. Power BI en producción

1. Entra como administrador y abre **Conectar Power BI**.
2. Genera una API key para el reporte publicado.
3. Configura la URL `https://rutaia-api.onrender.com/api/external/analytics/usage` y la
   cabecera `X-API-Key` en Power BI Desktop.
4. Publica y programa la actualización diaria; si la clave se filtra, desactívala y
   crea otra.

> En Render, elige un plan que no suspenda la API por inactividad durante la demo. Si
> usas el plan gratuito, la primera petición puede tardar ~30 s; ejecuta
> `node scripts/smoke-api.mjs <url>` antes de la presentación para despertarla.

## 6. Verificación manual del despliegue

```powershell
node scripts/smoke-api.mjs https://rutaia-api.onrender.com
```

Comprueba health check + MySQL, OpenAPI, login, catálogo, reporte de analítica y que el
reporte externo exige API key.

## 7. Docker como alternativa local

```powershell
docker compose --profile full up -d --build
```

Levanta MySQL y la API (imagen multi-stage sin devDependencies, usuario sin
privilegios y health check). La API queda en `http://localhost:4000`.
