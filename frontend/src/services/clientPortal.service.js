import api from './api';

export async function getClientProfile() {
  const response = await api.get('/client/profile');
  return response.data;
}

export async function getClientSummary() {
  const response = await api.get('/client/summary');
  return response.data;
}

export async function getClientDashboard() {
  const response = await api.get('/client/dashboard');
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

export async function downloadClientInvoicePdf(id, invoiceNumber) {
  const response = await api.get(`/client/invoices/${id}/download`, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${invoiceNumber || id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return true;
}

export async function getClientPayments() {
  const response = await api.get('/client/payments');
  return response.data;
}
