import { env } from './env.js';
import { APP_NAME, APP_VERSION, API_PREFIX } from './constants.js';

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const jsonContent = (schema) => ({
  'application/json': { schema },
});
const response = (description, schemaName) => ({
  description,
  content: jsonContent(ref(schemaName)),
});
const errorResponse = (description) => ({
  description,
  content: jsonContent(ref('ErrorResponse')),
});
const requestBody = (schemaName, required = true) => ({
  required,
  content: jsonContent(ref(schemaName)),
});
const pathParam = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema:
    name === 'id'
      ? { type: 'integer', format: 'int64', minimum: 1 }
      : { type: 'string', example: 'chat_rag' },
});
const queryParam = (name, description, schema, required = false) => ({
  name,
  in: 'query',
  required,
  description,
  schema,
});
const bearer = [{ bearerAuth: [] }];

const commonErrors = {
  400: errorResponse('Datos inválidos'),
  401: errorResponse('No autenticado'),
  403: errorResponse('Sin permisos'),
  404: errorResponse('Recurso no encontrado'),
  409: errorResponse('Conflicto con el estado actual'),
};

const paginationParams = [
  queryParam('page', 'Número de página', {
    type: 'integer',
    minimum: 1,
    default: 1,
  }),
  queryParam('limit', 'Elementos por página', {
    type: 'integer',
    minimum: 1,
    maximum: 100,
    default: 20,
  }),
  queryParam('search', 'Texto de búsqueda', { type: 'string' }),
];

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: APP_NAME,
    version: APP_VERSION,
    description:
      'API REST de RutaIA: autenticación JWT, gestión de usuarios y roles, ' +
      'catálogo turístico, servicios de IA configurables, cuotas mensuales de ' +
      'tokens y base para el chatbot RAG y los agentes de viaje.',
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
    {
      name: 'Autenticación',
      description: 'Inicio de sesión y perfil del usuario autenticado',
    },
    {
      name: 'Usuarios',
      description: 'CRUD de usuarios y roles (solo administradores)',
    },
    {
      name: 'Catálogo',
      description: 'Destinos y actividades turísticas',
    },
    {
      name: 'Servicios IA',
      description: 'Configuración y activación de los servicios de IA',
    },
    {
      name: 'Consumo',
      description: 'Cuota mensual de tokens del usuario',
    },
  ],
  paths: {
    '/': {
      get: {
        tags: ['Sistema'],
        summary: 'Información general de la API',
        responses: {
          200: response('Información de la API', 'ApiInfo'),
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
          200: response('Servicio y base de datos disponibles', 'HealthResponse'),
          503: response(
            'La base de datos no está disponible',
            'HealthResponse',
          ),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión',
        description:
          'Valida las credenciales y devuelve un token JWT. La cuenta debe estar activa.',
        requestBody: requestBody('LoginRequest'),
        responses: {
          200: response('Token JWT y datos del usuario', 'AuthResponse'),
          400: errorResponse('Datos inválidos'),
          401: errorResponse('Credenciales incorrectas'),
          403: errorResponse('Usuario inactivo'),
          429: errorResponse('Demasiados intentos de inicio de sesión'),
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Autenticación'],
        summary: 'Obtener el usuario autenticado',
        security: bearer,
        responses: {
          200: response('Usuario y cuota actual', 'UserQuotaResponse'),
          401: errorResponse('Token inválido o expirado'),
          403: errorResponse('Usuario inactivo'),
        },
      },
    },
    '/users': {
      get: {
        tags: ['Usuarios'],
        summary: 'Listar usuarios',
        description: 'Solo administradores. Incluye la cuota mensual de cada usuario.',
        security: bearer,
        parameters: [
          ...paginationParams,
          queryParam('role', 'Filtrar por rol', {
            type: 'string',
            enum: ['admin', 'user'],
          }),
          queryParam('active', 'Filtrar por estado', { type: 'boolean' }),
        ],
        responses: {
          200: response('Lista paginada de usuarios', 'UserListResponse'),
          401: errorResponse('No autenticado'),
          403: errorResponse('Sin permisos'),
        },
      },
      post: {
        tags: ['Usuarios'],
        summary: 'Crear usuario',
        security: bearer,
        requestBody: requestBody('CreateUserRequest'),
        responses: {
          201: response('Usuario creado', 'UserQuotaResponse'),
          400: errorResponse('Datos inválidos'),
          401: errorResponse('No autenticado'),
          403: errorResponse('Sin permisos'),
          409: errorResponse('El correo ya está registrado'),
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Usuarios'],
        summary: 'Obtener un usuario',
        security: bearer,
        parameters: [pathParam('id', 'ID del usuario')],
        responses: {
          200: response('Usuario y cuota', 'UserQuotaResponse'),
          ...commonErrors,
        },
      },
      patch: {
        tags: ['Usuarios'],
        summary: 'Actualizar un usuario',
        description:
          'Permite cambiar nombre, correo, contraseña, rol, cuota o estado. ' +
          'Un administrador no puede desactivarse ni quitarse el rol a sí mismo.',
        security: bearer,
        parameters: [pathParam('id', 'ID del usuario')],
        requestBody: requestBody('UpdateUserRequest'),
        responses: {
          200: response('Usuario actualizado', 'UserQuotaResponse'),
          ...commonErrors,
        },
      },
      delete: {
        tags: ['Usuarios'],
        summary: 'Desactivar un usuario',
        description:
          'Borrado lógico: el usuario se conserva para preservar su historial y consumo.',
        security: bearer,
        parameters: [pathParam('id', 'ID del usuario')],
        responses: {
          200: response('Usuario desactivado', 'DeleteUserResponse'),
          ...commonErrors,
        },
      },
    },
    '/destinations': {
      get: {
        tags: ['Catálogo'],
        summary: 'Listar destinos',
        description:
          'Los usuarios anónimos y normales solo ven destinos activos. ' +
          'Un administrador autenticado puede ver también los inactivos.',
        parameters: [
          ...paginationParams,
          queryParam('region', 'Filtrar por región', { type: 'string' }),
          queryParam('category', 'Filtrar por categoría', { type: 'string' }),
          queryParam('tag', 'Filtrar por etiqueta', { type: 'string' }),
          queryParam('priceLevel', 'Nivel de precio (1 a 4)', {
            type: 'integer',
            minimum: 1,
            maximum: 4,
          }),
          queryParam('active', 'Filtrar por estado (solo admin)', {
            type: 'boolean',
          }),
        ],
        responses: {
          200: response('Lista paginada de destinos', 'DestinationListResponse'),
          400: errorResponse('Parámetros inválidos'),
        },
      },
      post: {
        tags: ['Catálogo'],
        summary: 'Crear destino',
        description: 'Solo administradores. Actualiza automáticamente el RAG.',
        security: bearer,
        requestBody: requestBody('DestinationInput'),
        responses: {
          201: response('Destino creado', 'Destination'),
          ...commonErrors,
        },
      },
    },
    '/destinations/{id}': {
      get: {
        tags: ['Catálogo'],
        summary: 'Obtener un destino',
        description:
          'Incluye sus actividades activas. Un administrador puede ver destinos y actividades inactivas.',
        parameters: [pathParam('id', 'ID del destino')],
        responses: {
          200: response('Destino con actividades', 'Destination'),
          404: errorResponse('Destino no encontrado'),
        },
      },
      patch: {
        tags: ['Catálogo'],
        summary: 'Actualizar un destino',
        description: 'Solo administradores. Sincroniza los documentos del RAG.',
        security: bearer,
        parameters: [pathParam('id', 'ID del destino')],
        requestBody: requestBody('DestinationUpdate'),
        responses: {
          200: response('Destino actualizado', 'Destination'),
          ...commonErrors,
        },
      },
      delete: {
        tags: ['Catálogo'],
        summary: 'Desactivar un destino',
        description:
          'Borrado lógico. Las actividades se conservan, pero dejan de mostrarse públicamente.',
        security: bearer,
        parameters: [pathParam('id', 'ID del destino')],
        responses: {
          200: response('Destino desactivado', 'DeleteDestinationResponse'),
          ...commonErrors,
        },
      },
    },
    '/activities': {
      get: {
        tags: ['Catálogo'],
        summary: 'Listar actividades',
        description:
          'Los usuarios anónimos y normales solo ven actividades activas de destinos activos.',
        parameters: [
          ...paginationParams,
          queryParam('destinationId', 'Filtrar por destino', {
            type: 'integer',
            format: 'int64',
          }),
          queryParam('category', 'Filtrar por categoría', { type: 'string' }),
          queryParam('active', 'Filtrar por estado (solo admin)', {
            type: 'boolean',
          }),
        ],
        responses: {
          200: response('Lista paginada de actividades', 'ActivityListResponse'),
          400: errorResponse('Parámetros inválidos'),
        },
      },
      post: {
        tags: ['Catálogo'],
        summary: 'Crear actividad',
        description: 'Solo administradores. Actualiza automáticamente el RAG.',
        security: bearer,
        requestBody: requestBody('ActivityInput'),
        responses: {
          201: response('Actividad creada', 'Activity'),
          ...commonErrors,
        },
      },
    },
    '/activities/{id}': {
      get: {
        tags: ['Catálogo'],
        summary: 'Obtener una actividad',
        parameters: [pathParam('id', 'ID de la actividad')],
        responses: {
          200: response('Actividad', 'Activity'),
          404: errorResponse('Actividad no encontrada'),
        },
      },
      patch: {
        tags: ['Catálogo'],
        summary: 'Actualizar una actividad',
        description: 'Solo administradores. Sincroniza los documentos del RAG.',
        security: bearer,
        parameters: [pathParam('id', 'ID de la actividad')],
        requestBody: requestBody('ActivityUpdate'),
        responses: {
          200: response('Actividad actualizada', 'Activity'),
          ...commonErrors,
        },
      },
      delete: {
        tags: ['Catálogo'],
        summary: 'Desactivar una actividad',
        description: 'Borrado lógico. Sincroniza los documentos del RAG.',
        security: bearer,
        parameters: [pathParam('id', 'ID de la actividad')],
        responses: {
          200: response('Actividad desactivada', 'DeleteActivityResponse'),
          ...commonErrors,
        },
      },
    },
    '/services': {
      get: {
        tags: ['Servicios IA'],
        summary: 'Listar servicios de IA',
        description:
          'Los usuarios normales solo ven servicios habilitados. ' +
          'Un administrador ve todos, incluido el system prompt.',
        responses: {
          200: {
            description: 'Lista de servicios de IA',
            content: jsonContent({
              type: 'array',
              items: ref('AiService'),
            }),
          },
        },
      },
    },
    '/services/{code}': {
      get: {
        tags: ['Servicios IA'],
        summary: 'Obtener un servicio de IA',
        parameters: [pathParam('code', 'Código del servicio')],
        responses: {
          200: response('Servicio de IA', 'AiService'),
          404: errorResponse('Servicio no encontrado o deshabilitado'),
        },
      },
      patch: {
        tags: ['Servicios IA'],
        summary: 'Actualizar un servicio de IA',
        description:
          'Solo administradores. Permite cambiar modelo, temperatura, tokens, prompt y estado.',
        security: bearer,
        parameters: [pathParam('code', 'Código del servicio')],
        requestBody: requestBody('AiServiceUpdate'),
        responses: {
          200: response('Servicio actualizado', 'AiService'),
          ...commonErrors,
        },
      },
    },
    '/services/{code}/status': {
      patch: {
        tags: ['Servicios IA'],
        summary: 'Activar o desactivar un servicio de IA',
        security: bearer,
        parameters: [pathParam('code', 'Código del servicio')],
        requestBody: requestBody('ServiceStatusRequest'),
        responses: {
          200: response('Estado actualizado', 'AiService'),
          ...commonErrors,
        },
      },
    },
    '/usage/me': {
      get: {
        tags: ['Consumo'],
        summary: 'Consultar mi cuota mensual',
        security: bearer,
        responses: {
          200: response('Usuario y cuota mensual', 'UserQuotaResponse'),
          401: errorResponse('No autenticado'),
          403: errorResponse('Usuario inactivo'),
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
          endpoints: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
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
                oneOf: [
                  {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        message: { type: 'string' },
                      },
                    },
                  },
                  {
                    type: 'object',
                    additionalProperties: true,
                  },
                ],
              },
            },
            required: ['code', 'message'],
          },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@rutaia.local',
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'Admin123!',
          },
        },
      },
      Quota: {
        type: 'object',
        properties: {
          period: { type: 'string', example: '2026-11' },
          periodStart: { type: 'string', format: 'date-time' },
          periodEnd: { type: 'string', format: 'date-time' },
          resetAt: { type: 'string', format: 'date-time' },
          limitTokens: { type: 'integer', example: 50000 },
          usedTokens: { type: 'integer', example: 9820 },
          remainingTokens: { type: 'integer', example: 40180 },
          percentUsed: { type: 'number', example: 19.64 },
          exceeded: { type: 'boolean', example: false },
          successfulRequests: { type: 'integer', example: 14 },
          blockedRequests: { type: 'integer', example: 2 },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int64', example: 2 },
          name: { type: 'string', example: 'Usuario Demo' },
          email: {
            type: 'string',
            format: 'email',
            example: 'demo@rutaia.local',
          },
          role: {
            type: 'string',
            enum: ['admin', 'user'],
            example: 'user',
          },
          tokenLimitMonth: { type: 'integer', example: 50000 },
          active: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      UserListItem: {
        allOf: [
          ref('User'),
          {
            type: 'object',
            properties: {
              quota: ref('Quota'),
            },
          },
        ],
      },
      UserListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: ref('UserListItem'),
          },
          pagination: ref('Pagination'),
        },
      },
      UserQuotaResponse: {
        type: 'object',
        properties: {
          user: ref('User'),
          quota: ref('Quota'),
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          tokenType: { type: 'string', example: 'Bearer' },
          expiresIn: { type: 'string', example: '1h' },
          user: ref('User'),
          quota: ref('Quota'),
        },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Nuevo Usuario' },
          email: {
            type: 'string',
            format: 'email',
            example: 'nuevo@rutaia.local',
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'Usuario123!',
          },
          role: {
            type: 'string',
            enum: ['admin', 'user'],
            default: 'user',
          },
          tokenLimitMonth: {
            type: 'integer',
            minimum: 0,
            example: 50000,
          },
          active: { type: 'boolean', default: true },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
          role: { type: 'string', enum: ['admin', 'user'] },
          tokenLimitMonth: { type: 'integer', minimum: 0 },
          active: { type: 'boolean' },
        },
      },
      DeleteUserResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          user: ref('User'),
          quota: ref('Quota'),
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 12 },
          totalPages: { type: 'integer', example: 1 },
          hasNext: { type: 'boolean', example: false },
          hasPrev: { type: 'boolean', example: false },
        },
      },
      Destination: {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int64', example: 1 },
          name: { type: 'string', example: 'Cartagena de Indias' },
          region: { type: 'string', example: 'Bolívar' },
          description: { type: 'string' },
          category: {
            type: 'string',
            example: 'Ciudad histórica y playa',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['playa', 'historia'],
          },
          lat: { type: 'number', nullable: true, example: 10.391 },
          lng: { type: 'number', nullable: true, example: -75.4794 },
          priceLevel: { type: 'integer', example: 3 },
          bestSeason: {
            type: 'string',
            nullable: true,
            example: 'Diciembre a abril',
          },
          active: { type: 'boolean', example: true },
          activityCount: { type: 'integer', example: 4 },
          activities: {
            type: 'array',
            items: ref('Activity'),
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      DestinationInput: {
        type: 'object',
        required: ['name', 'region', 'description', 'category'],
        properties: {
          name: { type: 'string', example: 'Nuevo Destino' },
          region: { type: 'string', example: 'Antioquia' },
          description: {
            type: 'string',
            example: 'Descripción del destino turístico.',
          },
          category: { type: 'string', example: 'Naturaleza' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['naturaleza', 'aventura'],
          },
          lat: { type: 'number', nullable: true, example: 6.2442 },
          lng: { type: 'number', nullable: true, example: -75.5812 },
          priceLevel: {
            type: 'integer',
            minimum: 1,
            maximum: 4,
            default: 2,
          },
          bestSeason: {
            type: 'string',
            nullable: true,
            example: 'Todo el año',
          },
          active: { type: 'boolean', default: true },
        },
      },
      DestinationUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          region: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            nullable: true,
          },
          lat: { type: 'number', nullable: true },
          lng: { type: 'number', nullable: true },
          priceLevel: {
            type: 'integer',
            minimum: 1,
            maximum: 4,
          },
          bestSeason: { type: 'string', nullable: true },
          active: { type: 'boolean' },
        },
      },
      DestinationListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: ref('Destination'),
          },
          pagination: ref('Pagination'),
        },
      },
      DeleteDestinationResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          destination: ref('Destination'),
        },
      },
      Activity: {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int64', example: 1 },
          destinationId: { type: 'integer', format: 'int64', example: 1 },
          destinationName: {
            type: 'string',
            nullable: true,
            example: 'Cartagena de Indias',
          },
          destinationRegion: {
            type: 'string',
            nullable: true,
            example: 'Bolívar',
          },
          destinationActive: { type: 'boolean', example: true },
          name: {
            type: 'string',
            example: 'Tour por la ciudad amurallada',
          },
          description: { type: 'string' },
          category: { type: 'string', example: 'cultural' },
          durationMin: { type: 'integer', example: 180 },
          price: { type: 'number', example: 120000 },
          lat: { type: 'number', nullable: true, example: 10.4236 },
          lng: { type: 'number', nullable: true, example: -75.5253 },
          active: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ActivityInput: {
        type: 'object',
        required: ['destinationId', 'name', 'description', 'category'],
        properties: {
          destinationId: { type: 'integer', format: 'int64', example: 1 },
          name: { type: 'string', example: 'Nueva actividad' },
          description: {
            type: 'string',
            example: 'Descripción de la actividad turística.',
          },
          category: { type: 'string', example: 'cultural' },
          durationMin: {
            type: 'integer',
            minimum: 0,
            maximum: 65535,
            default: 0,
          },
          price: {
            type: 'number',
            minimum: 0,
            default: 0,
            example: 120000,
          },
          lat: { type: 'number', nullable: true },
          lng: { type: 'number', nullable: true },
          active: { type: 'boolean', default: true },
        },
      },
      ActivityUpdate: {
        type: 'object',
        properties: {
          destinationId: { type: 'integer', format: 'int64' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          durationMin: {
            type: 'integer',
            minimum: 0,
            maximum: 65535,
          },
          price: { type: 'number', minimum: 0 },
          lat: { type: 'number', nullable: true },
          lng: { type: 'number', nullable: true },
          active: { type: 'boolean' },
        },
      },
      ActivityListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: ref('Activity'),
          },
          pagination: ref('Pagination'),
        },
      },
      DeleteActivityResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          activity: ref('Activity'),
        },
      },
      AiService: {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int64', example: 1 },
          code: { type: 'string', example: 'chat_rag' },
          name: { type: 'string', example: 'Chatbot RAG de turismo' },
          description: { type: 'string' },
          model: {
            type: 'string',
            example: 'openai/gpt-oss-120b',
          },
          temperature: { type: 'number', example: 0.2 },
          maxTokens: { type: 'integer', example: 1024 },
          enabled: { type: 'boolean', example: true },
          systemPrompt: {
            type: 'string',
            description: 'Solo se devuelve a administradores.',
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AiServiceUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          model: { type: 'string' },
          temperature: {
            type: 'number',
            minimum: 0,
            maximum: 2,
          },
          maxTokens: {
            type: 'integer',
            minimum: 1,
            maximum: 32768,
          },
          systemPrompt: { type: 'string' },
          enabled: { type: 'boolean' },
        },
      },
      ServiceStatusRequest: {
        type: 'object',
        required: ['enabled'],
        properties: {
          enabled: { type: 'boolean', example: true },
        },
      },
    },
  },
};
