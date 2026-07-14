import api from './api';

export async function getDashboardSummary() {
  const response = await api.get('/dashboard/summary');
  return response.data;
}

/** @deprecated Prefer getDashboardSummary */
export async function getDashboard() {
  return getDashboardSummary();
}
