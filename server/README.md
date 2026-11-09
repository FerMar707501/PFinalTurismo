# API RutaIA

Backend Express de RutaIA. Implementa el esqueleto de la API, configuración validada,
seguridad, manejo centralizado de errores, health check y documentación OpenAPI.

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
│   │   └── errorHandler.js
│   ├── errors/
│   │   └── AppError.js
│   ├── routes/
│   │   ├── index.js
│   │   └── health.routes.js
│   ├── modules/           # auth, users, catalog, chat, agents, analytics (Fase 3+)
│   ├── ai/                # cliente Groq, RAG, prompts (Fase 4+)
│   ├── tools/             # herramientas de los agentes (Fase 5+)
│   ├── app.js             # Configuración de Express
│   └── server.js          # Arranque y cierre ordenado
├── scripts/
│   ├── ingest.js          # Ingesta de documentos para el RAG
│   └── seed.js            # Pendiente: utilidades de datos
├── tests/
│   └── api.test.js
├── vitest.config.js
├── .env.example
└── package.json
```

## Endpoints implementados

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Información del servicio |
| GET | `/api` | Información de la API |
| GET | `/api/health` | Estado de la API y de MySQL |
| GET | `/api/docs` | Swagger UI |
| GET | `/api/docs.json` | Especificación OpenAPI |

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
npm run dev      # http://localhost:4000
npm test         # Vitest + Supertest
npm start        # producción
```

- Documentación: <http://localhost:4000/api/docs>
- OpenAPI JSON: <http://localhost:4000/api/docs.json>
- Health check: <http://localhost:4000/api/health>

## Seguridad incluida

- Helmet con CSP compatible con Swagger UI.
- CORS restringido por `CORS_ORIGIN` (admite varios orígenes separados por coma).
- Rate limit: 300 solicitudes cada 15 minutos por IP.
- Cuerpo máximo de 1 MB.
- `X-Powered-By` deshabilitado.
- `X-Request-Id` en respuestas y logs.
- Errores de MySQL, Zod y JSON inválido normalizados.
- Cierre ordenado con `SIGINT`/`SIGTERM`.

## Variables de entorno

Todas están documentadas en `.env.example` y se validan al arrancar. La
`GROQ_API_KEY` solo debe existir en el backend; nunca se expone al frontend ni se sube
al repositorio.
