import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import QuotaBar from './QuotaBar.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { API_URL } from '../api/client.js';
import { initials, roleLabel } from '../utils/format.js';
import { COUNTRY } from '../utils/country.js';

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

export default function Layout({
  view,
  onNavigate,
  children,
  collapsed = false,
  onToggleCollapsed,
}) {
  const { user, quota, logout, isAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [view]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

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
      title={collapsed ? item.label : undefined}
      aria-current={view === item.view ? 'page' : undefined}
    >
      <span className="nav-icon">
        <Icon name={item.icon} size={19} />
      </span>
      <span className="nav-text">{item.label}</span>
    </button>
  );

  return (
    <div
      className={`app-shell ${collapsed ? 'is-collapsed' : ''}`.trim()}
    >
      <div
        className={`sidebar-overlay ${drawerOpen ? 'visible' : ''}`.trim()}
        onClick={() => setDrawerOpen(false)}
        role="presentation"
      />
      <aside
        className={`sidebar ${drawerOpen ? 'open' : ''}`.trim()}
        aria-label="Navegación principal"
      >
        <div className="sidebar-top">
          <div className="brand" onClick={() => go('dashboard')} role="presentation">
            <span className="brand-mark">R</span>
            <span className="brand-copy">
              <strong>RutaIA</strong>
              <small>{COUNTRY.name}</small>
            </span>
          </div>
          <button
            type="button"
            className="sidebar-collapse icon-btn"
            onClick={onToggleCollapsed}
            title={collapsed ? 'Mostrar menú completo' : 'Ocultar menú'}
            aria-label={collapsed ? 'Mostrar menú completo' : 'Ocultar menú'}
            aria-expanded={!collapsed}
          >
            <Icon
              name={collapsed ? 'chevronsRight' : 'chevronsLeft'}
              size={17}
            />
          </button>
        </div>

        <div className="sidebar-scroll">
          <nav className="nav-group">
            <span className="nav-label">Explorar</span>
            {MAIN_ITEMS.map(navButton)}
          </nav>

          {isAdmin ? (
            <nav className="nav-group">
              <span className="nav-label">Gestión</span>
              {ADMIN_ITEMS.map(navButton)}
            </nav>
          ) : null}

          <div className="sidebar-note">
            <span className="note-icon" aria-hidden="true">
              <Icon name="leaf" size={16} />
            </span>
            <p>
              Catálogo nacional, IA generativa, clima y rutas en tiempo real para
              recorrer Guatemala.
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
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn topbar-menu"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
          >
            <Icon name="menu" size={20} />
          </button>
          <button
            type="button"
            className="icon-btn topbar-collapse"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
            title={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
          >
            <Icon name={collapsed ? 'chevronsRight' : 'chevronsLeft'} size={17} />
          </button>

          <div className="topbar-title">
            <span className="topbar-kicker">{COUNTRY.name}</span>
            <strong>{TITLES[view] ?? 'RutaIA'}</strong>
          </div>

          <div className="topbar-actions">
            <a
              className="topbar-link"
              href={docsUrl()}
              target="_blank"
              rel="noreferrer"
              title="Documentación de la API"
            >
              <Icon name="external" size={15} />
              <span>API docs</span>
            </a>
            <ThemeToggle />
            <div className="user-menu" ref={menuRef}>
              <button
                type="button"
                className="user-chip"
                onClick={() => setMenuOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="avatar avatar-sm">{initials(user?.name)}</span>
                <span className="user-chip-copy">
                  <strong>{user?.name ?? 'Usuario'}</strong>
                  <small>{roleLabel(user?.role)}</small>
                </span>
                <Icon name="chevronDown" size={15} />
              </button>
              {menuOpen ? (
                <div className="user-dropdown" role="menu">
                  <div className="user-dropdown-head">
                    <strong>{user?.name}</strong>
                    <small>{user?.email}</small>
                  </div>
                  <button
                    type="button"
                    className="user-dropdown-item"
                    role="menuitem"
                    onClick={() => go('usage')}
                  >
                    <Icon name="gauge" size={16} /> Mi consumo
                  </button>
                  <button
                    type="button"
                    className="user-dropdown-item"
                    role="menuitem"
                    onClick={logout}
                  >
                    <Icon name="logout" size={16} /> Cerrar sesión
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
