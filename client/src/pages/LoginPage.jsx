import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { API_URL } from '../api/client.js';
import { COUNTRY, FACTS } from '../utils/country.js';

function docsUrl() {
  const base = API_URL.replace(/\/api\/?$/, '');
  return `${base}/api/docs`;
}

const REGIONS_SHOWCASE = [
  { icon: 'temple', label: 'Tikal', note: 'Petén' },
  { icon: 'waves', label: 'Atitlán', note: 'Sololá' },
  { icon: 'mountain', label: 'Pacaya', note: 'Escuintla' },
  { icon: 'coffee', label: 'Antigua', note: 'Sacatepéquez' },
];

const DEMO_ACCOUNTS = [
  {
    role: 'admin',
    title: 'Administrador',
    email: 'admin@rutaia.local',
    password: 'Admin123!',
    icon: 'shield',
    hint: 'Catálogo, usuarios y analítica',
  },
  {
    role: 'user',
    title: 'Viajero demo',
    email: 'demo@rutaia.local',
    password: 'Demo123!',
    icon: 'user',
    hint: 'Chat y agentes con cuota',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [factIndex, setFactIndex] = useState(0);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const fillDemo = (account) => {
    setForm({ email: account.email, password: account.password });
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(form.email.trim(), form.password);
    } catch (requestError) {
      setError(
        requestError?.message ??
          'No fue posible iniciar sesión. Revisa tus credenciales.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-stage">
        <header className="login-stage-top">
          <div className="login-brand">
            <span className="brand-mark large">R</span>
            <div>
              <strong>RutaIA</strong>
              <small>Turismo inteligente · {COUNTRY.name}</small>
            </div>
          </div>
          <ThemeToggle compact />
        </header>

        <div className="login-stage-copy">
          <span className="login-pill">
            <Icon name="sparkles" size={14} />
            Proyecto final · Programación Comercial
          </span>
          <h1>
            Recorre Guatemala con una IA que conoce cada departamento.
          </h1>
          <p className="login-lead">
            Del lago de Atitlán a Tikal, del altiplano volcánico a la costa del
            Pacífico: un asistente con RAG y dos agentes multi-paso que consultan
            catálogo, clima y rutas reales.
          </p>

          <ul className="login-highlights">
            {REGIONS_SHOWCASE.map((item) => (
              <li key={item.label}>
                <span className="login-highlight-icon">
                  <Icon name={item.icon} size={18} />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="login-fact"
            onClick={() => setFactIndex((index) => (index + 1) % FACTS.length)}
            title="Ver otro dato"
          >
            <Icon name="info" size={16} />
            <span>{FACTS[factIndex]}</span>
            <Icon name="refresh" size={14} />
          </button>
        </div>

        <footer className="login-stage-foot">
          <span>
            <Icon name="globe" size={14} /> Open-Meteo · OSRM · Wikipedia
          </span>
          <span>
            <Icon name="bot" size={14} /> Groq tool calling
          </span>
        </footer>

        <div className="login-contours" aria-hidden="true">
          <span className="contour c1" />
          <span className="contour c2" />
          <span className="contour c3" />
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card-head">
            <span className="login-card-icon">
              <Icon name="key" size={20} />
            </span>
            <div>
              <h2>Inicia sesión</h2>
              <p>Accede con la cuenta asignada por el administrador.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <label className="field">
              <span>Correo electrónico</span>
              <div className="input-with-icon">
                <Icon name="user" size={17} />
                <input
                  className="input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="tu.correo@rutaia.local"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="field">
              <span>Contraseña</span>
              <div className="input-with-icon">
                <Icon name="key" size={17} />
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={update('password')}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Icon name={showPassword ? 'close' : 'search'} size={15} />
                </button>
              </div>
            </label>

            {error ? (
              <div className="inline-alert alert-danger" role="alert">
                <Icon name="alert" size={18} />
                <div>{error}</div>
              </div>
            ) : null}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner spinner-light" /> Ingresando…
                </>
              ) : (
                <>
                  Entrar a RutaIA
                  <Icon name="arrowRight" size={18} />
                </>
              )}
            </button>
          </form>

          <div className="demo-box">
            <span className="demo-label">Cuentas de demostración</span>
            <div className="demo-actions">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  className="demo-btn"
                  onClick={() => fillDemo(account)}
                >
                  <span className={`demo-avatar demo-avatar-${account.role}`}>
                    <Icon name={account.icon} size={16} />
                  </span>
                  <span>
                    <strong>{account.title}</strong>
                    <small>{account.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="login-note">
            No hay registro público. Las cuentas y los límites de tokens los gestiona
            un administrador.{' '}
            <a href={docsUrl()} target="_blank" rel="noreferrer">
              Ver API
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
