import api from './api';

export async function getReminderSettings() {
  const response = await api.get('/invoice-reminders/settings');
  return response.data;
}

export async function updateReminderSettings(payload) {
  const response = await api.put('/invoice-reminders/settings', payload);
  return response.data;
}

export async function getDueReminderInvoices() {
  const response = await api.get('/invoice-reminders/due-invoices');
  return response.data;
}

export async function sendInvoiceReminder(invoiceId) {
  const response = await api.post(`/invoice-reminders/invoices/${invoiceId}/send`);
  return response.data;
}

export async function getInvoiceReminderLogs(invoiceId) {
  const response = await api.get(`/invoice-reminders/invoices/${invoiceId}/logs`);
  return response.data;
}

export async function enableInvoiceReminders(invoiceId) {
  const response = await api.patch(`/invoice-reminders/invoices/${invoiceId}/enable`);
  return response.data;
}

export async function disableInvoiceReminders(invoiceId) {
  const response = await api.patch(`/invoice-reminders/invoices/${invoiceId}/disable`);
  return response.data;
}

export async function runInvoiceRemindersNow() {
  const response = await api.post('/invoice-reminders/run-now');
  return response.data;
}