import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import { EmptyState, InlineAlert, LoadingState } from '../components/States.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import {
  destinationGradient,
  destinationIcon,
  formatCurrency,
  formatNumber,
  priceLevelLabel,
} from '../utils/format.js';
const PRICE_OPTIONS = [
  { value: '', label: 'Todos los precios' },
  { value: '1', label: 'Económico' },
  { value: '2', label: 'Medio' },
  { value: '3', label: 'Alto' },
  { value: '4', label: 'Lujo' },
];

export default function CatalogPage({ focusDestinationId }) {
  const { token, isAdmin } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    region: '',
    category: '',
    priceLevel: '',
  });
  const [page, setPage] = useState(1);
  const [destinations, setDestinations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [options, setOptions] = useState({ regions: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const debouncedSearch = useDebouncedValue(filters.search, 350);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let cancelled = false;

    api.destinations
      .list({ limit: 100, active: 'true' }, token)
      .then((result) => {
        if (cancelled) {
          return;
        }

        const regions = [...new Set(result.data.map((item) => item.region))].sort();
        const categories = [
          ...new Set(result.data.map((item) => item.category)),
        ].sort();
        setOptions({ regions, categories });
      })
      .catch(() => {
        // Los filtros avanzados son opcionales.
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    api.destinations
      .list(
        {
          page,
          limit: 12,
          search: debouncedSearch || undefined,
          region: filters.region || undefined,
          category: filters.category || undefined,
          priceLevel: filters.priceLevel || undefined,
          active: 'true',
        },
        token,
      )
      .then((result) => {
        if (!cancelled) {
          setDestinations(result.data);
          setPagination(result.pagination);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
          setDestinations([]);
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
  }, [
    token,
    page,
    debouncedSearch,
    filters.region,
    filters.category,
    filters.priceLevel,
  ]);

  useEffect(() => {
    if (focusDestinationId) {
      openDestination(focusDestinationId);
    }
    // La navegación desde el inicio solo debe abrir el detalle una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDestinationId]);

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter((value) => String(value).trim() !== '').length,
    [filters],
  );

  const updateFilter = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', region: '', category: '', priceLevel: '' });
    setPage(1);
  };

  async function openDestination(id) {
    setSelected({ id });
    setDetailLoading(true);
    setDetailError('');

    try {
      const detail = await api.destinations.get(id, token);
      setSelected(detail);
    } catch (requestError) {
      setDetailError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <Icon name="compass" size={14} /> Catálogo turístico
          </span>
          <h1>Encuentra tu próximo destino en Guatemala</h1>
          <p>
            Explora el lago de Atitlán, los volcanes del altiplano, las playas del
            Pacífico, la selva de Petén y los pueblos coloniales declarados Patrimonio
            de la Humanidad. Cada ficha incluye actividades, temporada recomendada y
            nivel de precio.
          </p>
        </div>
        <div className="page-head-badge">
          <Icon name="sparkles" size={17} />
          {pagination ? `${formatNumber(pagination.total)} destinos` : 'Catálogo'}
        </div>
      </header>

      <section className="catalog-toolbar">
        <label className="search-box">
          <Icon name="search" size={18} />
          <input
            className="input search-input"
            type="search"
            placeholder="Buscar por nombre, región o descripción…"
            value={filters.search}
            onChange={updateFilter('search')}
          />
        </label>
        <label className="filter-field">
          <span>Región</span>
          <select className="select" value={filters.region} onChange={updateFilter('region')}>
            <option value="">Todas las regiones</option>
            {options.regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Categoría</span>
          <select
            className="select"
            value={filters.category}
            onChange={updateFilter('category')}
          >
            <option value="">Todas las categorías</option>
            {options.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Precio</span>
          <select
            className="select"
            value={filters.priceLevel}
            onChange={updateFilter('priceLevel')}
          >
            {PRICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {activeFilterCount > 0 ? (
          <button type="button" className="btn btn-ghost btn-sm clear-filters" onClick={clearFilters}>
            <Icon name="close" size={15} />
            Limpiar ({activeFilterCount})
          </button>
        ) : null}
      </section>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      {loading ? (
        <LoadingState label="Buscando destinos…" />
      ) : destinations.length === 0 ? (
        <EmptyState
          icon="search"
          title="No encontramos destinos con esos filtros"
          message="Prueba con otra región, categoría o término de búsqueda."
          action={
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Limpiar filtros
            </button>
          }
        />
      ) : (
        <>
          <div className="destination-grid">
            {destinations.map((destination) => (
              <button
                type="button"
                key={destination.id}
                className="destination-card catalog-card"
                onClick={() => openDestination(destination.id)}
              >
                <span
                  className="destination-visual"
                  style={{ background: destinationGradient(destination) }}
                >
                  <span className="destination-icon">
                    <Icon name={destinationIcon(destination)} size={26} />
                  </span>
                  <span className="destination-price">
                    {priceLevelLabel(destination.priceLevel)}
                  </span>
                  <span className="destination-region-overlay">
                    {destination.region}
                  </span>
                </span>
                <span className="destination-body">
                  <span className="destination-region">
                    <Icon name="globe" size={13} /> {destination.region}
                  </span>
                  <strong>{destination.name}</strong>
                  <span className="destination-description">
                    {destination.description}
                  </span>
                  <span className="destination-footer">
                    <span className="mini-meta">
                      <Icon name="sparkles" size={14} />
                      {destination.activityCount} actividades
                    </span>
                    {destination.bestSeason ? (
                      <span className="mini-meta">
                        <Icon name="sun" size={14} />
                        {destination.bestSeason}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <Pagination pagination={pagination} onChange={setPage} />
        </>
      )}

      {isAdmin ? (
        <InlineAlert tone="info">
          Como administrador también puedes crear, editar o desactivar destinos desde
          la sección <strong>Administración</strong>.
        </InlineAlert>
      ) : null}

      <Modal
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setDetailError('');
        }}
        title={selected?.name ?? 'Detalle del destino'}
        subtitle={
          selected?.region
            ? `${selected.region} · ${selected.category}`
            : 'Cargando ficha…'
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
          <LoadingState label="Cargando ficha y actividades…" />
        ) : selected?.description ? (
          <div className="destination-detail">
            <div
              className="detail-hero"
              style={{ background: destinationGradient(selected) }}
            >
              <span className="detail-icon">
                <Icon name={destinationIcon(selected)} size={38} />
              </span>
              <div>
                <span className="detail-region">
                  <Icon name="globe" size={14} /> {selected.region}
                </span>
                <h3>{selected.name}</h3>
                <div className="detail-badges">
                  <span className="badge badge-neutral">{selected.category}</span>
                  <span className="badge badge-neutral">
                    {priceLevelLabel(selected.priceLevel)}
                  </span>
                  {selected.bestSeason ? (
                    <span className="badge badge-neutral">
                      Mejor época: {selected.bestSeason}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <p className="detail-description">{selected.description}</p>

            {selected.tags?.length ? (
              <div className="tag-row">
                {selected.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="detail-section-head">
              <h3>Actividades ({selected.activities?.length ?? 0})</h3>
              <span className="mini-meta">
                <Icon name="clock" size={14} /> Precios por persona
              </span>
            </div>

            {selected.activities?.length ? (
              <div className="activity-list">
                {selected.activities.map((activity) => (
                  <article className="activity-item" key={activity.id}>
                    <span className="activity-bullet">
                      <Icon name="sparkles" size={15} />
                    </span>
                    <div>
                      <div className="activity-title">
                        <strong>{activity.name}</strong>
                        <span>{formatCurrency(activity.price)}</span>
                      </div>
                      <p>{activity.description}</p>
                      <div className="activity-meta">
                        <span className="badge badge-neutral">{activity.category}</span>
                        <span>
                          <Icon name="clock" size={13} />
                          {activity.durationMin > 0
                            ? `${activity.durationMin} min`
                            : 'Duración libre'}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="sparkles"
                title="Sin actividades publicadas"
                message="Este destino todavía no tiene actividades activas."
              />
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
