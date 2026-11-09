import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import UsersTab from './admin/UsersTab.jsx';
import DestinationsTab from './admin/DestinationsTab.jsx';
import ActivitiesTab from './admin/ActivitiesTab.jsx';
import ServicesTab from './admin/ServicesTab.jsx';

const TABS = [
  {
    id: 'users',
    label: 'Usuarios',
    icon: 'users',
    description: 'Roles, cuotas y acceso',
  },
  {
    id: 'destinations',
    label: 'Destinos',
    icon: 'compass',
    description: 'Catálogo y RAG',
  },
  {
    id: 'activities',
    label: 'Actividades',
    icon: 'sparkles',
    description: 'Oferta turística',
  },
  {
    id: 'services',
    label: 'Servicios IA',
    icon: 'bot',
    description: 'Modelos y prompts',
  },
];

export default function AdminPage() {
  const [tab, setTab] = useState('users');

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <span className="eyebrow">
            <Icon name="shield" size={14} /> Solo administradores
          </span>
          <h1>Administración</h1>
          <p>
            Gestiona usuarios, cuotas, catálogo y configuración de los servicios de IA
            desde un solo lugar.
          </p>
        </div>
        <div className="page-head-badge">
          <Icon name="settings" size={17} />
          Panel administrativo
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Secciones de administración">
        {TABS.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`admin-tab-btn ${tab === item.id ? 'active' : ''}`.trim()}
            onClick={() => setTab(item.id)}
          >
            <span className="admin-tab-icon">
              <Icon name={item.icon} size={19} />
            </span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </button>
        ))}
      </nav>

      <section className="panel admin-panel">
        {tab === 'users' ? <UsersTab /> : null}
        {tab === 'destinations' ? <DestinationsTab /> : null}
        {tab === 'activities' ? <ActivitiesTab /> : null}
        {tab === 'services' ? <ServicesTab /> : null}
      </section>
    </div>
  );
}
