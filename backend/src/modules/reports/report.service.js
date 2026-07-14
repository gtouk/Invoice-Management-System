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
    date_from:
      normalizeDate(filters.start_date) || normalizeDate(filters.date_from),
    date_to: normalizeDate(filters.end_date) || normalizeDate(filters.date_to)
  };
}

function toNumber(value) {
  return Number(value || 0);
}

function getClientDisplayName(row) {
  if (row?.client_type === 'entreprise') {
    return row.company_name || row.full_name || 'Client';
  }

  return row.full_name || row.company_name || 'Client';
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
      total_invoiced: toNumber(summary.total_invoiced),
      total_paid: toNumber(summary.total_paid),
      total_balance_due: toNumber(summary.total_balance_due),
      invoices_count: toNumber(summary.invoices_count),
      unpaid_invoices_count: toNumber(summary.unpaid_invoices_count),
      partial_invoices_count: toNumber(summary.partial_invoices_count),
      paid_invoices_count: toNumber(summary.paid_invoices_count),
      draft_invoices_count: toNumber(summary.draft_invoices_count),
      payments_count: toNumber(paymentsStats.payments_count),
      payments_total: toNumber(paymentsStats.payments_total)
    },
    clients: {
      clients_count: toNumber(clientsStats.clients_count),
      active_clients_count: toNumber(clientsStats.active_clients_count),
      archived_clients_count: toNumber(clientsStats.archived_clients_count),
      company_clients_count: toNumber(clientsStats.company_clients_count),
      individual_clients_count: toNumber(clientsStats.individual_clients_count)
    },
    items: {
      items_count: toNumber(itemsStats.items_count),
      active_items_count: toNumber(itemsStats.active_items_count),
      disabled_items_count: toNumber(itemsStats.disabled_items_count),
      articles_count: toNumber(itemsStats.articles_count),
      services_count: toNumber(itemsStats.services_count)
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

  const totalInvoiced = toNumber(summary.total_invoiced);
  const totalPaid = toNumber(summary.total_paid);
  const invoicesCount = toNumber(summary.invoices_count);
  const paidInvoicesCount = toNumber(summary.paid_invoices_count);

  return {
    filters: {
      start_date: normalizedFilters.date_from,
      end_date: normalizedFilters.date_to,
      date_from: normalizedFilters.date_from,
      date_to: normalizedFilters.date_to
    },
    summary: {
      total_invoiced: totalInvoiced,
      total_paid: totalPaid,
      total_balance_due: toNumber(summary.total_balance_due),
      invoices_count: invoicesCount,
      draft_invoices_count: toNumber(summary.draft_invoices_count),
      unpaid_invoices_count: toNumber(summary.unpaid_invoices_count),
      partial_invoices_count: toNumber(summary.partial_invoices_count),
      paid_invoices_count: paidInvoicesCount,
      average_invoice_amount: toNumber(summary.average_invoice_amount),
      payments_count: toNumber(paymentsSummary.payments_count),
      payments_total: toNumber(paymentsSummary.payments_total),
      average_payment_amount: toNumber(paymentsSummary.average_payment_amount),
      paid_rate:
        invoicesCount > 0
          ? Number(((paidInvoicesCount / invoicesCount) * 100).toFixed(2))
          : 0
    },
    invoices_by_status: invoicesByStatus,
    payments_by_method: paymentsByMethod.map((row) => ({
      ...row,
      total_paid: toNumber(row.total_amount)
    })),
    top_clients: topClients.map((row) => ({
      client_id: row.id,
      client_name: getClientDisplayName(row),
      invoices_count: toNumber(row.invoices_count),
      total_invoiced: toNumber(row.total_invoiced),
      total_paid: toNumber(row.total_paid),
      balance_due: toNumber(row.balance_due),
      client_type: row.client_type,
      full_name: row.full_name,
      company_name: row.company_name,
      id: row.id
    })),
    unpaid_invoices: unpaidInvoices,
    monthly_revenue: monthlyRevenue
  };
}

export async function getReportsSummary(companyId, filters = {}) {
  requireCompanyId(companyId);
  const normalizedFilters = normalizeReportFilters(filters);

  const [summary, paymentsSummary] = await Promise.all([
    reportRepository.getReportsSummary(companyId, normalizedFilters),
    reportRepository.getReportsPaymentsSummary(companyId, normalizedFilters)
  ]);

  const totalInvoiced = toNumber(summary.total_invoiced);
  const invoicesCount = toNumber(summary.invoices_count);
  const paidInvoicesCount = toNumber(summary.paid_invoices_count);

  return {
    period: {
      start_date: normalizedFilters.date_from,
      end_date: normalizedFilters.date_to
    },
    total_invoiced: totalInvoiced,
    total_paid: toNumber(summary.total_paid),
    total_balance_due: toNumber(summary.total_balance_due),
    invoices_count: invoicesCount,
    payments_count: toNumber(paymentsSummary.payments_count),
    average_invoice_amount: toNumber(summary.average_invoice_amount),
    paid_rate:
      invoicesCount > 0
        ? Number(((paidInvoicesCount / invoicesCount) * 100).toFixed(2))
        : 0
  };
}

export async function getRevenueByMonth(companyId, filters = {}) {
  requireCompanyId(companyId);
  const normalizedFilters = normalizeReportFilters(filters);
  const rows = await reportRepository.getReportsMonthlyRevenue(
    companyId,
    normalizedFilters
  );

  return rows.map((row) => ({
    month: row.month,
    total_invoiced: toNumber(row.total_invoiced),
    total_paid: toNumber(row.total_paid),
    invoices_count: toNumber(row.invoices_count),
    balance_due: toNumber(row.balance_due)
  }));
}

export async function getInvoicesByStatusReport(companyId, filters = {}) {
  requireCompanyId(companyId);
  const normalizedFilters = normalizeReportFilters(filters);
  const rows = await reportRepository.getReportsInvoicesByStatus(
    companyId,
    normalizedFilters
  );

  return rows.map((row) => ({
    status: row.status,
    count: toNumber(row.count),
    total_amount: toNumber(row.total_amount),
    paid_amount: toNumber(row.paid_amount),
    balance_due: toNumber(row.balance_due)
  }));
}

export async function getTopClientsReport(companyId, filters = {}) {
  requireCompanyId(companyId);
  const normalizedFilters = normalizeReportFilters(filters);
  const rows = await reportRepository.getReportsTopClients(
    companyId,
    normalizedFilters,
    10
  );

  return rows.map((row) => ({
    client_id: row.id,
    client_name: getClientDisplayName(row),
    invoices_count: toNumber(row.invoices_count),
    total_invoiced: toNumber(row.total_invoiced),
    total_paid: toNumber(row.total_paid),
    balance_due: toNumber(row.balance_due)
  }));
}

export async function getPaymentsByMethodReport(companyId, filters = {}) {
  requireCompanyId(companyId);
  const normalizedFilters = normalizeReportFilters(filters);
  const rows = await reportRepository.getReportsPaymentsByMethod(
    companyId,
    normalizedFilters
  );

  return rows.map((row) => ({
    payment_method: row.payment_method,
    count: toNumber(row.count),
    total_paid: toNumber(row.total_amount)
  }));
}