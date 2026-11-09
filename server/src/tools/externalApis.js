import { createHash } from 'node:crypto';
import { pool } from '../config/db.js';
import { AppError } from '../errors/AppError.js';

const EXTERNAL_TIMEOUT_MS = 8000;
const DEFAULT_USER_AGENT =
  'RutaIA/0.5 (proyecto academico Programacion Comercial)';

function cacheKey(prefix, value) {
  const digest = createHash('sha1').update(String(value)).digest('hex');
  return `${prefix}:${digest}`;
}

function parsePayload(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function readCacheEntry(key) {
  try {
    const [rows] = await pool.execute(
      'SELECT payload, expires_at FROM external_cache WHERE cache_key = ? LIMIT 1',
      [key],
    );

    if (!rows[0]) {
      return null;
    }

    const expiresAt =
      rows[0].expires_at instanceof Date
        ? rows[0].expires_at
        : new Date(rows[0].expires_at);
    const payload = parsePayload(rows[0].payload);

    if (!payload) {
      return null;
    }

    return {
      payload,
      fresh: expiresAt.getTime() > Date.now(),
    };
  } catch {
    return null;
  }
}

async function writeCacheEntry(key, payload, ttlSeconds) {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await pool.execute(
      `INSERT INTO external_cache (cache_key, payload, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         payload = VALUES(payload),
         expires_at = VALUES(expires_at)`,
      [key, JSON.stringify(payload), expiresAt],
    );
  } catch {
    // La caché es una optimización: si falla, no debe romper la consulta.
  }
}

export async function withExternalCache(key, ttlSeconds, loader) {
  const cached = await readCacheEntry(key);

  if (cached?.fresh) {
    return cached.payload;
  }

  try {
    const payload = await loader();
    await writeCacheEntry(key, payload, ttlSeconds);
    return payload;
  } catch (error) {
    if (cached?.payload) {
      return cached.payload;
    }

    throw error;
  }
}

async function fetchJson(url, { allowNotFound = false } = {}) {
  let response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': DEFAULT_USER_AGENT,
      },
      signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
    });
  } catch {
    throw new AppError(
      502,
      'EXTERNAL_API_ERROR',
      'No se pudo consultar un servicio externo en este momento.',
    );
  }

  if (allowNotFound && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new AppError(
      502,
      'EXTERNAL_API_ERROR',
      `Un servicio externo respondió con estado ${response.status}.`,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new AppError(
      502,
      'EXTERNAL_API_ERROR',
      'Un servicio externo devolvió una respuesta inválida.',
    );
  }
}

export async function geocodeCity(name) {
  const city = String(name ?? '').trim();

  if (!city) {
    throw AppError.badRequest('La ciudad de origen es obligatoria.');
  }

  const key = cacheKey('geocode', city.toLowerCase());

  return withExternalCache(key, 60 * 60 * 24 * 30, async () => {
    const url =
      'https://geocoding-api.open-meteo.com/v1/search' +
      `?name=${encodeURIComponent(city)}&count=1&language=es&format=json`;
    const data = await fetchJson(url);
    const result = data?.results?.[0];

    if (!result) {
      throw new AppError(
        404,
        'LOCATION_NOT_FOUND',
        `No se encontró la ciudad de origen "${city}".`,
      );
    }

    return {
      name: result.name,
      country: result.country ?? null,
      admin1: result.admin1 ?? null,
      latitude: Number(result.latitude),
      longitude: Number(result.longitude),
      timezone: result.timezone ?? null,
    };
  });
}

export function describeWeatherCode(code) {
  const descriptions = {
    0: 'Despejado',
    1: 'Mayormente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Niebla',
    48: 'Niebla con escarcha',
    51: 'Llovizna ligera',
    53: 'Llovizna moderada',
    55: 'Llovizna intensa',
    56: 'Llovizna helada ligera',
    57: 'Llovizna helada intensa',
    61: 'Lluvia ligera',
    63: 'Lluvia moderada',
    65: 'Lluvia intensa',
    66: 'Lluvia helada ligera',
    67: 'Lluvia helada intensa',
    71: 'Nieve ligera',
    73: 'Nieve moderada',
    75: 'Nieve intensa',
    77: 'Granos de nieve',
    80: 'Chubascos ligeros',
    81: 'Chubascos moderados',
    82: 'Chubascos intensos',
    85: 'Chubascos de nieve ligeros',
    86: 'Chubascos de nieve intensos',
    95: 'Tormenta eléctrica',
    96: 'Tormenta con granizo ligero',
    99: 'Tormenta con granizo intenso',
  };

  return descriptions[Number(code)] ?? 'Condición no disponible';
}

