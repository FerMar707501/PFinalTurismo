import { useEffect, useMemo, useState } from 'react';
import AgentResult from '../components/AgentResult.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyState, InlineAlert, LoadingState } from '../components/States.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  destinationEmoji,
  destinationGradient,
  formatNumber,
  formatRelative,
} from '../utils/format.js';

const INTERESTS = [
  'playa',
  'naturaleza',
  'café',
  'cultura',
  'aventura',
  'gastronomía',
  'familia',
  'fotografía',
];

const BUDGET_OPTIONS = [
  { value: 'bajo', label: 'Económico' },
  { value: 'medio', label: 'Medio' },
  { value: 'alto', label: 'Alto' },
];

export default function ComparePage({ onNavigate }) {
  const { token, quota, setQuota } = useAuth();
  const [destinations, setDestinations] = useState([]);
  const [services, setServices] = useState([]);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    days: 3,
    travelers: 2,
    budget: 'medio',
    originCity: 'Bogotá',
    interests: ['naturaleza', 'cultura'],
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
      api.agents.runs({ limit: 3, serviceCode: 'agent_compare' }, token),
    ]).then((results) => {
      if (cancelled) {
        return;
      }

      if (results[0].status === 'fulfilled') {
        setDestinations(results[0].value.data);
      }

      if (results[1].status === 'fulfilled') {
        setServices(results[1].value);
        setServicesLoaded(true);
      }

      if (results[2].status === 'fulfilled') {
        setRecentRuns(results[2].value.data);
      }

      setLoadingOptions(false);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const service = services.find((item) => item.code === 'agent_compare');
  const serviceAvailable = servicesLoaded ? Boolean(service?.enabled) : true;
  const selectedDestinations = useMemo(
    () => selectedIds.map((id) => destinations.find((item) => item.id === id)).filter(Boolean),
    [selectedIds, destinations],
  );
  const filteredDestinations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return destinations;
    }

    return destinations.filter(
      (destination) =>
        destination.name.toLowerCase().includes(query) ||
        destination.region.toLowerCase().includes(query) ||
        destination.category.toLowerCase().includes(query),
    );
  }, [destinations, search]);

  const toggleDestination = (id) => {
    setError('');
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 4) {
        setError('Puedes comparar como máximo cuatro destinos.');
        return current;
      }

      return [...current, id];
    });
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

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (selectedIds.length < 2) {
      setError('Selecciona al menos dos destinos para comparar.');
      return;
    }

    if (quota?.exceeded) {
      setError('Tu cuota mensual está agotada. Espera al nuevo periodo.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.agents.compare(
        {
          destinationIds: selectedIds,
          days: Number(form.days),
          travelers: Number(form.travelers),
          budget: form.budget,
          originCity: form.originCity.trim(),
          interests: form.interests,
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
    return <LoadingState label="Preparando el comparador de destinos…" />;
  }

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <Icon name="compare" size={14} /> Agente agent_compare
          </span>
          <h1>Compara destinos con datos, no con corazonadas</h1>
          <p>
            Elige entre dos y cuatro lugares. El agente consultará actividades, clima y
            distancia, y cerrará con una recomendación justificada.
          </p>
        </div>
        <div className="page-head-badge">
          <Icon name="compare" size={17} />
          {selectedIds.length}/4 seleccionados
        </div>
      </header>

      {!serviceAvailable ? (
        <InlineAlert tone="danger" title="Servicio desactivado">
          El comparador está desactivado temporalmente. Un administrador puede
          activarlo desde la configuración de servicios de IA.
        </InlineAlert>
      ) : null}

      {quota?.exceeded ? (
        <InlineAlert tone="danger" title="Cuota mensual agotada">
          Podrás volver a usar los agentes cuando se renueve tu cuota el{' '}
          {new Date(quota.resetAt).toLocaleDateString('es-CO')}.
        </InlineAlert>
      ) : null}

      {destinations.length === 0 ? (
        <EmptyState
          icon="compass"
          title="No hay destinos activos"
          message="El catálogo debe tener destinos publicados para comparar."
        />
      ) : (
        <form onSubmit={handleSubmit} className="page-stack">
          <section className="panel compare-selector">
            <div className="panel-heading compare-selector-head">
              <div>
                <span className="eyebrow">Paso 1 · Destinos</span>
                <h2>¿Qué lugares quieres poner frente a frente?</h2>
              </div>
              <label className="search-box compare-search">
                <Icon name="search" size={16} />
                <input
                  className="input search-input"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar destino…"
                />
              </label>
            </div>

            <div className="compare-grid">
              {filteredDestinations.map((destination) => {
                const selected = selectedIds.includes(destination.id);

                return (
                  <button
                    type="button"
                    key={destination.id}
                    className={`compare-option ${selected ? 'selected' : ''}`.trim()}
                    onClick={() => toggleDestination(destination.id)}
                    aria-pressed={selected}
                  >
                    <span
                      className="compare-visual"
                      style={{ background: destinationGradient(destination) }}
                    >
                      <span>{destinationEmoji(destination)}</span>
                    </span>
                    <span className="compare-copy">
                      <strong>{destination.name}</strong>
                      <small>{destination.region}</small>
                      <span>{destination.category}</span>
                    </span>
                    <span className="compare-check">
                      {selected ? <Icon name="check" size={14} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedDestinations.length > 0 ? (
              <div className="selected-strip">
                <span className="selected-strip-label">Comparando:</span>
                {selectedDestinations.map((destination) => (
                  <button
                    type="button"
                    key={destination.id}
                    className="selected-pill"
                    onClick={() => toggleDestination(destination.id)}
                    title="Quitar de la comparación"
                  >
                    {destinationEmoji(destination)} {destination.name}
                    <Icon name="close" size={12} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="compare-hint">
                <Icon name="info" size={15} /> Selecciona al menos dos destinos para
                continuar.
              </p>
            )}
          </section>

          <div className="agent-workbench">
            <section className="panel agent-form">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Paso 2 · Criterios</span>
                  <h2>Datos para la comparación</h2>
                </div>
                <span className="form-step">{selectedIds.length} destinos</span>
              </div>

              <div className="form-grid three">
                <label className="field">
                  <span>Días por destino</span>
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
                  <select
                    className="select"
                    value={form.budget}
                    onChange={update('budget')}
                  >
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
                    placeholder="Bogotá, Medellín, Cali…"
                    minLength="2"
                    required
                  />
                </div>
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

              {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={submitting || !serviceAvailable || quota?.exceeded}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-light" /> Comparando destinos…
                  </>
                ) : (
                  <>
                    <Icon name="compare" size={18} /> Comparar {selectedIds.length || ''}{' '}
                    destinos
                  </>
                )}
              </button>
            </section>

            <aside className="agent-side">
              <div className="panel agent-info">
                <span className="eyebrow">
                  <Icon name="bot" size={14} /> Qué recibirás
                </span>
                <h3>Una decisión con evidencia</h3>
                <ul className="tool-list">
                  <li>
                    <span>
                      <Icon name="compass" size={15} />
                    </span>
                    Ficha y actividades de cada destino
                  </li>
                  <li>
                    <span>
                      <Icon name="sun" size={15} />
                    </span>
                    Clima esperado para tus fechas
                  </li>
                  <li>
                    <span>
                      <Icon name="plane" size={15} />
                    </span>
                    Distancia desde tu ciudad de origen
                  </li>
                  <li>
                    <span>
                      <Icon name="globe" size={15} />
                    </span>
                    Contexto cultural de Wikipedia
                  </li>
                </ul>
                <p className="agent-info-note">
                  La respuesta final incluye una tabla comparativa, fuentes y todos los
                  pasos ejecutados por el agente.
                </p>
              </div>

              <div className="panel quota-panel">
                <div className="quota-panel-head">
                  <span className="eyebrow">Tu cuota</span>
                  <Icon name="gauge" size={18} />
                </div>
                <strong>{formatNumber(quota?.remainingTokens)} tokens disponibles</strong>
                <p>
                  La comparación reserva tokens para consultar cada destino y hasta seis
                  pasos del agente.
                </p>
                <div className="mini-progress">
                  <span style={{ width: `${Math.min(100, quota?.percentUsed ?? 0)}%` }} />
                </div>
              </div>

              {recentRuns.length > 0 ? (
                <div className="panel recent-runs-mini">
                  <div className="panel-heading">
                    <h3>Comparaciones recientes</h3>
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
        </form>
      )}

      {result ? (
        <AgentResult result={result} onViewHistory={() => onNavigate('runs')} />
      ) : null}
    </div>
  );
}
