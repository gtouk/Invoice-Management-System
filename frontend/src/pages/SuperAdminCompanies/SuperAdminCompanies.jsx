import '../SuperAdminDashboard/SuperAdminDashboard.css';

export default function SuperAdminCompanies() {
  return (
    <div className="super-admin-page">
      <div className="super-admin-page-header">
        <div>
          <h1>Entreprises</h1>
          <p>
            Liste globale des entreprises inscrites sur la plateforme.
          </p>
        </div>
      </div>

      <section className="super-admin-panel">
        <h2>Gestion des entreprises</h2>
        <p>
          Prochaine étape : connecter cette page aux endpoints backend
          /api/super-admin/companies.
        </p>
      </section>
    </div>
  );
}
