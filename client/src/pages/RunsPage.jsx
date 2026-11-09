import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import RichText from '../components/RichText.jsx';
import SourceList from '../components/SourceList.jsx';
import { EmptyState, InlineAlert, LoadingState } from '../components/States.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  formatDateTime,
  formatNumber,
  formatRelative,
  serviceLabel,
  statusLabel,
  toolLabel,
  truncate,
} from '../utils/format.js';

function runSummary(run) {
  if (run.input?.destinationIds) {
    return `Destinos ${run.input.destinationIds.join(', ')} · ${run.input.days ?? '—'} días`;
  }

  return `Destino ${run.input?.destinationId ?? '—'} · ${run.input?.days ?? '—'} días`;
}

function RunSteps({ steps = [] }) {
  if (!steps.length) {
    return null;
  }

  return (
    <ol className="agent-steps run-steps">
      {steps.map((step) => (
        <li key={`run-step-${step.step}`} className="agent-step">
          <span className={`step-number step-${step.type}`}>
            {step.type === 'final' ? '✓' : step.step}
          </span>
          <div className="step-content">
            <div className="step-head">
              <strong>
                {step.type === 'final'
                  ? 'Respuesta final'
                  : `Paso ${step.step}: consultas`}
              </strong>
              {step.type === 'limit' ? (
                <span className="badge badge-error">Límite alcanzado</span>
              ) : null}
            </div>
            {step.content ? <p>{step.content}</p> : null}
            {step.results?.length ? (
              <ul className="step-tools">
                {step.results.map((result, index) => (
                  <li
                    key={`${step.step}-${result.tool}-${index}`}
                    className={`step-tool ${result.ok ? 'ok' : 'failed'}`.trim()}
                  >
                    <span className="step-tool-icon">
                      <Icon name={result.ok ? 'check' : 'alert'} size={14} />
                    </span>
                    <div className="step-tool-body">
                      <div className="step-tool-title">
                        <strong>{toolLabel(result.tool)}</strong>
                        <span>{formatNumber(result.durationMs ?? 0)} ms</span>
                      </div>
                      {result.error ? (
                        <p className="step-tool-error">{result.error.message}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function RunsPage({ focusRunId }) {
  const { token } = useAuth();
  const [runs, setRuns] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ serviceCode: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    api.agents
      .runs(
        {
          page,
          limit: 10,
          serviceCode: filters.serviceCode || undefined,
          status: filters.status || undefined,
        },
        token,
      )
      .then((result) => {
        if (!cancelled) {
          setRuns(result.data);
          setPagination(result.pagination);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
          setRuns([]);
          setPagination(null);
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
  }, [token, page, filters.serviceCode, filters.status]);

  useEffect(() => {
    if (focusRunId) {
      openRun(focusRunId);
    }
    // La navegación con un ID solo debe abrir el detalle una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRunId]);

  async function openRun(id) {
    setDetailLoading(true);
    setDetailError('');
    setSelected({ id });

    try {
      const result = await api.agents.run(id, token);
      setSelected(result.run);
    } catch (requestError) {
      setDetailError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  }

  const updateFilter = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
    setPage(1);
  };

  const detailOutput = selected?.output ?? null;
  const detailUsage = detailOutput?.usage ?? {};
  const detailSteps = selected?.steps ?? [];

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <Icon name="history" size={14} /> Trazabilidad
          </span>
          <h1>Historial de agentes</h1>
          <p>
            Revisa cada ejecución, sus fuentes, los pasos del modelo y el consumo real de
            tokens.
          </p>
        </div>
        <div className="page-head-badge">
          <Icon name="bot" size={17} />
          {pagination ? `${formatNumber(pagination.total)} ejecuciones` : 'Sin datos'}
        </div>
      </header>

      <section className="catalog-toolbar runs-toolbar">
        <label className="filter-field">
          <span>Servicio</span>
          <select
            className="select"
            value={filters.serviceCode}
            onChange={updateFilter('serviceCode')}
          >
            <option value="">Todos los agentes</option>
            <option value="agent_itinerary">Itinerario</option>
            <option value="agent_compare">Comparador</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Estado</span>
          <select
            className="select"
            value={filters.status}
            onChange={updateFilter('status')}
          >
            <option value="">Todos los estados</option>
            <option value="success">Exitoso</option>
            <option value="error">Error</option>
            <option value="partial">Parcial</option>
            <option value="running">En curso</option>
          </select>
        </label>
        <div className="toolbar-spacer" />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setFilters({ serviceCode: '', status: '' });
            setPage(1);
          }}
        >
          <Icon name="refresh" size={15} /> Limpiar filtros
        </button>
      </section>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      {loading ? (
        <LoadingState label="Cargando ejecuciones…" />
      ) : runs.length === 0 ? (
        <EmptyState
          icon="history"
          title="No hay ejecuciones para mostrar"
          message="Cuando uses el itinerario o el comparador, cada ejecución aparecerá aquí con toda su trazabilidad."
        />
      ) : (
        <>
          <div className="run-table panel">
            <div className="run-table-head">
              <span>Ejecución</span>
              <span>Servicio</span>
              <span>Entrada</span>
              <span>Tokens</span>
              <span>Latencia</span>
              <span>Fecha</span>
              <span>Estado</span>
              <span />
            </div>
            {runs.map((run) => (
              <button
                type="button"
                key={run.id}
                className="run-table-row"
                onClick={() => openRun(run.id)}
              >
                <span className="run-id">#{run.id}</span>
                <span>
                  <span className={`service-dot service-${run.serviceCode}`} />
                  {serviceLabel(run.serviceCode)}
                </span>
                <span className="run-input-cell">{runSummary(run)}</span>
                <span>{formatNumber(run.totalTokens)}</span>
                <span>{formatNumber(run.latencyMs)} ms</span>
                <span title={formatDateTime(run.createdAt)}>
                  {formatRelative(run.createdAt)}
                </span>
                <span className={`badge badge-${run.status}`}>
                  {statusLabel(run.status)}
                </span>
                <span className="run-open">
                  <Icon name="chevronRight" size={17} />
                </span>
              </button>
            ))}
          </div>
          <Pagination pagination={pagination} onChange={setPage} />
        </>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setDetailError('');
        }}
        title={selected?.id ? `Ejecución #${selected.id}` : 'Detalle de ejecución'}
        subtitle={
          selected?.serviceCode
            ? `${serviceLabel(selected.serviceCode)} · ${formatDateTime(selected.createdAt)}`
            : 'Cargando trazabilidad…'
        }
        size="lg"
        footer={
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setSelected(null)}
            >
              Cerrar
            </button>
          </div>
        }
      >
        {detailError ? <InlineAlert tone="danger">{detailError}</InlineAlert> : null}
        {detailLoading ? (
          <LoadingState label="Cargando ejecución…" />
        ) : selected?.status ? (
          <div className="run-detail">
            <div className="run-detail-badges">
              <span className={`badge badge-${selected.status}`}>
                {statusLabel(selected.status)}
              </span>
              <span className="badge badge-neutral">
                {serviceLabel(selected.serviceCode)}
              </span>
              <span className="badge badge-neutral">
                {formatNumber(selected.totalTokens)} tokens
              </span>
              <span className="badge badge-neutral">
                {formatNumber(selected.latencyMs)} ms
              </span>
            </div>

            <div className="run-detail-grid">
              <div>
                <span>Fecha</span>
                <strong>{formatDateTime(selected.createdAt)}</strong>
              </div>
              <div>
                <span>Destino(s)</span>
                <strong>{runSummary(selected)}</strong>
              </div>
              <div>
                <span>Tokens de entrada</span>
                <strong>{formatNumber(detailUsage.promptTokens)}</strong>
              </div>
              <div>
                <span>Tokens de salida</span>
                <strong>{formatNumber(detailUsage.completionTokens)}</strong>
              </div>
            </div>

            <details className="run-input-details">
              <summary>Entrada enviada al agente</summary>
              <pre>{JSON.stringify(selected.input, null, 2)}</pre>
            </details>

            {detailOutput?.error ? (
              <InlineAlert
                tone="danger"
                title={`Error: ${detailOutput.error.code ?? 'AGENT_ERROR'}`}
              >
                {truncate(detailOutput.error.message, 400)}
              </InlineAlert>
            ) : null}

            {detailOutput?.answer ? (
              <div className="agent-answer">
                <RichText text={detailOutput.answer} />
              </div>
            ) : null}

            <SourceList sources={detailOutput?.sources ?? []} />

            {detailSteps.length ? (
              <details className="agent-steps-block" open>
                <summary>
                  <span>
                    <Icon name="history" size={16} /> Pasos ejecutados (
                    {detailSteps.length})
                  </span>
                  <Icon name="chevronDown" size={17} />
                </summary>
                <RunSteps steps={detailSteps} />
              </details>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
