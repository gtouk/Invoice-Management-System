import { Link, Outlet, useNavigate } from 'react-router-dom';

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const canViewAuditLogs = ['admin', 'company_admin'].includes(user?.role);

  function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>Back-office</h2>
        <nav>
          <Link to="/admin/dashboard">Tableau de bord</Link>
          <Link to="/admin/clients">Clients</Link>
          <Link to="/admin/items">Articles / Services</Link>
          <Link to="/admin/invoices">Factures</Link>
          <Link to="/admin/payments">Paiements</Link>
          <Link to="/admin/bank-statements">Releves</Link>
          <Link to="/admin/commissions">Commissions</Link>
          <Link to="/admin/reports">Rapports</Link>
          <Link to="/admin/users">Utilisateurs</Link>
          <Link to="/admin/invoice-reminders"> Rappels de paiement </Link>
          <Link to="/admin/company-settings"> Paramètres entreprise </Link>
          {canViewAuditLogs && (
            <Link to="/admin/audit-logs">Audit logs</Link>
          )}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>Espace admin / employe</span>
          <button onClick={handleLogout}>Deconnexion</button>
        </header>

        <section className="content-area">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
