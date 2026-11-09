import Icon from './Icon.jsx';

export function LoadingState({ label = 'Cargando información…', compact = false }) {
  return (
    <div className={`loading-state ${compact ? 'loading-compact' : ''}`.trim()}>
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  icon = 'compass',
  title = 'Todavía no hay información',
  message,
  action,
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

export function InlineAlert({ tone = 'info', title, children }) {
  return (
    <div className={`inline-alert alert-${tone}`} role="alert">
      <Icon
        name={tone === 'danger' ? 'alert' : tone === 'success' ? 'check' : 'info'}
        size={19}
      />
      <div>
        {title ? <strong>{title}</strong> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}
