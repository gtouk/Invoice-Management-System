import * as dashboardRepository from './dashboard.repository.js';
import * as reportRepository from '../reports/report.repository.js';

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requireCompanyId(companyId) {
  if (!companyId) {
    throw createHttpError('Aucune entreprise associée à cet utilisateur.', 403);
  }
}

function toNumber(value) {
  return Number(value || 0);
}

export async function getDashboardSummary(user) {
  if (!user?.role || !['admin', 'company_admin', 'employee'].includes(user.role)) {
    throw createHttpError('Accès réservé aux utilisateurs internes de l’entreprise.', 403);
  }

  requireCompanyId(user.company_id);

  const companyId = user.company_id;

  const [summary, paymentsStats, recentInvoices, recentPayments, upcomingDue] =
    await Promise.all([
      dashboardRepository.getCompanyDashboardSummary(companyId),
      dashboardRepository.getCompanyPaymentsDashboardStats(companyId),
      reportRepository.getRecentInvoices(companyId, 5),
      reportRepository.getRecentPayments(companyId, 5),
      dashboardRepository.getUpcomingDueInvoices(companyId, 7, 5)
    ]);

  return {
    clients_count: toNumber(summary.clients_count),
    items_count: toNumber(summary.items_count),
    invoices_count: toNumber(summary.invoices_count),
    draft_invoices_count: toNumber(summary.draft_invoices_count),
    sent_invoices_count: toNumber(summary.sent_invoices_count),
    paid_invoices_count: toNumber(summary.paid_invoices_count),
    partial_invoices_count: toNumber(summary.partial_invoices_count),
    overdue_invoices_count: toNumber(summary.overdue_invoices_count),
    cancelled_invoices_count: toNumber(summary.cancelled_invoices_count),
    payments_count: toNumber(paymentsStats.payments_count),
    total_invoiced: toNumber(summary.total_invoiced),
    total_paid: toNumber(summary.total_paid),
    total_balance_due: toNumber(summary.total_balance_due),
    payments_this_month: toNumber(paymentsStats.payments_this_month),
    invoiced_this_month: toNumber(summary.invoiced_this_month),
    recent_invoices: recentInvoices,
    recent_payments: recentPayments,
    upcoming_due_invoices: upcomingDue
  };
}
