import { useEffect, useState } from 'react';
import { getClientSummary } from '../../services/clientPortal.service';

export default function ClientDashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getClientSummary()
      .then((response) => setSummary(response.data))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger le resume.'));
  }, []);

  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <h1>Mon tableau de bord</h1>
      <p>Bienvenue dans votre espace client.</p>

      <div className="cards-grid">
        <div className="card">
          <strong>Total facture</strong>
          <span>{summary?.total_invoiced ?? 0}</span>
        </div>
        <div className="card">
          <strong>Total paye</strong>
          <span>{summary?.total_paid ?? 0}</span>
        </div>
        <div className="card">
          <strong>Solde restant</strong>
          <span>{summary?.balance_due ?? 0}</span>
        </div>
      </div>
    </div>
  );
}
