import { useEffect, useState } from 'react';
import { getClientPayments } from '../../services/clientPortal.service';
import { formatDate, formatMoney } from '../../utils/formatters';

const methodLabels = {
  cash: 'Espèces',
  virement_bancaire: 'Virement',
  bank_transfer: 'Virement',
  mobile_money: 'Mobile money',
  carte_bancaire: 'Carte',
  cheque: 'Chèque',
  autre: 'Autre'
};

export default function ClientPayments() {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getClientPayments()
      .then((response) => setPayments(response.data || []))
      .catch((err) =>
        setError(
          err.response?.data?.message ||
            'Impossible de charger les paiements.'
        )
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="page-stack">
      <h1>Mes paiements</h1>
      <p>Historique des paiements enregistrés sur vos factures.</p>

      {error && <div className="error-message">{error}</div>}
      {isLoading && <p className="empty-state">Chargement…</p>}

      {!isLoading && (
        <div className="panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Facture</th>
                <th>Date</th>
                <th>Montant</th>
                <th>Mode</th>
                <th>Référence</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.invoice_number || '—'}</td>
                  <td>{formatDate(payment.payment_date)}</td>
                  <td>
                    <strong>{formatMoney(payment.amount)}</strong>
                  </td>
                  <td>
                    {methodLabels[payment.payment_method] ||
                      payment.payment_method ||
                      '—'}
                  </td>
                  <td>{payment.reference || '—'}</td>
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
      )}
    </div>
  );
}
