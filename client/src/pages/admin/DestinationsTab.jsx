import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { EmptyState, InlineAlert, LoadingState } from '../../components/States.jsx';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import {
  destinationGradient,
  destinationIcon,
  formatNumber,
  priceLevelLabel,
} from '../../utils/format.js';

const EMPTY_FORM = {
  name: '',
  region: '',
  category: '',
  description: '',
  tags: '',
  lat: '',
  lng: '',
  priceLevel: 2,
  bestSeason: '',
  active: true,
};

export default function DestinationsTab() {
  const { token } = useAuth();
  const { push } = useToast();
  const [destinations, setDestinations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', active: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebouncedValue(filters.search, 350);

  const load = () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    api.destinations
      .list(
        {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          active: filters.active || undefined,
        },
        token,
      )
      .then((result) => {
        setDestinations(result.data);
        setPagination(result.pagination);
      })
      .catch((requestError) => {
        setError(requestError.message);
        setDestinations([]);
        setPagination(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, debouncedSearch, filters.active]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (destination) => {
    setEditing(destination);
    setForm({
      name: destination.name,
      region: destination.region,
      category: destination.category,
      description: destination.description,
      tags: (destination.tags ?? []).join(', '),
      lat: destination.lat ?? '',
      lng: destination.lng ?? '',
      priceLevel: destination.priceLevel,
      bestSeason: destination.bestSeason ?? '',
      active: destination.active,
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
      name: form.name.trim(),
      region: form.region.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      tags: form.tags.trim(),
      priceLevel: Number(form.priceLevel),
      bestSeason: form.bestSeason.trim() || null,
      active: form.active,
      lat: form.lat === '' ? null : Number(form.lat),
      lng: form.lng === '' ? null : Number(form.lng),
    };

    try {
      if (editing) {
        await api.destinations.update(editing.id, body, token);
        push('Destino actualizado y documentos RAG sincronizados.');
      } else {
        await api.destinations.create(body, token);
        push('Destino creado y agregado al RAG.');
      }

      setModalOpen(false);
      load();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (destination) => {
    if (
      !window.confirm(
        `¿Desactivar "${destination.name}"? Dejará de aparecer en el catálogo y en el RAG.`,
      )
    ) {
      return;
    }

    try {
      await api.destinations.remove(destination.id, token);
      push('Destino desactivado.');
      load();
    } catch (requestError) {
      push(requestError.message, 'error');
    }
  };

  return (
    <div className="admin-tab">
      <div className="admin-tab-head">
        <div>
          <h2>Destinos</h2>
          <p>
            Cada cambio sincroniza automáticamente los documentos usados por el chat
            RAG.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Icon name="plus" size={17} /> Nuevo destino
        </button>
      </div>

      <div className="admin-filters">
        <label className="search-box">
          <Icon name="search" size={16} />
          <input
            className="input search-input"
            type="search"
            placeholder="Buscar destino, región o descripción…"
            value={filters.search}
            onChange={(event) => {
              setFilters((current) => ({ ...current, search: event.target.value }));
              setPage(1);
            }}
          />
        </label>
        <select
          className="select"
          value={filters.active}
          onChange={(event) => {
            setFilters((current) => ({ ...current, active: event.target.value }));
            setPage(1);
          }}
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setFilters({ search: '', active: '' });
            setPage(1);
          }}
        >
          <Icon name="refresh" size={15} /> Limpiar
        </button>
      </div>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      {loading ? (
        <LoadingState label="Cargando destinos…" />
      ) : destinations.length === 0 ? (
        <EmptyState
          icon="compass"
          title="No hay destinos con esos filtros"
          message="Cambia la búsqueda o crea un nuevo destino."
        />
      ) : (
        <>
          <div className="admin-table-wrap panel">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Destino</th>
                  <th>Región</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Actividades</th>
                  <th>Estado</th>
                  <th className="align-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {destinations.map((destination) => (
                  <tr key={destination.id}>
                    <td>
                      <div className="table-destination">
                        <span
                          className="table-thumb"
                          style={{ background: destinationGradient(destination) }}
                        >
                          <Icon name={destinationIcon(destination)} size={17} />
                        </span>
                        <div>
                          <strong>{destination.name}</strong>
                          <small>#{destination.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>{destination.region}</td>
                    <td>{destination.category}</td>
                    <td>{priceLevelLabel(destination.priceLevel)}</td>
                    <td>{formatNumber(destination.activityCount)}</td>
                    <td>
                      <span
                        className={`badge ${destination.active ? 'badge-success' : 'badge-muted'}`}
                      >
                        {destination.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Editar destino"
                          onClick={() => openEdit(destination)}
                        >
                          <Icon name="edit" size={17} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Desactivar destino"
                          onClick={() => deactivate(destination)}
                          disabled={!destination.active}
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
        title={editing ? 'Editar destino' : 'Nuevo destino'}
        subtitle="Los cambios se reflejan en el catálogo público y en la base de conocimiento."
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
              form="destination-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? <span className="spinner spinner-light" /> : null}
              {editing ? 'Guardar cambios' : 'Crear destino'}
            </button>
          </div>
        }
      >
        <form id="destination-form" className="form-stack" onSubmit={save}>
          <div className="form-grid two">
            <label className="field">
              <span>Nombre</span>
              <input
                className="input"
                value={form.name}
                onChange={update('name')}
                minLength="2"
                maxLength="150"
                required
              />
            </label>
            <label className="field">
              <span>Región</span>
              <input
                className="input"
                value={form.region}
                onChange={update('region')}
                minLength="2"
                maxLength="120"
                placeholder="Caribe, Andina, Pacífico…"
                required
              />
            </label>
          </div>

          <div className="form-grid three">
            <label className="field">
              <span>Categoría</span>
              <input
                className="input"
                value={form.category}
                onChange={update('category')}
                minLength="2"
                maxLength="80"
                placeholder="Playa, Café, Selva…"
                required
              />
            </label>
            <label className="field">
              <span>Nivel de precio</span>
              <select
                className="select"
                value={form.priceLevel}
                onChange={update('priceLevel')}
              >
                <option value="1">Económico</option>
                <option value="2">Medio</option>
                <option value="3">Alto</option>
                <option value="4">Lujo</option>
              </select>
            </label>
            <label className="field">
              <span>Mejor temporada</span>
              <input
                className="input"
                value={form.bestSeason}
                onChange={update('bestSeason')}
                maxLength="100"
                placeholder="Dic – Abr"
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

          <label className="field">
            <span>Etiquetas (separadas por coma)</span>
            <input
              className="input"
              value={form.tags}
              onChange={update('tags')}
              maxLength="255"
              placeholder="playa, familia, gastronomía"
            />
          </label>

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
              <strong>Destino activo</strong>
              <small>Si se desactiva, no aparecerá en el catálogo público ni en el RAG.</small>
            </span>
          </label>

          {formError ? <InlineAlert tone="danger">{formError}</InlineAlert> : null}
        </form>
      </Modal>
    </div>
  );
}
