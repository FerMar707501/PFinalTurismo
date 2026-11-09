# API RutaIA

Backend Express de RutaIA. Implementa autenticación JWT, roles, CRUD de usuarios y
catálogo, configuración de servicios de IA, chat RAG con memoria e historial, dos
agentes multi-paso con herramientas internas y externas, cuotas mensuales de tokens,
seguridad, manejo centralizado de errores, health check y documentación OpenAPI.

## Estado actual

La **Fase 5** está completada. La API ya permite iniciar sesión, administrar usuarios,
gestionar destinos y actividades, activar o desactivar servicios de IA, consultar la
cuota mensual, conversar con el chatbot RAG y ejecutar los agentes `agent_itinerary` y
`agent_compare`. El chatbot recupera contexto del catálogo con `FULLTEXT`; los agentes
usan *tool calling* de Groq para consultar el catálogo, Open-Meteo, OSRM y Wikipedia en
varios pasos. Todas las llamadas registran fuentes, consumo real, cuota y trazabilidad
en `agent_runs` y `usage_logs`. La analítica y el frontend se agregan en las fases
siguientes.

## Estructura

```text
server/
├── src/
│   ├── config/
│   │   ├── env.js         # Carga y validación de variables con Zod
│   │   ├── constants.js   # Nombre, versión y prefijo de la API
│   │   ├── db.js          # Pool MySQL, consultas y transacciones
│   │   └── swagger.js     # Especificación OpenAPI 3.0.3
│   ├── middleware/
│   │   ├── requestId.js
│   │   ├── errorHandler.js
│   │   ├── auth.js        # JWT, autenticación opcional y roles
│   │   └── validate.js    # Validación de params, body y query con Zod
│   ├── errors/
│   │   └── AppError.js
│   ├── ai/
│   │   └── groqClient.js        # Cliente Groq, tool calling y normalización
│   ├── agents/
│   │   └── toolRunner.js        # Bucle multi-paso y ejecución de herramientas
│   ├── tools/
│   │   ├── agentTools.js        # Herramientas de catálogo para los agentes
│   │   └── externalApis.js      # Open-Meteo, OSRM, Wikipedia y caché
│   ├── rag/
│   │   ├── catalogDocuments.js  # Documentos y sincronización del catálogo
│   │   └── retrieval.js         # Recuperación FULLTEXT y contexto para el prompt
│   ├── routes/
│   │   ├── index.js
│   │   └── health.routes.js
│   ├── modules/
│   │   ├── auth/          # Login y perfil autenticado
│   │   ├── users/         # CRUD de usuarios y roles
│   │   ├── catalog/       # Destinos y actividades
│   │   ├── services/      # Servicios de IA
│   │   ├── chat/          # Chat RAG, memoria, historial y fuentes
│   │   ├── agents/        # Itinerarios y comparación de destinos
│   │   └── usage/         # Cuotas y registro de consumo
│   ├── utils/
│   │   ├── jwt.js
│   │   ├── password.js
│   │   └── pagination.js
│   ├── app.js             # Configuración de Express
│   └── server.js          # Arranque y cierre ordenado
├── scripts/
│   └── ingest.js          # Ingesta de documentos para el RAG
├── tests/
│   ├── api.test.js        # Salud, Swagger y manejo de errores
│   ├── fase3.test.js      # Auth, usuarios, catálogo, servicios y cuotas
│   ├── fase4.test.js      # Chat RAG, memoria, historial, cuotas y errores
│   └── fase5.test.js      # Agentes multi-paso, herramientas, fuentes y cuotas
├── vitest.config.js
├── .env.example
└── package.json
```

## Endpoints implementados

### Sistema y autenticación

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | Pública | Información del servicio |
| GET | `/api` | Pública | Información de la API |
| GET | `/api/health` | Pública | Estado de la API y de MySQL |
| GET | `/api/docs` | Pública | Swagger UI |
| GET | `/api/docs.json` | Pública | Especificación OpenAPI |
| POST | `/api/auth/login` | Pública | Login y entrega del JWT |
| GET | `/api/auth/me` | JWT | Usuario autenticado y cuota |

