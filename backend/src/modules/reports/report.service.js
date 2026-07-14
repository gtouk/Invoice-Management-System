import * as reportRepository from './report.repository.js';

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requireCompanyId(companyId) {
  if (!companyId) {
    throw createHttpError('Entreprise non trouvée pour cet utilisateur.', 403);
  }
}

function normalizeDate(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  return trimmed;
}

function normalizeReportFilters(filters = {}) {
  return {
    date_from: normalizeDate(filters.date_from),
    date_to: normalizeDate(filters.date_to)
  };
}

export async function getDashboard(companyId) {
  requireCompanyId(companyId);

  const [
    summary,
    clientsStats,
    itemsStats,
    paymentsStats,
    recentInvoices,
    recentPayments,
    unpaidClients,
    invoicesByStatus
  ] = await Promise.all([
    reportRepository.getDashboardSummary(companyId),
    reportRepository.getClientsStats(companyId),
    reportRepository.getItemsStats(companyId),
    reportRepository.getPaymentsStats(companyId),
    reportRepository.getRecentInvoices(companyId, 5),
    reportRepository.getRecentPayments(companyId, 5),
    reportRepository.getUnpaidClients(companyId, 5),
    reportRepository.getInvoicesByStatus(companyId)
  ]);

  return {
    summary: {
      total_invoiced: Number(summary.total_invoiced || 0),
      total_paid: Number(summary.total_paid || 0),
      total_balance_due: Number(summary.total_balance_due || 0),
      invoices_count: Number(summary.invoices_count || 0),
      unpaid_invoices_count: Number(summary.unpaid_invoices_count || 0),
      partial_invoices_count: Number(summary.partial_invoices_count || 0),
      paid_invoices_count: Number(summary.paid_invoices_count || 0),
      draft_invoices_count: Number(summary.draft_invoices_count || 0),
      payments_count: Number(paymentsStats.payments_count || 0),
      payments_total: Number(paymentsStats.payments_total || 0)
    },
    clients: {
      clients_count: Number(clientsStats.clients_count || 0),
      active_clients_count: Number(clientsStats.active_clients_count || 0),
      archived_clients_count: Number(clientsStats.archived_clients_count || 0),
      company_clients_count: Number(clientsStats.company_clients_count || 0),
      individual_clients_count: Number(clientsStats.individual_clients_count || 0)
    },
    items: {
      items_count: Number(itemsStats.items_count || 0),
      active_items_count: Number(itemsStats.active_items_count || 0),
      disabled_items_count: Number(itemsStats.disabled_items_count || 0),
      articles_count: Number(itemsStats.articles_count || 0),
      services_count: Number(itemsStats.services_count || 0)
    },
    recent_invoices: recentInvoices,
    recent_payments: recentPayments,
    unpaid_clients: unpaidClients,
    invoices_by_status: invoicesByStatus
  };
}

export async function getReports(companyId, filters = {}) {
  requireCompanyId(companyId);

  const normalizedFilters = normalizeReportFilters(filters);

  const [
    summary,
    paymentsSummary,
    invoicesByStatus,
    paymentsByMethod,
    topClients,
    unpaidInvoices,
    monthlyRevenue
  ] = await Promise.all([
    reportRepository.getReportsSummary(companyId, normalizedFilters),
    reportRepository.getReportsPaymentsSummary(companyId, normalizedFilters),
    reportRepository.getReportsInvoicesByStatus(companyId, normalizedFilters),
    reportRepository.getReportsPaymentsByMethod(companyId, normalizedFilters),
    reportRepository.getReportsTopClients(companyId, normalizedFilters, 10),
    reportRepository.getReportsUnpaidInvoices(companyId, normalizedFilters, 20),
    reportRepository.getReportsMonthlyRevenue(companyId, normalizedFilters)
  ]);

  return {
    filters: normalizedFilters,
    summary: {
      total_invoiced: Number(summary.total_invoiced || 0),
      total_paid: Number(summary.total_paid || 0),
      total_balance_due: Number(summary.total_balance_due || 0),
      invoices_count: Number(summary.invoices_count || 0),
      draft_invoices_count: Number(summary.draft_invoices_count || 0),
      unpaid_invoices_count: Number(summary.unpaid_invoices_count || 0),
      partial_invoices_count: Number(summary.partial_invoices_count || 0),
      paid_invoices_count: Number(summary.paid_invoices_count || 0),
      average_invoice_amount: Number(summary.average_invoice_amount || 0),
      payments_count: Number(paymentsSummary.payments_count || 0),
      payments_total: Number(paymentsSummary.payments_total || 0),
      average_payment_amount: Number(paymentsSummary.average_payment_amount || 0)
    },
    invoices_by_status: invoicesByStatus,
    payments_by_method: paymentsByMethod,
    top_clients: topClients,
    unpaid_invoices: unpaidInvoices,
    monthly_revenue: monthlyRevenue
  };
}