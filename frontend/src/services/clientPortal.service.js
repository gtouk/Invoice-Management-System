import api from './api';

export async function getClientProfile() {
  const response = await api.get('/client/profile');
  return response.data;
}

export async function getClientSummary() {
  const response = await api.get('/client/summary');
  return response.data;
}

export async function getClientInvoices() {
  const response = await api.get('/client/invoices');
  return response.data;
}

export async function getClientInvoice(id) {
  const response = await api.get(`/client/invoices/${id}`);
  return response.data;
}

export async function getClientInvoicePdf(id) {
  const response = await api.get(`/client/invoices/${id}/pdf`);
  return response.data;
}

export async function getClientPayments() {
  const response = await api.get('/client/payments');
  return response.data;
}
