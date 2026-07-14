import { useEffect, useState } from 'react';
import { getClientProfile } from '../../services/clientPortal.service';

export default function ClientProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getClientProfile()
      .then((response) => setProfile(response.data))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger le profil.'));
  }, []);

  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <h1>Mon profil</h1>

      <div className="details-card">
        <p><strong>Nom :</strong> {profile?.full_name}</p>
        <p><strong>Code client :</strong> {profile?.client_code || '-'}</p>
        <p><strong>Telephone :</strong> {profile?.phone || '-'}</p>
        <p><strong>Email :</strong> {profile?.email || '-'}</p>
        <p><strong>Adresse :</strong> {profile?.address || '-'}</p>
        <p><strong>Type :</strong> {profile?.client_type || '-'}</p>
        <p><strong>Statut :</strong> {profile?.status || '-'}</p>
      </div>
    </div>
  );
}
