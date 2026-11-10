import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { EmptyState, InlineAlert, LoadingState } from '../../components/States.jsx';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { formatCurrency, formatNumber } from '../../utils/format.js';

const EMPTY_FORM = {
  destinationId: '',
  name: '',
  description: '',
  category: '',
  durationMin: 0,
  price: 0,
  lat: '',
  lng: '',
  active: true,
};

export default function ActivitiesTab() {
  const { token } = useAuth();
  const { push } = useToast();
  const [activities, setActivities] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    destinationId: '',
    active: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebouncedValue(filters.search, 350);

  useEffect(() => {
    if (!token) {
      return;
    }

    api.destinations
      .list({ limit: 100 }, token)
      .then((result) => setDestinations(result.data))
      .catch(() => setDestinations([]));
  }, [token]);

  const load = () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    api.activities
      .list(
        {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          destinationId: filters.destinationId || undefined,
          active: filters.active || undefined,
        },
        token,
      )
      .then((result) => {
        setActivities(result.data);
        setPagination(result.pagination);
      })
      .catch((requestError) => {
        setError(requestError.message);
        setActivities([]);
        setPagination(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, debouncedSearch, filters.destinationId, filters.active]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      destinationId: filters.destinationId || destinations[0]?.id || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (activity) => {
    setEditing(activity);
    setForm({
      destinationId: activity.destinationId,
      name: activity.name,
      description: activity.description,
      category: activity.category,
      durationMin: activity.durationMin,
      price: activity.price,
      lat: activity.lat ?? '',
      lng: activity.lng ?? '',
      active: activity.active,
    });
    setFormError('');
    setModalOpen(true);
  };

  const update = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    const body = {
      destinationId: Number(form.destinationId),
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      durationMin: Number(form.durationMin),
      price: Number(form.price),
      lat: form.lat === '' ? null : Number(form.lat),
      lng: form.lng === '' ? null : Number(form.lng),
      active: form.active,
    };

    try {
      if (editing) {
        await api.activities.update(editing.id, body, token);
        push('Actividad actualizada y RAG sincronizado.');
      } else {
        await api.activities.create(body, token);
        push('Actividad creada y agregada al RAG.');
      }

      setModalOpen(false);
      load();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (activity) => {
    if (
      !window.confirm(
        `¿Desactivar la actividad "${activity.name}"? Dejará de aparecer en el catálogo.`,
      )
    ) {
      return;
    }

    try {
      await api.activities.remove(activity.id, token);
      push('Actividad desactivada.');
      load();
    } catch (requestError) {
      push(requestError.message, 'error');
    }
  };

  return (
    <div className="admin-tab">
      <div className="admin-tab-head">
        <div>
          <h2>Actividades</h2>
          <p>
            Gestiona la oferta de cada destino. El RAG se actualiza al guardar cambios.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Icon name="plus" size={17} /> Nueva actividad
        </button>
      </div>

      <div className="admin-filters">
        <label className="search-box">
          <Icon name="search" size={16} />
          <input
            className="input search-input"
            type="search"
            placeholder="Buscar actividad…"
            value={filters.search}
            onChange={(event) => {
              setFilters((current) => ({ ...current, search: event.target.value }));
              setPage(1);
            }}
          />
        </label>
        <select
          className="select"
          value={filters.destinationId}
          onChange={(event) => {
            setFilters((current) => ({
              ...current,
              destinationId: event.target.value,
            }));
            setPage(1);
          }}
        >
          <option value="">Todos los destinos</option>
          {destinations.map((destination) => (
            <option key={destination.id} value={destination.id}>
              {destination.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={filters.active}
          onChange={(event) => {
            setFilters((current) => ({ ...current, active: event.target.value }));
            setPage(1);
          }}
        >
          <option value="">Todos los estados</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </select>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setFilters({ search: '', destinationId: '', active: '' });
            setPage(1);
          }}
        >
          <Icon name="refresh" size={15} /> Limpiar
        </button>
      </div>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      {loading ? (
        <LoadingState label="Cargando actividades…" />
      ) : activities.length === 0 ? (
        <EmptyState
          icon="sparkles"
          title="No hay actividades con esos filtros"
          message="Cambia la búsqueda o crea una nueva actividad."
        />
      ) : (
        <>
          <div className="admin-table-wrap panel">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Actividad</th>
                  <th>Destino</th>
                  <th>Categoría</th>
                  <th>Duración</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th className="align-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>
                      <div className="table-activity">
                        <strong>{activity.name}</strong>
                        <small>#{activity.id}</small>
                      </div>
                    </td>
                    <td>
                      {activity.destinationName}
                      <small className="table-sub">{activity.destinationRegion}</small>
                    </td>
                    <td>{activity.category}</td>
                    <td>
                      {activity.durationMin > 0
                        ? `${formatNumber(activity.durationMin)} min`
                        : 'Libre'}
                    </td>
                    <td>{formatCurrency(activity.price)}</td>
                    <td>
                      <span
                        className={`badge ${activity.active ? 'badge-success' : 'badge-muted'}`}
                      >
                        {activity.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Editar actividad"
                          onClick={() => openEdit(activity)}
                        >
                          <Icon name="edit" size={17} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Desactivar actividad"
                          onClick={() => deactivate(activity)}
                          disabled={!activity.active}
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onChange={setPage} />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar actividad' : 'Nueva actividad'}
        subtitle="La actividad se agrega al documento RAG del destino al guardar."
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
              form="activity-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? <span className="spinner spinner-light" /> : null}
              {editing ? 'Guardar cambios' : 'Crear actividad'}
            </button>
          </div>
        }
      >
        <form id="activity-form" className="form-stack" onSubmit={save}>
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

          <div className="form-grid two">
            <label className="field">
              <span>Nombre</span>
              <input
                className="input"
                value={form.name}
                onChange={update('name')}
                minLength="2"
                maxLength="180"
                required
              />
            </label>
            <label className="field">
              <span>Categoría</span>
              <input
                className="input"
                value={form.category}
                onChange={update('category')}
                minLength="2"
                maxLength="80"
                placeholder="Tour, gastronomía, naturaleza…"
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Descripción</span>
            <textarea
              className="textarea"
              rows="4"
              value={form.description}
              onChange={update('description')}
              minLength="10"
              maxLength="5000"
              required
            />
          </label>

          <div className="form-grid two">
            <label className="field">
              <span>Duración (minutos)</span>
              <input
                className="input"
                type="number"
                min="0"
                max="65535"
                value={form.durationMin}
                onChange={update('durationMin')}
                required
              />
            </label>
            <label className="field">
              <span>Precio por persona (GTQ)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="1000"
                value={form.price}
                onChange={update('price')}
                required
              />
            </label>
          </div>

          <div className="form-grid two">
            <label className="field">
              <span>Latitud (opcional)</span>
              <input
                className="input"
                type="number"
                step="any"
                min="-90"
                max="90"
                value={form.lat}
                onChange={update('lat')}
              />
            </label>
            <label className="field">
              <span>Longitud (opcional)</span>
              <input
                className="input"
                type="number"
                step="any"
                min="-180"
                max="180"
                value={form.lng}
                onChange={update('lng')}
              />
            </label>
          </div>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={form.active}
              onChange={update('active')}
            />
            <span>
              <strong>Actividad activa</strong>
              <small>Si se desactiva, no se mostrará en el catálogo ni en el RAG.</small>
            </span>
          </label>

          {formError ? <InlineAlert tone="danger">{formError}</InlineAlert> : null}
        </form>
      </Modal>
    </div>
  );
}
