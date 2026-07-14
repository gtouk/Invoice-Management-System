import { Link, Outlet, useNavigate } from 'react-router-dom';

export default function ClientLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>Portail client</h2>
        <nav>
          <Link to="/client/dashboard">Mon tableau de bord</Link>
          <Link to="/client/profile">Mon profil</Link>
          <Link to="/client/invoices">Mes factures</Link>
          <Link to="/client/payments">Mes paiements</Link>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>Espace client</span>
          <button onClick={handleLogout}>Deconnexion</button>
        </header>

        <section className="content-area">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
