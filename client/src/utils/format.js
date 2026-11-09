const numberFormatter = new Intl.NumberFormat('es-CO');

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

export function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

export function formatRelative(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const minutes = Math.round(diffMs / 60000);

  if (Math.abs(minutes) < 60) {
    return new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(
      minutes,
      'minute',
    );
  }

  const hours = Math.round(minutes / 60);

  if (Math.abs(hours) < 24) {
    return new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(
      hours,
      'hour',
    );
  }

  const days = Math.round(hours / 24);
  return new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(
    days,
    'day',
  );
}

export function formatPercent(value) {
  const number = Number(value) || 0;
  return `${Math.round(number * 10) / 10}%`;
}

export function initials(name = '') {
  return (
    String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'R'
  );
}

export function truncate(value = '', max = 120) {
  const text = String(value).replace(/\s+/g, ' ').trim();

  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 1)}…`;
}

export function safeJsonParse(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export const PRICE_LEVELS = {
  1: 'Económico',
  2: 'Medio',
  3: 'Alto',
  4: 'Lujo',
};

export const BUDGETS = {
  bajo: 'Económico',
  medio: 'Medio',
  alto: 'Alto',
};

export const SERVICE_LABELS = {
  chat_rag: 'Chat RAG',
  agent_itinerary: 'Itinerario',
  agent_compare: 'Comparador',
};

export const STATUS_LABELS = {
  success: 'Exitoso',
  error: 'Error',
  blocked: 'Bloqueado',
  running: 'En curso',
  partial: 'Parcial',
};

export const TOOL_LABELS = {
  get_destination_info: 'Ficha del destino',
  list_destination_activities: 'Actividades del destino',
  get_weather_forecast: 'Pronóstico del clima',
  get_route_distance: 'Distancia y ruta',
  get_wikipedia_summary: 'Contexto de Wikipedia',
};

export function toolLabel(name) {
  return TOOL_LABELS[name] ?? name ?? 'Herramienta';
}

const CATEGORY_META = [
  {
    match: /playa|mar|isla|caribe/i,
    emoji: '🌊',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #22d3ee 58%, #fef3c7 100%)',
  },
  {
    match: /selva|amazon|naturaleza|parque|río|rio/i,
    emoji: '🌿',
    gradient: 'linear-gradient(135deg, #14532d 0%, #22c55e 60%, #fde68a 100%)',
  },
  {
    match: /café|cafetero|montaña|valle/i,
    emoji: '☕',
    gradient: 'linear-gradient(135deg, #4a2c17 0%, #b45309 55%, #fcd34d 100%)',
  },
  {
    match: /colonial|histórico|historico|ciudad/i,
    emoji: '🏛️',
    gradient: 'linear-gradient(135deg, #78350f 0%, #f59e0b 55%, #fef3c7 100%)',
  },
  {
    match: /aventura|desierto|deporte/i,
    emoji: '🧭',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 55%, #fde68a 100%)',
  },
];

export function categoryMeta(category = '') {
  return (
    CATEGORY_META.find((item) => item.match.test(category)) ?? {
      emoji: '📍',
      gradient: 'linear-gradient(135deg, #134e4a 0%, #0f766e 55%, #fbbf24 100%)',
    }
  );
}

export function destinationGradient(destination) {
  const meta = categoryMeta(
    `${destination?.category ?? ''} ${destination?.region ?? ''}`,
  );
  return meta.gradient;
}

export function destinationEmoji(destination) {
  return categoryMeta(
    `${destination?.category ?? ''} ${destination?.region ?? ''}`,
  ).emoji;
}

export function serviceLabel(code) {
  return SERVICE_LABELS[code] ?? code ?? 'Servicio';
}

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status ?? '—';
}

export function roleLabel(role) {
  return role === 'admin' ? 'Administrador' : 'Usuario';
}

export function budgetLabel(value) {
  return BUDGETS[value] ?? value ?? '—';
}

export function priceLevelLabel(value) {
  return PRICE_LEVELS[Number(value)] ?? 'Medio';
}

export function quotaTone(quota) {
  if (!quota) {
    return 'neutral';
  }

  if (quota.exceeded || quota.percentUsed >= 90) {
    return 'danger';
  }

  if (quota.percentUsed >= 70) {
    return 'warning';
  }

  return 'ok';
}
