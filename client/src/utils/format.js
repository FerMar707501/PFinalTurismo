const LOCALE = 'es-GT';

const numberFormatter = new Intl.NumberFormat(LOCALE);

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'GTQ',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
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

export const CATEGORY_STYLES = {
  playa: {
    icon: 'waves',
    gradient:
      'linear-gradient(135deg, #0a5f74 0%, #14a3a3 52%, #8fe3c8 100%)',
  },
  volcan: {
    icon: 'mountain',
    gradient:
      'linear-gradient(135deg, #3b2d1f 0%, #a16207 48%, #f2b74a 100%)',
  },
  lago: {
    icon: 'waves',
    gradient:
      'linear-gradient(135deg, #12457a 0%, #1f7fb8 50%, #7fd0e8 100%)',
  },
  cafe: {
    icon: 'coffee',
    gradient:
      'linear-gradient(135deg, #33261a 0%, #7a4a21 50%, #d9a05b 100%)',
  },
  naturaleza: {
    icon: 'leaf',
    gradient:
      'linear-gradient(135deg, #123b25 0%, #1c7a48 52%, #86d59b 100%)',
  },
  selva: {
    icon: 'leaf',
    gradient:
      'linear-gradient(135deg, #0f3220 0%, #17693a 50%, #6fc98d 100%)',
  },
  colonial: {
    icon: 'temple',
    gradient:
      'linear-gradient(135deg, #5a2418 0%, #b3452b 52%, #f0b47a 100%)',
  },
  ciudad: {
    icon: 'building',
    gradient:
      'linear-gradient(135deg, #1d2b44 0%, #3d5a80 50%, #a9c6e8 100%)',
  },
  arqueologia: {
    icon: 'temple',
    gradient:
      'linear-gradient(135deg, #2c3a1d 0%, #6b7a2a 50%, #d9cf7a 100%)',
  },
  aventura: {
    icon: 'tent',
    gradient:
      'linear-gradient(135deg, #4a2a1a 0%, #c25a22 52%, #f5c07a 100%)',
  },
  gastronomia: {
    icon: 'utensils',
    gradient:
      'linear-gradient(135deg, #40202c 0%, #9b3a52 52%, #f2a2a2 100%)',
  },
  cultura: {
    icon: 'bookmark',
    gradient:
      'linear-gradient(135deg, #2a2140 0%, #5b4b9c 52%, #b8a8ee 100%)',
  },
};

const CATEGORY_MATCHERS = [
  { match: /playa|mar|isla|caribe/i, style: 'playa' },
  { match: /volc|montaña|montana|sierra|cumbre/i, style: 'volcan' },
  { match: /lago|río|rio|lacustre/i, style: 'lago' },
  { match: /caf|hacienda/i, style: 'cafe' },
  { match: /selva|amazon|bosque|naturaleza|parque|reserva/i, style: 'naturaleza' },
  { match: /colonial|históric|historic|patrimonio/i, style: 'colonial' },
  { match: /arqueolog|maya|ruina|templo|piramide|pirámide/i, style: 'arqueologia' },
  { match: /capital|ciudad/i, style: 'ciudad' },
  { match: /aventura|deporte|senderismo|trekking/i, style: 'aventura' },
  { match: /gastronom|mercado|sabor/i, style: 'gastronomia' },
  { match: /cultura|arte|artesanía|artesania|pueblo/i, style: 'cultura' },
];

const DEFAULT_STYLE = {
  icon: 'pin',
  gradient: 'linear-gradient(135deg, #07352a 0%, #0d6b4f 52%, #12a594 100%)',
};

export function categoryStyle(category = '', region = '') {
  const text = `${category} ${region}`;
  const found = CATEGORY_MATCHERS.find((item) => item.match.test(text));
  return found ? { ...CATEGORY_STYLES[found.style] } : { ...DEFAULT_STYLE };
}

export function categoryIcon(category = '', region = '') {
  return categoryStyle(category, region).icon;
}

export function destinationGradient(destination) {
  return categoryStyle(destination?.category, destination?.region).gradient;
}

export function destinationIcon(destination) {
  return categoryStyle(destination?.category, destination?.region).icon;
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
