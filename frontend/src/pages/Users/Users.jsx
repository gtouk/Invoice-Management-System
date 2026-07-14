import { useEffect, useMemo, useState } from 'react';
import {
  createUser,
  disableUser,
  getUsers,
  reactivateUser,
  updateUser,
  updateUserPassword
} from '../../services/user.service';
import './Users.css';
import { formatDateTime } from '../../utils/formatters';

const emptyForm = {
  full_name: '',
  email: '',
  username: '',
  phone: '',
  password: '',
  role: 'employee'
};

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function getRoleLabel(role) {
  const labels = {
    admin: 'Administrateur',
    company_admin: 'Administrateur entreprise',
    employee: 'Employé',
    client: 'Client'
  };

  return labels[role] || role || '-';
}

function getStatusLabel(status) {
  const labels = {
    actif: 'Actif',
    desactive: 'Désactivé',
    archive: 'Archivé'
  };

  return labels[status] || status || '-';
}

export default function Users() {
  const currentUser = useMemo(() => getCurrentUser(), []);

  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    role: '',
    page: 1,
    limit: 20
  });

  const [form, setForm] = useState(emptyForm);
  const [passwordForm, setPasswordForm] = useState({
    userId: null,
    password: ''
  });

  const [editingUserId, setEditingUserId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadUsers(nextFilters = filters) {
    setIsLoading(true);
    setError('');

    try {
      const response = await getUsers(nextFilters);

      setUsers(response.data || []);
      setMeta(response.meta || {
        page: 1,
        limit: 20,
        total: 0
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger les utilisateurs.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function updateFilter(name, value) {
    const nextFilters = {
      ...filters,
      [name]: value,
      page: 1
    };

    setFilters(nextFilters);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    loadUsers(filters);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingUserId(null);
    setPasswordForm({
      userId: null,
      password: ''
    });
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
    setMessage('');
    setError('');
  }

  function openEditForm(user) {
    setEditingUserId(user.id);
    setForm({
      full_name: user.full_name || '',
      email: user.email || '',
      username: user.username || '',
      phone: user.phone || '',
      password: '',
      role: 'employee'
    });
    setIsFormOpen(true);
    setMessage('');
    setError('');
  }

  function closeForm() {
    setIsFormOpen(false);
    resetForm();
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handlePasswordChange(event) {
    setPasswordForm((current) => ({
      ...current,
      password: event.target.value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setIsSaving(true);
    setMessage('');
    setError('');

    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        username: form.username,
        phone: form.phone,
        role: 'employee'
      };

      if (editingUserId) {
        await updateUser(editingUserId, payload);
        setMessage('Utilisateur mis à jour avec succès.');
      } else {
        await createUser({
          ...payload,
          password: form.password
        });
        setMessage('Employé créé avec succès.');
      }

      closeForm();
      await loadUsers();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(' '));
      } else {
        setError(
          err.response?.data?.message ||
            'Impossible d’enregistrer l’utilisateur.'
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    if (!passwordForm.userId) return;

    setIsPasswordSaving(true);
    setMessage('');
    setError('');

    try {
      await updateUserPassword(passwordForm.userId, {
        password: passwordForm.password
      });

      setPasswordForm({
        userId: null,
        password: ''
      });

      setMessage('Mot de passe mis à jour avec succès.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de mettre à jour le mot de passe.'
      );
    } finally {
      setIsPasswordSaving(false);
    }
  }

  async function handleDisable(user) {
    if (user.id === currentUser?.id) {
      setError('Vous ne pouvez pas désactiver votre propre compte.');
      return;
    }

    const confirmed = window.confirm(
      `Voulez-vous vraiment désactiver ${user.full_name} ?`
    );

    if (!confirmed) return;

    setMessage('');
    setError('');

    try {
      await disableUser(user.id);
      setMessage('Utilisateur désactivé avec succès.');
      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de désactiver cet utilisateur.'
      );
    }
  }

  async function handleReactivate(user) {
    setMessage('');
    setError('');

    try {
      await reactivateUser(user.id);
      setMessage('Utilisateur réactivé avec succès.');
      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de réactiver cet utilisateur.'
      );
    }
  }

  function goToPage(page) {
    const nextFilters = {
      ...filters,
      page
    };

    setFilters(nextFilters);
    loadUsers(nextFilters);
  }

  const totalPages = Math.max(
    Math.ceil((meta.total || 0) / (meta.limit || 20)),
    1
  );

  return (
    <div className="page-stack users-page">
      <div className="page-header">
        <div>
          <h1>Utilisateurs</h1>
          <p>
            Gérez les employés de votre entreprise. Les utilisateurs sont isolés
            par entreprise.
          </p>
        </div>

        <button type="button" onClick={openCreateForm}>
          Nouvel employé
        </button>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <section className="panel users-filters-panel">
        <form onSubmit={handleSearchSubmit} className="users-filters">
          <label>
            Recherche
            <input
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Nom, email, username, téléphone..."
            />
          </label>

          <label>
            Statut
            <select
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
            >
              <option value="">Tous</option>
              <option value="actif">Actif</option>
              <option value="desactive">Désactivé</option>
            </select>
          </label>

          <label>
            Rôle
            <select
              value={filters.role}
              onChange={(event) => updateFilter('role', event.target.value)}
            >
              <option value="">Tous</option>
              <option value="admin">Admin</option>
              <option value="company_admin">Admin entreprise</option>
              <option value="employee">Employé</option>
            </select>
          </label>

          <div className="users-filter-actions">
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Chargement...' : 'Rechercher'}
            </button>

            <button
              type="button"
              className="secondary"
              onClick={() => {
                const resetFilters = {
                  search: '',
                  status: '',
                  role: '',
                  page: 1,
                  limit: 20
                };

                setFilters(resetFilters);
                loadUsers(resetFilters);
              }}
            >
              Réinitialiser
            </button>
          </div>
        </form>
      </section>

      {isFormOpen && (
        <section className="panel user-form-panel">
          <div className="section-header">
            <div>
              <h2>
                {editingUserId ? 'Modifier un employé' : 'Créer un employé'}
              </h2>
              <p>
                Pour cette version, seuls les comptes employés peuvent être
                créés depuis cette interface.
              </p>
            </div>

            <button type="button" className="secondary" onClick={closeForm}>
              Fermer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="user-form">
            <label>
              Nom complet *
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleFormChange}
                required
              />
            </label>

            <label>
              Email *
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleFormChange}
                required
              />
            </label>

            <label>
              Nom d’utilisateur *
              <input
                name="username"
                value={form.username}
                onChange={handleFormChange}
                required
              />
            </label>

            <label>
              Téléphone
              <input
                name="phone"
                value={form.phone}
                onChange={handleFormChange}
              />
            </label>

            {!editingUserId && (
              <label>
                Mot de passe *
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleFormChange}
                  required
                  minLength={6}
                />
              </label>
            )}

            <label>
              Rôle
              <select
                name="role"
                value={form.role}
                onChange={handleFormChange}
              >
                <option value="employee">Employé</option>
                {currentUser?.role === 'company_admin' ? (
                  <>
                    <option value="admin">Administrateur</option>
                    <option value="company_admin">Admin entreprise</option>
                  </>
                ) : null}
              </select>
            </label>

            <div className="form-actions">
              <button type="button" className="secondary" onClick={closeForm}>
                Annuler
              </button>

              <button type="submit" disabled={isSaving}>
                {isSaving
                  ? 'Enregistrement...'
                  : editingUserId
                    ? 'Mettre à jour'
                    : 'Créer l’employé'}
              </button>
            </div>
          </form>
        </section>
      )}

      {passwordForm.userId && (
        <section className="panel password-panel">
          <div className="section-header">
            <div>
              <h2>Changer le mot de passe</h2>
              <p>
                Définissez un nouveau mot de passe temporaire pour cet
                utilisateur.
              </p>
            </div>

            <button
              type="button"
              className="secondary"
              onClick={() => setPasswordForm({ userId: null, password: '' })}
            >
              Fermer
            </button>
          </div>

          <form onSubmit={handlePasswordSubmit} className="password-form">
            <label>
              Nouveau mot de passe *
              <input
                type="password"
                value={passwordForm.password}
                onChange={handlePasswordChange}
                required
                minLength={6}
              />
            </label>

            <button type="submit" disabled={isPasswordSaving}>
              {isPasswordSaving ? 'Enregistrement...' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        </section>
      )}

      <section className="panel users-table-panel">
        <div className="section-header">
          <div>
            <h2>Liste des utilisateurs</h2>
            <p>{meta.total || 0} utilisateur(s) trouvé(s)</p>
          </div>

          <button type="button" className="secondary" onClick={() => loadUsers()}>
            Actualiser
          </button>
        </div>

        <div className="users-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Contact</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Dernière connexion</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan="6">
                    {isLoading
                      ? 'Chargement des utilisateurs...'
                      : 'Aucun utilisateur trouvé.'}
                  </td>
                </tr>
              )}

              {users.map((user) => {
                const isCurrentUser = user.id === currentUser?.id;
                const isAdminUser =
                  user.role === 'admin' || user.role === 'company_admin';

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-identity">
                        <div className="user-avatar">
                          {(user.full_name || user.email || '?')
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>{user.full_name}</strong>
                          <span>@{user.username}</span>
                          {isCurrentUser && <small>Compte connecté</small>}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="user-contact">
                        <span>{user.email}</span>
                        <small>{user.phone || '-'}</small>
                      </div>
                    </td>

                    <td>
                      <span className={`role-pill ${user.role}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>

                    <td>
                      <span className={`status-pill ${user.status}`}>
                        {getStatusLabel(user.status)}
                      </span>
                    </td>

                    <td>{formatDateTime(user.last_login_at)}</td>

                    <td>
                      <div className="user-actions">
                        {!isAdminUser && (
                          <>
                            <button
                              type="button"
                              className="small-button"
                              onClick={() => openEditForm(user)}
                            >
                              Modifier
                            </button>

                            <button
                              type="button"
                              className="small-button"
                              onClick={() =>
                                setPasswordForm({
                                  userId: user.id,
                                  password: ''
                                })
                              }
                            >
                              Mot de passe
                            </button>
                          </>
                        )}

                        {user.status === 'actif' ? (
                          <button
                            type="button"
                            className="small-button danger"
                            onClick={() => handleDisable(user)}
                            disabled={isCurrentUser || isAdminUser}
                          >
                            Désactiver
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="small-button success"
                            onClick={() => handleReactivate(user)}
                            disabled={isAdminUser}
                          >
                            Réactiver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="users-pagination">
          <button
            type="button"
            className="secondary"
            disabled={meta.page <= 1}
            onClick={() => goToPage(meta.page - 1)}
          >
            Précédent
          </button>

          <span>
            Page {meta.page || 1} sur {totalPages}
          </span>

          <button
            type="button"
            className="secondary"
            disabled={meta.page >= totalPages}
            onClick={() => goToPage(meta.page + 1)}
          >
            Suivant
          </button>
        </div>
      </section>
    </div>
  );
}