### Usuarios y roles

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/users` | Admin | Lista paginada con búsqueda, rol y estado |
| POST | `/api/users` | Admin | Crea un usuario |
| GET | `/api/users/:id` | Admin | Detalle de usuario y cuota |
| PATCH | `/api/users/:id` | Admin | Actualiza nombre, correo, contraseña, rol, cuota o estado |
| DELETE | `/api/users/:id` | Admin | Desactiva el usuario (borrado lógico) |

No existe registro público. Los administradores crean las cuentas y asignan la cuota
mensual. El sistema impide que un administrador se desactive o se quite el rol a sí
mismo, y que se quede sin al menos un administrador activo.

### Catálogo turístico

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/destinations` | Pública | Destinos activos con filtros y paginación |
| GET | `/api/destinations/:id` | Pública | Destino con sus actividades activas |
| POST | `/api/destinations` | Admin | Crea un destino |
| PATCH | `/api/destinations/:id` | Admin | Actualiza un destino |
| DELETE | `/api/destinations/:id` | Admin | Desactiva un destino |
| GET | `/api/activities` | Pública | Actividades activas con filtros |
| GET | `/api/activities/:id` | Pública | Detalle de una actividad |
| POST | `/api/activities` | Admin | Crea una actividad |
| PATCH | `/api/activities/:id` | Admin | Actualiza una actividad |
| DELETE | `/api/activities/:id` | Admin | Desactiva una actividad |

Cada creación, actualización o desactivación de un destino o actividad sincroniza los
documentos correspondientes en la tabla `documents`. Así el chatbot RAG siempre
consulta información vigente. Un administrador autenticado puede ver registros
inactivos usando el filtro `active=false` o consultando el detalle.

### Servicios de IA y consumo

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/services` | Pública/JWT | Servicios habilitados; admin ve todos |
| GET | `/api/services/:code` | Pública/JWT | Detalle de un servicio |
| PATCH | `/api/services/:code` | Admin | Edita modelo, temperatura, tokens o prompt |
| PATCH | `/api/services/:code/status` | Admin | Activa o desactiva el servicio |
| GET | `/api/usage/me` | JWT | Cuota mensual del usuario autenticado |

Los códigos iniciales son `chat_rag`, `agent_itinerary` y `agent_compare`. El
`system_prompt` solo se devuelve a administradores.

### Chat RAG

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/chat` | JWT | Envía un mensaje y crea la conversación si no se indica `conversationId` |
| GET | `/api/chat/conversations` | JWT | Lista paginada de conversaciones propias |
| GET | `/api/chat/conversations/:id` | JWT | Mensajes recientes y fuentes de una conversación propia |

Flujo de una respuesta:

1. Comprueba que el servicio `chat_rag` esté habilitado.
2. Si se envía `conversationId`, verifica que pertenezca al usuario autenticado.
3. Recupera hasta 5 documentos del catálogo con `MATCH ... AGAINST` y los últimos
   10 mensajes de la conversación.
4. Construye el prompt con el `system_prompt` del servicio, el contexto y la memoria.
5. Estima los tokens de entrada más el máximo de salida y bloquea con
   `TOKEN_QUOTA_EXCEEDED` (HTTP 429) si no alcanza la cuota.
6. Llama a Groq, guarda los mensajes, las fuentes RAG en `messages.sources_json` y el
   consumo real en `usage_logs`.

Las conversaciones están aisladas por usuario. La respuesta incluye
`conversation`, `userMessage`, `message`, `sources`, `usage` y la cuota actualizada.
Si el servicio está desactivado responde `409 SERVICE_DISABLED`; si falta
`GROQ_API_KEY` responde `503 AI_NOT_CONFIGURED`.

