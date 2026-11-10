import { useEffect, useMemo, useState } from 'react';
import Layout from './components/Layout.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import ItineraryPage from './pages/ItineraryPage.jsx';
import ComparePage from './pages/ComparePage.jsx';
import RunsPage from './pages/RunsPage.jsx';
import UsagePage from './pages/UsagePage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import PowerBiPage from './pages/PowerBiPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import './App.css';

const VIEWS = [
  'dashboard',
  'catalog',
  'chat',
  'itinerary',
  'compare',
  'runs',
  'usage',
  'analytics',
  'powerbi',
  'admin',
];

function readViewFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  return VIEWS.includes(raw) ? raw : 'dashboard';
}

function SplashScreen() {
  return (
    <div className="splash-screen">
      <span className="brand-mark large">R</span>
      <strong>RutaIA</strong>
      <span className="spinner" />
      <p>Preparando tu sesión…</p>
    </div>
  );
}

function AppContent() {
  const { user, booting, isAdmin } = useAuth();
  const [view, setView] = useState(readViewFromHash);
  const [catalogFocus, setCatalogFocus] = useState(null);
  const [focusRunId, setFocusRunId] = useState(null);

  useEffect(() => {
    const onHashChange = () => {
      const next = readViewFromHash();
      setView(next);

      if (next !== 'catalog') {
        setCatalogFocus(null);
      }

      if (next !== 'runs') {
        setFocusRunId(null);
      }
    };

    window.addEventListener('hashchange', onHashChange);

    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/dashboard');
    }

    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  const navigate = (nextView, options = {}) => {
    const adminOnly =
      nextView === 'admin' || nextView === 'analytics' || nextView === 'powerbi';
    const safeView = adminOnly && !isAdmin ? 'dashboard' : nextView;
    setView(safeView);
    setCatalogFocus(options.destinationId ?? null);
    setFocusRunId(options.runId ?? null);

    if (window.location.hash !== `#/${safeView}`) {
      window.location.hash = `#/${safeView}`;
    }
  };

  const safeView = useMemo(
    () =>
      (view === 'admin' || view === 'analytics' || view === 'powerbi') && !isAdmin
        ? 'dashboard'
        : view,
    [view, isAdmin],
  );

  if (booting) {
    return <SplashScreen />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout view={safeView} onNavigate={navigate}>
      {safeView === 'dashboard' ? (
        <DashboardPage onNavigate={navigate} />
      ) : null}
      {safeView === 'catalog' ? (
        <CatalogPage focusDestinationId={catalogFocus} />
      ) : null}
      {safeView === 'chat' ? <ChatPage /> : null}
      {safeView === 'itinerary' ? (
        <ItineraryPage onNavigate={navigate} />
      ) : null}
      {safeView === 'compare' ? (
        <ComparePage onNavigate={navigate} />
      ) : null}
      {safeView === 'runs' ? <RunsPage focusRunId={focusRunId} /> : null}
      {safeView === 'usage' ? <UsagePage onNavigate={navigate} /> : null}
      {safeView === 'analytics' && isAdmin ? (
        <AnalyticsPage onNavigate={navigate} />
      ) : null}
      {safeView === 'powerbi' && isAdmin ? <PowerBiPage /> : null}
      {safeView === 'admin' && isAdmin ? <AdminPage /> : null}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
