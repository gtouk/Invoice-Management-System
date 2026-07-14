import { useEffect, useMemo, useState } from 'react';
import { getBusinessReports } from '../../services/report.service';
import './Reports.css';

function getDefaultDateRange() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    date_from: firstDay.toISOString().slice(0, 10),
    date_to: today.toISOString().slice(0, 10)
  };
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('fr-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} CAD`;
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('fr-CA');
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

function getClientName(item) {
  if (item?.client_type === 'entreprise') {
    return item.company_name || item.client_name || item.full_name || '-';
  }

  return item?.client_name || item?.full_name || '-';
}

function StatCard({ label, value, helper, tone = 'default' }) {
  return (
    <div className={`report-stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </div>
  );
}

export default function Reports() {
  const defaultDates = useMemo(() => getDefaultDateRange(), []);

  const [filters, setFilters] = useState(defaultDates);
  const [reports, setReports] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadReports(nextFilters = filters) {
    setIsLoading(true);
    setError('');

    try {
      const response = await getBusinessReports(nextFilters);
      setReports(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger les rapports.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReports(defaultDates);
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    loadReports(filters);
  }

  function setQuickRange(type) {
    const today = new Date();
    let startDate = new Date(today);

    if (type === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    if (type === 'year') {
      startDate = new Date(today.getFullYear(), 0, 1);
    }

    if (type === 'last_30') {
      startDate.setDate(today.getDate() - 30);
    }

    const nextFilters = {
      date_from: startDate.toISOString().slice(0, 10),
      date_to: today.toISOString().slice(0, 10)
    };

    setFilters(nextFilters);
    loadReports(nextFilters);
  }

  const summary = reports?.summary || {};
  const invoicesByStatus = reports?.invoices_by_status || [];
  const paymentsByMethod = reports?.payments_by_method || [];
  const topClients = reports?.top_clients || [];
  const unpaidInvoices = reports?.unpaid_invoices || [];
  const monthlyRevenue = reports?.monthly_revenue || [];

  return (
    <div className="page-stack reports-page">
      <div className="reports-hero">
        <div>
          <span>Rapports entreprise</span>
          <h1>Analyse financière</h1>
          <p>
            Suivez le chiffre d’affaires, les encaissements, les soldes impayés,
            les clients importants et l’évolution mensuelle.
          </p>
        </div>

        <button type="button" onClick={() => loadReports()} disabled={isLoading}>
          {isLoading ? 'Chargement...' : 'Actualiser'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <section className="panel reports-filter-panel">
        <form className="reports-filters" onSubmit={handleSubmit}>
          <label>
            Date début
            <input
              name="date_from"
              type="date"
              value={filters.date_from}
              onChange={handleChange}
            />
          </label>

          <label>
            Date fin
            <input
              name="date_to"
              type="date"
              value={filters.date_to}
              onChange={handleChange}
            />
          </label>

          <div className="quick-range-buttons">
            <button type="button" className="secondary" onClick={() => setQuickRange('month')}>
              Ce mois
            </button>

            <button type="button" className="secondary" onClick={() => setQuickRange('last_30')}>
              30 jours
            </button>

            <button type="button" className="secondary" onClick={() => setQuickRange('year')}>
              Cette année
            </button>
          </div>

          <button type="submit" disabled={isLoading}>
            Appliquer
          </button>
        </form>
      </section>

      <section className="reports-stats-grid">
        <StatCard
          label="Total facturé"
          value={formatMoney(summary.total_invoiced)}
          helper={`${summary.invoices_count || 0} facture(s)`}
          tone="blue"
        />

        <StatCard
          label="Total encaissé"
          value={formatMoney(summary.total_paid)}
          helper={`${summary.payments_count || 0} paiement(s)`}
          tone="green"
        />

        <StatCard
          label="Solde restant"
          value={formatMoney(summary.total_balance_due)}
          helper="Montant encore dû"
          tone="red"
        />

        <StatCard
          label="Facture moyenne"
          value={formatMoney(summary.average_invoice_amount)}
          helper="Moyenne sur la période"
        />

        <StatCard
          label="Paiement moyen"
          value={formatMoney(summary.average_payment_amount)}
          helper="Moyenne des encaissements"
        />

        <StatCard
          label="Factures impayées"
          value={summary.unpaid_invoices_count || 0}
          helper={`${summary.partial_invoices_count || 0} partielle(s)`}
          tone="orange"
        />
      </section>

      <section className="reports-grid-two">
        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Factures par statut</h2>
              <p>Répartition des montants par état.</p>
            </div>
          </div>

          <div className="report-list">
            {invoicesByStatus.length === 0 && (
              <p className="empty-state">Aucune facture sur cette période.</p>
            )}

            {invoicesByStatus.map((item) => (
              <div className="report-row" key={item.status}>
                <div>
                  <strong>{getStatusLabel(item.status)}</strong>
                  <span>{item.count} facture(s)</span>
                </div>

                <div>
                  <strong>{formatMoney(item.total_amount)}</strong>
                  <span>Solde : {formatMoney(item.balance_due)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Paiements par méthode</h2>
              <p>Analyse des moyens d’encaissement.</p>
            </div>
          </div>

          <div className="report-list">
            {paymentsByMethod.length === 0 && (
              <p className="empty-state">Aucun paiement sur cette période.</p>
            )}

            {paymentsByMethod.map((item) => (
              <div className="report-row" key={item.payment_method}>
                <div>
                  <strong>{item.payment_method || '-'}</strong>
                  <span>{item.count} paiement(s)</span>
                </div>

                <div>
                  <strong>{formatMoney(item.total_amount)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Évolution mensuelle</h2>
            <p>Facturation, encaissements et soldes par mois.</p>
          </div>
        </div>

        <div className="reports-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mois</th>
                <th>Factures</th>
                <th>Total facturé</th>
                <th>Total encaissé</th>
                <th>Solde restant</th>
              </tr>
            </thead>

            <tbody>
              {monthlyRevenue.length === 0 && (
                <tr>
                  <td colSpan="5">Aucune donnée mensuelle.</td>
                </tr>
              )}

              {monthlyRevenue.map((item) => (
                <tr key={item.month}>
                  <td>{item.month}</td>
                  <td>{item.invoices_count}</td>
                  <td>{formatMoney(item.total_invoiced)}</td>
                  <td>{formatMoney(item.total_paid)}</td>
                  <td>{formatMoney(item.balance_due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="reports-grid-two">
        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Top clients</h2>
              <p>Clients avec le plus grand volume facturé.</p>
            </div>
          </div>

          <div className="reports-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Factures</th>
                  <th>Facturé</th>
                  <th>Payé</th>
                  <th>Solde</th>
                </tr>
              </thead>

              <tbody>
                {topClients.length === 0 && (
                  <tr>
                    <td colSpan="5">Aucun client sur cette période.</td>
                  </tr>
                )}

                {topClients.map((client) => (
                  <tr key={client.id}>
                    <td>{getClientName(client)}</td>
                    <td>{client.invoices_count}</td>
                    <td>{formatMoney(client.total_invoiced)}</td>
                    <td>{formatMoney(client.total_paid)}</td>
                    <td>{formatMoney(client.balance_due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Factures impayées</h2>
              <p>Factures à suivre ou relancer.</p>
            </div>
          </div>

          <div className="reports-table-wrapper">
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
                {unpaidInvoices.length === 0 && (
                  <tr>
                    <td colSpan="4">Aucune facture impayée.</td>
                  </tr>
                )}

                {unpaidInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.invoice_number || '-'}</strong>
                      <small>{getStatusLabel(invoice.status)}</small>
                    </td>
                    <td>{getClientName(invoice)}</td>
                    <td>{formatDate(invoice.due_date)}</td>
                    <td>{formatMoney(invoice.balance_due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}