import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'rutaia_token';
const USER_KEY = 'rutaia_user';
const QUOTA_KEY = 'rutaia_quota';

function readStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // El almacenamiento puede estar bloqueado; la sesión sigue en memoria.
  }
}

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readToken());
  const [user, setUser] = useState(() => readStorage(USER_KEY));
  const [quota, setQuotaState] = useState(() => readStorage(QUOTA_KEY));
  const [booting, setBooting] = useState(Boolean(token));

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setQuotaState(null);
    setBooting(false);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(QUOTA_KEY);
    } catch {
      // Sin almacenamiento disponible.
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return undefined;
    }

    let cancelled = false;
    setBooting(true);

    api.auth
      .me(token)
      .then((data) => {
        if (cancelled) {
          return;
        }

        setUser(data.user);
        setQuotaState(data.quota);
        writeStorage(USER_KEY, data.user);
        writeStorage(QUOTA_KEY, data.quota);
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBooting(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, clearSession]);

  useEffect(() => {
    const handler = () => clearSession();
    window.addEventListener('rutaia:unauthorized', handler);
    return () => window.removeEventListener('rutaia:unauthorized', handler);
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    const data = await api.auth.login({ email, password });

    try {
      localStorage.setItem(TOKEN_KEY, data.token);
    } catch {
      // La sesión funciona en memoria aunque no haya localStorage.
    }

    writeStorage(USER_KEY, data.user);
    writeStorage(QUOTA_KEY, data.quota);
    setToken(data.token);
    setUser(data.user);
    setQuotaState(data.quota);
    setBooting(false);

    return data;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshSession = useCallback(async () => {
    if (!token) {
      return null;
    }

    const data = await api.auth.me(token);
    setUser(data.user);
    setQuotaState(data.quota);
    writeStorage(USER_KEY, data.user);
    writeStorage(QUOTA_KEY, data.quota);
    return data;
  }, [token]);

  const setQuota = useCallback((nextQuota) => {
    setQuotaState(nextQuota);
    writeStorage(QUOTA_KEY, nextQuota);
  }, []);

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
    writeStorage(USER_KEY, nextUser);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      quota,
      booting,
      isAdmin: user?.role === 'admin',
      login,
      logout,
      refreshSession,
      setQuota,
      updateUser,
    }),
    [
      token,
      user,
      quota,
      booting,
      login,
      logout,
      refreshSession,
      setQuota,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }

  return context;
}
