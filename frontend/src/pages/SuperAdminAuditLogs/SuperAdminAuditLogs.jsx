import { useEffect, useMemo, useState } from 'react';
import {
  getCompanies,
  getSuperAdminAuditLogFilterOptions,
  getSuperAdminAuditLogs
} from '../../services/superAdmin.service';
import './SuperAdminAuditLogs.css';
import { formatDateTime } from '../../utils/formatters';

const emptyFilters = {
  company_id: '',
  action: '',
  entity_type: '',
  start_date: '',
  end_date: '',
  page: 1,
  limit: 20
};

function formatMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return '—';
  const entries = Object.entries(metadata);
  if (entries.length === 0) return '—';

  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join(' · ');
}

export default function SuperAdminAuditLogs() {
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [companies, setCompanies] = useState([]);
  const [options, setOptions] = useState({ actions: [], entity_types: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 20))),
    [meta]
  );

  useEffect(() => {
    Promise.all([
      getCompanies({ page: 1, limit: 100 }),
      getSuperAdminAuditLogFilterOptions()
    ])
      .then(([companiesResponse, optionsResponse]) => {
        setCompanies(companiesResponse.data || []);
        setOptions({
          actions: optionsResponse.data?.actions || [],
          entity_types: optionsResponse.data?.entity_types || []
        });
      })
      .catch(() => {
        // non-blocking
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const response = await getSuperAdminAuditLogs(appliedFilters);
        if (cancelled) return;

        setItems(response.data?.items || []);
        setMeta(
          response.data?.meta || {
            page: appliedFilters.page,
            limit: appliedFilters.limit,
            total: 0
          }
        );
      } catch (err) {
        if (cancelled) return;
        setItems([]);
        setError(
          err.response?.data?.message ||
            'Impossible de charger les logs d’audit plateforme.'
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [appliedFilters]);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleSearch(event) {
    event.preventDefault();
    setAppliedFilters({ ...filters, page: 1 });
  }

  function handleReset() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  function goToPage(page) {
    setAppliedFilters((current) => ({ ...current, page }));
    setFilters((current) => ({ ...current, page }));
  }

  return (
    <div className="page-stack sa-audit-page">
      <div className="page-header">
        <div>
          <h1>Audit logs plateforme</h1>
          <p>Journal global des actions cross-entreprises.</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="panel sa-audit-filters-panel">
        <form className="sa-audit-filters" onSubmit={handleSearch}>
          <label>
            Entreprise
            <select
              name="company_id"
              value={filters.company_id}
              onChange={handleFilterChange}
            >
              <option value="">Toutes</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.company_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Action
            <select
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
            >
              <option value="">Toutes</option>
              {options.actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </label>

          <label>
            Entité
            <select
              name="entity_type"
              value={filters.entity_type}
              onChange={handleFilterChange}
            >
              <option value="">Toutes</option>
              {options.entity_types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            Date début
            <input
              type="date"
              name="start_date"
              value={filters.start_date}
              onChange={handleFilterChange}
            />
          </label>

          <label>
            Date fin
            <input
              type="date"
              name="end_date"
              value={filters.end_date}
              onChange={handleFilterChange}
            />
          </label>

          <div className="sa-audit-filter-actions">
            <button type="submit" disabled={isLoading}>
              Rechercher
            </button>
            <button
              type="button"
              className="secondary"
              onClick={handleReset}
              disabled={isLoading}
            >
              Réinitialiser
            </button>
          </div>
        </form>
      </div>

      <div className="panel sa-audit-table-panel">
        <div className="section-header">
          <h2>Logs globaux</h2>
          <p>{meta.total || 0} log(s)</p>
        </div>

        {isLoading ? (
          <p>Chargement…</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Entreprise</th>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Action</th>
                  <th>Entité</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {items.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.created_at)}</td>
                    <td>{log.company_name || '—'}</td>
                    <td>
                      <strong>{log.user_full_name || '—'}</strong>
                      <small>{log.user_email || ''}</small>
                    </td>
                    <td>{log.actor_role || '—'}</td>
                    <td>
                      <code>{log.action}</code>
                    </td>
                    <td>
                      {log.entity_type || '—'}
                      {log.entity_id ? (
                        <small className="muted-id">{log.entity_id}</small>
                      ) : null}
                    </td>
                    <td className="audit-details">
                      {formatMetadata(log.metadata)}
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan="7">Aucun log trouvé.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="sa-audit-pagination">
          <button
            type="button"
            className="secondary"
            disabled={meta.page <= 1 || isLoading}
            onClick={() => goToPage(meta.page - 1)}
          >
            Précédent
          </button>
          <span>
            Page {meta.page || 1} / {totalPages}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={meta.page >= totalPages || isLoading}
            onClick={() => goToPage(meta.page + 1)}
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}
