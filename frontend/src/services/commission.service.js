import api from './api';

export async function getExchangeRate(params = {}) {
  const response = await api.get('/commissions/rate', { params });
  return response.data;
}

export async function calculateCommission(payload) {
  const response = await api.post('/commissions/calculate', payload);
  return response.data;
}