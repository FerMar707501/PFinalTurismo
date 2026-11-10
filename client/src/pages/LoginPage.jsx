import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import BrandMark from '../components/BrandMark.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { API_URL } from '../api/client.js';
import { COUNTRY } from '../utils/country.js';

function docsUrl() {
  const base = API_URL.replace(/\/api\/?$/, '');
  return `${base}/api/docs`;
}

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
    <main className="login-page login-page-centered">
      <div className="login-sky" aria-hidden="true">
        <span className="sunset-glow" />
        <span className="sunset-ridge ridge-back" />
        <span className="sunset-ridge ridge-mid" />
        <span className="sunset-ridge ridge-front" />
      </div>

      <div className="login-theme-slot">
        <ThemeToggle compact />
      </div>

      <div className="login-center">
        <header className="login-hero">
          <BrandMark size="xl" className="login-hero-logo" />
          <div className="login-hero-copy">
            <h1 className="login-wordmark">RutaIA</h1>
            <p className="login-tagline">
              Turismo inteligente · {COUNTRY.name}
            </p>
          </div>
        </header>

        <section className="login-card">
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
        </section>
      </div>
    </main>
  );
}
