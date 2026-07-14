import { useEffect, useState } from 'react';
import {
  downloadClientInvoicePdf,
  getClientInvoices
} from '../../services/clientPortal.service';
import { formatDate, formatMoney } from '../../utils/formatters';

const statusLabels = {
  brouillon: 'Brouillon',
  non_payee: 'Non payée',
  partiellement_payee: 'Partiellement payée',
  payee: 'Payée',
  annulee: 'Annulée'
};

export default function ClientInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    getClientInvoices()
      .then((response) => setInvoices(response.data || []))
      .catch((err) =>
        setError(
          err.response?.data?.message ||
            'Impossible de charger les factures.'
        )
      )
      .finally(() => setIsLoading(false));
  }, []);

  async function handlePdf(invoice) {
    setBusyId(invoice.id);
    setError('');

    try {
      await downloadClientInvoicePdf(invoice.id, invoice.invoice_number);
    } catch (err) {
      setError(err.response?.data?.message || 'PDF non disponible.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-stack">
      <h1>Mes factures</h1>
      <p>Consultez vos factures et téléchargez les PDF sécurisés.</p>

      {error && <div className="error-message">{error}</div>}
      {isLoading && <p className="empty-state">Chargement…</p>}

      {!isLoading && (
        <div className="panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Date</th>
                <th>Échéance</th>
                <th>Total</th>
                <th>Payé</th>
                <th>Solde</th>
                <th>Statut</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoice_number || '—'}</td>
                  <td>{formatDate(invoice.issue_date)}</td>
                  <td>{formatDate(invoice.due_date)}</td>
                  <td>{formatMoney(invoice.total_amount)}</td>
                  <td>{formatMoney(invoice.paid_amount)}</td>
                  <td>
                    <strong>{formatMoney(invoice.balance_due)}</strong>
                  </td>
                  <td>{statusLabels[invoice.status] || invoice.status || '—'}</td>
                  <td>
                    {invoice.status !== 'brouillon' && invoice.status !== 'annulee' ? (
                      <button
                        type="button"
                        disabled={busyId === invoice.id}
                        onClick={() => handlePdf(invoice)}
                      >
                        {busyId === invoice.id ? '…' : 'Télécharger'}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}

              {invoices.length === 0 && (
                <tr>
                  <td colSpan="8">Aucune facture disponible.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
