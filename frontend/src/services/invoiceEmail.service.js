import api from './api';

export async function prepareInvoiceEmail(invoiceId) {
  const response = await api.get(`/invoices/${invoiceId}/email/prepare`);
  return response.data;
}

export async function sendInvoiceEmail(invoiceId, payload) {
  const response = await api.post(`/invoices/${invoiceId}/send-email`, payload);
  return response.data;
}

export async function getInvoiceEmailLogs(invoiceId) {
  const response = await api.get(`/invoices/${invoiceId}/email/logs`);
  return response.data;
}
