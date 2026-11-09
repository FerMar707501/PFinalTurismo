import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';
import { InlineAlert, LoadingState } from '../../components/States.jsx';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatNumber, serviceLabel } from '../../utils/format.js';

const MODEL_OPTIONS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

export default function ServicesTab() {
  const { token } = useAuth();
  const { push } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);

  const load = () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    api.services
      .list(token)
      .then((result) => setServices(result))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openEdit = (service) => {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description,
      model: service.model,
      temperature: service.temperature,
      maxTokens: service.maxTokens,
      systemPrompt: service.systemPrompt ?? '',
      enabled: service.enabled,
    });
    setFormError('');
    setModalOpen(true);
  };

  const update = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggle = async (service) => {
    setToggling(service.code);

    try {
      const updated = await api.services.setStatus(
        service.code,
        !service.enabled,
        token,
      );
      setServices((current) =>
        current.map((item) => (item.code === service.code ? updated : item)),
      );
      push(
        `${service.name} ${updated.enabled ? 'activado' : 'desactivado'}.`,
        updated.enabled ? 'success' : 'info',
      );
    } catch (requestError) {
      push(requestError.message, 'error');
    } finally {
      setToggling(null);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      const updated = await api.services.update(
        editing.code,
        {
          name: form.name.trim(),
          description: form.description.trim(),
          model: form.model.trim(),
          temperature: Number(form.temperature),
          maxTokens: Number(form.maxTokens),
          systemPrompt: form.systemPrompt.trim(),
          enabled: form.enabled,
        },
        token,
      );
      setServices((current) =>
        current.map((item) => (item.code === editing.code ? updated : item)),
      );
      push('Configuración del servicio actualizada.');
      setModalOpen(false);
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Cargando servicios de IA…" />;
  }

  return (
    <div className="admin-tab">
      <div className="admin-tab-head">
        <div>
          <h2>Servicios de IA</h2>
          <p>
            Ajusta modelos y prompts. Desactivar un servicio lo bloquea de inmediato
            para todos los usuarios.
          </p>
        </div>
        <span className="admin-counter">
          {services.filter((service) => service.enabled).length} de {services.length}{' '}
          activos
        </span>
      </div>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <InlineAlert tone="info">
        Los prompts del sistema afectan las siguientes llamadas. Los cambios de modelo
        deben ser compatibles con la API de Groq y el mecanismo de tool calling.
      </InlineAlert>

      <div className="service-admin-grid">
        {services.map((service) => (
          <article
            className={`panel service-admin-card ${service.enabled ? 'enabled' : 'disabled'}`.trim()}
            key={service.code}
          >
            <div className="service-admin-head">
              <div className="service-admin-title">
                <span className="service-admin-icon">
                  <Icon
                    name={
                      service.code === 'chat_rag'
                        ? 'chat'
                        : service.code === 'agent_itinerary'
                          ? 'map'
                          : 'compare'
                    }
                    size={21}
                  />
                </span>
                <div>
                  <strong>{service.name}</strong>
                  <small>{serviceLabel(service.code)} · {service.code}</small>
                </div>
              </div>
              <button
                type="button"
                className={`toggle ${service.enabled ? 'on' : ''}`.trim()}
                onClick={() => toggle(service)}
                disabled={toggling === service.code}
                aria-label={`${service.enabled ? 'Desactivar' : 'Activar'} ${service.name}`}
                aria-pressed={service.enabled}
              >
                <span />
              </button>
            </div>

            <p className="service-admin-desc">{service.description}</p>

            <div className="service-admin-meta">
              <div>
                <span>Modelo</span>
                <strong>{service.model}</strong>
              </div>
              <div>
                <span>Temperatura</span>
                <strong>{service.temperature}</strong>
              </div>
              <div>
                <span>Máx. tokens</span>
                <strong>{formatNumber(service.maxTokens)}</strong>
              </div>
            </div>

            <div className="service-prompt">
              <span>Prompt del sistema</span>
              <p>{service.systemPrompt}</p>
            </div>

            <div className="service-admin-foot">
              <span
                className={`badge ${service.enabled ? 'badge-success' : 'badge-muted'}`}
              >
                {service.enabled ? 'Activo' : 'Desactivado'}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => openEdit(service)}
              >
                <Icon name="edit" size={15} /> Editar
              </button>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar ${editing.name}` : 'Editar servicio'}
        subtitle="La configuración se aplica a todas las ejecuciones posteriores."
        size="lg"
        footer={
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="service-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? <span className="spinner spinner-light" /> : null}
              Guardar configuración
            </button>
          </div>
        }
      >
        {form ? (
          <form id="service-form" className="form-stack" onSubmit={save}>
            <div className="form-grid two">
              <label className="field">
                <span>Nombre</span>
                <input
                  className="input"
                  value={form.name}
                  onChange={update('name')}
                  maxLength="150"
                  required
                />
              </label>
              <label className="field">
                <span>Modelo de Groq</span>
                <input
                  className="input"
                  list="groq-models"
                  value={form.model}
                  onChange={update('model')}
                  required
                />
                <datalist id="groq-models">
                  {MODEL_OPTIONS.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </label>
            </div>

            <label className="field">
              <span>Descripción</span>
              <textarea
                className="textarea"
                rows="2"
                value={form.description}
                onChange={update('description')}
                maxLength="500"
                required
              />
            </label>

            <div className="form-grid two">
              <label className="field">
                <span>Temperatura (0 a 2)</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={form.temperature}
                  onChange={update('temperature')}
                  required
                />
              </label>
              <label className="field">
                <span>Máximo de tokens de salida</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="32768"
                  value={form.maxTokens}
                  onChange={update('maxTokens')}
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>Prompt del sistema</span>
              <textarea
                className="textarea code-textarea"
                rows="9"
                value={form.systemPrompt}
                onChange={update('systemPrompt')}
                minLength="10"
                maxLength="8000"
                required
              />
              <small className="field-hint">
                Define el rol, las restricciones y el formato esperado de la respuesta.
              </small>
            </label>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={update('enabled')}
              />
              <span>
                <strong>Servicio activo</strong>
                <small>
                  Si se desactiva, las llamadas responden con el error
                  SERVICE_DISABLED.
                </small>
              </span>
            </label>

            {formError ? <InlineAlert tone="danger">{formError}</InlineAlert> : null}
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
