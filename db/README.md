# Base de datos — RutaIA

Motor: **MySQL 8.4** · Charset `utf8mb4` · Collation `utf8mb4_spanish_ci` · Zona horaria UTC.

## Archivos

| Archivo | Contenido |
|---|---|
| `schema.sql` | Crea la base, las 10 tablas, índices, claves foráneas y 2 vistas |
| `seed.sql` | Usuarios, 12 destinos, 48 actividades, 3 servicios IA, conversaciones y consumo de ejemplo |
| `../server/scripts/ingest.js` | Genera los 60 documentos del RAG a partir del catálogo |

## Modelo

| Tabla | Propósito |
|---|---|
| `users` | Usuarios, rol (`admin`/`user`), cuota mensual de tokens y estado |
| `destinations` | Catálogo de destinos turísticos |
| `activities` | Actividades asociadas a cada destino |
| `documents` | Fragmentos de texto para la recuperación del RAG (`FULLTEXT`) |
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

## Inicialización con Docker

```powershell
docker compose down -v   # solo si necesitas recrear el volumen
docker compose up -d
```

Los scripts se ejecutan automáticamente **solo al crear el volumen por primera vez**.

## Ingesta del RAG

Con el contenedor saludable y las dependencias del backend instaladas:

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

El script es idempotente: borra y regenera únicamente los documentos de tipo
`destination` y `activity`, y conserva los documentos manuales.

## Credenciales de demostración

| Rol | Correo | Contraseña | Cuota mensual |
|---|---|---|---|
| Administrador | `admin@rutaia.local` | `Admin123!` | 500.000 tokens |
| Usuario | `demo@rutaia.local` | `Demo123!` | 50.000 tokens |
| Usuario | `maria@rutaia.local` | `Demo123!` | 30.000 tokens |

Las contraseñas están hasheadas con bcrypt (10 rondas). Cambiarlas antes de publicar.

## Consultas de verificación

```sql
-- Documentos generados
SELECT source_type, COUNT(*) FROM documents GROUP BY source_type;

-- Consumo del mes por usuario
SELECT u.email, u.token_limit_month, COALESCE(SUM(l.total_tokens), 0) AS used
FROM users u
LEFT JOIN usage_logs l
  ON l.user_id = u.id
 AND l.created_at >= DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01')
GROUP BY u.id;

-- Recuperación RAG
SELECT title, MATCH(title, content) AGAINST ('playa con niños' IN NATURAL LANGUAGE MODE) AS score
FROM documents
WHERE MATCH(title, content) AGAINST ('playa con niños' IN NATURAL LANGUAGE MODE)
ORDER BY score DESC
LIMIT 5;
```

## Reinicio completo

```powershell
docker compose down -v
docker compose up -d --wait
cd server
npm run db:ingest
```

> `docker compose down -v` elimina todos los datos locales.
