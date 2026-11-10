import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import QuotaBar from '../components/QuotaBar.jsx';
import { EmptyState, InlineAlert, LoadingState } from '../components/States.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  destinationGradient,
  destinationIcon,
  formatNumber,
  formatRelative,
  priceLevelLabel,
  serviceLabel,
  statusLabel,
} from '../utils/format.js';
import { COUNTRY } from '../utils/country.js';

const QUICK_ACTIONS = [
  {
    view: 'chat',
    icon: 'chat',
    title: 'Pregunta al asistente',
    text: 'Consulta destinos, actividades y consejos de viaje con fuentes del catálogo.',
    tone: 'teal',
  },
  {
    view: 'itinerary',
    icon: 'map',
    title: 'Diseña un itinerario',
    text: 'Un agente combina clima, rutas, presupuesto y actividades día por día.',
    tone: 'gold',
  },
  {
    view: 'compare',
    icon: 'compare',
    title: 'Compara destinos',
    text: 'Evalúa hasta cuatro lugares de Guatemala y recibe una recomendación justificada.',
    tone: 'coral',
  },
];

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Buenos días';
  }

  if (hour < 19) {
    return 'Buenas tardes';
  }

  return 'Buenas noches';
}

export default function DashboardPage({ onNavigate }) {
  const { token, user, quota } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: '',
    destinations: [],
    destinationTotal: 0,
    activityTotal: 0,
    services: [],
    runs: [],
  });

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let cancelled = false;

    Promise.allSettled([
      api.destinations.list({ limit: 6, active: 'true' }, token),
      api.activities.list({ limit: 1, active: 'true' }, token),
      api.services.list(token),
      api.agents.runs({ limit: 3 }, token),
    ]).then((results) => {
      if (cancelled) {
        return;
      }

      const [destinationsResult, activitiesResult, servicesResult, runsResult] =
        results;

      const destinations =
        destinationsResult.status === 'fulfilled' ? destinationsResult.value : null;
      const activities =
        activitiesResult.status === 'fulfilled' ? activitiesResult.value : null;
      const services =
        servicesResult.status === 'fulfilled' ? servicesResult.value : [];
      const runs =
        runsResult.status === 'fulfilled' ? runsResult.value.data : [];

      setState({
        loading: false,
        error:
          destinationsResult.status === 'rejected'
            ? 'No se pudo cargar el catálogo. Revisa la conexión con la API.'
            : '',
        destinations: destinations?.data ?? [],
        destinationTotal: destinations?.pagination?.total ?? 0,
        activityTotal: activities?.pagination?.total ?? 0,
        services: Array.isArray(services) ? services : [],
        runs,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const firstName = user?.name?.split(' ')[0] ?? 'viajero';
  const activeServices = state.services.filter((service) => service.enabled).length;

  return (
    <div className="page-stack">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="eyebrow eyebrow-light">
            <Icon name="sparkles" size={14} /> {greeting()}, {firstName}
          </span>
          <h1>
            Tu próxima ruta por Guatemala empieza con una buena pregunta.
          </h1>
          <p>
            Explora el catálogo nacional, conversa con el asistente RAG o deja que los
            agentes construyan un plan con datos reales de clima, distancias y
            actividades entre los 22 departamentos.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-light"
              onClick={() => onNavigate('chat')}
            >
              <Icon name="chat" size={18} />
              Abrir chat
            </button>
            <button
              type="button"
              className="btn btn-outline-light"
              onClick={() => onNavigate('catalog')}
            >
              Explorar destinos
              <Icon name="arrowRight" size={18} />
            </button>
          </div>
        </div>
        <div className="hero-map" aria-hidden="true">
          <span className="map-pin pin-one">
            <Icon name="waves" size={18} />
          </span>
          <span className="map-pin pin-two">
            <Icon name="temple" size={18} />
          </span>
          <span className="map-pin pin-three">
            <Icon name="mountain" size={18} />
          </span>
          <span className="map-pin pin-four">
            <Icon name="leaf" size={18} />
          </span>
          <div className="map-line line-one" />
          <div className="map-line line-two" />
          <div className="hero-map-label">
            <strong>{COUNTRY.name}</strong>
            <span>22 departamentos · catálogo nacional</span>
          </div>
        </div>
      </section>

      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}

      <section className="stat-grid">
        <article className="stat-card">
          <span className="stat-icon teal">
            <Icon name="compass" size={20} />
          </span>
          <div>
            <strong>{state.loading ? '—' : formatNumber(state.destinationTotal)}</strong>
            <span>Destinos de Guatemala</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon amber">
            <Icon name="sparkles" size={20} />
          </span>
          <div>
            <strong>{state.loading ? '—' : formatNumber(state.activityTotal)}</strong>
            <span>Actividades disponibles</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon coral">
            <Icon name="bot" size={20} />
          </span>
          <div>
            <strong>{state.loading ? '—' : formatNumber(activeServices)}</strong>
            <span>Servicios de IA activos</span>
          </div>
        </article>
        <article className="stat-card stat-quota">
          <div className="stat-quota-head">
            <span className="stat-icon navy">
              <Icon name="gauge" size={20} />
            </span>
            <span>Cuota de {quota?.period ?? 'este mes'}</span>
          </div>
          <QuotaBar quota={quota} />
        </article>
      </section>

      {quota?.exceeded ? (
        <InlineAlert tone="danger" title="Cuota mensual agotada">
          Ya no puedes ejecutar servicios de IA este mes. El límite se renueva el{' '}
          {new Date(quota.resetAt).toLocaleDateString('es-GT')}.
        </InlineAlert>
      ) : null}

      <section className="section-block">
        <div className="section-head">
          <div>
            <span className="eyebrow">Accesos rápidos</span>
            <h2>¿Qué quieres hacer hoy?</h2>
          </div>
        </div>
        <div className="quick-grid">
          {QUICK_ACTIONS.map((action) => (
            <button
              type="button"
              key={action.view}
              className={`quick-card quick-${action.tone}`}
              onClick={() => onNavigate(action.view)}
            >
              <span className="quick-icon">
                <Icon name={action.icon} size={22} />
              </span>
              <strong>{action.title}</strong>
              <p>{action.text}</p>
              <span className="quick-link">
                Empezar <Icon name="arrowRight" size={15} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <div>
            <span className="eyebrow">Catálogo</span>
            <h2>Destinos para inspirarte</h2>
          </div>
          <button
            type="button"
            className="text-link"
            onClick={() => onNavigate('catalog')}
          >
            Ver todos <Icon name="arrowRight" size={15} />
          </button>
        </div>

        {state.loading ? (
          <LoadingState label="Cargando destinos…" />
        ) : state.destinations.length === 0 ? (
          <EmptyState
            icon="compass"
            title="El catálogo está vacío"
            message="Un administrador debe publicar destinos de Guatemala para comenzar."
          />
        ) : (
          <div className="destination-grid compact-grid">
            {state.destinations.map((destination) => (
              <button
                type="button"
                key={destination.id}
                className="destination-card"
                onClick={() =>
                  onNavigate('catalog', { destinationId: destination.id })
                }
              >
                <span
                  className="destination-visual small"
                  style={{ background: destinationGradient(destination) }}
                >
                  <span className="destination-icon">
                    <Icon name={destinationIcon(destination)} size={22} />
                  </span>
                  <span className="destination-price">
                    {priceLevelLabel(destination.priceLevel)}
                  </span>
                </span>
                <span className="destination-body">
                  <span className="destination-region">
                    <Icon name="globe" size={13} /> {destination.region}
                  </span>
                  <strong>{destination.name}</strong>
                  <span className="destination-meta">
                    {destination.category} · {destination.activityCount ?? 0}{' '}
                    actividades
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-head">
          <div>
            <span className="eyebrow">Trazabilidad</span>
            <h2>Últimas ejecuciones de agentes</h2>
          </div>
          <button
            type="button"
            className="text-link"
            onClick={() => onNavigate('runs')}
          >
            Ver historial <Icon name="arrowRight" size={15} />
          </button>
        </div>

        {state.loading ? (
          <LoadingState label="Cargando ejecuciones…" compact />
        ) : state.runs.length === 0 ? (
          <EmptyState
            icon="map"
            title="Aún no has ejecutado un agente"
            message="Crea tu primer itinerario o compara destinos para ver la trazabilidad aquí."
            action={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onNavigate('itinerary')}
              >
                Crear itinerario
              </button>
            }
          />
        ) : (
          <div className="run-list">
            {state.runs.map((run) => (
              <button
                type="button"
                key={run.id}
                className="run-row"
                onClick={() => onNavigate('runs', { runId: run.id })}
              >
                <span className={`run-status-dot status-${run.status}`} />
                <span className="run-main">
                  <strong>{serviceLabel(run.serviceCode)}</strong>
                  <small>
                    {run.input?.destinationIds
                      ? `Destinos ${run.input.destinationIds.join(', ')}`
                      : `Destino ${run.input?.destinationId ?? '—'}`}
                  </small>
                </span>
                <span className={`badge badge-${run.status}`}>
                  {statusLabel(run.status)}
                </span>
                <span className="run-tokens">
                  {formatNumber(run.totalTokens)} tokens
                </span>
                <span className="run-date">{formatRelative(run.createdAt)}</span>
                <Icon name="chevronRight" size={17} />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
