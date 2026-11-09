import { env } from './env.js';
import { APP_NAME, APP_VERSION, API_PREFIX } from './constants.js';

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: APP_NAME,
    version: APP_VERSION,
    description:
      'API REST de RutaIA: autenticación, chatbot con RAG, agentes de viaje, ' +
      'historial, consumo de tokens y analítica para Power BI.',
    license: {
      name: 'Proyecto académico — Programación Comercial',
    },
  },
  servers: [
    {
      url: API_PREFIX,
      description: 'Servidor actual',
    },
    {
      url: `http://localhost:${env.PORT}${API_PREFIX}`,
      description: 'Desarrollo local',
    },
  ],
  tags: [
    {
      name: 'Sistema',
      description: 'Estado del servicio y documentación',
    },
  ],
  paths: {
    '/': {
      get: {
        tags: ['Sistema'],
        summary: 'Información general de la API',
        responses: {
          200: {
            description: 'Información de la API',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiInfo' },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Estado de la API y de MySQL',
        description:
          'Comprueba que la API esté en ejecución y que la conexión a MySQL responda.',
        responses: {
          200: {
            description: 'Servicio y base de datos disponibles',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
          503: {
            description: 'La base de datos no está disponible',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtenido en /api/auth/login',
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key para consumidores externos como Power BI',
      },
    },
    schemas: {
      ApiInfo: {
        type: 'object',
        properties: {
          service: { type: 'string', example: APP_NAME },
          version: { type: 'string', example: APP_VERSION },
          docs: { type: 'string', example: `${API_PREFIX}/docs` },
          health: { type: 'string', example: `${API_PREFIX}/health` },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['ok', 'degraded'],
            example: 'ok',
          },
          service: { type: 'string', example: APP_NAME },
          version: { type: 'string', example: APP_VERSION },
          environment: {
            type: 'string',
            enum: ['development', 'test', 'production'],
            example: 'development',
          },
          uptimeSeconds: { type: 'integer', example: 120 },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2026-11-09T16:00:00.000Z',
          },
          requestId: { type: 'string', format: 'uuid' },
          database: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['up', 'down'] },
              version: { type: 'string', example: '8.4.13' },
              latencyMs: { type: 'number', example: 1.25 },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'NOT_FOUND' },
              message: {
                type: 'string',
                example: 'La ruta GET /api/no-existe no existe.',
              },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
            required: ['code', 'message'],
          },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
};
