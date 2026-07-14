import { useEffect, useState } from 'react';
import { getClientInvoices, getClientInvoicePdf } from '../../services/clientPortal.service';

export default function ClientInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getClientInvoices()
      .then((response) => setInvoices(response.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger les factures.'));
  }, []);

  async function handlePdf(invoiceId) {
    try {
      const response = await getClientInvoicePdf(invoiceId);
      if (response.data?.pdf_url) {
        window.open(response.data.pdf_url, '_blank');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'PDF non disponible.');
    }
  }

  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <h1>Mes factures</h1>

      <table className="data-table">
        <thead>
          <tr>
            <th>Numero</th>
            <th>Date</th>
            <th>Total</th>
            <th>Paye</th>
            <th>Solde</th>
            <th>Statut</th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{invoice.invoice_number || '-'}</td>
              <td>{invoice.issue_date || '-'}</td>
              <td>{invoice.total_amount}</td>
              <td>{invoice.paid_amount}</td>
              <td>{invoice.balance_due}</td>
              <td>{invoice.status}</td>
              <td>
                <button onClick={() => handlePdf(invoice.id)}>Voir PDF</button>
              </td>
            </tr>
          ))}

          {invoices.length === 0 && (
            <tr>
              <td colSpan="7">Aucune facture disponible.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
