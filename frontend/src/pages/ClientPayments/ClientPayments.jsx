import { useEffect, useState } from 'react';
import { getClientPayments } from '../../services/clientPortal.service';

export default function ClientPayments() {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getClientPayments()
      .then((response) => setPayments(response.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger les paiements.'));
  }, []);

  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <h1>Mes paiements</h1>

      <table className="data-table">
        <thead>
          <tr>
            <th>Facture</th>
            <th>Date</th>
            <th>Montant</th>
            <th>Mode</th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td>{payment.invoice_number || '-'}</td>
              <td>{payment.payment_date || '-'}</td>
              <td>{payment.amount}</td>
              <td>{payment.payment_method}</td>
              <td>{payment.reference || '-'}</td>
            </tr>
          ))}

          {payments.length === 0 && (
            <tr>
              <td colSpan="5">Aucun paiement disponible.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
