import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardSummary } from '../../services/dashboard.service';
import { formatDate, formatMoney, formatNumber } from '../../utils/formatters';
import './Dashboard.css';

function getClientDisplayName(item) {
  if (item?.client_type === 'entreprise') {
    return item.company_name || item.client_name || item.full_name || '—';
  }

  return item?.client_name || item?.full_name || '—';
}

function getStatusLabel(status) {
  const labels = {
    brouillon: 'Brouillon',
    non_payee: 'Non payée',
    partiellement_payee: 'Partiellement payée',
    payee: 'Payée',
    annulee: 'Annulée'
  };

  return labels[status] || status || '—';
}

function StatCard({ label, value, helper, tone = 'default' }) {
  return (
    <div className={`dashboard-stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </div>
  );
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);

  async function loadDashboard() {
    setIsLoading(true);
    setError('');

    try {
      const response = await getDashboardSummary();
      setDashboard(response.data || null);
    } catch (err) {
      setDashboard(null);
      setError(
        err.response?.data?.message ||
          'Impossible de charger le tableau de bord.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const recentInvoices = dashboard?.recent_invoices || [];
  const recentPayments = dashboard?.recent_payments || [];
  const upcomingDue = dashboard?.upcoming_due_invoices || [];

  return (
    <div className="page-stack dashboard-page">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">Tableau de bord entreprise</span>
          <h1>
            Bonjour{user?.full_name ? `, ${user.full_name}` : ''}
          </h1>
          <p>
            Résumé financier et activité récente de{' '}
            <strong>{user?.company_name || 'votre entreprise'}</strong>.
          </p>
        </div>

        <div className="dashboard-hero-actions">
          <button type="button" onClick={loadDashboard} disabled={isLoading}>
            {isLoading ? 'Chargement…' : 'Actualiser'}
          </button>
          <Link to="/admin/invoices" className="hero-secondary-link">
            Factures
          </Link>
          <Link to="/admin/payments" className="hero-secondary-link">
            Paiements
          </Link>
          <Link to="/admin/reports" className="hero-secondary-link">
            Rapports
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {isLoading && !dashboard && <div className="empty-state">Chargement…</div>}

      {dashboard && (
        <>
          <section className="dashboard-stats-grid">
            <StatCard
              label="Clients"
              value={formatNumber(dashboard.clients_count)}
              helper={`${formatNumber(dashboard.items_count)} article(s)/service(s)`}
            />
            <StatCard
              label="Factures"
              value={formatNumber(dashboard.invoices_count)}
              helper={`${formatNumber(dashboard.draft_invoices_count)} brouillon(s)`}
              tone="blue"
            />
            <StatCard
              label="Total facturé"
              value={formatMoney(dashboard.total_invoiced)}
              helper={`${formatMoney(dashboard.invoiced_this_month)} ce mois`}
              tone="blue"
            />
            <StatCard
              label="Total payé"
              value={formatMoney(dashboard.total_paid)}
              helper={`${formatMoney(dashboard.payments_this_month)} ce mois · ${formatNumber(dashboard.payments_count)} paiement(s)`}
              tone="green"
            />
            <StatCard
              label="Solde restant"
              value={formatMoney(dashboard.total_balance_due)}
              helper={`${formatNumber(dashboard.partial_invoices_count)} partielle(s)`}
              tone="red"
            />
            <StatCard
              label="Factures en retard"
              value={formatNumber(dashboard.overdue_invoices_count)}
              helper={`${formatNumber(dashboard.paid_invoices_count)} payée(s)`}
              tone="orange"
            />
          </section>

          <section className="dashboard-actions-grid">
            <Link to="/admin/invoices" className="quick-action-card">
              <span>Factures</span>
              <strong>Créer ou consulter</strong>
            </Link>
            <Link to="/admin/payments" className="quick-action-card">
              <span>Paiements</span>
              <strong>Enregistrer un encaissement</strong>
            </Link>
            <Link to="/admin/reports" className="quick-action-card">
              <span>Rapports</span>
              <strong>Analyser la période</strong>
            </Link>
            <Link to="/admin/clients" className="quick-action-card">
              <span>Clients</span>
              <strong>Gérer le portefeuille</strong>
            </Link>
          </section>

          <section className="dashboard-split-grid">
            <div className="panel">
              <div className="section-header">
                <div>
                  <h2>Factures bientôt dues</h2>
                  <p>Échéances dans les 7 prochains jours.</p>
                </div>
                <Link to="/admin/invoices">Tout voir</Link>
              </div>

              <div className="dashboard-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Facture</th>
                      <th>Client</th>
                      <th>Échéance</th>
                      <th>Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingDue.length === 0 && (
                      <tr>
                        <td colSpan="4">Aucune échéance prochaine.</td>
                      </tr>
                    )}
                    {upcomingDue.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>
                          <strong>{invoice.invoice_number || '—'}</strong>
                          <small>{getStatusLabel(invoice.status)}</small>
                        </td>
                        <td>{getClientDisplayName(invoice)}</td>
                        <td>{formatDate(invoice.due_date)}</td>
                        <td>{formatMoney(invoice.balance_due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="section-header">
                <div>
                  <h2>Derniers paiements</h2>
                  <p>Encaissements récents.</p>
                </div>
                <Link to="/admin/payments">Tout voir</Link>
              </div>

              <div className="recent-payment-list">
                {recentPayments.length === 0 && (
                  <p className="empty-state">Aucun paiement récent.</p>
                )}
                {recentPayments.map((payment) => (
                  <div className="recent-payment-card" key={payment.id}>
                    <div>
                      <strong>{formatMoney(payment.amount)}</strong>
                      <span>{getClientDisplayName(payment)}</span>
                      <small>
                        {payment.invoice_number || '—'} · {formatDate(payment.payment_date)}
                      </small>
                    </div>
                    <span className="payment-method-pill">
                      {payment.payment_method}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <h2>Dernières factures</h2>
                <p>Activité récente de facturation.</p>
              </div>
              <Link to="/admin/invoices">Tout voir</Link>
            </div>

            <div className="dashboard-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Facture</th>
                    <th>Client</th>
                    <th>Statut</th>
                    <th>Total</th>
                    <th>Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.length === 0 && (
                    <tr>
                      <td colSpan="5">Aucune facture récente.</td>
                    </tr>
                  )}
                  {recentInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <strong>{invoice.invoice_number || 'Brouillon'}</strong>
                        <small>{formatDate(invoice.issue_date)}</small>
                      </td>
                      <td>{getClientDisplayName(invoice)}</td>
                      <td>
                        <span className={`invoice-status ${invoice.status}`}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td>{formatMoney(invoice.total_amount)}</td>
                      <td>{formatMoney(invoice.balance_due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
