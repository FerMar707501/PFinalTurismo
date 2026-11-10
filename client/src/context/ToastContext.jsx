import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Icon from '../components/Icon.jsx';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'success') => {
    const id =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  // Permite notificar desde módulos que no son componentes (por ejemplo el
  // cliente API al descargar un CSV).
  useEffect(() => {
    const handler = (event) => {
      push(event.detail?.message ?? 'Ocurrió un error.', event.detail?.type);
    };

    window.addEventListener('rutaia:toast', handler);
    return () => window.removeEventListener('rutaia:toast', handler);
  }, [push]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.type}`} key={toast.id}>
            <span className="toast-icon" aria-hidden="true">
              <Icon
                name={
                  toast.type === 'error'
                    ? 'alert'
                    : toast.type === 'info'
                      ? 'sparkles'
                      : 'check'
                }
                size={18}
              />
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider.');
  }

  return context;
}
