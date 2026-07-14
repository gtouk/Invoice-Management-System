import api from './api';

export async function prepareInvoiceEmail(invoiceId) {
  const response = await api.get(`/invoices/${invoiceId}/email/prepare`);
  return response.data;
}

export async function sendInvoiceEmail(invoiceId, payload) {
  const response = await api.post(`/invoices/${invoiceId}/email/send`, {
    to: payload.to,
    cc: payload.cc || '',
    bcc: payload.bcc || '',
    subject: payload.subject,
    body: payload.body,
    from: payload.from,
    from_name: payload.from_name
  });
  return response.data;
}

export async function getInvoiceEmailLogs(invoiceId) {
  const response = await api.get(`/invoices/${invoiceId}/email/logs`);
  return response.data;
}
