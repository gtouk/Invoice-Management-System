import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  activateCompany,
  getCompanyById,
  getCompanySummary,
  getCompanyUsers,
  suspendCompany
} from '../../services/superAdmin.service';
import {
  formatDateTime as formatDate,
  formatMoney,
  formatNumber
} from '../../utils/formatters';
import './SuperAdminCompanyDetails.css';

function getStatusLabel(status) {
  if (status === 'active') return 'Active';
  if (status === 'suspended') return 'Suspendue';
  if (status === 'inactive') return 'Inactive';
  return status || '—';
}

function getRoleLabel(role) {
  const labels = {
    admin: 'Administrateur',
    company_admin: 'Admin entreprise',
    employee: 'Employé',
    client: 'Client'
  };
  return labels[role] || role || '—';
}

export default function SuperAdminCompanyDetails() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [companyRes, summaryRes, usersRes] = await Promise.all([
        getCompanyById(id),
        getCompanySummary(id),
        getCompanyUsers(id)
      ]);

      setCompany(companyRes.data || null);
      setSummary(summaryRes.data || null);
      setUsers(usersRes.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger le détail de l’entreprise.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  async function handleSuspend() {
    if (
      !window.confirm(
        `Suspendre « ${company?.company_name} » ? Ses utilisateurs seront bloqués.`
      )
    ) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await suspendCompany(id);
      setSuccess(response.message || 'Entreprise suspendue.');
      await loadDetails();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de suspendre l’entreprise.'
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleActivate() {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await activateCompany(id);
      setSuccess(response.message || 'Entreprise activée.');
      await loadDetails();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible d’activer l’entreprise.'
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="sa-details-page">
        <div className="sa-alert">Chargement...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="sa-details-page">
        <div className="sa-alert error">
          {error || 'Entreprise introuvable.'}
        </div>
        <Link to="/super-admin/companies" className="sa-btn ghost">
          Retour aux entreprises
        </Link>
      </div>
    );
  }

  return (
    <div className="sa-details-page">
      <div className="sa-details-header">
        <div>
          <Link to="/super-admin/companies" className="sa-back-link">
            ← Retour aux entreprises
          </Link>
          <h1>{company.company_name}</h1>
          <p>
            Détail plateforme · inscrite le {formatDate(company.created_at)}
          </p>
        </div>

        <div className="sa-details-actions">
          <button
            type="button"
            className="sa-btn ghost"
            onClick={loadDetails}
            disabled={actionLoading}
          >
            Actualiser
          </button>

          {company.status === 'active' ? (
            <button
              type="button"
              className="sa-btn danger"
              onClick={handleSuspend}
              disabled={actionLoading}
            >
              Suspendre
            </button>
          ) : (
            <button
              type="button"
              className="sa-btn"
              onClick={handleActivate}
              disabled={actionLoading}
            >
              Activer
            </button>
          )}
        </div>
      </div>

      {company.status === 'suspended' ? (
        <div className="sa-alert error">
          Cette entreprise est suspendue. Ses utilisateurs ne peuvent plus
          utiliser la plateforme.
        </div>
      ) : null}

      {error ? <div className="sa-alert error">{error}</div> : null}
      {success ? <div className="sa-alert success">{success}</div> : null}

      <section className="sa-card">
        <div className="sa-card-header">
          <h2>Informations</h2>
          <span
            className={`sa-badge ${
              company.status === 'active'
                ? 'active'
                : company.status === 'suspended'
                  ? 'suspended'
                  : 'inactive'
            }`}
          >
            {getStatusLabel(company.status)}
          </span>
        </div>

        <div className="sa-info-grid">
          <div>
            <span>Email</span>
            <strong>{company.company_email || '—'}</strong>
          </div>
          <div>
            <span>Téléphone</span>
            <strong>{company.company_phone || '—'}</strong>
          </div>
          <div>
            <span>Adresse</span>
            <strong>{company.company_address || '—'}</strong>
          </div>
          <div>
            <span>Site web</span>
            <strong>{company.website || '—'}</strong>
          </div>
          <div>
            <span>Business number</span>
            <strong>{company.business_number || '—'}</strong>
          </div>
          <div>
            <span>GST/HST</span>
            <strong>{company.gst_hst_number || '—'}</strong>
          </div>
          <div>
            <span>QST</span>
            <strong>{company.qst_number || '—'}</strong>
          </div>
          <div>
            <span>Dernière mise à jour</span>
            <strong>{formatDate(company.updated_at)}</strong>
          </div>
        </div>
      </section>

      <section className="sa-stats-grid">
        <div className="sa-stat">
          <span>Utilisateurs</span>
          <strong>{formatNumber(summary?.users_count)}</strong>
        </div>
        <div className="sa-stat">
          <span>Admins</span>
          <strong>{formatNumber(summary?.admins_count)}</strong>
        </div>
        <div className="sa-stat">
          <span>Employés</span>
          <strong>{formatNumber(summary?.employees_count)}</strong>
        </div>
        <div className="sa-stat">
          <span>Clients</span>
          <strong>{formatNumber(summary?.clients_count)}</strong>
        </div>
        <div className="sa-stat">
          <span>Articles</span>
          <strong>{formatNumber(summary?.items_count)}</strong>
        </div>
        <div className="sa-stat">
          <span>Factures</span>
          <strong>{formatNumber(summary?.invoices_count)}</strong>
        </div>
        <div className="sa-stat">
          <span>Total facturé</span>
          <strong>{formatMoney(summary?.total_invoiced)}</strong>
        </div>
        <div className="sa-stat">
          <span>Total payé</span>
          <strong>{formatMoney(summary?.total_paid)}</strong>
        </div>
        <div className="sa-stat">
          <span>Solde</span>
          <strong>{formatMoney(summary?.total_balance_due)}</strong>
        </div>
        <div className="sa-stat">
          <span>Paiements</span>
          <strong>{formatNumber(summary?.payments_count)}</strong>
        </div>
        <div className="sa-stat">
          <span>Relevés bancaires</span>
          <strong>{formatNumber(summary?.bank_statements_count)}</strong>
        </div>
        <div className="sa-stat">
          <span>Commissions</span>
          <strong>{formatNumber(summary?.commissions_count)}</strong>
        </div>
      </section>

      <section className="sa-card">
        <div className="sa-card-header">
          <h2>Utilisateurs de l’entreprise</h2>
        </div>

        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Username</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Dernière connexion</th>
                <th>Créé le</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7">Aucun utilisateur.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.full_name}</td>
                    <td>{user.email || '—'}</td>
                    <td>{user.username || '—'}</td>
                    <td>{getRoleLabel(user.role)}</td>
                    <td>{user.status || '—'}</td>
                    <td>{formatDate(user.last_login_at)}</td>
                    <td>{formatDate(user.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
