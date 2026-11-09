import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { API_URL } from '../api/client.js';

function docsUrl() {
  const base = API_URL.replace(/\/api\/?$/, '');
  return `${base}/api/docs`;
}

const FEATURES = [
  {
    icon: 'chat',
    title: 'Chat con RAG',
    text: 'Respuestas basadas en el catálogo real, con memoria y fuentes citadas.',
  },
  {
    icon: 'map',
    title: 'Agentes de viaje',
    text: 'Itinerarios y comparaciones que consultan clima, rutas y actividades.',
  },
  {
    icon: 'shield',
    title: 'Control de consumo',
    text: 'Cuotas mensuales por usuario y trazabilidad completa de cada llamada.',
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

  const fillDemo = (role) => {
    setForm({
      email:
        role === 'admin' ? 'admin@rutaia.local' : 'demo@rutaia.local',
      password: role === 'admin' ? 'Admin123!' : 'Demo123!',
    });
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
      <section className="login-story">
        <div className="login-story-inner">
          <div className="login-brand">
            <span className="brand-mark large">R</span>
            <div>
              <strong>RutaIA</strong>
              <small>Turismo inteligente para Colombia</small>
            </div>
          </div>

          <p className="login-eyebrow">Proyecto final · Programación Comercial</p>
          <h1>
            Descubre Colombia con una IA que conoce el territorio.
          </h1>
          <p className="login-lead">
            Un asistente conversacional, dos agentes multi-paso y un catálogo
            turístico conectado a fuentes abiertas de clima, rutas y cultura.
          </p>

          <div className="login-features">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="login-feature">
                <span className="feature-icon">
                  <Icon name={feature.icon} size={19} />
                </span>
                <div>
                  <strong>{feature.title}</strong>
                  <p>{feature.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="login-story-footer">
            <span>
              <Icon name="globe" size={15} /> Open-Meteo · OSRM · Wikipedia
            </span>
            <span>
              <Icon name="sparkles" size={15} /> Groq tool calling
            </span>
          </div>
        </div>
        <div className="login-orbit orbit-one" />
        <div className="login-orbit orbit-two" />
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card-head">
            <span className="login-card-icon">
              <Icon name="key" size={21} />
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
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
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
              <button type="button" className="demo-btn" onClick={() => fillDemo('admin')}>
                <span className="demo-avatar">A</span>
                <span>
                  <strong>Administrador</strong>
                  <small>admin@rutaia.local</small>
                </span>
              </button>
              <button type="button" className="demo-btn" onClick={() => fillDemo('user')}>
                <span className="demo-avatar demo-avatar-user">U</span>
                <span>
                  <strong>Usuario demo</strong>
                  <small>demo@rutaia.local</small>
                </span>
              </button>
            </div>
          </div>

          <p className="login-note">
            No hay registro público. Las cuentas y los límites de tokens los gestiona
            un administrador. <a href={docsUrl()} target="_blank" rel="noreferrer">Ver API</a>
          </p>
        </div>
      </section>
    </main>
  );
}
