import api from './api';

export async function getBusinessReports(params = {}) {
  const response = await api.get('/reports/business', { params });
  return response.data;
}