export async function getWeatherForecast({
  latitude,
  longitude,
  locationName,
  days = 5,
}) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const forecastDays = Math.min(Math.max(Number(days) || 5, 1), 7);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new AppError(
      422,
      'DESTINATION_WITHOUT_COORDINATES',
      'El destino no tiene coordenadas para consultar el clima.',
    );
  }

  const key = cacheKey(
    'weather',
    `${lat.toFixed(3)},${lng.toFixed(3)},${forecastDays}`,
  );

  return withExternalCache(key, 60 * 60, async () => {
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${lat}&longitude=${lng}` +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      `&timezone=auto&forecast_days=${forecastDays}`;
    const data = await fetchJson(url);
    const daily = data?.daily ?? {};
    const dates = daily.time ?? [];

    return {
      location: locationName ?? null,
      timezone: data?.timezone ?? null,
      days: dates.map((date, index) => {
        const code = daily.weather_code?.[index] ?? null;
        return {
          date,
          weatherCode: code,
          description: describeWeatherCode(code),
          temperatureMax: daily.temperature_2m_max?.[index] ?? null,
          temperatureMin: daily.temperature_2m_min?.[index] ?? null,
          precipitationProbability:
            daily.precipitation_probability_max?.[index] ?? null,
        };
      }),
    };
  });
}

export async function getRouteDistance({
  originCity,
  destinationLat,
  destinationLng,
  destinationName,
}) {
  const origin = await geocodeCity(originCity);
  const destinationLatitude = Number(destinationLat);
  const destinationLongitude = Number(destinationLng);

  if (
    !Number.isFinite(destinationLatitude) ||
    !Number.isFinite(destinationLongitude)
  ) {
    throw new AppError(
      422,
      'DESTINATION_WITHOUT_COORDINATES',
      'El destino no tiene coordenadas para calcular la ruta.',
    );
  }

  const key = cacheKey(
    'route',
    [
      origin.latitude.toFixed(4),
      origin.longitude.toFixed(4),
      destinationLatitude.toFixed(4),
      destinationLongitude.toFixed(4),
    ].join(','),
  );

  return withExternalCache(key, 60 * 60 * 24, async () => {
    const url =
      'https://router.project-osrm.org/route/v1/driving/' +
      `${origin.longitude},${origin.latitude};` +
      `${destinationLongitude},${destinationLatitude}?overview=false`;
    const data = await fetchJson(url);
    const route = data?.routes?.[0];

    if (!route) {
      throw new AppError(
        404,
        'ROUTE_NOT_FOUND',
        'No se encontró una ruta terrestre entre los puntos indicados.',
      );
    }

    return {
      origin: origin.name,
      destination: destinationName ?? null,
      mode: 'driving',
      distanceKm: Math.round(Number(route.distance) / 100) / 10,
      durationMinutes: Math.round(Number(route.duration) / 60),
      durationHours: Math.round(Number(route.duration) / 360) / 10,
    };
  });
}

async function fetchWikipediaPage(pageTitle) {
  const url =
    'https://es.wikipedia.org/api/rest_v1/page/summary/' +
    encodeURIComponent(pageTitle);

  return fetchJson(url, { allowNotFound: true });
}

function isWikipediaDisambiguation(data) {
  return (
    data?.type === 'disambiguation' ||
    /puede (referirse|significar)|desambiguaci[oó]n/i.test(
      String(data?.extract ?? ''),
    )
  );
}

async function searchWikipedia(query) {
  const url =
    'https://es.wikipedia.org/w/api.php?action=query&list=search' +
    `&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=5`;
  const data = await fetchJson(url);

  return data?.query?.search ?? [];
}

export async function getWikipediaSummary(title) {
  const pageTitle = String(title ?? '').trim();

  if (!pageTitle) {
    throw AppError.badRequest('El título de Wikipedia es obligatorio.');
  }

  const key = cacheKey('wikipedia', `${pageTitle.toLowerCase()}|co`);

  return withExternalCache(key, 60 * 60 * 24 * 7, async () => {
    let data = await fetchWikipediaPage(pageTitle);

    if (!data || isWikipediaDisambiguation(data)) {
      const results = await searchWikipedia(`${pageTitle} Colombia`);

      for (const result of results) {
        if (result.title === data?.title) {
          continue;
        }

        const candidate = await fetchWikipediaPage(result.title);

        if (candidate?.extract && !isWikipediaDisambiguation(candidate)) {
          data = candidate;
          break;
        }
      }
    }

    if (!data?.extract) {
      throw new AppError(
        404,
        'WIKIPEDIA_NOT_FOUND',
        `No se encontró información en Wikipedia para "${pageTitle}".`,
      );
    }

    return {
      title: data.title ?? pageTitle,
      extract: String(data.extract).slice(0, 1200),
      url: data.content_urls?.desktop?.page ?? null,
      thumbnail: data.thumbnail?.source ?? null,
    };
  });
}
