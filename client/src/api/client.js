const DEFAULT_API_URL = 'http://localhost:4000/api';

export const API_URL = (
  import.meta.env.VITE_API_URL || DEFAULT_API_URL
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status = 0, code = 'API_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, String(item));
      }
    } else {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function apiRequest(
  path,
  { method = 'GET', body, token, signal, headers = {} } = {},
) {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const options = {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  };

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }

    throw new ApiError(
      'No se pudo conectar con la API. Verifica que el backend esté en ejecución.',
      0,
      'NETWORK_ERROR',
    );
  }

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const apiError = data?.error ?? {};
    const code = apiError.code || 'HTTP_ERROR';
    const message =
      apiError.message || `La solicitud falló con el estado ${response.status}.`;

    if (
      response.status === 401 &&
      token &&
      !path.includes('/auth/login')
    ) {
      window.dispatchEvent(new Event('rutaia:unauthorized'));
    }

    throw new ApiError(message, response.status, code, apiError.details);
  }

  return data;
}

export const api = {
  auth: {
    login: (body) =>
      apiRequest('/auth/login', { method: 'POST', body }),
    me: (token) => apiRequest('/auth/me', { token }),
  },
  users: {
    list: (params, token) =>
      apiRequest(`/users${buildQuery(params)}`, { token }),
    get: (id, token) => apiRequest(`/users/${id}`, { token }),
    create: (body, token) =>
      apiRequest('/users', { method: 'POST', body, token }),
    update: (id, body, token) =>
      apiRequest(`/users/${id}`, { method: 'PATCH', body, token }),
    remove: (id, token) =>
      apiRequest(`/users/${id}`, { method: 'DELETE', token }),
  },
  destinations: {
    list: (params, token) =>
      apiRequest(`/destinations${buildQuery(params)}`, { token }),
    get: (id, token) => apiRequest(`/destinations/${id}`, { token }),
    create: (body, token) =>
      apiRequest('/destinations', { method: 'POST', body, token }),
    update: (id, body, token) =>
      apiRequest(`/destinations/${id}`, { method: 'PATCH', body, token }),
    remove: (id, token) =>
      apiRequest(`/destinations/${id}`, { method: 'DELETE', token }),
  },
  activities: {
    list: (params, token) =>
      apiRequest(`/activities${buildQuery(params)}`, { token }),
    get: (id, token) => apiRequest(`/activities/${id}`, { token }),
    create: (body, token) =>
      apiRequest('/activities', { method: 'POST', body, token }),
    update: (id, body, token) =>
      apiRequest(`/activities/${id}`, { method: 'PATCH', body, token }),
    remove: (id, token) =>
      apiRequest(`/activities/${id}`, { method: 'DELETE', token }),
  },
  services: {
    list: (token) => apiRequest('/services', { token }),
    get: (code, token) => apiRequest(`/services/${code}`, { token }),
    update: (code, body, token) =>
      apiRequest(`/services/${code}`, { method: 'PATCH', body, token }),
    setStatus: (code, enabled, token) =>
      apiRequest(`/services/${code}/status`, {
        method: 'PATCH',
        body: { enabled },
        token,
      }),
  },
  usage: {
    me: (token) => apiRequest('/usage/me', { token }),
  },
  chat: {
    send: (body, token, signal) =>
      apiRequest('/chat', { method: 'POST', body, token, signal }),
    conversations: (params, token) =>
      apiRequest(`/chat/conversations${buildQuery(params)}`, { token }),
    conversation: (id, params, token) =>
      apiRequest(
        `/chat/conversations/${id}${buildQuery(params)}`,
        { token },
      ),
  },
  agents: {
    itinerary: (body, token, signal) =>
      apiRequest('/agents/itinerary', {
        method: 'POST',
        body,
        token,
        signal,
      }),
    compare: (body, token, signal) =>
      apiRequest('/agents/compare', {
        method: 'POST',
        body,
        token,
        signal,
      }),
    runs: (params, token) =>
      apiRequest(`/agents/runs${buildQuery(params)}`, { token }),
    run: (id, token) => apiRequest(`/agents/runs/${id}`, { token }),
  },
};
