import { query } from '../../database/db.js';

export async function getPlatformStats() {
  const result = await query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM companies) AS companies_count,
        (SELECT COUNT(*)::int FROM companies WHERE status = 'active') AS active_companies_count,
        (SELECT COUNT(*)::int FROM companies WHERE status = 'suspended') AS suspended_companies_count,
        (SELECT COUNT(*)::int FROM users) AS users_count,
        (
          SELECT COUNT(*)::int
          FROM users u
          INNER JOIN roles r ON r.id = u.role_id
          WHERE r.name = 'client'
        ) AS client_users_count,
        (SELECT COUNT(*)::int FROM invoices) AS invoices_count,
        (
          SELECT COALESCE(SUM(total_amount), 0)::numeric
          FROM invoices
          WHERE status <> 'annulee'
        ) AS total_invoiced,
        (
          SELECT COALESCE(SUM(paid_amount), 0)::numeric
          FROM invoices
          WHERE status <> 'annulee'
        ) AS total_paid,
        (
          SELECT COALESCE(SUM(balance_due), 0)::numeric
          FROM invoices
          WHERE status <> 'annulee'
        ) AS total_balance_due,
        (SELECT COUNT(*)::int FROM payments) AS payments_count
    `
  );

  return result.rows[0];
}

export async function findCompanies({ search, status, page, limit }) {
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(
        c.company_name ILIKE $${values.length}
        OR COALESCE(c.company_email, '') ILIKE $${values.length}
        OR COALESCE(c.company_phone, '') ILIKE $${values.length}
      )`
    );
  }

  if (status) {
    values.push(status);
    conditions.push(`c.status = $${values.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM companies c
      ${whereClause}
    `,
    values
  );

  const offset = (page - 1) * limit;
  values.push(limit);
  values.push(offset);

  const result = await query(
    `
      SELECT
        c.id,
        c.company_name,
        c.company_email,
        c.company_phone,
        c.company_address,
        c.company_logo_url,
        c.business_number,
        c.gst_hst_number,
        c.qst_number,
        c.status,
        c.created_at,
        c.updated_at,
        (
          SELECT COUNT(*)::int
          FROM users u
          WHERE u.company_id = c.id
        ) AS users_count,
        (
          SELECT COUNT(*)::int
          FROM clients cl
          WHERE cl.company_id = c.id
        ) AS clients_count,
        (
          SELECT COUNT(*)::int
          FROM invoices i
          WHERE i.company_id = c.id
            AND i.status <> 'annulee'
        ) AS invoices_count,
        (
          SELECT COALESCE(SUM(i.total_amount), 0)::numeric
          FROM invoices i
          WHERE i.company_id = c.id
            AND i.status <> 'annulee'
        ) AS total_invoiced,
        (
          SELECT COALESCE(SUM(i.paid_amount), 0)::numeric
          FROM invoices i
          WHERE i.company_id = c.id
            AND i.status <> 'annulee'
        ) AS total_paid,
        (
          SELECT COALESCE(SUM(i.balance_due), 0)::numeric
          FROM invoices i
          WHERE i.company_id = c.id
            AND i.status <> 'annulee'
        ) AS total_balance_due
      FROM companies c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values
  );

  return {
    data: result.rows,
    meta: {
      page,
      limit,
      total: countResult.rows[0]?.total || 0
    }
  };
}

export async function findCompanyById(companyId) {
  const result = await query(
    `
      SELECT
        c.id,
        c.company_name,
        c.company_email,
        c.company_phone,
        c.company_address,
        c.website,
        c.company_logo_url,
        c.business_number,
        c.gst_hst_number,
        c.qst_number,
        c.status,
        c.created_at,
        c.updated_at
      FROM companies c
      WHERE c.id = $1
      LIMIT 1
    `,
    [companyId]
  );

  return result.rows[0] || null;
}

export async function getCompanySummary(companyId) {
  const result = await query(
    `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM users u
          WHERE u.company_id = $1
        ) AS users_count,
        (
          SELECT COUNT(*)::int
          FROM users u
          INNER JOIN roles r ON r.id = u.role_id
          WHERE u.company_id = $1
            AND r.name IN ('admin', 'company_admin')
        ) AS admins_count,
        (
          SELECT COUNT(*)::int
          FROM users u
          INNER JOIN roles r ON r.id = u.role_id
          WHERE u.company_id = $1
            AND r.name = 'employee'
        ) AS employees_count,
        (
          SELECT COUNT(*)::int
          FROM clients cl
          WHERE cl.company_id = $1
        ) AS clients_count,
        (
          SELECT COUNT(*)::int
          FROM items it
          WHERE it.company_id = $1
        ) AS items_count,
        (
          SELECT COUNT(*)::int
          FROM invoices i
          WHERE i.company_id = $1
        ) AS invoices_count,
        (
          SELECT COUNT(*)::int
          FROM invoices i
          WHERE i.company_id = $1
            AND i.status = 'brouillon'
        ) AS draft_invoices_count,
        (
          SELECT COUNT(*)::int
          FROM invoices i
          WHERE i.company_id = $1
            AND i.status = 'non_payee'
        ) AS unpaid_invoices_count,
        (
          SELECT COUNT(*)::int
          FROM invoices i
          WHERE i.company_id = $1
            AND i.status = 'partiellement_payee'
        ) AS partial_invoices_count,
        (
          SELECT COUNT(*)::int
          FROM invoices i
          WHERE i.company_id = $1
            AND i.status = 'payee'
        ) AS paid_invoices_count,
        (
          SELECT COUNT(*)::int
          FROM invoices i
          WHERE i.company_id = $1
            AND i.status = 'annulee'
        ) AS cancelled_invoices_count,
        (
          SELECT COUNT(*)::int
          FROM payments p
          WHERE p.company_id = $1
        ) AS payments_count,
        (
          SELECT COALESCE(SUM(i.total_amount), 0)::numeric
          FROM invoices i
          WHERE i.company_id = $1
            AND i.status <> 'annulee'
        ) AS total_invoiced,
        (
          SELECT COALESCE(SUM(i.paid_amount), 0)::numeric
          FROM invoices i
          WHERE i.company_id = $1
            AND i.status <> 'annulee'
        ) AS total_paid,
        (
          SELECT COALESCE(SUM(i.balance_due), 0)::numeric
          FROM invoices i
          WHERE i.company_id = $1
            AND i.status <> 'annulee'
        ) AS total_balance_due,
        (
          SELECT COUNT(*)::int
          FROM bank_statements bs
          WHERE bs.company_id = $1
        ) AS bank_statements_count,
        0::int AS commissions_count
    `,
    [companyId]
  );

  return result.rows[0] || null;
}

export async function findCompanyUsers(companyId) {
  const result = await query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.username,
        r.name AS role,
        u.status,
        u.last_login_at,
        u.created_at
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.company_id = $1
      ORDER BY u.created_at DESC
    `,
    [companyId]
  );

  return result.rows;
}

export async function updateCompanyStatus(companyId, status) {
  const result = await query(
    `
      UPDATE companies
      SET
        status = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING
        id,
        company_name,
        company_email,
        company_phone,
        company_address,
        website,
        company_logo_url,
        business_number,
        gst_hst_number,
        qst_number,
        status,
        created_at,
        updated_at
    `,
    [companyId, status]
  );

  return result.rows[0] || null;
}

export async function findCompanyStatusById(companyId) {
  const result = await query(
    `
      SELECT id, status
      FROM companies
      WHERE id = $1
      LIMIT 1
    `,
    [companyId]
  );

  return result.rows[0] || null;
}

export async function countCompanyCommissions(companyId) {
  const result = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM commissions cm
      INNER JOIN invoices i ON i.id = cm.invoice_id
      WHERE i.company_id = $1
    `,
    [companyId]
  );

  return result.rows[0]?.count || 0;
}