### Agentes multi-paso

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/agents/itinerary` | JWT | Planifica un itinerario por días con clima, ruta y actividades |
| POST | `/api/agents/compare` | JWT | Compara de 2 a 4 destinos y recomienda uno |
| GET | `/api/agents/runs` | JWT | Lista las ejecuciones propias con filtros y paginación |
| GET | `/api/agents/runs/:id` | JWT | Detalle de una ejecución, incluidos todos sus pasos |

El **agente de itinerario** recibe `destinationId`, `days`, `originCity`, `travelers`,
`budget`, `interests` y `notes`. El **agente comparador** recibe `destinationIds`
(entre 2 y 4), `days`, `originCity`, `travelers`, `budget` e `interests`.

Ambos agentes usan el mecanismo de *tool calling* de Groq con un máximo de 6 pasos:

1. `get_destination_info`: ficha del catálogo.
2. `list_destination_activities`: actividades, duración y precios.
3. `get_weather_forecast`: pronóstico de Open-Meteo.
4. `get_route_distance`: distancia y duración terrestre con OSRM.
5. `get_wikipedia_summary`: contexto externo de Wikipedia en español.

Las respuestas externas se guardan en `external_cache` con TTL para reducir llamadas y
tolerar fallos temporales. Si una herramienta falla, el agente recibe el error y puede
continuar con el resto de la información. Al finalizar se guardan:

- La conversación y los mensajes en `conversations` / `messages`.
- Las fuentes internas y externas en `messages.sources_json`.
- La entrada, salida y todos los pasos en `agent_runs`.
- El consumo real agregado de todas las llamadas en `usage_logs`.

La respuesta incluye `run`, `conversationId`, `answer`, `sources`, `steps`, `usage` y
`quota`. La cuota se estima de forma conservadora antes de ejecutar (prompt, reserva
para resultados de herramientas y `max_tokens × 6`). Si no alcanza, responde
`429 TOKEN_QUOTA_EXCEEDED` y registra el intento como `blocked`. Un servicio desactivado
responde `409 SERVICE_DISABLED` y una ejecución fallida se conserva en `agent_runs` con
estado `error`.

Ejemplo de itinerario:

```powershell
$body = @{
  destinationId = 6
  days = 3
  travelers = 2
  budget = 'medio'
  originCity = 'Bogotá'
  interests = @('café', 'naturaleza')
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://localhost:4000/api/agents/itinerary `
  -Headers $headers `
  -ContentType 'application/json' `
  -Body $body
```

## Autenticación

```powershell
$login = Invoke-RestMethod -Method Post `
  -Uri http://localhost:4000/api/auth/login `
  -ContentType 'application/json' `
  -Body (@{ email = 'admin@rutaia.local'; password = 'Admin123!' } | ConvertTo-Json)

$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Uri http://localhost:4000/api/users -Headers $headers
```

- El token se envía como `Authorization: Bearer <token>`.
- Los errores de autenticación usan los códigos `UNAUTHORIZED`, `INVALID_TOKEN`,
  `TOKEN_EXPIRED`, `USER_INACTIVE` y `FORBIDDEN`.
- El login tiene un límite de 10 intentos fallidos cada 15 minutos por IP.
- Cada solicitud autenticada vuelve a comprobar que el usuario exista y esté activo.

## Cuotas de tokens

La cuota es mensual y se calcula con los registros `success` de `usage_logs` cuyo
`created_at` cae en el mes UTC actual. La respuesta incluye:

- `period`, `periodStart`, `periodEnd` y `resetAt`.
- `limitTokens`, `usedTokens` y `remainingTokens`.
- `percentUsed`, `exceeded`, `successfulRequests` y `blockedRequests`.

El chat y los agentes usan `assertQuotaAvailable()` antes de llamar a Groq y
`recordUsage()` después de la llamada. Las solicitudes bloqueadas se guardan con estado
`blocked` y las fallas del proveedor con estado `error`, sin sumar tokens a la cuota.
En los agentes, el consumo registrado es la suma real de todas las llamadas del bucle
multi-paso y el detalle queda en `agent_runs.total_tokens`.

## Seguridad y validación

- Helmet con CSP compatible con Swagger UI.
- CORS restringido por `CORS_ORIGIN` (admite varios orígenes separados por coma).
- Rate limit global: 300 solicitudes cada 15 minutos por IP.
- Cuerpo máximo de 1 MB y `X-Powered-By` deshabilitado.
- `X-Request-Id` en respuestas y logs.
- Contraseñas con bcrypt y JWT firmados con `JWT_SECRET`.
- Validación de `params`, `body` y `query` con Zod.
- Errores de MySQL, Zod y JSON inválido normalizados.
- Consultas SQL parametrizadas y borrado lógico para no perder historial.
- Cierre ordenado con `SIGINT`/`SIGTERM`.

Ejemplo de respuesta de error:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "La ruta GET /api/no-existe no existe."
  },
  "requestId": "7f49c1d8-6a1e-4c02-9b01-9a2d4d4c2a11"
}
```

## Comandos

```powershell
Copy-Item .env.example .env
npm install
npm run db:ingest   # requiere MySQL arriba
npm run dev         # http://localhost:4000
npm test            # Vitest + Supertest (58 pruebas)
npm start           # producción
```

- Documentación: <http://localhost:4000/api/docs>
- OpenAPI JSON: <http://localhost:4000/api/docs.json>
- Health check: <http://localhost:4000/api/health>

Las pruebas usan la misma base local configurada en `server/.env` y crean registros
temporales con prefijos `TEST_Fase3_`, `TEST_Fase4_` y `TEST_Fase5_`; al final los
eliminan. Las pruebas del chat y de los agentes simulan Groq y las APIs externas, por lo
que no consumen tokens, no dependen de Internet ni necesitan una `GROQ_API_KEY` real. No
ejecutes `npm test` contra una base de producción.

## Variables de entorno

Todas están documentadas en `.env.example` y se validan al arrancar. La
`GROQ_API_KEY` solo debe existir en el backend; nunca se expone al frontend ni se sube
al repositorio. Antes de desplegar, cambia `JWT_SECRET` por un valor largo y aleatorio.

## Próximas fases

- **Fase 6:** frontend React.
- **Fase 7:** analítica web y Power BI.
- **Fase 8:** pruebas completas, Swagger final y colección Postman.
- **Fase 9:** despliegue y CI/CD.
- **Fase 10:** documentación final y demostración.
