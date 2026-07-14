const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getStoredToken() {
  return (
    localStorage.getItem('access_token') ||
    localStorage.getItem('token')
  );
}

async function request(path, options = {}) {
  const token = getStoredToken();

  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'Erreur API');
    error.response = { data };
    throw error;
  }

  return data.data;
}

function saveAuthSession(result) {
  if (result.access_token) {
    localStorage.setItem('access_token', result.access_token);

    // Compatibilité avec les anciens guards/routes du projet
    localStorage.setItem('token', result.access_token);
  }

  if (result.refresh_token) {
    localStorage.setItem('refresh_token', result.refresh_token);
  }

  if (result.user) {
    localStorage.setItem('user', JSON.stringify(result.user));
  }
}

/**
 * Compatible avec :
 * login({ identifier, password })
 * login(identifier, password)
 */
export async function login(credentialsOrIdentifier, passwordValue) {
  const credentials =
    typeof credentialsOrIdentifier === 'object'
      ? credentialsOrIdentifier
      : {
          identifier: credentialsOrIdentifier,
          password: passwordValue
        };

  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: credentials.identifier,
      password: credentials.password
    })
  });

  saveAuthSession(result);

  return result;
}

export async function registerCompany(payload) {
  const result = await request('/auth/register-company', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  saveAuthSession(result);

  return result;
}

export async function getCurrentUser() {
  return request('/auth/me');
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getAuthUser() {
  const rawUser = localStorage.getItem('user');

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getStoredToken());
}