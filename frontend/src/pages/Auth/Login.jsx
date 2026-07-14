import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../services/auth.service';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    identifier: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function redirectAfterLogin(user) {
    if (user?.role === 'super_admin') {
      navigate('/super-admin/dashboard', { replace: true });
      window.location.href = '/super-admin/dashboard';
      return;
    }

    if (user?.role === 'client') {
      navigate('/client/dashboard', { replace: true });
      window.location.href = '/client/dashboard';
      return;
    }

    navigate('/admin/dashboard', { replace: true });
    window.location.href = '/admin/dashboard';
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setIsLoading(true);

    try {
      const result = await login({
        identifier: form.identifier,
        password: form.password
      });

      if (!result?.access_token || !result?.user) {
        setError('Connexion impossible');
        return;
      }

      redirectAfterLogin(result.user);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Connexion impossible'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Système de facturation</h1>
        <p>Connectez-vous pour continuer</p>

        {error && <div className="error-message">{error}</div>}

        <label>
          Identifiant ou email
          <input
            name="identifier"
            value={form.identifier}
            onChange={handleChange}
            placeholder="admin@invoice.com"
            autoComplete="username"
            required
          />
        </label>

        <label>
          Mot de passe
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Votre mot de passe"
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Connexion...' : 'Se connecter'}
        </button>

        <p className="auth-link">
          Pas encore de compte entreprise ?{' '}
          <Link to="/register-company">Créer un espace entreprise</Link>
        </p>
      </form>
    </div>
  );
}