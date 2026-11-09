import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { EmptyState, InlineAlert, LoadingState } from '../../components/States.jsx';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import {
  formatDate,
  formatNumber,
  initials,
  roleLabel,
} from '../../utils/format.js';

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'user',
  tokenLimitMonth: 100000,
  active: true,
};

export default function UsersTab() {
  const { token, user: currentUser } = useAuth();
  const { push } = useToast();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', role: '', active: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebouncedValue(filters.search, 350);

  const load = () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    api.users
      .list(
        {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          role: filters.role || undefined,
          active: filters.active || undefined,
        },
        token,
      )
      .then((result) => {
        setUsers(result.data);
        setPagination(result.pagination);
      })
      .catch((requestError) => {
        setError(requestError.message);
        setUsers([]);
        setPagination(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, debouncedSearch, filters.role, filters.active]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      tokenLimitMonth: user.tokenLimitMonth,
      active: user.active,
    });
    setFormError('');
    setModalOpen(true);
  };

  const update = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      if (editing) {
        const body = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          tokenLimitMonth: Number(form.tokenLimitMonth),
          active: form.active,
        };

        if (form.password.trim()) {
          body.password = form.password;
        }

        await api.users.update(editing.id, body, token);
        push('Usuario actualizado correctamente.');
      } else {
        await api.users.create(
          {
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
            tokenLimitMonth: Number(form.tokenLimitMonth),
            active: form.active,
          },
          token,
        );
        push('Usuario creado correctamente.');
      }

      setModalOpen(false);
      load();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (user) => {
    if (user.id === currentUser?.id) {
      push('No puedes desactivar tu propia cuenta.', 'error');
      return;
    }

    if (
      !window.confirm(
        `¿Desactivar la cuenta de ${user.name}? El usuario no podrá iniciar sesión.`,
      )
    ) {
      return;
    }

    try {
      await api.users.remove(user.id, token);
      push('Usuario desactivado.');
      load();
    } catch (requestError) {
      push(requestError.message, 'error');
    }
  };

  return (
    <div className="admin-tab">
      <div className="admin-tab-head">
        <div>
          <h2>Usuarios y cuotas</h2>
          <p>Crea cuentas, asigna roles y define el límite mensual de tokens.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Icon name="plus" size={17} /> Nuevo usuario
        </button>
      </div>

      <div className="admin-filters">
        <label className="search-box">
          <Icon name="search" size={16} />
          <input
            className="input search-input"
            type="search"
            placeholder="Buscar por nombre o correo…"
            value={filters.search}
            onChange={(event) => {
              setFilters((current) => ({ ...current, search: event.target.value }));
              setPage(1);
            }}
          />
        </label>
        <select
          className="select"
          value={filters.role}
          onChange={(event) => {
            setFilters((current) => ({ ...current, role: event.target.value }));
            setPage(1);
          }}
        >
          <option value="">Todos los roles</option>
          <option value="admin">Administrador</option>
          <option value="user">Usuario</option>
        </select>
        <select
          className="select"
          value={filters.active}
          onChange={(event) => {
            setFilters((current) => ({ ...current, active: event.target.value }));
            setPage(1);
          }}
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setFilters({ search: '', role: '', active: '' });
            setPage(1);
          }}
        >
          <Icon name="refresh" size={15} /> Limpiar
        </button>
      </div>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      {loading ? (
        <LoadingState label="Cargando usuarios…" />
      ) : users.length === 0 ? (
        <EmptyState
          icon="users"
          title="No hay usuarios con esos filtros"
          message="Cambia los filtros o crea una nueva cuenta."
        />
      ) : (
        <>
          <div className="admin-table-wrap panel">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Consumo del mes</th>
                  <th>Creado</th>
                  <th className="align-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const used = user.quota?.usedTokens ?? 0;
                  const limit = user.tokenLimitMonth || 0;
                  const percent =
                    limit > 0 ? Math.min(100, (used / limit) * 100) : 100;

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="table-user">
                          <span className="avatar avatar-sm">{initials(user.name)}</span>
                          <div>
                            <strong>{user.name}</strong>
                            <small>{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}`}
                        >
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${user.active ? 'badge-success' : 'badge-muted'}`}
                        >
                          {user.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="table-quota">
                          <div className="table-quota-top">
                            <span>
                              {formatNumber(used)} / {formatNumber(limit)}
                            </span>
                            <strong>{percent.toFixed(0)}%</strong>
                          </div>
                          <div className="mini-progress">
                            <span style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Editar usuario"
                            onClick={() => openEdit(user)}
                          >
                            <Icon name="edit" size={17} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Desactivar usuario"
                            onClick={() => deactivate(user)}
                            disabled={!user.active}
                          >
                            <Icon name="trash" size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onChange={setPage} />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
        subtitle={
          editing
            ? 'Actualiza los datos, el rol o la cuota mensual.'
            : 'La cuenta podrá iniciar sesión con el correo y la contraseña indicados.'
        }
        footer={
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="user-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? <span className="spinner spinner-light" /> : null}
              {editing ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        }
      >
        <form id="user-form" className="form-stack" onSubmit={save}>
          <div className="form-grid two">
            <label className="field">
              <span>Nombre completo</span>
              <input
                className="input"
                value={form.name}
                onChange={update('name')}
                minLength="2"
                maxLength="120"
                required
              />
            </label>
            <label className="field">
              <span>Correo electrónico</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={update('email')}
                required
              />
            </label>
          </div>

          <div className="form-grid two">
            <label className="field">
              <span>Rol</span>
              <select className="select" value={form.role} onChange={update('role')}>
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            <label className="field">
              <span>Límite mensual de tokens</span>
              <input
                className="input"
                type="number"
                min="0"
                max="10000000"
                step="1000"
                value={form.tokenLimitMonth}
                onChange={update('tokenLimitMonth')}
                required
              />
            </label>
          </div>

          <label className="field">
            <span>
              Contraseña {editing ? '(dejar vacío para conservar la actual)' : ''}
            </span>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={update('password')}
              minLength={editing ? undefined : 8}
              maxLength="72"
              required={!editing}
              autoComplete="new-password"
            />
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={form.active}
              onChange={update('active')}
            />
            <span>
              <strong>Cuenta activa</strong>
              <small>Si se desactiva, el usuario no podrá iniciar sesión.</small>
            </span>
          </label>

          {formError ? <InlineAlert tone="danger">{formError}</InlineAlert> : null}
        </form>
      </Modal>
    </div>
  );
}
