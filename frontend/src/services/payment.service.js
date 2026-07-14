import api from './api';

export async function getPayments(params = {}) {
  const response = await api.get('/payments', { params });
  return response.data;
}

export async function createPayment(payload) {
  const response = await api.post('/payments', payload);
  return response.data;
}

export async function getPaymentsByInvoice(invoiceId) {
  const response = await api.get(`/payments/invoice/${invoiceId}`);
  return response.data;
}

export async function getPaymentsByClient(clientId) {
  const response = await api.get(`/payments/client/${clientId}`);
  return response.data;
}
