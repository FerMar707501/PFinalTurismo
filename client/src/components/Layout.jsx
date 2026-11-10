import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import QuotaBar from './QuotaBar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { API_URL } from '../api/client.js';
import { initials, roleLabel } from '../utils/format.js';

const MAIN_ITEMS = [
  { view: 'dashboard', label: 'Inicio', icon: 'home' },
  { view: 'catalog', label: 'Explorar destinos', icon: 'compass' },
  { view: 'chat', label: 'Chat RAG', icon: 'chat' },
  { view: 'itinerary', label: 'Planear itinerario', icon: 'map' },
  { view: 'compare', label: 'Comparar destinos', icon: 'compare' },
  { view: 'runs', label: 'Historial de agentes', icon: 'history' },
  { view: 'usage', label: 'Mi consumo', icon: 'gauge' },
];

const ADMIN_ITEMS = [
  { view: 'analytics', label: 'Analítica y Power BI', icon: 'chart' },
  { view: 'powerbi', label: 'Conectar Power BI', icon: 'external' },
  { view: 'admin', label: 'Administración', icon: 'settings' },
];

const TITLES = {
  dashboard: 'Inicio',
  catalog: 'Explorar destinos',
  chat: 'Chat RAG',
  itinerary: 'Planear itinerario',
  compare: 'Comparar destinos',
  runs: 'Historial de agentes',
  usage: 'Mi consumo',
  analytics: 'Analítica',
  powerbi: 'Power BI',
  admin: 'Administración',
};

function docsUrl() {
  const base = API_URL.replace(/\/api\/?$/, '');
  return `${base}/api/docs`;
}

export default function Layout({ view, onNavigate, children }) {
  const { user, quota, logout, isAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [view]);

  const go = (nextView) => {
    onNavigate(nextView);
    setDrawerOpen(false);
  };

  const navButton = (item) => (
    <button
      key={item.view}
      type="button"
      className={`nav-link ${view === item.view ? 'active' : ''}`.trim()}
      onClick={() => go(item.view)}
      title={item.label}
    >
      <Icon name={item.icon} size={19} />
      <span>{item.label}</span>
    </button>
  );

  return (
    <div className="app-shell">
      <div
        className={`sidebar-overlay ${drawerOpen ? 'visible' : ''}`.trim()}
        onClick={() => setDrawerOpen(false)}
        role="presentation"
      />
      <aside className={`sidebar ${drawerOpen ? 'open' : ''}`.trim()}>
        <div className="brand" onClick={() => go('dashboard')} role="presentation">
          <span className="brand-mark">R</span>
          <span className="brand-copy">
            <strong>RutaIA</strong>
            <small>Turismo inteligente</small>
          </span>
        </div>

        <div className="sidebar-scroll">
          <nav className="nav-group" aria-label="Navegación principal">
            <span className="nav-label">Explorar</span>
            {MAIN_ITEMS.map(navButton)}
          </nav>

          {isAdmin ? (
            <nav className="nav-group" aria-label="Administración">
              <span className="nav-label">Gestión</span>
              {ADMIN_ITEMS.map(navButton)}
            </nav>
          ) : null}

          <div className="sidebar-note">
            <span className="note-icon" aria-hidden="true">
              <Icon name="sparkles" size={17} />
            </span>
            <p>
              Combina el catálogo turístico con IA generativa, clima y rutas en tiempo
              real.
            </p>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-row">
            <span className="avatar">{initials(user?.name)}</span>
            <span className="user-copy">
              <strong>{user?.name ?? 'Usuario'}</strong>
              <small>{roleLabel(user?.role)}</small>
            </span>
            <button
              type="button"
              className="icon-btn icon-btn-dark"
              onClick={logout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
          <QuotaBar quota={quota} compact />
          <div className="sidebar-user-actions">
            <button type="button" className="sidebar-mini-link" onClick={() => go('usage')}>
              <Icon name="gauge" size={14} />
              Ver consumo
            </button>
            <a
              className="sidebar-mini-link"
              href={docsUrl()}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="external" size={14} />
              API docs
            </a>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="mobile-topbar">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
          >
            <Icon name="menu" size={21} />
          </button>
          <span className="mobile-brand">
            <span className="brand-mark small">R</span>
            RutaIA
          </span>
          <span className="mobile-title">{TITLES[view] ?? 'RutaIA'}</span>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
