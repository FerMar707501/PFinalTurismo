import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { InlineAlert, LoadingState } from '../components/States.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  formatDate,
  formatNumber,
  initials,
  quotaTone,
  roleLabel,
} from '../utils/format.js';

const QUOTA_RULES = [
  {
    icon: 'shield',
    title: 'Reserva antes de llamar',
    text: 'Cada servicio estima los tokens de entrada y salida antes de consultar a Groq. Si no alcanzan, la solicitud se bloquea.',
  },
  {
    icon: 'gauge',
    title: 'Registro real',
    text: 'Al finalizar se guarda el consumo real informado por el proveedor. Las solicitudes bloqueadas o fallidas no suman tokens.',
  },
  {
    icon: 'calendar',
    title: 'Renovación mensual',
    text: 'El periodo se calcula por mes calendario en UTC. El contador vuelve a cero al iniciar el siguiente mes.',
  },
  {
    icon: 'key',
    title: 'Límite por usuario',
    text: 'Un administrador asigna la cuota mensual de cada cuenta. El valor 0 bloquea por completo los servicios de IA.',
  },
];

export default function UsagePage({ onNavigate }) {
  const { token, user, quota, setQuota, refreshSession } = useAuth();
  const [loading, setLoading] = useState(!quota);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
    setRefreshing(true);
    setError('');

    try {
      const result = await api.usage.me(token);
      setQuota(result.quota);
      await refreshSession();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      load(!quota);
    }
    // Solo al entrar a la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) {
    return <LoadingState label="Calculando tu consumo mensual…" />;
  }

  const percent = Math.min(100, Math.max(0, quota?.percentUsed ?? 0));
  const tone = quotaTone(quota);
  const ringColor =
    tone === 'danger'
      ? 'var(--danger)'
      : tone === 'warning'
        ? 'var(--amber)'
        : 'var(--brand)';
  const resetDate = quota?.resetAt
    ? new Date(quota.resetAt).toLocaleDateString('es-GT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <Icon name="gauge" size={14} /> Control de consumo
          </span>
          <h1>Tu cuota de tokens</h1>
          <p>
            Consulta el consumo del periodo, el saldo disponible y las reglas que
            protegen tu límite mensual.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => load(false)}
          disabled={refreshing}
        >
          <Icon name="refresh" size={16} />
          {refreshing ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <section className={`usage-hero panel usage-${tone}`.trim()}>
        <div className="usage-ring-wrap">
          <div
            className="usage-ring"
            style={{
              background: `conic-gradient(${ringColor} ${percent}%, var(--surface-inset) 0)`,
            }}
          >
            <div className="usage-ring-center">
              <strong>{percent.toFixed(1)}%</strong>
              <span>usado</span>
            </div>
          </div>
        </div>

        <div className="usage-hero-copy">
          <span className="eyebrow">Periodo {quota?.period}</span>
          <h2>
            {formatNumber(quota?.remainingTokens)} tokens disponibles
          </h2>
          <p>
            Has consumido {formatNumber(quota?.usedTokens)} de{' '}
            {formatNumber(quota?.limitTokens)} tokens. El contador se renueva el{' '}
            {resetDate}.
          </p>
          <div className="usage-hero-meta">
            <span>
              <Icon name="calendar" size={15} /> {formatDate(quota?.periodStart)} —{' '}
              {formatDate(quota?.periodEnd)}
            </span>
            <span>
              <Icon name="user" size={15} /> {user?.name}
            </span>
          </div>
        </div>

        <div className="usage-side">
          <div className="usage-side-user">
            <span className="avatar">{initials(user?.name)}</span>
            <div>
              <strong>{user?.name}</strong>
              <small>
                {roleLabel(user?.role)} · {user?.email}
              </small>
            </div>
          </div>
          <div className="usage-side-stat">
            <span>Límite mensual</span>
            <strong>{formatNumber(quota?.limitTokens)}</strong>
          </div>
          <div className="usage-side-stat">
            <span>Saldo restante</span>
            <strong>{formatNumber(quota?.remainingTokens)}</strong>
          </div>
        </div>
      </section>

      {quota?.exceeded ? (
        <InlineAlert tone="danger" title="Límite alcanzado">
          No puedes ejecutar servicios de IA hasta que se renueve el periodo. Si
          necesitas más capacidad, solicita a un administrador que ajuste tu límite.
        </InlineAlert>
      ) : percent >= 80 ? (
        <InlineAlert tone="warning" title="Estás cerca del límite">
          Te queda {formatNumber(quota?.remainingTokens)} tokens. Las solicitudes de
          agentes reservan varios miles de tokens antes de ejecutarse.
        </InlineAlert>
      ) : null}

      <section className="stat-grid usage-stat-grid">
        <article className="stat-card">
          <span className="stat-icon teal">
            <Icon name="check" size={20} />
          </span>
          <div>
            <strong>{formatNumber(quota?.successfulRequests)}</strong>
            <span>Solicitudes exitosas</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon coral">
            <Icon name="shield" size={20} />
          </span>
          <div>
            <strong>{formatNumber(quota?.blockedRequests)}</strong>
            <span>Solicitudes bloqueadas</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon amber">
            <Icon name="gauge" size={20} />
          </span>
          <div>
            <strong>{formatNumber(quota?.usedTokens)}</strong>
            <span>Tokens consumidos</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon navy">
            <Icon name="key" size={20} />
          </span>
          <div>
            <strong>{formatNumber(quota?.limitTokens)}</strong>
            <span>Límite asignado</span>
          </div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-head">
          <div>
            <span className="eyebrow">Transparencia</span>
            <h2>Cómo se calcula el consumo</h2>
          </div>
        </div>
        <div className="rule-grid">
          {QUOTA_RULES.map((rule) => (
            <article className="rule-card" key={rule.title}>
              <span className="rule-icon">
                <Icon name={rule.icon} size={19} />
              </span>
              <strong>{rule.title}</strong>
              <p>{rule.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel usage-cta">
        <div>
          <span className="eyebrow">
            <Icon name="sparkles" size={14} /> Aprovecha tu saldo
          </span>
          <h2>Usa el chat o los agentes sin perder de vista el contador.</h2>
          <p>
            El saldo se actualiza después de cada respuesta. Los agentes muestran cuántos
            tokens consumieron y cuántos pasos ejecutaron.
          </p>
        </div>
        <div className="usage-cta-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('chat')}
          >
            Abrir chat <Icon name="arrowRight" size={17} />
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onNavigate('itinerary')}
          >
            Crear itinerario
          </button>
        </div>
      </section>
    </div>
  );
}
