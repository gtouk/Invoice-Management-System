import './SuperAdminDashboard.css';

export default function SuperAdminDashboard() {
  return (
    <div className="super-admin-page">
      <div className="super-admin-page-header">
        <div>
          <h1>Dashboard Super Admin</h1>
          <p>
            Vue globale de la plateforme SaaS : entreprises, utilisateurs,
            factures et activité.
          </p>
        </div>
      </div>

      <div className="super-admin-stats-grid">
        <div className="super-admin-stat-card">
          <span>Entreprises</span>
          <strong>—</strong>
          <small>À connecter au backend</small>
        </div>

        <div className="super-admin-stat-card">
          <span>Utilisateurs</span>
          <strong>—</strong>
          <small>Tous comptes plateforme</small>
        </div>

        <div className="super-admin-stat-card">
          <span>Factures</span>
          <strong>—</strong>
          <small>Toutes entreprises</small>
        </div>

        <div className="super-admin-stat-card">
          <span>Revenus facturés</span>
          <strong>—</strong>
          <small>Total global</small>
        </div>
      </div>

      <section className="super-admin-panel">
        <h2>Prochaine étape</h2>
        <p>
          Créer les endpoints backend super admin pour lire les statistiques
          globales et gérer les entreprises.
        </p>
      </section>
    </div>
  );
}
