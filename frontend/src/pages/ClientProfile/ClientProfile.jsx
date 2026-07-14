import { useEffect, useState } from 'react';
import { getClientProfile } from '../../services/clientPortal.service';
import { formatDate } from '../../utils/formatters';

export default function ClientProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getClientProfile()
      .then((response) => setProfile(response.data))
      .catch((err) =>
        setError(
          err.response?.data?.message ||
            'Impossible de charger le profil.'
        )
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="page-stack">
      <h1>Mon profil</h1>
      <p>Informations de votre dossier client.</p>

      {error && <div className="error-message">{error}</div>}
      {isLoading && <p className="empty-state">Chargement…</p>}

      {!isLoading && profile && (
        <div className="details-card panel">
          <p>
            <strong>Nom :</strong> {profile.full_name || '—'}
          </p>
          <p>
            <strong>Code client :</strong> {profile.client_code || '—'}
          </p>
          <p>
            <strong>Téléphone :</strong> {profile.phone || '—'}
          </p>
          <p>
            <strong>Email :</strong> {profile.email || '—'}
          </p>
          <p>
            <strong>Adresse :</strong> {profile.address || '—'}
          </p>
          <p>
            <strong>Type :</strong> {profile.client_type || '—'}
          </p>
          <p>
            <strong>Statut :</strong> {profile.status || '—'}
          </p>
          <p>
            <strong>Créé le :</strong> {formatDate(profile.created_at)}
          </p>
        </div>
      )}

      {!isLoading && !profile && !error && (
        <p className="empty-state">Aucun profil disponible.</p>
      )}
    </div>
  );
}
