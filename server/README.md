# API RutaIA

Backend Express de RutaIA. Implementa autenticación JWT, roles, CRUD de usuarios y
catálogo, configuración de servicios de IA, cuotas mensuales de tokens, seguridad,
manejo centralizado de errores, health check y documentación OpenAPI.

## Estado actual

La **Fase 3** está completada. La API ya permite iniciar sesión, administrar usuarios,
gestionar destinos y actividades, activar o desactivar servicios de IA y consultar la
cuota mensual de tokens. El chat RAG, los agentes multi-paso y la analítica se agregan
en las fases siguientes.

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
│   ├── rag/
│   │   └── catalogDocuments.js  # Documentos y sincronización del catálogo
│   ├── routes/
│   │   ├── index.js
│   │   └── health.routes.js
│   ├── modules/
│   │   ├── auth/          # Login y perfil autenticado
│   │   ├── users/         # CRUD de usuarios y roles
│   │   ├── catalog/       # Destinos y actividades
│   │   ├── services/      # Servicios de IA
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
│   └── fase3.test.js      # Auth, usuarios, catálogo, servicios y cuotas
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

Las funciones `assertQuotaAvailable()` y `recordUsage()` de
`src/modules/usage/usage.service.js` quedan listas para que el chat y los agentes de
la Fase 4 estimen el costo antes de llamar a Groq, bloqueen la solicitud con el código
`TOKEN_QUOTA_EXCEEDED` y registren el consumo real después de la llamada.

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
npm test            # Vitest + Supertest (39 pruebas)
npm start           # producción
```

- Documentación: <http://localhost:4000/api/docs>
- OpenAPI JSON: <http://localhost:4000/api/docs.json>
- Health check: <http://localhost:4000/api/health>

Las pruebas usan la misma base local configurada en `server/.env` y crean registros
con prefijo `TEST_Fase3_`; al final los eliminan. No ejecutes `npm test` contra una
base de producción.

## Variables de entorno

Todas están documentadas en `.env.example` y se validan al arrancar. La
`GROQ_API_KEY` solo debe existir en el backend; nunca se expone al frontend ni se sube
al repositorio. Antes de desplegar, cambia `JWT_SECRET` por un valor largo y aleatorio.

## Próximas fases

- **Fase 4:** chat RAG con memoria, historial de conversaciones, bloqueo por cuota y
  registro real de tokens.
- **Fase 5:** agentes multi-paso con herramientas internas y fuentes externas.
- **Fase 6:** frontend React.
- **Fase 7:** analítica web y Power BI.
- **Fase 8:** pruebas completas, Swagger final y colección Postman.
- **Fase 9:** despliegue y CI/CD.
- **Fase 10:** documentación final y demostración.
