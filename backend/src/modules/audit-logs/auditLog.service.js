import * as auditLogRepository from './auditLog.repository.js';

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

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeDate(value) {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createHttpError('Format de date invalide. Utilisez YYYY-MM-DD.', 422);
  }

  return normalized;
}

function buildCompanyFilters(query = {}, companyId) {
  return {
    company_id: companyId,
    action: normalizeOptionalString(query.action),
    entity_type: normalizeOptionalString(query.entity_type),
    start_date: normalizeDate(query.start_date),
    end_date: normalizeDate(query.end_date),
    page: parsePositiveInt(query.page, 1),
    limit: Math.min(parsePositiveInt(query.limit, 20), 100)
  };
}

function buildGlobalFilters(query = {}) {
  return {
    company_id: normalizeOptionalString(query.company_id),
    action: normalizeOptionalString(query.action),
    entity_type: normalizeOptionalString(query.entity_type),
    start_date: normalizeDate(query.start_date),
    end_date: normalizeDate(query.end_date),
    page: parsePositiveInt(query.page, 1),
    limit: Math.min(parsePositiveInt(query.limit, 20), 100)
  };
}

function mapCompanyLog(row) {
  return {
    id: row.id,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    actor_role: row.actor_role,
    user_id: row.user_id,
    user_full_name: row.user_full_name || null,
    user_email: row.user_email || null,
    metadata: row.metadata || {},
    ip_address: row.ip_address || null,
    created_at: row.created_at
  };
}

function mapGlobalLog(row) {
  return {
    ...mapCompanyLog(row),
    company_id: row.company_id || null,
    company_name: row.company_name || null
  };
}

export async function listCompanyAuditLogs(user, query = {}) {
  if (!user?.company_id) {
    throw createHttpError('Aucune entreprise associée à cet utilisateur.', 403);
  }

  if (!['admin', 'company_admin'].includes(user.role)) {
    throw createHttpError(
      'Accès réservé aux administrateurs de l’entreprise.',
      403
    );
  }

  const filters = buildCompanyFilters(query, user.company_id);
  const result = await auditLogRepository.findCompanyAuditLogs(filters);

  return {
    items: result.items.map(mapCompanyLog),
    meta: result.meta
  };
}

export async function listGlobalAuditLogs(query = {}) {
  const filters = buildGlobalFilters(query);
  const result = await auditLogRepository.findGlobalAuditLogs(filters);

  return {
    items: result.items.map(mapGlobalLog),
    meta: result.meta
  };
}

export async function getCompanyFilterOptions(user) {
  if (!user?.company_id) {
    throw createHttpError('Aucune entreprise associée à cet utilisateur.', 403);
  }

  const [actions, entityTypes] = await Promise.all([
    auditLogRepository.listDistinctActions(user.company_id),
    auditLogRepository.listDistinctEntityTypes(user.company_id)
  ]);

  return { actions, entity_types: entityTypes };
}

export async function getGlobalFilterOptions() {
  const [actions, entityTypes] = await Promise.all([
    auditLogRepository.listDistinctActions(null),
    auditLogRepository.listDistinctEntityTypes(null)
  ]);

  return { actions, entity_types: entityTypes };
}
