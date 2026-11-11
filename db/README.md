# Base de datos — RutaIA

Motor: **PostgreSQL 16** · UTF-8 · zona horaria UTC.

## Archivos

| Archivo | Contenido |
|---|---|
| `schema.postgres.sql` | Crea las 11 tablas, índices, claves foráneas, 2 vistas y el trigger `updated_at` |
| `seed.postgres.sql` | Usuarios, 12 destinos, 48 actividades, 3 servicios IA, conversaciones, consumo de ejemplo y la API key de Power BI |
| `bi-key.postgres.sql` | Snippet suelto para registrar solo la API key de Power BI (el seed ya la incluye) |
| `../server/scripts/ingest.js` | Genera los 60 documentos del RAG a partir del catálogo |

> `schema.sql` y `seed.sql` son la versión histórica para MySQL y **no se usan** en el
> despliegue actual.

## Modelo

| Tabla | Propósito |
|---|---|
| `users` | Usuarios, rol (`admin`/`user`), cuota mensual de tokens y estado |
| `destinations` | Catálogo de destinos turísticos de Guatemala |
| `activities` | Actividades asociadas a cada destino |
| `documents` | Fragmentos de texto para la recuperación del RAG (`tsvector`) |
| `ai_services` | Configuración de los 3 servicios de IA (modelo, prompt, límites) |
| `conversations` | Conversaciones del chatbot y de los agentes |
| `messages` | Mensajes con rol, fuentes citadas y tokens |
| `usage_logs` | Hechos de consumo: tokens, modelo, latencia, estado |
| `agent_runs` | Entrada, salida y traza de pasos de cada agente |
| `api_clients` | API keys con hash para Power BI y consumidores externos |
| `external_cache` | Caché de respuestas de Open-Meteo, OSRM y Wikipedia |

Vistas de apoyo:

- `v_usage_daily`: consumo agregado por día, servicio y usuario.
- `v_usage_by_service`: consultas y tokens acumulados por servicio.

## Creación de la base

### Opción A — script del proyecto (recomendado)

Requiere PostgreSQL 16 en ejecución y la conexión configurada en `server/.env`:

```ini
DATABASE_URL=postgresql://usuario:clave@host:5432/rutaia_db
```

Luego, desde la carpeta `server/`:

```powershell
npm install
npm run db:setup -- --force   # aplica schema.postgres.sql + seed.postgres.sql
npm run db:ingest             # genera los 60 documentos del RAG
```

`db:setup` lee y aplica los dos archivos SQL en orden. La bandera `--force` es necesaria
cuando la base ya tiene usuarios; sin ella el script se detiene para no borrar datos.

Variantes:

| Comando | Efecto |
|---|---|
| `npm run db:setup` | Pide confirmación antes de recrear |
| `npm run db:setup -- --force` | Recrea y siembra sin preguntar (CI/CD) |
| `npm run db:setup -- --keep` | No hace nada si ya hay usuarios |
| `npm run db:setup -- --schema-only` | Solo crea las tablas, sin datos |

### Opción B — `psql` directamente

```powershell
psql "$DATABASE_URL" -f db/schema.postgres.sql
psql "$DATABASE_URL" -f db/seed.postgres.sql
cd server; npm run db:ingest
```

### Opción C — Docker local

```powershell
docker compose up -d
cd server
npm run db:ingest
```

El contenedor ejecuta los scripts automáticamente **solo la primera vez** que se crea el
volumen. Para recrear: `docker compose down -v` y luego `docker compose up -d`.

## Verificación

```sql
-- Conteos esperados
SELECT (SELECT COUNT(*) FROM destinations) AS destinos,
       (SELECT COUNT(*) FROM activities)   AS actividades,
       (SELECT COUNT(*) FROM documents)    AS documentos,
       (SELECT COUNT(*) FROM users)        AS usuarios;
-- 12 | 48 | 60 | 3

-- Documentos generados
SELECT source_type, COUNT(*) FROM documents GROUP BY source_type;

-- Consumo del mes por usuario
SELECT u.email,
       u.token_limit_month,
       COALESCE(SUM(l.total_tokens), 0) AS usado
FROM users u
LEFT JOIN usage_logs l
  ON l.user_id = u.id
 AND l.created_at >= date_trunc('month', now() AT TIME ZONE 'UTC')
GROUP BY u.id, u.email, u.token_limit_month;

-- Recuperación RAG
SELECT title,
       ts_rank(to_tsvector('spanish', title || ' ' || content),
               plainto_tsquery('spanish', 'playa con niños')) AS score
FROM documents
WHERE to_tsvector('spanish', title || ' ' || content)
      @@ plainto_tsquery('spanish', 'playa con niños')
ORDER BY score DESC
LIMIT 5;
```

## Credenciales de demostración

| Rol | Correo | Contraseña | Cuota mensual |
|---|---|---|---|
| Administrador | `admin@rutaia.local` | `Admin123!` | 500.000 tokens |
| Usuario | `demo@rutaia.local` | `Demo123!` | 50.000 tokens |
| Usuario | `maria@rutaia.local` | `Demo123!` | 30.000 tokens |

Las contraseñas están hasheadas con bcrypt (10 rondas). Cambiarlas antes de publicar.

## Ingesta del RAG

```powershell
cd server
npm run db:ingest
```

Resultado esperado:

```text
Ingesta completada: 12 destinos y 48 actividades.
activity     48
destination  12
```

El script es idempotente: actualiza los documentos existentes de tipo `destination` y
`activity`, elimina los de entidades que ya no existen y conserva los documentos manuales.

## Reinicio completo

```powershell
cd server
npm run db:setup -- --force
npm run db:ingest
```

> `--force` elimina y recrea las tablas: se pierde todo el historial de consumo.
> En producción, exporta el consumo antes si necesitas conservarlo para Power BI.
