import Icon from './Icon.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const OPTIONS = [
  { mode: 'light', label: 'Claro', icon: 'sun' },
  { mode: 'dark', label: 'Oscuro', icon: 'moon' },
  { mode: 'system', label: 'Sistema', icon: 'contrast' },
];

export default function ThemeToggle({ compact = false }) {
  const { mode, theme, changeMode, toggle } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        className="icon-btn"
        onClick={toggle}
        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
      </button>
    );
  }

  return (
    <div className="theme-switch" role="group" aria-label="Tema de la interfaz">
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          className={`theme-switch-btn ${mode === option.mode ? 'active' : ''}`.trim()}
          onClick={() => changeMode(option.mode)}
          title={`Tema ${option.label.toLowerCase()}`}
          aria-pressed={mode === option.mode}
        >
          <Icon name={option.icon} size={16} />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
