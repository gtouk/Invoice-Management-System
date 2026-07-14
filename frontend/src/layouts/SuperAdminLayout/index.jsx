import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import './SuperAdminLayout.css';

export default function SuperAdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.clear();
    navigate('/login', { replace: true });
    window.location.href = '/login';
  }

  return (
    <div className="super-admin-layout">
      <aside className="super-admin-sidebar">
        <div className="super-admin-brand">
          <span className="super-admin-logo">SA</span>
          <div>
            <strong>Super Admin</strong>
            <small>Plateforme SaaS</small>
          </div>
        </div>

        <nav className="super-admin-nav">
          <NavLink to="/super-admin/dashboard">Dashboard</NavLink>
          <NavLink to="/super-admin/companies">Entreprises</NavLink>
        </nav>

        <button
          type="button"
          className="super-admin-logout"
          onClick={handleLogout}
        >
          Déconnexion
        </button>
      </aside>

      <main className="super-admin-main">
        <Outlet />
      </main>
    </div>
  );
}
