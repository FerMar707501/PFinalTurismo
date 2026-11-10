import { useEffect, useMemo, useState } from 'react';
import AgentResult from '../components/AgentResult.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyState, InlineAlert, LoadingState } from '../components/States.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  destinationGradient,
  destinationIcon,
  formatNumber,
  formatRelative,
} from '../utils/format.js';
import { ORIGIN_CITIES } from '../utils/country.js';

const INTERESTS = [
  'playa',
  'volcanes',
  'lago',
  'café',
  'cultura maya',
  'aventura',
  'gastronomía',
  'mercados',
  'familia',
  'fotografía',
];

const BUDGET_OPTIONS = [
  { value: 'bajo', label: 'Económico' },
  { value: 'medio', label: 'Medio' },
  { value: 'alto', label: 'Alto' },
];

const TOOL_INFO = [
  { icon: 'compass', label: 'Ficha del destino' },
  { icon: 'sparkles', label: 'Actividades y precios' },
  { icon: 'sun', label: 'Pronóstico del clima' },
  { icon: 'plane', label: 'Distancia desde tu origen' },
  { icon: 'globe', label: 'Contexto de Wikipedia' },
];

export default function ItineraryPage({ onNavigate }) {
  const { token, quota, setQuota } = useAuth();
  const [destinations, setDestinations] = useState([]);
  const [services, setServices] = useState([]);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [form, setForm] = useState({
    destinationId: '',
    days: 3,
    travelers: 2,
    budget: 'medio',
    originCity: 'Guatemala',
    interests: ['volcanes', 'café'],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let cancelled = false;

    Promise.allSettled([
      api.destinations.list({ limit: 100, active: 'true' }, token),
      api.services.list(token),
      api.agents.runs({ limit: 3, serviceCode: 'agent_itinerary' }, token),
    ]).then((results) => {
      if (cancelled) {
        return;
      }

      const destinationsResult = results[0];
      const servicesResult = results[1];
      const runsResult = results[2];

      if (destinationsResult.status === 'fulfilled') {
        const list = destinationsResult.value.data;
        setDestinations(list);
        setForm((current) => ({
          ...current,
          destinationId: current.destinationId || (list[0]?.id ?? ''),
        }));
      }

      if (servicesResult.status === 'fulfilled') {
        setServices(servicesResult.value);
        setServicesLoaded(true);
      }

      if (runsResult.status === 'fulfilled') {
        setRecentRuns(runsResult.value.data);
      }

      setLoadingOptions(false);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const selectedDestination = useMemo(
    () =>
      destinations.find(
        (destination) => Number(destination.id) === Number(form.destinationId),
      ) ?? null,
    [destinations, form.destinationId],
  );

  const service = services.find((item) => item.code === 'agent_itinerary');
  const serviceAvailable = servicesLoaded ? Boolean(service?.enabled) : true;

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const toggleInterest = (interest) => {
    setForm((current) => {
      const exists = current.interests.includes(interest);
      const interests = exists
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest].slice(0, 8);
      return { ...current, interests };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.destinationId) {
      setError('Selecciona un destino para crear el itinerario.');
      return;
    }

    if (quota?.exceeded) {
      setError('Tu cuota mensual está agotada. Espera al nuevo periodo.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.agents.itinerary(
        {
          destinationId: Number(form.destinationId),
          days: Number(form.days),
          travelers: Number(form.travelers),
          budget: form.budget,
          originCity: form.originCity.trim(),
          interests: form.interests,
          ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        },
        token,
      );
      setResult(response);
      setQuota(response.quota);
      setRecentRuns((current) => [response.run, ...current].slice(0, 3));
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.details?.limitTokens !== undefined) {
        setQuota(requestError.details);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOptions) {
    return <LoadingState label="Preparando el planificador de viajes…" />;
  }

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <Icon name="map" size={14} /> Agente agent_itinerary
          </span>
          <h1>Diseña un itinerario por Guatemala</h1>
          <p>
            Cuéntanos cómo viajas y el agente consultará actividades, clima, rutas y
            contexto cultural antes de proponer un plan día por día.
          </p>
        </div>
        <div className="page-head-badge">
          <Icon name="sparkles" size={17} />
          Hasta 15 días
        </div>
      </header>

      {!serviceAvailable ? (
        <InlineAlert tone="danger" title="Servicio desactivado">
          El agente de itinerarios está desactivado temporalmente. Un administrador
          puede activarlo desde la configuración de servicios de IA.
        </InlineAlert>
      ) : null}

      {quota?.exceeded ? (
        <InlineAlert tone="danger" title="Cuota mensual agotada">
          Podrás volver a usar los agentes cuando se renueve tu cuota el{' '}
          {new Date(quota.resetAt).toLocaleDateString('es-GT')}.
        </InlineAlert>
      ) : null}

      {destinations.length === 0 ? (
        <EmptyState
          icon="compass"
          title="No hay destinos activos"
          message="El catálogo debe tener destinos de Guatemala publicados para planear un itinerario."
        />
      ) : (
        <div className="agent-workbench">
          <form className="panel agent-form" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Datos del viaje</span>
                <h2>Configura tu itinerario</h2>
              </div>
              <span className="form-step">Paso 1 de 2</span>
            </div>

            <label className="field">
              <span>Destino</span>
              <select
                className="select"
                value={form.destinationId}
                onChange={update('destinationId')}
                required
              >
                <option value="">Selecciona un destino</option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name} — {destination.region}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid three">
              <label className="field">
                <span>Días</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="15"
                  value={form.days}
                  onChange={update('days')}
                  required
                />
              </label>
              <label className="field">
                <span>Viajeros</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="20"
                  value={form.travelers}
                  onChange={update('travelers')}
                  required
                />
              </label>
              <label className="field">
                <span>Presupuesto</span>
                <select className="select" value={form.budget} onChange={update('budget')}>
                  {BUDGET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Ciudad de origen</span>
              <div className="input-with-icon">
                <Icon name="plane" size={17} />
                <input
                  className="input"
                  type="text"
                  value={form.originCity}
                  onChange={update('originCity')}
                  placeholder="Guatemala, Quetzaltenango, Cobán…"
                  list="origin-cities"
                  minLength="2"
                  required
                />
                <datalist id="origin-cities">
                  {ORIGIN_CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>
              <small className="field-hint">
                Se usa para calcular la distancia terrestre con OSRM dentro de
                Guatemala.
              </small>
            </label>

            <div className="field">
              <span>Intereses (máximo 8)</span>
              <div className="chip-row">
                {INTERESTS.map((interest) => (
                  <button
                    type="button"
                    key={interest}
                    className={`choice-chip ${form.interests.includes(interest) ? 'selected' : ''}`.trim()}
                    onClick={() => toggleInterest(interest)}
                  >
                    {form.interests.includes(interest) ? (
                      <Icon name="check" size={13} />
                    ) : null}
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span>Notas adicionales (opcional)</span>
              <textarea
                className="textarea"
                rows="3"
                maxLength="500"
                value={form.notes}
                onChange={update('notes')}
                placeholder="Viajamos con un niño de 6 años, preferimos actividades tranquilas…"
              />
            </label>

            {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting || !serviceAvailable || quota?.exceeded}
            >
              {submitting ? (
                <>
                  <span className="spinner spinner-light" /> El agente está
                  consultando fuentes…
                </>
              ) : (
                <>
                  <Icon name="sparkles" size={18} /> Generar itinerario
                </>
              )}
            </button>
          </form>

          <aside className="agent-side">
            {selectedDestination ? (
              <div className="panel destination-preview">
                <div
                  className="destination-preview-hero"
                  style={{ background: destinationGradient(selectedDestination) }}
                >
                  <span className="preview-icon">
                    <Icon name={destinationIcon(selectedDestination)} size={28} />
                  </span>
                  <div>
                    <small>{selectedDestination.region}</small>
                    <strong>{selectedDestination.name}</strong>
                  </div>
                </div>
                <p>{selectedDestination.description}</p>
                <div className="preview-meta">
                  <span>
                    <Icon name="sparkles" size={14} />{' '}
                    {selectedDestination.activityCount} actividades
                  </span>
                  <span>
                    <Icon name="sun" size={14} />{' '}
                    {selectedDestination.bestSeason || 'Todo el año'}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="panel agent-info">
              <span className="eyebrow">
                <Icon name="bot" size={14} /> Cómo trabaja
              </span>
              <h3>Un agente, cinco herramientas</h3>
              <ul className="tool-list">
                {TOOL_INFO.map((tool) => (
                  <li key={tool.label}>
                    <span>
                      <Icon name={tool.icon} size={15} />
                    </span>
                    {tool.label}
                  </li>
                ))}
              </ul>
              <p className="agent-info-note">
                El agente decide qué consultar y puede continuar si una fuente externa
                falla. Cada paso queda registrado para que puedas auditar la respuesta.
              </p>
            </div>

            <div className="panel quota-panel">
              <div className="quota-panel-head">
                <span className="eyebrow">Tu cuota</span>
                <Icon name="gauge" size={18} />
              </div>
              <strong>{formatNumber(quota?.remainingTokens)} tokens disponibles</strong>
              <p>
                Cada itinerario reserva tokens para hasta 6 pasos del agente. El consumo
                real se descuenta al finalizar.
              </p>
              <div className="mini-progress">
                <span style={{ width: `${Math.min(100, quota?.percentUsed ?? 0)}%` }} />
              </div>
            </div>

            {recentRuns.length > 0 ? (
              <div className="panel recent-runs-mini">
                <div className="panel-heading">
                  <h3>Ejecuciones recientes</h3>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => onNavigate('runs')}
                  >
                    Ver todas
                  </button>
                </div>
                {recentRuns.map((run) => (
                  <button
                    type="button"
                    key={run.id}
                    className="mini-run"
                    onClick={() => onNavigate('runs', { runId: run.id })}
                  >
                    <span className={`run-status-dot status-${run.status}`} />
                    <span>
                      <strong>#{run.id}</strong>
                      <small>{formatRelative(run.createdAt)}</small>
                    </span>
                    <span>{formatNumber(run.totalTokens)} tokens</span>
                  </button>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      )}

      {result ? (
        <AgentResult result={result} onViewHistory={() => onNavigate('runs')} />
      ) : null}
    </div>
  );
}
