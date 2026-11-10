import { z } from 'zod';
import { pool } from '../config/db.js';
import { AppError } from '../errors/AppError.js';
import {
  getRouteDistance,
  getWeatherForecast,
  getWikipediaSummary,
} from './externalApis.js';

const destinationIdSchema = z.coerce.number().int().positive();

const destinationInfoArgs = z.object({
  destinationId: destinationIdSchema,
});

const activitiesArgs = z.object({
  destinationId: destinationIdSchema,
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

const weatherArgs = z.object({
  destinationId: destinationIdSchema,
  days: z.coerce.number().int().min(1).max(7).default(5),
});

const routeArgs = z.object({
  destinationId: destinationIdSchema,
  originCity: z.string().trim().min(2).max(120).default('Bogotá'),
});

const wikipediaArgs = z.object({
  destinationId: destinationIdSchema,
});

const PRICE_LEVELS = {
  1: 'económico',
  2: 'medio',
  3: 'alto',
  4: 'lujo',
};

export const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_destination_info',
      description:
        'Consulta la ficha de un destino activo del catálogo: región, descripción, categoría, etiquetas, nivel de precio, mejor temporada y coordenadas.',
      parameters: {
        type: 'object',
        properties: {
          destinationId: {
            type: 'integer',
            minimum: 1,
            description: 'ID del destino en el catálogo.',
          },
        },
        required: ['destinationId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_destination_activities',
      description:
        'Lista las actividades activas de un destino con su categoría, duración y precio por persona en pesos colombianos.',
      parameters: {
        type: 'object',
        properties: {
          destinationId: {
            type: 'integer',
            minimum: 1,
            description: 'ID del destino en el catálogo.',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 20,
            default: 8,
            description: 'Número máximo de actividades a devolver.',
          },
        },
        required: ['destinationId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather_forecast',
      description:
        'Consulta el pronóstico diario de Open-Meteo para un destino: temperatura máxima/mínima, probabilidad de lluvia y condición climática.',
      parameters: {
        type: 'object',
        properties: {
          destinationId: {
            type: 'integer',
            minimum: 1,
            description: 'ID del destino en el catálogo.',
          },
          days: {
            type: 'integer',
            minimum: 1,
            maximum: 7,
            default: 5,
            description: 'Días de pronóstico a consultar.',
          },
        },
        required: ['destinationId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_route_distance',
      description:
        'Calcula la distancia y duración aproximada del trayecto terrestre desde una ciudad de origen hasta un destino usando OSRM.',
      parameters: {
        type: 'object',
        properties: {
          destinationId: {
            type: 'integer',
            minimum: 1,
            description: 'ID del destino en el catálogo.',
          },
          originCity: {
            type: 'string',
            description:
              'Ciudad de origen del viajero, por ejemplo Bogotá o Medellín.',
          },
        },
        required: ['destinationId', 'originCity'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_wikipedia_summary',
      description:
        'Obtiene un resumen externo de Wikipedia en español sobre el destino para complementar la ficha del catálogo.',
      parameters: {
        type: 'object',
        properties: {
          destinationId: {
            type: 'integer',
            minimum: 1,
            description: 'ID del destino en el catálogo.',
          },
        },
        required: ['destinationId'],
        additionalProperties: false,
      },
    },
  },
];

function destinationSource(row) {
  return {
    sourceType: 'destination',
    sourceId: Number(row.id),
    title: row.name,
  };
}

function activitySource(row) {
  return {
    sourceType: 'activity',
    sourceId: Number(row.id),
    title: row.name,
  };
}

function externalSource(title, url, provider) {
  return {
    sourceType: 'external',
    sourceId: null,
    title,
    url,
    provider,
  };
}

async function getActiveDestination(destinationId) {
  const [rows] = await pool.execute(
    `SELECT id, name, region, description, category, tags, lat, lng,
            price_level, best_season
     FROM destinations
     WHERE id = $1 AND active = TRUE
     LIMIT 1`,
    [destinationId],
  );

  if (!rows[0]) {
    throw AppError.notFound('Destino no encontrado o inactivo.');
  }

  return rows[0];
}

async function destinationInfo({ destinationId }) {
  const row = await getActiveDestination(destinationId);
  const data = {
    id: Number(row.id),
    name: row.name,
    region: row.region,
    description: row.description,
    category: row.category,
    tags: row.tags
      ? row.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : [],
    priceLevel: Number(row.price_level),
    priceLevelLabel: PRICE_LEVELS[Number(row.price_level)] ?? 'medio',
    bestSeason: row.best_season,
    latitude: row.lat === null ? null : Number(row.lat),
    longitude: row.lng === null ? null : Number(row.lng),
  };

  return { data, sources: [destinationSource(row)] };
}

async function listActivities({ destinationId, limit }) {
  const destination = await getActiveDestination(destinationId);
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);
  const [rows] = await pool.execute(
    `SELECT id, name, description, category, duration_min, price
     FROM activities
     WHERE destination_id = $1 AND active = TRUE
     ORDER BY price ASC, id ASC
     LIMIT ${safeLimit}`,
    [destinationId],
  );

  const activities = rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    description: row.description,
    category: row.category,
    durationMin: Number(row.duration_min),
    price: Number(row.price),
  }));

  return {
    data: {
      destinationId: Number(destination.id),
      destinationName: destination.name,
      count: activities.length,
      activities,
    },
    sources: activities.map((activity) => activitySource(activity)),
  };
}

async function weatherForecast({ destinationId, days }) {
  const destination = await getActiveDestination(destinationId);

  if (destination.lat === null || destination.lng === null) {
    throw new AppError(
      422,
      'DESTINATION_WITHOUT_COORDINATES',
      'El destino no tiene coordenadas para consultar el clima.',
    );
  }

  const forecast = await getWeatherForecast({
    latitude: Number(destination.lat),
    longitude: Number(destination.lng),
    locationName: destination.name,
    days,
  });

  return {
    data: {
      destinationId: Number(destination.id),
      destination: destination.name,
      ...forecast,
    },
    sources: [
      externalSource(
        `Open-Meteo — Clima en ${destination.name}`,
        'https://open-meteo.com/',
        'Open-Meteo',
      ),
    ],
  };
}

async function routeDistance({ destinationId, originCity }) {
  const destination = await getActiveDestination(destinationId);

  if (destination.lat === null || destination.lng === null) {
    throw new AppError(
      422,
      'DESTINATION_WITHOUT_COORDINATES',
      'El destino no tiene coordenadas para calcular la ruta.',
    );
  }

  const route = await getRouteDistance({
    originCity: originCity || 'Bogotá',
    destinationLat: Number(destination.lat),
    destinationLng: Number(destination.lng),
    destinationName: destination.name,
  });

  return {
    data: {
      destinationId: Number(destination.id),
      ...route,
    },
    sources: [
      externalSource(
        `OSRM — Ruta ${route.origin} a ${destination.name}`,
        'https://project-osrm.org/',
        'OSRM',
      ),
    ],
  };
}

async function wikipediaSummary({ destinationId }) {
  const destination = await getActiveDestination(destinationId);
  const summary = await getWikipediaSummary(destination.name);

  return {
    data: {
      destinationId: Number(destination.id),
      destination: destination.name,
      ...summary,
    },
    sources: [
      externalSource(
        `Wikipedia — ${summary.title}`,
        summary.url,
        'Wikipedia',
      ),
    ],
  };
}

export async function executeAgentTool(name, rawArguments) {
  switch (name) {
    case 'get_destination_info':
      return destinationInfo(destinationInfoArgs.parse(rawArguments));
    case 'list_destination_activities':
      return listActivities(activitiesArgs.parse(rawArguments));
    case 'get_weather_forecast':
      return weatherForecast(weatherArgs.parse(rawArguments));
    case 'get_route_distance':
      return routeDistance(routeArgs.parse(rawArguments));
    case 'get_wikipedia_summary':
      return wikipediaSummary(wikipediaArgs.parse(rawArguments));
    default:
      throw new AppError(
        400,
        'UNKNOWN_TOOL',
        `La herramienta "${name}" no existe.`,
      );
  }
}
