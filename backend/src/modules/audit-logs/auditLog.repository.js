import { query } from '../../database/db.js';

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildAuditFilters(filters = {}, { requireCompanyId = false } = {}) {
  const conditions = [];
  const values = [];

  if (requireCompanyId) {
    values.push(filters.company_id);
    conditions.push(`al.company_id = $${values.length}`);
  } else if (filters.company_id) {
    values.push(filters.company_id);
    conditions.push(`al.company_id = $${values.length}`);
  }

  if (filters.action) {
    values.push(filters.action);
    conditions.push(`al.action = $${values.length}`);
  }

  if (filters.entity_type) {
    values.push(filters.entity_type);
    conditions.push(`al.entity_type = $${values.length}`);
  }

  if (filters.start_date) {
    values.push(filters.start_date);
    conditions.push(`al.created_at >= $${values.length}::date`);
  }

  if (filters.end_date) {
    values.push(filters.end_date);
    conditions.push(`al.created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  };
}

export async function findCompanyAuditLogs(filters = {}) {
  const page = parsePositiveInt(filters.page, 1);
  const limit = Math.min(parsePositiveInt(filters.limit, 20), 100);
  const offset = (page - 1) * limit;

  const { whereClause, values } = buildAuditFilters(
    { ...filters, company_id: filters.company_id },
    { requireCompanyId: true }
  );

  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM audit_logs al
      ${whereClause}
    `,
    values
  );

  const listValues = [...values, limit, offset];

  const result = await query(
    `
      SELECT
        al.id,
        al.company_id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.actor_role,
        al.user_id,
        u.full_name AS user_full_name,
        u.email AS user_email,
        al.metadata,
        al.ip_address,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `,
    listValues
  );

  return {
    items: result.rows,
    meta: {
      page,
      limit,
      total: countResult.rows[0]?.total || 0
    }
  };
}

export async function findGlobalAuditLogs(filters = {}) {
  const page = parsePositiveInt(filters.page, 1);
  const limit = Math.min(parsePositiveInt(filters.limit, 20), 100);
  const offset = (page - 1) * limit;

  const { whereClause, values } = buildAuditFilters(filters, {
    requireCompanyId: false
  });

  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM audit_logs al
      ${whereClause}
    `,
    values
  );

  const listValues = [...values, limit, offset];

  const result = await query(
    `
      SELECT
        al.id,
        al.company_id,
        c.company_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.actor_role,
        al.user_id,
        u.full_name AS user_full_name,
        u.email AS user_email,
        al.metadata,
        al.ip_address,
        al.created_at
      FROM audit_logs al
      LEFT JOIN companies c ON c.id = al.company_id
      LEFT JOIN users u ON u.id = al.user_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `,
    listValues
  );

  return {
    items: result.rows,
    meta: {
      page,
      limit,
      total: countResult.rows[0]?.total || 0
    }
  };
}

export async function listDistinctActions(companyId = null) {
  const values = [];
  let where = '';

  if (companyId) {
    values.push(companyId);
    where = `WHERE company_id = $1`;
  }

  const result = await query(
    `
      SELECT DISTINCT action
      FROM audit_logs
      ${where}
      ORDER BY action ASC
    `,
    values
  );

  return result.rows.map((row) => row.action).filter(Boolean);
}

export async function listDistinctEntityTypes(companyId = null) {
  const values = [];
  let where = '';

  if (companyId) {
    values.push(companyId);
    where = `WHERE company_id = $1`;
  }

  const result = await query(
    `
      SELECT DISTINCT entity_type
      FROM audit_logs
      ${where}
      ORDER BY entity_type ASC
    `,
    values
  );

  return result.rows.map((row) => row.entity_type).filter(Boolean);
}
