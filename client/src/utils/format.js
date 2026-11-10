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
      'linear-gradient(135deg, #2a4a7a 0%, #5b7fb5 48%, #ffc2a8 100%)',
  },
  volcan: {
    icon: 'mountain',
    gradient:
      'linear-gradient(135deg, #4a2418 0%, #c0642e 48%, #ffc98a 100%)',
  },
  lago: {
    icon: 'waves',
    gradient:
      'linear-gradient(135deg, #24356b 0%, #6b5aa8 50%, #ffb8a0 100%)',
  },
  cafe: {
    icon: 'coffee',
    gradient:
      'linear-gradient(135deg, #3b2418 0%, #8a4a2a 50%, #e8a872 100%)',
  },
  naturaleza: {
    icon: 'leaf',
    gradient:
      'linear-gradient(135deg, #3a2c1e 0%, #8a5a3a 52%, #ffce9e 100%)',
  },
  selva: {
    icon: 'leaf',
    gradient:
      'linear-gradient(135deg, #2f2340 0%, #6d3f6a 50%, #ffb08a 100%)',
  },
  colonial: {
    icon: 'temple',
    gradient:
      'linear-gradient(135deg, #5a2018 0%, #c2483a 52%, #ffc08a 100%)',
  },
  ciudad: {
    icon: 'building',
    gradient:
      'linear-gradient(135deg, #2a2148 0%, #5c4a8a 50%, #f0a8b0 100%)',
  },
  arqueologia: {
    icon: 'temple',
    gradient:
      'linear-gradient(135deg, #3d2a1f 0%, #a06a35 50%, #ffe0a3 100%)',
  },
  aventura: {
    icon: 'tent',
    gradient:
      'linear-gradient(135deg, #4a2218 0%, #d0603a 52%, #ffd08a 100%)',
  },
  gastronomia: {
    icon: 'utensils',
    gradient:
      'linear-gradient(135deg, #431f2e 0%, #b03a5c 52%, #ffb0b0 100%)',
  },
  cultura: {
    icon: 'bookmark',
    gradient:
      'linear-gradient(135deg, #2f1f42 0%, #7a4a9c 52%, #e8b0ea 100%)',
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
  gradient: 'linear-gradient(135deg, #7a3556 0%, #a5497a 52%, #c98be0 100%)',
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
