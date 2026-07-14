import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getClientDashboard } from '../../services/clientPortal.service';
import { formatDate, formatMoney, formatNumber } from '../../utils/formatters';
import './ClientDashboard.css';

function getStatusLabel(status) {
  const labels = {
    brouillon: 'Brouillon',
    non_payee: 'Non payée',
    partiellement_payee: 'Partielle',
    payee: 'Payée',
    annulee: 'Annulée'
  };

  return labels[status] || status || '—';
}

export default function ClientDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    getClientDashboard()
      .then((response) => setDashboard(response.data || null))
      .catch((err) =>
        setError(
          err.response?.data?.message ||
            'Impossible de charger le tableau de bord.'
        )
      )
      .finally(() => setIsLoading(false));
  }, []);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="page-stack client-dashboard-page">
      <div className="client-dashboard-hero">
        <div>
          <span>Espace client</span>
          <h1>Mon tableau de bord</h1>
          <p>Vos factures, paiements et soldes en un coup d’œil.</p>
        </div>
        <div className="client-dashboard-actions">
          <Link to="/client/invoices">Mes factures</Link>
          <Link to="/client/payments">Mes paiements</Link>
          <Link to="/client/profile">Mon profil</Link>
        </div>
      </div>

      {isLoading && <p className="empty-state">Chargement…</p>}

      {dashboard && (
        <>
          <section className="client-dashboard-stats">
            <div className="client-stat-card">
              <span>Factures</span>
              <strong>{formatNumber(dashboard.invoices_count)}</strong>
            </div>
            <div className="client-stat-card success">
              <span>Total payé</span>
              <strong>{formatMoney(dashboard.total_paid)}</strong>
            </div>
            <div className="client-stat-card warning">
              <span>Solde restant</span>
              <strong>{formatMoney(dashboard.total_balance_due)}</strong>
            </div>
            <div className="client-stat-card danger">
              <span>En retard</span>
              <strong>{formatNumber(dashboard.overdue_invoices_count)}</strong>
            </div>
          </section>

          <section className="client-dashboard-grid">
            <div className="panel">
              <div className="section-header">
                <div>
                  <h2>Dernières factures</h2>
                  <p>
                    {formatNumber(dashboard.unpaid_invoices_count)} non payée(s) ·{' '}
                    {formatNumber(dashboard.partial_invoices_count)} partielle(s)
                  </p>
                </div>
                <Link to="/client/invoices">Tout voir</Link>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Numéro</th>
                      <th>Statut</th>
                      <th>Échéance</th>
                      <th>Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard.recent_invoices || []).length === 0 && (
                      <tr>
                        <td colSpan="4">Aucune facture.</td>
                      </tr>
                    )}
                    {(dashboard.recent_invoices || []).map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.invoice_number || '—'}</td>
                        <td>{getStatusLabel(invoice.status)}</td>
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
                  <p>Historique récent.</p>
                </div>
                <Link to="/client/payments">Tout voir</Link>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Facture</th>
                      <th>Méthode</th>
                      <th>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard.recent_payments || []).length === 0 && (
                      <tr>
                        <td colSpan="4">Aucun paiement.</td>
                      </tr>
                    )}
                    {(dashboard.recent_payments || []).map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td>{payment.invoice_number || '—'}</td>
                        <td>{payment.payment_method || '—'}</td>
                        <td>{formatMoney(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
