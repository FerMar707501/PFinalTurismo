import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { EmptyState, InlineAlert, LoadingState } from '../components/States.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatNumber, serviceLabel } from '../utils/format.js';

const SERVICES = [
  { value: '', label: 'Todos los servicios' },
  { value: 'chat_rag', label: 'Chat RAG' },
  { value: 'agent_itinerary', label: 'Itinerario' },
  { value: 'agent_compare', label: 'Comparador' },
];

const SERVICE_COLORS = {
  chat_rag: '#0ea5e9',
  agent_itinerary: '#0f766e',
  agent_compare: '#d97706',
};

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

function daysAgoFrom(base, days) {
  const date = new Date(base);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return isoDay(date);
}

const PRESETS = [
  { id: '7', label: '7 días', days: 6 },
  { id: '30', label: '30 días', days: 29 },
  { id: '90', label: '90 días', days: 89 },
  { id: 'all', label: 'Todo el año', days: 359 },
];

function serviceColor(code) {
  return SERVICE_COLORS[code] ?? '#697a74';
}

function maxOf(values) {
  return values.reduce((max, value) => Math.max(max, Number(value) || 0), 0);
}

function niceMax(value) {
  if (value <= 0) {
    return 100;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function dateLabel(value) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

function DailyChart({ data }) {
  if (!data?.length) {
    return (
      <div className="analytics-empty-chart">
        No hay registros de consumo en el rango seleccionado.
      </div>
    );
  }

  const visible = data.slice(-30);
  const max = niceMax(maxOf(visible.map((item) => item.totalTokens)));

  return (
    <div className="daily-chart">
      <div className="chart-axis" aria-hidden="true">
        <span>{formatNumber(max)}</span>
        <span>{formatNumber(max / 2)}</span>
        <span>0</span>
      </div>
      <div className="chart-bars" role="img" aria-label="Tokens por día">
        {visible.map((item) => {
          const height = max > 0 ? Math.max(2, (item.totalTokens / max) * 100) : 2;
          return (
            <div className="chart-bar-wrap" key={item.date}>
              <div className="chart-bar-tooltip">
                <strong>{dateLabel(item.date)}</strong>
                <span>{formatNumber(item.totalTokens)} tokens</span>
                <span>{formatNumber(item.requests)} solicitudes</span>
              </div>
              <div className="chart-bar-track">
                <span
                  className="chart-bar"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="chart-bar-label">
                {dateLabel(item.date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServiceBreakdown({ services, totalTokens }) {
  if (!services?.length) {
    return (
      <div className="analytics-empty-chart">
        Sin datos por servicio para este rango.
      </div>
    );
  }

  return (
    <div className="service-breakdown">
      <div className="donut-wrap">
        <div
          className="donut"
          style={{
            background: `conic-gradient(${services
              .reduce(
                (acc, item) => {
                  const start = acc.cursor;
                  const end = start + item.sharePercent;
                  acc.parts.push(
                    `${serviceColor(item.serviceCode)} ${start}% ${end}%`,
                  );
                  acc.cursor = end;
                  return acc;
                },
                { parts: [], cursor: 0 },
              )
              .parts.join(', ')}, #eef2f0 0)`,
          }}
          aria-hidden="true"
        >
          <div className="donut-center">
            <strong>{formatNumber(totalTokens)}</strong>
            <span>tokens</span>
          </div>
        </div>
      </div>
      <div className="breakdown-list">
        {services.map((item) => (
          <div className="breakdown-row" key={item.serviceCode}>
            <span
              className="legend-dot"
              style={{ background: serviceColor(item.serviceCode) }}
            />
            <div className="breakdown-copy">
              <strong>{serviceLabel(item.serviceCode)}</strong>
              <small>
                {formatNumber(item.requests)} solicitudes ·{' '}
                {formatNumber(item.averageLatencyMs)} ms
              </small>
            </div>
            <div className="breakdown-values">
              <strong>{formatNumber(item.totalTokens)}</strong>
              <span>{item.sharePercent.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserTable({ users }) {
  if (!users?.length) {
    return (
      <EmptyState
        icon="users"
        title="Sin consumo de usuarios"
        message="No se registraron solicitudes para el rango seleccionado."
      />
    );
  }

  return (
    <div className="analytics-table-wrap">
      <table className="analytics-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th className="align-right">Solicitudes</th>
            <th className="align-right">Exitosas</th>
            <th className="align-right">Bloqueadas</th>
            <th className="align-right">Tokens</th>
            <th className="align-right">Latencia media</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.userId}>
              <td>
                <div className="analytics-user">
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </div>
              </td>
              <td>
                <span className="badge badge-neutral">
                  {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                </span>
              </td>
              <td className="align-right">{formatNumber(user.requests)}</td>
              <td className="align-right">
                {formatNumber(user.successfulRequests)}
              </td>
              <td className="align-right">
                {formatNumber(user.blockedRequests)}
              </td>
              <td className="align-right">
                <strong>{formatNumber(user.totalTokens)}</strong>
              </td>
              <td className="align-right">
                {formatNumber(user.averageLatencyMs)} ms
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage({ onNavigate }) {
  const { token } = useAuth();
  const [now] = useState(() => new Date());
  const today = isoDay(now);
  const [preset, setPreset] = useState('30');
  const [filters, setFilters] = useState({
    from: daysAgoFrom(now, 29),
    to: today,
    serviceCode: '',
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    api.analytics
      .usage(filters, token)
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, filters]);

  const applyPreset = (nextPreset) => {
    const found = PRESETS.find((item) => item.id === nextPreset);
    setPreset(nextPreset);
    setFilters((current) => ({
      ...current,
      from: daysAgoFrom(now, found?.days ?? 29),
      to: today,
    }));
  };

  const updateFilter = (field) => (event) => {
    setPreset('custom');
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  const downloadCsv = () => {
    api.analytics.downloadCsv(filters, token);
  };

  const monthly = useMemo(() => data?.monthly ?? [], [data]);

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <Icon name="chart" size={14} /> Analítica de consumo
          </span>
          <h1>Panel de uso de la IA</h1>
          <p>
            Este reporte sale del endpoint <code>/api/analytics/usage</code>. Power BI
            consume el mismo agregado vía <code>/api/external/analytics/usage</code>{' '}
            con una API key, por lo que las cifras coinciden.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={downloadCsv}
          disabled={loading}
        >
          <Icon name="external" size={16} />
          Exportar CSV
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onNavigate('powerbi')}
        >
          <Icon name="key" size={16} />
          Conectar Power BI
        </button>
      </header>

      <section className="panel analytics-toolbar">
        <div className="preset-row">
          {PRESETS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`preset-chip ${preset === item.id ? 'active' : ''}`.trim()}
              onClick={() => applyPreset(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="analytics-filters">
          <label className="filter-field">
            <span>Desde</span>
            <input
              className="input"
              type="date"
              value={filters.from}
              max={filters.to}
              onChange={updateFilter('from')}
            />
          </label>
          <label className="filter-field">
            <span>Hasta</span>
            <input
              className="input"
              type="date"
              value={filters.to}
              min={filters.from}
              max={today}
              onChange={updateFilter('to')}
            />
          </label>
          <label className="filter-field">
            <span>Servicio</span>
            <select
              className="select"
              value={filters.serviceCode}
              onChange={updateFilter('serviceCode')}
            >
              {SERVICES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {data?.meta ? (
          <p className="analytics-range-note">
            Mostrando {dateLabel(data.meta.from)} → {dateLabel(data.meta.to)} (
            {data.meta.days} días). Actualizado{' '}
            {new Date(data.meta.generatedAt).toLocaleTimeString('es-CO')}.          </p>
        ) : null}
      </section>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      {loading ? (
        <LoadingState label="Calculando métricas de consumo…" />
      ) : data ? (
        <>
          <section className="stat-grid analytics-kpis">
            <article className="stat-card">
              <span className="stat-icon teal">
                <Icon name="chart" size={20} />
              </span>
              <div>
                <strong>{formatNumber(data.totals.requests)}</strong>
                <span>Solicitudes totales</span>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-icon amber">
                <Icon name="gauge" size={20} />
              </span>
              <div>
                <strong>{formatNumber(data.totals.totalTokens)}</strong>
                <span>Tokens consumidos</span>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-icon coral">
                <Icon name="check" size={20} />
              </span>
              <div>
                <strong>{data.totals.successRate.toFixed(1)}%</strong>
                <span>Tasa de éxito</span>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-icon navy">
                <Icon name="clock" size={20} />
              </span>
              <div>
                <strong>{formatNumber(data.totals.averageLatencyMs)} ms</strong>
                <span>Latencia promedio</span>
              </div>
            </article>
          </section>

          <div className="analytics-grid">
            <section className="panel analytics-card analytics-chart-card">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Serie diaria</span>
                  <h2>Tokens por día</h2>
                </div>
                <span className="badge badge-neutral">
                  {formatNumber(data.totals.averageTokens)} tokens/solicitud
                </span>
              </div>
              <DailyChart data={data.daily} />
            </section>

            <section className="panel analytics-card">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Distribución</span>
                  <h2>Uso por servicio</h2>
                </div>
              </div>
              <ServiceBreakdown
                services={data.byService}
                totalTokens={data.totals.totalTokens}
              />
            </section>

            <section className="panel analytics-card analytics-wide">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Detalle</span>
                  <h2>Servicios de IA</h2>
                </div>
              </div>
              {data.byService.length ? (
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th className="align-right">Solicitudes</th>
                        <th className="align-right">Exitosas</th>
                        <th className="align-right">Bloqueadas</th>
                        <th className="align-right">Tokens entrada</th>
                        <th className="align-right">Tokens salida</th>
                        <th className="align-right">Total tokens</th>
                        <th className="align-right">Participación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byService.map((item) => (
                        <tr key={item.serviceCode}>
                          <td>
                            <span
                              className="legend-dot"
                              style={{ background: serviceColor(item.serviceCode) }}
                            />
                            {serviceLabel(item.serviceCode)}
                          </td>
                          <td className="align-right">
                            {formatNumber(item.requests)}
                          </td>
                          <td className="align-right">
                            {formatNumber(item.successfulRequests)}
                          </td>
                          <td className="align-right">
                            {formatNumber(item.blockedRequests)}
                          </td>
                          <td className="align-right">
                            {formatNumber(item.promptTokens)}
                          </td>
                          <td className="align-right">
                            {formatNumber(item.completionTokens)}
                          </td>
                          <td className="align-right">
                            <strong>{formatNumber(item.totalTokens)}</strong>
                          </td>
                          <td className="align-right">
                            {item.sharePercent.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon="chart"
                  title="Sin servicios en el rango"
                  message="Prueba con otro período o servicio."
                />
              )}
            </section>

            <section className="panel analytics-card analytics-wide">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Usuarios</span>
                  <h2>Consumo por usuario</h2>
                </div>
                <span className="badge badge-neutral">
                  {formatNumber(data.totals.activeUsers)} activos
                </span>
              </div>
              <UserTable users={data.byUser} />
            </section>

            <section className="panel analytics-card analytics-wide">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Histórico</span>
                  <h2>Consumo mensual</h2>
                </div>
              </div>
              {monthly.length ? (
                <div className="monthly-list">
                  {monthly.map((item) => (
                    <div className="monthly-row" key={item.month}>
                      <span className="monthly-label">{item.month}</span>
                      <div className="monthly-track">
                        <span
                          style={{
                            width: `${
                              (item.totalTokens /
                                Math.max(
                                  ...monthly.map((entry) => entry.totalTokens),
                                  1,
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <strong>{formatNumber(item.totalTokens)}</strong>
                      <small>{formatNumber(item.requests)} solicitudes</small>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="calendar"
                  title="Sin histórico"
                  message="Aún no hay datos mensuales para graficar."
                />
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
