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
      'tokens, chatbot RAG con memoria e historial y base para los agentes de viaje.',
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
      name: 'Chat',
      description:
        'Chatbot RAG con recuperación en el catálogo, memoria e historial',
    },
    {
      name: 'Agentes',
      description:
        'Agentes multi-paso de itinerarios y comparación con herramientas internas y externas',
    },
    {
      name: 'Consumo',
      description: 'Cuota mensual de tokens del usuario',
    },
    {
      name: 'Analítica',
      description:
        'Reporte agregado de consumo para el panel web y Power BI (solo administradores)',
    },
    {
      name: 'API externa',
      description:
        'Consumo del reporte con X-API-Key para Power BI, Excel o scripts',
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
        summary: 'Estado de la API y de PostgreSQL',
        description:
          'Comprueba que la API esté en ejecución y que la conexión a PostgreSQL responda.',
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
    '/chat': {
      post: {
        tags: ['Chat'],
        summary: 'Enviar mensaje al chatbot RAG',
        description:
          'Recupera contexto relevante del catálogo, incorpora la memoria de la conversación y descuenta los tokens reales de la cuota mensual. Si no se envía conversationId, se crea una conversación nueva.',
        security: bearer,
        requestBody: requestBody('ChatRequest'),
        responses: {
          201: response('Respuesta del chatbot', 'ChatResponse'),
          400: errorResponse('Mensaje inválido'),
          401: errorResponse('No autenticado'),
          403: errorResponse('Usuario inactivo'),
          404: errorResponse('Conversación no encontrada'),
          409: errorResponse('Servicio de chat desactivado'),
          429: errorResponse('Cuota mensual de tokens agotada'),
          502: errorResponse('Error del proveedor de IA'),
          503: errorResponse('Servicio de IA no configurado o saturado'),
        },
      },
    },
    '/chat/conversations': {
      get: {
        tags: ['Chat'],
        summary: 'Listar mis conversaciones',
        description:
          'Devuelve únicamente las conversaciones del usuario autenticado, con el número de mensajes y el último mensaje.',
        security: bearer,
        parameters: paginationParams,
        responses: {
          200: response(
            'Conversaciones del usuario',
            'ConversationListResponse',
          ),
          401: errorResponse('No autenticado'),
          403: errorResponse('Usuario inactivo'),
        },
      },
    },
    '/chat/conversations/{id}': {
      get: {
        tags: ['Chat'],
        summary: 'Consultar una conversación',
        description:
          'Devuelve los mensajes recientes de una conversación propia, incluyendo las fuentes RAG utilizadas por las respuestas del asistente.',
        security: bearer,
        parameters: [
          pathParam('id', 'ID de la conversación'),
          queryParam('limit', 'Mensajes recientes a devolver', {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 50,
          }),
        ],
        responses: {
          200: response(
            'Detalle de la conversación',
            'ConversationDetailResponse',
          ),
          401: errorResponse('No autenticado'),
          403: errorResponse('Usuario inactivo'),
          404: errorResponse('Conversación no encontrada'),
        },
      },
    },
    '/agents/itinerary': {
      post: {
        tags: ['Agentes'],
        summary: 'Generar un itinerario multi-paso',
        description:
          'Ejecuta el agente planificador con herramientas internas del catálogo y fuentes externas (Open-Meteo, OSRM y Wikipedia). Registra la ejecución en agent_runs y descuenta los tokens reales.',
        security: bearer,
        requestBody: requestBody('ItineraryRequest'),
        responses: {
          201: response('Itinerario generado', 'AgentResponse'),
          400: errorResponse('Datos inválidos'),
          401: errorResponse('No autenticado'),
          403: errorResponse('Usuario inactivo'),
          404: errorResponse('Destino no encontrado o inactivo'),
          409: errorResponse('Servicio de agente desactivado'),
          429: errorResponse('Cuota mensual de tokens agotada'),
          502: errorResponse('Error del proveedor de IA o de una fuente externa'),
          503: errorResponse('Servicio de IA no configurado o saturado'),
        },
      },
    },
    '/agents/compare': {
      post: {
        tags: ['Agentes'],
        summary: 'Comparar destinos con un agente multi-paso',
        description:
          'Compara entre dos y cuatro destinos consultando fichas, actividades, clima y distancias. Devuelve una tabla comparativa y una recomendación justificada.',
        security: bearer,
        requestBody: requestBody('CompareRequest'),
        responses: {
          201: response('Comparación generada', 'AgentResponse'),
          400: errorResponse('Datos inválidos'),
          401: errorResponse('No autenticado'),
          403: errorResponse('Usuario inactivo'),
          404: errorResponse('Algún destino no existe o está inactivo'),
          409: errorResponse('Servicio de agente desactivado'),
          429: errorResponse('Cuota mensual de tokens agotada'),
          502: errorResponse('Error del proveedor de IA o de una fuente externa'),
          503: errorResponse('Servicio de IA no configurado o saturado'),
        },
      },
    },
    '/agents/runs': {
      get: {
        tags: ['Agentes'],
        summary: 'Listar mis ejecuciones de agentes',
        description:
          'Devuelve las ejecuciones propias con su estado, tokens, entrada y salida. No incluye el detalle de pasos.',
        security: bearer,
        parameters: [
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
          queryParam('serviceCode', 'Filtrar por agente', {
            type: 'string',
            enum: ['agent_itinerary', 'agent_compare'],
          }),
          queryParam('status', 'Filtrar por estado', {
            type: 'string',
            enum: ['running', 'success', 'error', 'partial'],
          }),
        ],
        responses: {
          200: response('Ejecuciones del usuario', 'AgentRunListResponse'),
          401: errorResponse('No autenticado'),
          403: errorResponse('Usuario inactivo'),
        },
      },
    },
    '/agents/runs/{id}': {
      get: {
        tags: ['Agentes'],
        summary: 'Consultar una ejecución de agente',
        description:
          'Devuelve la entrada, salida y todos los pasos (herramientas, argumentos, resultados y duración) de una ejecución propia.',
        security: bearer,
        parameters: [pathParam('id', 'ID de la ejecución del agente')],
        responses: {
          200: response('Detalle de la ejecución', 'AgentRunDetailResponse'),
          401: errorResponse('No autenticado'),
          403: errorResponse('Usuario inactivo'),
          404: errorResponse('Ejecución no encontrada'),
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
    '/analytics/usage': {
      get: {
        tags: ['Analítica'],
        summary: 'Reporte agregado de consumo',
        description:
          'Totales, desglose por servicio y por usuario, serie diaria y mensual. ' +
          'El panel web y Power BI consumen exactamente este mismo agregado. ' +
          'Si no se envían fechas se usan los últimos 30 días.',
        security: bearer,
        parameters: [
          queryParam('from', 'Fecha inicial (YYYY-MM-DD)', {
            type: 'string',
            format: 'date',
            example: '2026-11-01',
          }),
          queryParam('to', 'Fecha final inclusive (YYYY-MM-DD)', {
            type: 'string',
            format: 'date',
            example: '2026-11-09',
          }),
          queryParam('serviceCode', 'Código del servicio de IA', {
            type: 'string',
            example: 'chat_rag',
          }),
        ],
        responses: {
          200: response('Reporte de consumo', 'AnalyticsUsageResponse'),
          400: errorResponse('Rango de fechas inválido'),
          401: errorResponse('No autenticado'),
          403: errorResponse('Requiere rol administrador'),
        },
      },
    },
    '/analytics/usage.csv': {
      get: {
        tags: ['Analítica'],
        summary: 'Exportar el consumo en CSV',
        description:
          'Un renglón por fecha, servicio, modelo, usuario y estado. Útil para ' +
          'Excel o para cargar la tabla de hechos en Power BI.',
        security: bearer,
        parameters: [
          queryParam('from', 'Fecha inicial (YYYY-MM-DD)', {
            type: 'string',
            format: 'date',
          }),
          queryParam('to', 'Fecha final inclusive (YYYY-MM-DD)', {
            type: 'string',
            format: 'date',
          }),
          queryParam('serviceCode', 'Código del servicio de IA', {
            type: 'string',
          }),
        ],
        responses: {
          200: {
            description: 'Archivo CSV en UTF-8 con BOM',
            content: {
              'text/csv': {
                schema: { type: 'string' },
              },
            },
          },
          400: errorResponse('Rango de fechas inválido'),
          401: errorResponse('No autenticado'),
          403: errorResponse('Requiere rol administrador'),
        },
      },
    },
    '/analytics/clients': {
      get: {
        tags: ['Analítica'],
        summary: 'Listar clientes de API',
        description:
          'Clientes con permiso analytics:read. La clave solo se muestra al crearla.',
        security: bearer,
        responses: {
          200: response('Lista de clientes', 'ApiClientListResponse'),
          401: errorResponse('No autenticado'),
          403: errorResponse('Requiere rol administrador'),
        },
      },
      post: {
        tags: ['Analítica'],
        summary: 'Crear un cliente de API para Power BI',
        description:
          'Genera una clave aleatoria y devuelve el valor completo una única ' +
          'vez. Guárdala en un lugar seguro para configurarla en Power BI.',
        security: bearer,
        requestBody: requestBody('CreateApiClientRequest'),
        responses: {
          201: response('Cliente creado con su clave', 'CreatedApiClientResponse'),
          400: errorResponse('Datos inválidos'),
          401: errorResponse('No autenticado'),
          403: errorResponse('Requiere rol administrador'),
        },
      },
    },
    '/analytics/clients/{id}/status': {
      patch: {
        tags: ['Analítica'],
        summary: 'Activar o desactivar un cliente de API',
        security: bearer,
        parameters: [pathParam('id', 'ID del cliente de API')],
        requestBody: requestBody('ApiClientStatusRequest'),
        responses: {
          200: response('Estado actualizado', 'ApiClientStatusResponse'),
          400: errorResponse('Datos inválidos'),
          401: errorResponse('No autenticado'),
          403: errorResponse('Requiere rol administrador'),
          404: errorResponse('Cliente no encontrado'),
        },
      },
    },
    '/bi/usage': {      get: {
        tags: ['API externa'],
        summary: 'Reporte de consumo para Power BI',
        description:
          'Devuelve el mismo agregado que /api/analytics/usage, pero autenticado ' +
          'con una API key de la tabla api_clients (scope analytics:read). No usa JWT.',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          queryParam('from', 'Fecha inicial (YYYY-MM-DD)', {
            type: 'string',
            format: 'date',
          }),
          queryParam('to', 'Fecha final inclusive (YYYY-MM-DD)', {
            type: 'string',
            format: 'date',
          }),
          queryParam('serviceCode', 'Código del servicio de IA', {
            type: 'string',
          }),
        ],
        responses: {
          200: response('Reporte de consumo', 'AnalyticsUsageResponse'),
          400: errorResponse('Rango de fechas inválido'),
          401: errorResponse('API key faltante, inválida o desactivada'),
          403: errorResponse('La API key no tiene el permiso requerido'),
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
      AnalyticsMeta: {
        type: 'object',
        properties: {
          from: { type: 'string', format: 'date', example: '2026-11-01' },
          to: { type: 'string', format: 'date', example: '2026-11-09' },
          days: { type: 'integer', example: 9 },
          serviceCode: { type: 'string', nullable: true, example: null },
          generatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AnalyticsTotals: {
        type: 'object',
        properties: {
          requests: { type: 'integer', example: 22 },
          successfulRequests: { type: 'integer', example: 20 },
          blockedRequests: { type: 'integer', example: 2 },
          errorRequests: { type: 'integer', example: 0 },
          promptTokens: { type: 'integer', example: 8970 },
          completionTokens: { type: 'integer', example: 13670 },
          totalTokens: { type: 'integer', example: 22640 },
          averageTokens: { type: 'integer', example: 1029 },
          averageLatencyMs: { type: 'integer', example: 1619 },
          activeUsers: { type: 'integer', example: 2 },
          successRate: { type: 'number', example: 90.91 },
        },
      },
      AnalyticsServiceUsage: {
        type: 'object',
        properties: {
          serviceCode: { type: 'string', example: 'agent_itinerary' },
          requests: { type: 'integer', example: 6 },
          successfulRequests: { type: 'integer', example: 5 },
          blockedRequests: { type: 'integer', example: 1 },
          errorRequests: { type: 'integer', example: 0 },
          promptTokens: { type: 'integer', example: 4050 },
          completionTokens: { type: 'integer', example: 5950 },
          totalTokens: { type: 'integer', example: 10000 },
          averageTokens: { type: 'integer', example: 1667 },
          averageLatencyMs: { type: 'integer', example: 2434 },
          activeUsers: { type: 'integer', example: 2 },
          sharePercent: { type: 'number', example: 44.17 },
        },
      },
      AnalyticsUserUsage: {
        type: 'object',
        properties: {
          userId: { type: 'integer', example: 2 },
          name: { type: 'string', example: 'Usuario Demo' },
          email: { type: 'string', example: 'demo@rutaia.local' },
          role: { type: 'string', enum: ['admin', 'user'] },
          totalTokens: { type: 'integer', example: 11220 },
          requests: { type: 'integer', example: 11 },
          successfulRequests: { type: 'integer', example: 10 },
          blockedRequests: { type: 'integer', example: 1 },
          errorRequests: { type: 'integer', example: 0 },
          averageLatencyMs: { type: 'integer', example: 1500 },
        },
      },
      AnalyticsDailyPoint: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date', example: '2026-11-09' },
          requests: { type: 'integer', example: 2 },
          successfulRequests: { type: 'integer', example: 2 },
          blockedRequests: { type: 'integer', example: 0 },
          totalTokens: { type: 'integer', example: 2720 },
          promptTokens: { type: 'integer', example: 1060 },
          completionTokens: { type: 'integer', example: 1660 },
        },
      },
      AnalyticsMonthlyPoint: {
        type: 'object',
        properties: {
          month: { type: 'string', example: '2026-11' },
          requests: { type: 'integer', example: 17 },
          successfulRequests: { type: 'integer', example: 15 },
          blockedRequests: { type: 'integer', example: 2 },
          totalTokens: { type: 'integer', example: 16940 },
          promptTokens: { type: 'integer', example: 6730 },
          completionTokens: { type: 'integer', example: 10210 },
        },
      },
      AnalyticsUsageResponse: {
        type: 'object',
        properties: {
          meta: ref('AnalyticsMeta'),
          totals: ref('AnalyticsTotals'),
          byService: {
            type: 'array',
            items: ref('AnalyticsServiceUsage'),
          },
          byUser: {
            type: 'array',
            items: ref('AnalyticsUserUsage'),
          },
          daily: {
            type: 'array',
            items: ref('AnalyticsDailyPoint'),
          },
          monthly: {
            type: 'array',
            items: ref('AnalyticsMonthlyPoint'),
          },
        },
      },
      CreateApiClientRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            maxLength: 120,
            example: 'Power BI · Consumo IA',
          },
          scope: {
            type: 'string',
            default: 'analytics:read',
            example: 'analytics:read',
          },
        },
      },
      ApiClient: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Power BI · Consumo IA' },
          keyPrefix: { type: 'string', example: 'rutaia_8d2de5c' },
          scope: { type: 'string', example: 'analytics:read' },
          active: { type: 'boolean', example: true },
          lastUsedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreatedApiClientResponse: {
        allOf: [
          ref('ApiClient'),
          {
            type: 'object',
            properties: {
              apiKey: {
                type: 'string',
                description:
                  'Clave completa. Solo se devuelve una vez, al crearla.',
                example: 'rutaia_8d2de5c3797d07ffcd3aba5227a73c066e7cd392b4f4f190',
              },
            },
          },
        ],
      },
      ApiClientListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: ref('ApiClient'),
          },
        },
      },
      ApiClientStatusRequest: {
        type: 'object',
        required: ['active'],
        properties: {
          active: { type: 'boolean', example: false },
        },
      },
      ApiClientStatusResponse: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Power BI · Consumo IA' },
          active: { type: 'boolean', example: false },
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
          name: { type: 'string', example: 'Antigua Guatemala' },
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
            example: 'Antigua Guatemala',
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
      ChatRequest: {
        type: 'object',
        required: ['message'],
        properties: {
          message: {
            type: 'string',
            minLength: 1,
            maxLength: 4000,
            example: 'Quiero visitar Antigua Guatemala con niños',
          },
          conversationId: {
            type: 'integer',
            format: 'int64',
            minimum: 1,
            description:
              'Conversación existente del usuario. Si se omite, se crea una nueva.',
          },
        },
      },
      ChatSource: {
        type: 'object',
        properties: {
          documentId: { type: 'integer', format: 'int64', example: 1 },
          sourceType: {
            type: 'string',
            example: 'destination',
            enum: ['destination', 'activity', 'manual', 'external'],
          },
          sourceId: {
            type: 'integer',
            format: 'int64',
            nullable: true,
            example: 5,
          },
          title: {
            type: 'string',
            example: 'Antigua Guatemala',
          },
          score: { type: 'number', example: 8.215 },
        },
      },
      ChatMessage: {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int64', example: 10 },
          conversationId: {
            type: 'integer',
            format: 'int64',
            example: 4,
          },
          role: {
            type: 'string',
            enum: ['user', 'assistant'],
            example: 'assistant',
          },
          content: { type: 'string' },
          sources: {
            type: 'array',
            items: ref('ChatSource'),
          },
          tokensIn: { type: 'integer', example: 120 },
          tokensOut: { type: 'integer', example: 80 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ChatConversation: {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int64', example: 4 },
          title: {
            type: 'string',
            nullable: true,
            example: 'Quiero visitar Antigua Guatemala con niños',
          },
          serviceCode: { type: 'string', example: 'chat_rag' },
          lastMessageAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          messageCount: { type: 'integer', example: 4 },
          lastMessage: { type: 'string' },
        },
      },
      ChatUsage: {
        type: 'object',
        properties: {
          promptTokens: { type: 'integer', example: 120 },
          completionTokens: { type: 'integer', example: 80 },
          totalTokens: { type: 'integer', example: 200 },
          latencyMs: { type: 'integer', example: 842 },
          model: { type: 'string', example: 'openai/gpt-oss-120b' },
        },
      },
      ChatResponse: {
        type: 'object',
        properties: {
          conversation: ref('ChatConversation'),
          userMessage: ref('ChatMessage'),
          message: ref('ChatMessage'),
          sources: {
            type: 'array',
            items: ref('ChatSource'),
          },
          usage: ref('ChatUsage'),
          quota: ref('Quota'),
        },
      },
      ConversationListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: ref('ChatConversation'),
          },
          pagination: ref('Pagination'),
        },
      },
      ConversationDetailResponse: {
        type: 'object',
        properties: {
          conversation: ref('ChatConversation'),
          messages: {
            type: 'array',
            items: ref('ChatMessage'),
          },
        },
      },
      ItineraryRequest: {
        type: 'object',
        required: ['destinationId', 'days'],
        properties: {
          destinationId: {
            type: 'integer',
            format: 'int64',
            minimum: 1,
            example: 6,
          },
          days: {
            type: 'integer',
            minimum: 1,
            maximum: 15,
            example: 3,
          },
          originCity: {
            type: 'string',
            example: 'Guatemala',
            default: 'Guatemala',
          },
          travelers: {
            type: 'integer',
            minimum: 1,
            maximum: 20,
            example: 2,
            default: 2,
          },
          budget: {
            type: 'string',
            enum: ['bajo', 'medio', 'alto'],
            example: 'medio',
            default: 'medio',
          },
          interests: {
            type: 'array',
            maxItems: 8,
            items: { type: 'string' },
            example: ['café', 'naturaleza'],
          },
          notes: {
            type: 'string',
            maxLength: 500,
            example: 'Prefiero actividades tranquilas.',
          },
        },
      },
      CompareRequest: {
        type: 'object',
        required: ['destinationIds'],
        properties: {
          destinationIds: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            uniqueItems: true,
            items: { type: 'integer', format: 'int64', minimum: 1 },
            example: [1, 4],
          },
          days: {
            type: 'integer',
            minimum: 1,
            maximum: 15,
            example: 4,
            default: 3,
          },
          originCity: {
            type: 'string',
            example: 'Guatemala',
            default: 'Guatemala',
          },
          travelers: {
            type: 'integer',
            minimum: 1,
            maximum: 20,
            example: 2,
            default: 2,
          },
          budget: {
            type: 'string',
            enum: ['bajo', 'medio', 'alto'],
            example: 'alto',
            default: 'medio',
          },
          interests: {
            type: 'array',
            maxItems: 8,
            items: { type: 'string' },
            example: ['playa', 'cultura'],
          },
        },
      },
      AgentSource: {
        type: 'object',
        properties: {
          sourceType: {
            type: 'string',
            enum: ['destination', 'activity', 'external'],
            example: 'destination',
          },
          sourceId: {
            type: 'integer',
            format: 'int64',
            nullable: true,
            example: 6,
          },
          title: { type: 'string', example: 'Salento' },
          url: {
            type: 'string',
            format: 'uri',
            nullable: true,
            example: 'https://es.wikipedia.org/wiki/Salento',
          },
          provider: {
            type: 'string',
            nullable: true,
            example: 'Open-Meteo',
          },
        },
      },
      AgentStepResult: {
        type: 'object',
        properties: {
          tool: { type: 'string', example: 'get_weather_forecast' },
          arguments: {
            type: 'string',
            example: '{"destinationId":6,"days":3}',
          },
          ok: { type: 'boolean', example: true },
          error: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
          },
          durationMs: { type: 'integer', example: 180 },
          result: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      AgentStep: {
        type: 'object',
        properties: {
          step: { type: 'integer', example: 1 },
          type: {
            type: 'string',
            enum: ['tool_calls', 'final', 'limit'],
            example: 'tool_calls',
          },
          content: { type: 'string', nullable: true },
          toolCalls: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'call_1' },
                name: {
                  type: 'string',
                  example: 'get_destination_info',
                },
                arguments: {
                  type: 'string',
                  example: '{"destinationId":6}',
                },
              },
            },
          },
          results: {
            type: 'array',
            items: ref('AgentStepResult'),
          },
        },
      },
      AgentRun: {
        type: 'object',
        properties: {
          id: { type: 'integer', format: 'int64', example: 1 },
          serviceCode: {
            type: 'string',
            enum: ['agent_itinerary', 'agent_compare'],
            example: 'agent_itinerary',
          },
          status: {
            type: 'string',
            enum: ['running', 'success', 'error', 'partial'],
            example: 'success',
          },
          totalTokens: { type: 'integer', example: 450 },
          latencyMs: { type: 'integer', nullable: true, example: 1200 },
          createdAt: { type: 'string', format: 'date-time' },
          input: {
            type: 'object',
            additionalProperties: true,
          },
          output: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
          },
        },
      },
      AgentRunDetail: {
        allOf: [
          ref('AgentRun'),
          {
            type: 'object',
            properties: {
              steps: {
                type: 'array',
                items: ref('AgentStep'),
              },
            },
          },
        ],
      },
      AgentUsage: {
        type: 'object',
        properties: {
          promptTokens: { type: 'integer', example: 300 },
          completionTokens: { type: 'integer', example: 150 },
          totalTokens: { type: 'integer', example: 450 },
          latencyMs: { type: 'integer', example: 1200 },
          model: { type: 'string', example: 'openai/gpt-oss-120b' },
        },
      },
      AgentResponse: {
        type: 'object',
        properties: {
          run: ref('AgentRun'),
          conversationId: {
            type: 'integer',
            format: 'int64',
            example: 4,
          },
          answer: { type: 'string' },
          sources: {
            type: 'array',
            items: ref('AgentSource'),
          },
          steps: {
            type: 'array',
            items: ref('AgentStep'),
          },
          usage: ref('AgentUsage'),
          quota: ref('Quota'),
        },
      },
      AgentRunListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: ref('AgentRun'),
          },
          pagination: ref('Pagination'),
        },
      },
      AgentRunDetailResponse: {
        type: 'object',
        properties: {
          run: ref('AgentRunDetail'),
        },
      },
    },
  },
};
