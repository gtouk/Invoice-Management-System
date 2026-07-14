import api from './api';

export async function getBusinessReports(params = {}) {
  const response = await api.get('/reports/business', { params });
  return response.data;
}

export async function getReportsSummary(params = {}) {
  const response = await api.get('/reports/summary', { params });
  return response.data;
}

export async function getRevenueByMonth(params = {}) {
  const response = await api.get('/reports/revenue-by-month', { params });
  return response.data;
}

export async function getInvoicesByStatus(params = {}) {
  const response = await api.get('/reports/invoices-by-status', { params });
  return response.data;
}

export async function getTopClients(params = {}) {
  const response = await api.get('/reports/top-clients', { params });
  return response.data;
}

export async function getPaymentsByMethod(params = {}) {
  const response = await api.get('/reports/payments-by-method', { params });
  return response.data;
}
