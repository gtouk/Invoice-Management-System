import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../../services/dashboard.service';
import './Dashboard.css';

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('fr-CA');
}

function getClientDisplayName(item) {
  if (item?.client_type === 'entreprise') {
    return item.company_name || item.client_name || item.full_name || '-';
  }

  return item?.client_name || item?.full_name || '-';
}

function getStatusLabel(status) {
  const labels = {
    brouillon: 'Brouillon',
    non_payee: 'Non payée',
    partiellement_payee: 'Partiellement payée',
    payee: 'Payée',
    annulee: 'Annulée'
  };

  return labels[status] || status || '-';
}

function buildPdfUrl(pdfUrl) {
  if (!pdfUrl) return null;

  if (pdfUrl.startsWith('http')) {
    return pdfUrl;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const backendBaseUrl = apiBaseUrl.replace(/\/api$/, '');

  return `${backendBaseUrl}${pdfUrl}`;
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
      const response = await getDashboard();
      setDashboard(response.data);
    } catch (err) {
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

  const summary = dashboard?.summary || {};
  const clients = dashboard?.clients || {};
  const items = dashboard?.items || {};
  const recentInvoices = dashboard?.recent_invoices || [];
  const recentPayments = dashboard?.recent_payments || [];
  const unpaidClients = dashboard?.unpaid_clients || [];
  const invoicesByStatus = dashboard?.invoices_by_status || [];

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
            {isLoading ? 'Chargement...' : 'Actualiser'}
          </button>

          <Link to="/admin/invoices" className="hero-secondary-link">
            Voir les factures
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <section className="dashboard-actions-grid">
        <Link to="/admin/clients" className="quick-action-card">
          <span>Clients</span>
          <strong>Ajouter ou gérer les clients</strong>
        </Link>

        <Link to="/admin/items" className="quick-action-card">
          <span>Articles / Services</span>
          <strong>Configurer vos produits et services</strong>
        </Link>

        <Link to="/admin/invoices" className="quick-action-card">
          <span>Factures</span>
          <strong>Créer ou consulter une facture</strong>
        </Link>

        <Link to="/admin/payments" className="quick-action-card">
          <span>Paiements</span>
          <strong>Enregistrer un paiement</strong>
        </Link>

        <Link to="/admin/company-settings" className="quick-action-card">
          <span>Entreprise</span>
          <strong>Modifier logo, taxes et coordonnées</strong>
        </Link>
      </section>

      <section className="dashboard-stats-grid">
        <StatCard
          label="Total facturé"
          value={`${formatMoney(summary.total_invoiced)} CAD`}
          helper={`${summary.invoices_count || 0} facture(s)`}
          tone="blue"
        />

        <StatCard
          label="Total encaissé"
          value={`${formatMoney(summary.total_paid)} CAD`}
          helper={`${summary.payments_count || 0} paiement(s)`}
          tone="green"
        />

        <StatCard
          label="Solde restant"
          value={`${formatMoney(summary.total_balance_due)} CAD`}
          helper="Montant encore à recevoir"
          tone="red"
        />

        <StatCard
          label="Clients actifs"
          value={clients.active_clients_count || 0}
          helper={`${clients.company_clients_count || 0} entreprise(s), ${clients.individual_clients_count || 0} particulier(s)`}
        />

        <StatCard
          label="Articles / services actifs"
          value={items.active_items_count || 0}
          helper={`${items.articles_count || 0} article(s), ${items.services_count || 0} service(s)`}
        />

        <StatCard
          label="Factures impayées"
          value={summary.unpaid_invoices_count || 0}
          helper={`${summary.partial_invoices_count || 0} partiellement payée(s)`}
          tone="orange"
        />
      </section>

      <section className="dashboard-split-grid">
        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Répartition des factures</h2>
              <p>Vue rapide par statut.</p>
            </div>
          </div>

          <div className="status-list">
            {invoicesByStatus.length === 0 && (
              <p className="empty-state">Aucune facture pour le moment.</p>
            )}

            {invoicesByStatus.map((item) => (
              <div className="status-row" key={item.status}>
                <div>
                  <strong>{getStatusLabel(item.status)}</strong>
                  <span>{item.count} facture(s)</span>
                </div>

                <div>
                  <strong>{formatMoney(item.total_amount)} CAD</strong>
                  <span>Solde : {formatMoney(item.balance_due)} CAD</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Clients avec solde impayé</h2>
              <p>Priorité de suivi et relance.</p>
            </div>
          </div>

          <div className="unpaid-client-list">
            {unpaidClients.length === 0 && (
              <p className="empty-state">Aucun solde impayé.</p>
            )}

            {unpaidClients.map((client) => (
              <div className="unpaid-client-card" key={client.id}>
                <div>
                  <strong>{getClientDisplayName(client)}</strong>
                  <span>{client.invoices_count} facture(s) ouverte(s)</span>
                </div>

                <strong>{formatMoney(client.balance_due)} CAD</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-split-grid">
        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Dernières factures</h2>
              <p>Factures récemment créées.</p>
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
                  <th>PDF</th>
                </tr>
              </thead>

              <tbody>
                {recentInvoices.length === 0 && (
                  <tr>
                    <td colSpan="6">Aucune facture récente.</td>
                  </tr>
                )}

                {recentInvoices.map((invoice) => {
                  const pdfUrl = buildPdfUrl(invoice.pdf_url);

                  return (
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

                      <td>{formatMoney(invoice.total_amount)} CAD</td>
                      <td>{formatMoney(invoice.balance_due)} CAD</td>

                      <td>
                        {pdfUrl ? (
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="small-link-button"
                          >
                            Ouvrir
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Derniers paiements</h2>
              <p>Paiements récemment enregistrés.</p>
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
                  <strong>{formatMoney(payment.amount)} CAD</strong>
                  <span>{getClientDisplayName(payment)}</span>
                  <small>
                    {payment.invoice_number || '-'} · {formatDate(payment.payment_date)}
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
    </div>
  );
}