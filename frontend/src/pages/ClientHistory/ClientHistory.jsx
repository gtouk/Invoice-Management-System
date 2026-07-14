import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getClientHistory } from '../../services/client.service';
import './ClientHistory.css';

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('fr-FR');
}

function formatStatus(status) {
  const labels = {
    brouillon: 'Brouillon',
    non_payee: 'Non payée',
    partiellement_payee: 'Partiellement payée',
    payee: 'Payée',
    annulee: 'Annulée',
    actif: 'Actif',
    archive: 'Archivé'
  };

  return labels[status] || status || '-';
}

function formatPaymentMethod(method) {
  const labels = {
    cash: 'Cash',
    virement_bancaire: 'Virement bancaire',
    mobile_money: 'Mobile money',
    carte_bancaire: 'Carte bancaire',
    cheque: 'Chèque',
    autre: 'Autre'
  };

  return labels[method] || method || '-';
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

export default function ClientHistory() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [history, setHistory] = useState(null);
  const [activeTab, setActiveTab] = useState('invoices');

  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadClientHistory() {
    try {
      setLoading(true);
      setError('');

      const response = await getClientHistory(id);
      setHistory(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger l’historique du client.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClientHistory();
  }, [id]);

  const client = history?.client;
  const summary = history?.summary || {};
  const invoices = history?.invoices || [];
  const payments = history?.payments || [];

  const filteredInvoices = invoiceStatusFilter
    ? invoices.filter((invoice) => invoice.status === invoiceStatusFilter)
    : invoices;

  const filteredPayments = paymentMethodFilter
    ? payments.filter((payment) => payment.payment_method === paymentMethodFilter)
    : payments;

  if (loading) {
    return (
      <div className="client-history-page">
        <p className="client-history-empty">Chargement de l’historique...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-history-page">
        <div className="client-history-alert client-history-alert-error">
          {error}
        </div>

        <button type="button" onClick={() => navigate('/admin/clients')}>
          Retour aux clients
        </button>
      </div>
    );
  }

  if (!history) {
    return null;
  }

  return (
    <div className="client-history-page">
      <div className="client-history-header">
        <div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/admin/clients')}
          >
            ← Retour
          </button>

          <h1>Dossier client</h1>
          <p>Historique complet des factures et paiements du client.</p>
        </div>

        <div className="client-status-box">
          <span>Statut</span>
          <strong>{formatStatus(client?.status)}</strong>
        </div>
      </div>

      <section className="client-history-card client-profile-card">
        <div>
          <h2>{client?.full_name}</h2>
          <p>{client?.notes || 'Aucune note enregistrée.'}</p>
        </div>

        <div className="client-profile-grid">
          <div>
            <span>Téléphone</span>
            <strong>{client?.phone || '-'}</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>{client?.email || '-'}</strong>
          </div>

          <div>
            <span>Adresse</span>
            <strong>{client?.address || '-'}</strong>
          </div>

          <div>
            <span>Type</span>
            <strong>{client?.client_type || '-'}</strong>
          </div>
        </div>
      </section>

      <section className="client-summary-grid">
        <div className="summary-card">
          <span>Total facturé</span>
          <strong>{formatMoney(summary.total_invoiced)}</strong>
        </div>

        <div className="summary-card">
          <span>Total payé</span>
          <strong>{formatMoney(summary.total_paid)}</strong>
        </div>

        <div className="summary-card danger-summary">
          <span>Solde restant</span>
          <strong>{formatMoney(summary.total_balance_due)}</strong>
        </div>

        <div className="summary-card">
          <span>Factures</span>
          <strong>{summary.invoices_count || 0}</strong>
        </div>

        <div className="summary-card">
          <span>Paiements</span>
          <strong>{summary.payments_count || 0}</strong>
        </div>
      </section>

      <section className="client-history-card">
        <div className="client-tabs">
          <button
            type="button"
            className={activeTab === 'invoices' ? 'active-tab' : ''}
            onClick={() => setActiveTab('invoices')}
          >
            Factures
          </button>

          <button
            type="button"
            className={activeTab === 'payments' ? 'active-tab' : ''}
            onClick={() => setActiveTab('payments')}
          >
            Paiements
          </button>
        </div>

        {activeTab === 'invoices' && (
          <div>
            <div className="history-section-header">
              <div>
                <h2>Factures du client</h2>
                <p>{filteredInvoices.length} facture(s)</p>
              </div>

              <select
                value={invoiceStatusFilter}
                onChange={(event) => setInvoiceStatusFilter(event.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="brouillon">Brouillon</option>
                <option value="non_payee">Non payée</option>
                <option value="partiellement_payee">Partiellement payée</option>
                <option value="payee">Payée</option>
                <option value="annulee">Annulée</option>
              </select>
            </div>

            {filteredInvoices.length === 0 ? (
              <p className="client-history-empty">Aucune facture trouvée.</p>
            ) : (
              <div className="client-history-table-wrapper">
                <table className="client-history-table">
                  <thead>
                    <tr>
                      <th>Numéro</th>
                      <th>Date</th>
                      <th>Statut</th>
                      <th>Total</th>
                      <th>Payé</th>
                      <th>Solde</th>
                      <th>PDF</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.invoice_number || 'Brouillon'}</td>
                        <td>{formatDate(invoice.issue_date)}</td>
                        <td>
                          <span className={`history-status status-${invoice.status}`}>
                            {formatStatus(invoice.status)}
                          </span>
                        </td>
                        <td>{formatMoney(invoice.total_amount)}</td>
                        <td>{formatMoney(invoice.paid_amount)}</td>
                        <td>{formatMoney(invoice.balance_due)}</td>
                        <td>
                          {invoice.pdf_url ? (
                            <a
                              href={buildPdfUrl(invoice.pdf_url)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Voir PDF
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <div className="history-section-header">
              <div>
                <h2>Paiements du client</h2>
                <p>{filteredPayments.length} paiement(s)</p>
              </div>

              <select
                value={paymentMethodFilter}
                onChange={(event) => setPaymentMethodFilter(event.target.value)}
              >
                <option value="">Tous les modes</option>
                <option value="cash">Cash</option>
                <option value="virement_bancaire">Virement bancaire</option>
                <option value="mobile_money">Mobile money</option>
                <option value="carte_bancaire">Carte bancaire</option>
                <option value="cheque">Chèque</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            {filteredPayments.length === 0 ? (
              <p className="client-history-empty">Aucun paiement trouvé.</p>
            ) : (
              <div className="client-history-table-wrapper">
                <table className="client-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Facture</th>
                      <th>Montant</th>
                      <th>Mode</th>
                      <th>Référence</th>
                      <th>Notes</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td>{payment.invoice_number || '-'}</td>
                        <td>{formatMoney(payment.amount)}</td>
                        <td>{formatPaymentMethod(payment.payment_method)}</td>
                        <td>{payment.reference || '-'}</td>
                        <td>{payment.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
