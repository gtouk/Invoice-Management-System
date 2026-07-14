import { Navigate } from 'react-router-dom';

function getStoredUser() {
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

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const token =
    localStorage.getItem('access_token') ||
    localStorage.getItem('token');

  const user = getStoredUser();

  const role =
    user?.role ||
    localStorage.getItem('user_role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === 'super_admin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }

    if (role === 'client') {
      return <Navigate to="/client/dashboard" replace />;
    }

    if (['admin', 'employee', 'company_admin'].includes(role)) {
      return <Navigate to="/admin/dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return children;
}