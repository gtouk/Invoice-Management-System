import api from './api';

export async function getDashboard() {
  const response = await api.get('/reports/dashboard');
  return response.data;
}
