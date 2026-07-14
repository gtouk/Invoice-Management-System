import api from './api';

export async function getInvoices(params = {}) {
  const response = await api.get('/invoices', { params });
  return response.data;
}

export async function getInvoiceById(id) {
  const response = await api.get(`/invoices/${id}`);
  return response.data;
}

// Alias pour compatibilité avec les autres pages
export async function getInvoice(id) {
  return getInvoiceById(id);
}

export async function createInvoice(payload) {
  const response = await api.post('/invoices', payload);
  return response.data;
}

// Alias pour anciennes pages qui utilisent encore createDraftInvoice
export async function createDraftInvoice(payload) {
  return createInvoice(payload);
}

export async function generateInvoice(id) {
  const response = await api.patch(`/invoices/${id}/generate`);
  return response.data;
}

export async function generateInvoicePdf(id) {
  const response = await api.post(`/invoices/${id}/generate-pdf`);
  return response.data;
}

export async function getInvoicePdf(id) {
  const response = await api.get(`/invoices/${id}/pdf`);
  return response.data;
}

export async function cancelInvoice(id, payload = {}) {
  const response = await api.patch(`/invoices/${id}/cancel`, payload);
  return response.data;
}

export async function prepareInvoiceEmail(id) {
  const response = await api.get(`/invoices/${id}/email/prepare`);
  return response.data;
}

export async function sendInvoiceEmail(id, payload = {}) {
  const response = await api.post(`/invoices/${id}/email/send`, payload);
  return response.data;
}

export async function getInvoiceEmailLogs(id) {
  const response = await api.get(`/invoices/${id}/email/logs`);
  return response.data;
}

// Utilisé par la page Factures complète
export async function getClients(params = {}) {
  const response = await api.get('/clients', { params });
  return response.data;
}

// Utilisé par la page Factures complète
export async function getItems(params = {}) {
  const response = await api.get('/items', { params });
  return response.data;
}

// Utilisé par la page Factures complète pour paiement rapide
export async function createPayment(payload) {
  const response = await api.post('/payments', payload);
  return response.data;
}