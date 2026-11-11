import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { InlineAlert, LoadingState } from '../components/States.jsx';
import { api, API_URL } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDateTime } from '../utils/format.js';

const API_ORIGIN = API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

const STEPS = [
  {
    title: 'Obtén una API key',
    text: 'El administrador crea un cliente de API en esta página. La clave completa aparece una sola vez.',
  },
  {
    title: 'Conecta Power BI Desktop',
    text: 'Obtener datos → Web → Avanzado. Pega la URL del endpoint y agrega la cabecera X-API-Key con la clave.',
  },
  {
    title: 'Carga el JSON',
    text: 'Power BI detecta un registro con meta, totals, byService, byUser, daily y monthly. Convierte cada lista en tabla.',
  },
  {
    title: 'Publica y programa la actualización',
    text: 'Publica el reporte en el servicio de Power BI y programa la actualización diaria. La API exige X-API-Key.',
  },
];

export default function PowerBiPage() {
  const { token } = useAuth();
  const { push } = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '' });
  const [createdKey, setCreatedKey] = useState(null);
  const [updating, setUpdating] = useState(null);

  const endpoint = `${API_ORIGIN}/api/bi/usage`;

  const load = () => {
    if (!token) {
      return;
    }

    setLoading(true);

    api.analytics
      .clients(token)
      .then((result) => setClients(result.data))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const createClient = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError('');

    try {
      const result = await api.analytics.createClient(
        { name: form.name.trim() },
        token,
      );
      setCreatedKey(result);
      setForm({ name: '' });
      load();
      push('API key creada. Cópiala ahora: no volverá a mostrarse.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (client) => {
    setUpdating(client.id);

    try {
      const result = await api.analytics.setClientStatus(
        client.id,
        !client.active,
        token,
      );
      setClients((current) =>
        current.map((item) =>
          item.id === client.id ? { ...item, active: result.active } : item,
        ),
      );
      push(
        `Cliente ${result.active ? 'activado' : 'desactivado'}.`,
        result.active ? 'success' : 'info',
      );
    } catch (requestError) {
      push(requestError.message, 'error');
    } finally {
      setUpdating(null);
    }
  };

  const copyKey = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      push('Clave copiada al portapapeles.');
    } catch {
      push('No se pudo copiar automáticamente. Selecciona y copia a mano.', 'error');
    }
  };

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <Icon name="chart" size={14} /> Integración BI
          </span>
          <h1>Power BI conectado a la API</h1>
          <p>
            Descarga el consumo desde el endpoint externo con una API key. El reporte y
            el panel web comparten el mismo cálculo, así que las cifras coinciden.
          </p>
        </div>
        <a
          className="btn btn-ghost btn-sm"
          href={`${API_ORIGIN}/api/docs`}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="external" size={16} /> Ver Swagger
        </a>
      </header>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <div className="powerbi-grid">
        <section className="panel powerbi-card">
          <div>
            <span className="eyebrow">Conectividad</span>
            <h2>Cómo conectar Power BI Desktop</h2>
            <p>
              Power BI no puede enviar un JWT de usuario, por eso el consumo se expone
              con <code>X-API-Key</code> y un scope de solo lectura.
            </p>
          </div>

          <ol className="powerbi-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="powerbi-step-number">{index + 1}</span>
                <span>
                  <strong>{step.title}</strong>
                  <br />
                  {step.text}
                </span>
              </li>
            ))}
          </ol>

          <div className="endpoint-box">
            <span>URL del endpoint</span>
            <code>{endpoint}</code>
          </div>
          <div className="endpoint-box">
            <span>Cabecera requerida</span>
            <code>X-API-Key: rutaia_…</code>
          </div>
          <div className="endpoint-box">
            <span>Parámetros opcionales</span>
            <code>?from=2026-11-01&amp;to=2026-11-09</code>
          </div>

          <InlineAlert tone="info" title="JSON plano para Power BI">
            En el Editor de Power Query usa «Convertir en tabla» sobre el registro y
            luego expande los campos byService, byUser, daily y monthly. Para tablas
            planas usa GET /api/analytics/usage.csv desde el panel de analítica.
          </InlineAlert>
        </section>

        <section className="panel powerbi-card">
          <div>
            <span className="eyebrow">Credenciales</span>
            <h2>Clientes de API</h2>
            <p>
              Crea una clave por reporte o equipo. Si se filtra, desactívala y genera
              otra.
            </p>
          </div>

          <form className="form-stack" onSubmit={createClient}>
            <label className="field">
              <span>Nombre del cliente</span>
              <input
                className="input"
                value={form.name}
                onChange={(event) =>
                  setForm({ name: event.target.value })
                }
                placeholder="Power BI · Consumo IA"
                minLength="2"
                maxLength="120"
                required
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? (
                <span className="spinner spinner-light" />
              ) : (
                <Icon name="key" size={17} />
              )}
              Generar API key
            </button>
          </form>

          {createdKey ? (
            <div className="new-key">
              <strong>Guarda esta clave ahora</strong>
              <p>No volverá a mostrarse por seguridad.</p>
              <code>{createdKey.apiKey}</code>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => copyKey(createdKey.apiKey)}
              >
                <Icon name="key" size={14} /> Copiar clave
              </button>
            </div>
          ) : null}

          {loading ? (
            <LoadingState label="Cargando clientes…" compact />
          ) : clients.length === 0 ? (
            <p className="compare-hint">
              <Icon name="info" size={15} /> Aún no hay clientes de API registrados.
            </p>
          ) : (
            <div className="client-list">
              {clients.map((client) => (
                <div className="client-row" key={client.id}>
                  <div className="client-copy">
                    <strong>{client.name}</strong>
                    <small>
                      {client.keyPrefix}… · {client.scope}
                    </small>
                  </div>
                  <span
                    className={`badge ${client.active ? 'badge-success' : 'badge-muted'}`}
                  >
                    {client.active ? 'Activo' : 'Inactivo'}
                  </span>
                  <div className="client-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggle(client)}
                      disabled={updating === client.id}
                    >
                      {client.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {clients.some((client) => client.lastUsedAt) ? (
            <p className="analytics-range-note">
              Último uso:{' '}
              {formatDateTime(
                clients
                  .filter((client) => client.lastUsedAt)
                  .sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt))[0]
                  .lastUsedAt,
              )}
            </p>
          ) : null}
        </section>
      </div>

      <section className="panel powerbi-card">
        <div>
          <span className="eyebrow">Medidas sugeridas</span>
          <h2>Qué construir en Power BI</h2>
          <p>
            Con <strong>monthly</strong> crea un gráfico de columnas por mes; con{' '}
            <strong>daily</strong> una línea de tokens; con <strong>byService</strong>{' '}
            un gráfico de anillos; con <strong>byUser</strong> una tabla. Los filtros de
            fecha y servicio usan los parámetros de la URL y se pueden parametrizar en
            Power Query.
          </p>
        </div>
        <div className="rule-grid">
          <article className="rule-card">
            <span className="rule-icon">
              <Icon name="gauge" size={19} />
            </span>
            <strong>Consumo total</strong>
            <p>Suma de tokens por periodo, separando entrada y salida.</p>
          </article>
          <article className="rule-card">
            <span className="rule-icon">
              <Icon name="check" size={19} />
            </span>
            <strong>Tasa de éxito</strong>
            <p>Solicitudes exitosas sobre el total, con bloqueos visibles.</p>
          </article>
          <article className="rule-card">
            <span className="rule-icon">
              <Icon name="users" size={19} />
            </span>
            <strong>Uso por usuario</strong>
            <p>Ranking de tokens y solicitudes para detectar cuotas al límite.</p>
          </article>
          <article className="rule-card">
            <span className="rule-icon">
              <Icon name="clock" size={19} />
            </span>
            <strong>Latencia media</strong>
            <p>Comparación entre chat y agentes para el monitoreo técnico.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
