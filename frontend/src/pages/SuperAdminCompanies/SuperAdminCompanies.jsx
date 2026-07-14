import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  activateCompany,
  getCompanies,
  suspendCompany
} from '../../services/superAdmin.service';
import { formatDate, formatMoney } from '../../utils/formatters';
import '../SuperAdminDashboard/SuperAdminDashboard.css';

function getStatusLabel(status) {
  if (status === 'active') return 'Active';
  if (status === 'suspended') return 'Suspendue';
  if (status === 'inactive') return 'Inactive';
  return status || '—';
}

export default function SuperAdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    page: 1,
    limit: 20
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionId, setActionId] = useState(null);

  async function loadCompanies(nextFilters = filters) {
    setLoading(true);
    setError('');

    try {
      const params = {
        page: nextFilters.page,
        limit: nextFilters.limit
      };

      if (nextFilters.search.trim()) {
        params.search = nextFilters.search.trim();
      }

      if (nextFilters.status) {
        params.status = nextFilters.status;
      }

      const response = await getCompanies(params);
      setCompanies(response.data || []);
      setMeta(response.meta || { page: 1, limit: 20, total: 0 });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger la liste des entreprises.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.status, filters.limit]);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: name === 'page' ? Number(value) || 1 : 1
    }));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
    loadCompanies({ ...filters, page: 1 });
  }

  async function handleSuspend(company) {
    if (
      !window.confirm(
        `Suspendre « ${company.company_name} » ? Ses utilisateurs ne pourront plus se connecter.`
      )
    ) {
      return;
    }

    setActionId(company.id);
    setError('');
    setSuccess('');

    try {
      const response = await suspendCompany(company.id);
      setSuccess(response.message || 'Entreprise suspendue.');
      await loadCompanies(filters);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de suspendre l’entreprise.'
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleActivate(company) {
    setActionId(company.id);
    setError('');
    setSuccess('');

    try {
      const response = await activateCompany(company.id);
      setSuccess(response.message || 'Entreprise activée.');
      await loadCompanies(filters);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible d’activer l’entreprise.'
      );
    } finally {
      setActionId(null);
    }
  }

  const totalPages = Math.max(
    1,
    Math.ceil((meta.total || 0) / (meta.limit || 20))
  );

  return (
    <div className="super-admin-page">
      <div className="super-admin-page-header">
        <div>
          <h1>Entreprises</h1>
          <p>Liste globale des entreprises inscrites sur la plateforme.</p>
        </div>
      </div>

      {error ? <div className="super-admin-alert error">{error}</div> : null}
      {success ? <div className="super-admin-alert success">{success}</div> : null}

      <section className="super-admin-panel">
        <form className="super-admin-filters" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Rechercher par nom, email ou téléphone"
          />

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actives</option>
            <option value="suspended">Suspendues</option>
            <option value="inactive">Inactives</option>
          </select>

          <button type="submit" className="super-admin-btn">
            Rechercher
          </button>
        </form>

        <div className="super-admin-table-wrap">
          <table className="super-admin-table">
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Contact</th>
                <th>Statut</th>
                <th>Utilisateurs</th>
                <th>Clients</th>
                <th>Factures</th>
                <th>Total facturé</th>
                <th>Solde</th>
                <th>Création</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10">Chargement...</td>
                </tr>
              ) : null}

              {!loading && companies.length === 0 ? (
                <tr>
                  <td colSpan="10">Aucune entreprise trouvée.</td>
                </tr>
              ) : null}

              {!loading &&
                companies.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <strong>{company.company_name}</strong>
                    </td>
                    <td>
                      <div>{company.company_email || '—'}</div>
                      <small className="super-admin-muted">
                        {company.company_phone || '—'}
                      </small>
                    </td>
                    <td>
                      <span
                        className={`super-admin-badge ${
                          company.status === 'active'
                            ? 'active'
                            : company.status === 'suspended'
                              ? 'suspended'
                              : 'inactive'
                        }`}
                      >
                        {getStatusLabel(company.status)}
                      </span>
                    </td>
                    <td>{company.users_count ?? 0}</td>
                    <td>{company.clients_count ?? 0}</td>
                    <td>{company.invoices_count ?? 0}</td>
                    <td>{formatMoney(company.total_invoiced)}</td>
                    <td>{formatMoney(company.total_balance_due)}</td>
                    <td>{formatDate(company.created_at)}</td>
                    <td>
                      <div className="super-admin-row-actions">
                        <Link
                          to={`/super-admin/companies/${company.id}`}
                          className="super-admin-btn ghost"
                        >
                          Voir détail
                        </Link>

                        {company.status === 'active' ? (
                          <button
                            type="button"
                            className="super-admin-btn danger"
                            disabled={actionId === company.id}
                            onClick={() => handleSuspend(company)}
                          >
                            Suspendre
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="super-admin-btn"
                            disabled={actionId === company.id}
                            onClick={() => handleActivate(company)}
                          >
                            Activer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="super-admin-pagination">
          <span>
            {meta.total || 0} entreprise{(meta.total || 0) > 1 ? 's' : ''} · page{' '}
            {meta.page || 1}/{totalPages}
          </span>
          <div className="super-admin-pagination-actions">
            <button
              type="button"
              className="super-admin-btn ghost"
              disabled={(meta.page || 1) <= 1 || loading}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: Math.max(1, prev.page - 1)
                }))
              }
            >
              Précédent
            </button>
            <button
              type="button"
              className="super-admin-btn ghost"
              disabled={(meta.page || 1) >= totalPages || loading}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: prev.page + 1
                }))
              }
            >
              Suivant
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
