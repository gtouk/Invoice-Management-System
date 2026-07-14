import * as superAdminRepository from './superAdmin.repository.js';
import * as auditLogService from '../audit-logs/auditLog.service.js';

function createHttpError(message, statusCode = 400, errors = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toNumber(value) {
  return Number(value || 0);
}

function normalizeCompanyId(companyId) {
  const id = String(companyId || '').trim();

  if (!id) {
    throw createHttpError('Identifiant entreprise invalide.', 400);
  }

  return id;
}

async function ensureCompanyExists(companyId) {
  const company = await superAdminRepository.findCompanyById(companyId);

  if (!company) {
    throw createHttpError('Entreprise introuvable.', 404);
  }

  return company;
}

export async function getPlatformStats() {
  const stats = await superAdminRepository.getPlatformStats();

  return {
    companies_count: toNumber(stats.companies_count),
    active_companies_count: toNumber(stats.active_companies_count),
    suspended_companies_count: toNumber(stats.suspended_companies_count),
    users_count: toNumber(stats.users_count),
    client_users_count: toNumber(stats.client_users_count),
    invoices_count: toNumber(stats.invoices_count),
    total_invoiced: toNumber(stats.total_invoiced),
    total_paid: toNumber(stats.total_paid),
    total_balance_due: toNumber(stats.total_balance_due),
    payments_count: toNumber(stats.payments_count)
  };
}

export async function listCompanies(query = {}) {
  const search =
    typeof query.search === 'string' ? query.search.trim() : '';
  const status = ['active', 'suspended', 'inactive'].includes(query.status)
    ? query.status
    : '';
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, 20), 100);

  const result = await superAdminRepository.findCompanies({
    search: search || null,
    status: status || null,
    page,
    limit
  });

  return {
    data: result.data.map((row) => ({
      ...row,
      users_count: toNumber(row.users_count),
      clients_count: toNumber(row.clients_count),
      invoices_count: toNumber(row.invoices_count),
      total_invoiced: toNumber(row.total_invoiced),
      total_paid: toNumber(row.total_paid),
      total_balance_due: toNumber(row.total_balance_due)
    })),
    meta: result.meta
  };
}

export async function getCompanyDetails(companyId) {
  const id = normalizeCompanyId(companyId);
  return ensureCompanyExists(id);
}

export async function suspendCompany(companyId) {
  const id = normalizeCompanyId(companyId);
  const existing = await ensureCompanyExists(id);

  if (existing.status === 'suspended') {
    return existing;
  }

  const updated = await superAdminRepository.updateCompanyStatus(
    id,
    'suspended'
  );

  if (!updated) {
    throw createHttpError('Impossible de suspendre l’entreprise.', 500);
  }

  return updated;
}

export async function activateCompany(companyId) {
  const id = normalizeCompanyId(companyId);
  const existing = await ensureCompanyExists(id);

  if (existing.status === 'active') {
    return existing;
  }

  const updated = await superAdminRepository.updateCompanyStatus(id, 'active');

  if (!updated) {
    throw createHttpError('Impossible d’activer l’entreprise.', 500);
  }

  return updated;
}

export async function getCompanyUsers(companyId) {
  const id = normalizeCompanyId(companyId);
  await ensureCompanyExists(id);
  return superAdminRepository.findCompanyUsers(id);
}

export async function listAuditLogs(query = {}) {
  return auditLogService.listGlobalAuditLogs(query);
}

export async function getAuditLogFilterOptions() {
  return auditLogService.getGlobalFilterOptions();
}

export async function getCompanySummary(companyId) {
  const id = normalizeCompanyId(companyId);
  const company = await ensureCompanyExists(id);
  const summary = await superAdminRepository.getCompanySummary(id);

  let commissionsCount = toNumber(summary?.commissions_count);

  try {
    const commissions = await superAdminRepository.countCompanyCommissions(id);
    commissionsCount = toNumber(commissions);
  } catch {
    commissionsCount = 0;
  }

  return {
    company,
    users_count: toNumber(summary?.users_count),
    admins_count: toNumber(summary?.admins_count),
    employees_count: toNumber(summary?.employees_count),
    clients_count: toNumber(summary?.clients_count),
    items_count: toNumber(summary?.items_count),
    invoices_count: toNumber(summary?.invoices_count),
    draft_invoices_count: toNumber(summary?.draft_invoices_count),
    unpaid_invoices_count: toNumber(summary?.unpaid_invoices_count),
    partial_invoices_count: toNumber(summary?.partial_invoices_count),
    paid_invoices_count: toNumber(summary?.paid_invoices_count),
    cancelled_invoices_count: toNumber(summary?.cancelled_invoices_count),
    payments_count: toNumber(summary?.payments_count),
    total_invoiced: toNumber(summary?.total_invoiced),
    total_paid: toNumber(summary?.total_paid),
    total_balance_due: toNumber(summary?.total_balance_due),
    bank_statements_count: toNumber(summary?.bank_statements_count),
    commissions_count: commissionsCount
  };
}
