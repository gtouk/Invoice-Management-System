import { useEffect, useMemo, useState } from 'react';
import {
  getInvoicesByStatus,
  getPaymentsByMethod,
  getReportsSummary,
  getRevenueByMonth,
  getTopClients
} from '../../services/report.service';
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent
} from '../../utils/formatters';
import './Reports.css';

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultDateRange() {
  const today = new Date();
  return {
    start_date: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    end_date: toIsoDate(today)
  };
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

function getPaymentMethodLabel(method) {
  const labels = {
    cash: 'Espèces',
    virement_bancaire: 'Virement',
    mobile_money: 'Mobile money',
    carte_bancaire: 'Carte',
    cheque: 'Chèque',
    autre: 'Autre',
    virement: 'Virement'
  };

  return labels[method] || method || '—';
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
  const [summary, setSummary] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [invoicesByStatus, setInvoicesByStatus] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [paymentsByMethod, setPaymentsByMethod] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadReports(nextFilters = filters) {
    setIsLoading(true);
    setError('');

    const params = {
      start_date: nextFilters.start_date || undefined,
      end_date: nextFilters.end_date || undefined
    };

    try {
      const [
        summaryResponse,
        revenueResponse,
        statusResponse,
        clientsResponse,
        methodsResponse
      ] = await Promise.all([
        getReportsSummary(params),
        getRevenueByMonth(params),
        getInvoicesByStatus(params),
        getTopClients(params),
        getPaymentsByMethod(params)
      ]);

      setSummary(summaryResponse.data || null);
      setMonthlyRevenue(revenueResponse.data || []);
      setInvoicesByStatus(statusResponse.data || []);
      setTopClients(clientsResponse.data || []);
      setPaymentsByMethod(methodsResponse.data || []);
    } catch (err) {
      setSummary(null);
      setMonthlyRevenue([]);
      setInvoicesByStatus([]);
      setTopClients([]);
      setPaymentsByMethod([]);
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
    setFilters((current) => ({ ...current, [name]: value }));
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

    if (type === 'last_3_months') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    }

    if (type === 'year') {
      startDate = new Date(today.getFullYear(), 0, 1);
    }

    const nextFilters = {
      start_date: toIsoDate(startDate),
      end_date: toIsoDate(today)
    };

    setFilters(nextFilters);
    loadReports(nextFilters);
  }

  return (
    <div className="page-stack reports-page">
      <div className="reports-hero">
        <div>
          <span>Rapports entreprise</span>
          <h1>Analyse financière</h1>
          <p>
            Chiffre d’affaires, encaissements, top clients et répartition par
            statut ou méthode de paiement.
          </p>
        </div>

        <button type="button" onClick={() => loadReports()} disabled={isLoading}>
          {isLoading ? 'Chargement…' : 'Actualiser'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <section className="panel reports-filter-panel">
        <form className="reports-filters" onSubmit={handleSubmit}>
          <label>
            Date début
            <input
              name="start_date"
              type="date"
              value={filters.start_date}
              onChange={handleChange}
            />
          </label>

          <label>
            Date fin
            <input
              name="end_date"
              type="date"
              value={filters.end_date}
              onChange={handleChange}
            />
          </label>

          <div className="quick-range-buttons">
            <button type="button" className="secondary" onClick={() => setQuickRange('month')}>
              Ce mois
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setQuickRange('last_3_months')}
            >
              3 derniers mois
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

      {isLoading && !summary && <p className="empty-state">Chargement des rapports…</p>}

      {summary && (
        <section className="reports-stats-grid">
          <StatCard
            label="Total facturé"
            value={formatMoney(summary.total_invoiced)}
            helper={`${formatNumber(summary.invoices_count)} facture(s)`}
            tone="blue"
          />
          <StatCard
            label="Total encaissé"
            value={formatMoney(summary.total_paid)}
            helper={`${formatNumber(summary.payments_count)} paiement(s)`}
            tone="green"
          />
          <StatCard
            label="Solde restant"
            value={formatMoney(summary.total_balance_due)}
            helper="Hors factures annulées"
            tone="red"
          />
          <StatCard
            label="Facture moyenne"
            value={formatMoney(summary.average_invoice_amount)}
            helper="Sur la période"
          />
          <StatCard
            label="Taux payé"
            value={formatPercent(summary.paid_rate)}
            helper="Factures entièrement payées"
            tone="orange"
          />
          <StatCard
            label="Période"
            value={`${formatDate(summary.period?.start_date)} → ${formatDate(summary.period?.end_date)}`}
            helper="Filtres appliqués"
          />
        </section>
      )}

      <section className="reports-grid-two">
        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Factures par statut</h2>
              <p>Répartition des montants.</p>
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
                  <span>{formatNumber(item.count)} facture(s)</span>
                </div>
                <div>
                  <strong>{formatMoney(item.total_amount)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Paiements par méthode</h2>
              <p>Moyens d’encaissement.</p>
            </div>
          </div>
          <div className="report-list">
            {paymentsByMethod.length === 0 && (
              <p className="empty-state">Aucun paiement sur cette période.</p>
            )}
            {paymentsByMethod.map((item) => (
              <div className="report-row" key={item.payment_method || 'none'}>
                <div>
                  <strong>{getPaymentMethodLabel(item.payment_method)}</strong>
                  <span>{formatNumber(item.count)} paiement(s)</span>
                </div>
                <div>
                  <strong>{formatMoney(item.total_paid)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Revenus par mois</h2>
            <p>Facturation et encaissements.</p>
          </div>
        </div>
        <div className="reports-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mois</th>
                <th>Total facturé</th>
                <th>Total payé</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRevenue.length === 0 && (
                <tr>
                  <td colSpan="3">Aucune donnée mensuelle.</td>
                </tr>
              )}
              {monthlyRevenue.map((item) => (
                <tr key={item.month}>
                  <td>{item.month}</td>
                  <td>{formatMoney(item.total_invoiced)}</td>
                  <td>{formatMoney(item.total_paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Top clients</h2>
            <p>Volume facturé sur la période.</p>
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
                <tr key={client.client_id}>
                  <td>{client.client_name}</td>
                  <td>{formatNumber(client.invoices_count)}</td>
                  <td>{formatMoney(client.total_invoiced)}</td>
                  <td>{formatMoney(client.total_paid)}</td>
                  <td>{formatMoney(client.balance_due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
