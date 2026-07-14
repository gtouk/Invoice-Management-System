import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getPlatformStats,
  getSuperAdminAuditLogs
} from '../../services/superAdmin.service';
import {
  formatDateTime,
  formatMoney,
  formatNumber
} from '../../utils/formatters';
import './SuperAdminDashboard.css';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [statsResponse, logsResponse] = await Promise.all([
        getPlatformStats(),
        getSuperAdminAuditLogs({ limit: 5, page: 1 })
      ]);

      setStats(statsResponse.data || null);
      setRecentLogs(logsResponse.data?.items || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger les statistiques plateforme.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="super-admin-page">
      <div className="super-admin-page-header">
        <div>
          <h1>Dashboard Super Admin</h1>
          <p>
            Vue globale de la plateforme SaaS : entreprises, utilisateurs,
            factures et activité.
          </p>
        </div>

        <div className="super-admin-header-actions">
          <button
            type="button"
            className="super-admin-btn ghost"
            onClick={loadStats}
            disabled={loading}
          >
            Actualiser
          </button>
          <Link to="/super-admin/companies" className="super-admin-action-link">
            Entreprises
          </Link>
          <Link to="/super-admin/audit-logs" className="super-admin-action-link">
            Audit logs
          </Link>
        </div>
      </div>

      {error ? <div className="super-admin-alert error">{error}</div> : null}
      {loading ? <div className="super-admin-alert">Chargement…</div> : null}

      <div className="super-admin-stats-grid dense">
        <div className="super-admin-stat-card">
          <span>Entreprises</span>
          <strong>{loading ? '—' : formatNumber(stats?.companies_count)}</strong>
          <small>Total inscrits</small>
        </div>
        <div className="super-admin-stat-card">
          <span>Actives</span>
          <strong>
            {loading ? '—' : formatNumber(stats?.active_companies_count)}
          </strong>
          <small>Entreprises actives</small>
        </div>
        <div className="super-admin-stat-card">
          <span>Suspendues</span>
          <strong>
            {loading ? '—' : formatNumber(stats?.suspended_companies_count)}
          </strong>
          <small>Accès bloqué</small>
        </div>
        <div className="super-admin-stat-card">
          <span>Utilisateurs</span>
          <strong>{loading ? '—' : formatNumber(stats?.users_count)}</strong>
          <small>
            dont {formatNumber(stats?.client_users_count)} clients
          </small>
        </div>
        <div className="super-admin-stat-card">
          <span>Factures</span>
          <strong>{loading ? '—' : formatNumber(stats?.invoices_count)}</strong>
          <small>Toutes entreprises</small>
        </div>
        <div className="super-admin-stat-card">
          <span>Paiements</span>
          <strong>{loading ? '—' : formatNumber(stats?.payments_count)}</strong>
          <small>Transactions enregistrées</small>
        </div>
        <div className="super-admin-stat-card">
          <span>Total facturé</span>
          <strong>{loading ? '—' : formatMoney(stats?.total_invoiced)}</strong>
          <small>Hors annulées</small>
        </div>
        <div className="super-admin-stat-card">
          <span>Total payé</span>
          <strong>{loading ? '—' : formatMoney(stats?.total_paid)}</strong>
          <small>Encaissements</small>
        </div>
        <div className="super-admin-stat-card">
          <span>Solde restant</span>
          <strong>
            {loading ? '—' : formatMoney(stats?.total_balance_due)}
          </strong>
          <small>Impayés globaux</small>
        </div>
      </div>

      <div className="super-admin-card" style={{ marginTop: 20 }}>
        <div className="super-admin-card-header">
          <div>
            <h2>Activité récente</h2>
            <p>Derniers audit logs plateforme.</p>
          </div>
          <Link to="/super-admin/audit-logs">Voir tout</Link>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Entreprise</th>
                <th>Action</th>
                <th>Utilisateur</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan="4">Aucune activité récente.</td>
                </tr>
              )}
              {recentLogs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td>{log.company_name || '—'}</td>
                  <td>
                    <code>{log.action}</code>
                  </td>
                  <td>{log.user_full_name || log.actor_role || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
