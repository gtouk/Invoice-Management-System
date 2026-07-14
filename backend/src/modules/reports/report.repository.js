import { query } from '../../database/db.js';

function buildDateFilter(values, alias = 'i', dateColumn = 'issue_date') {
  const conditions = [];

  if (values.date_from) {
    values.params.push(values.date_from);
    conditions.push(`${alias}.${dateColumn} >= $${values.params.length}`);
  }

  if (values.date_to) {
    values.params.push(values.date_to);
    conditions.push(`${alias}.${dateColumn} <= $${values.params.length}`);
  }

  return conditions;
}

export async function getDashboardSummary(companyId) {
  const result = await query(
    `
      SELECT
        COALESCE(SUM(i.total_amount), 0)::numeric(12,2) AS total_invoiced,
        COALESCE(SUM(i.paid_amount), 0)::numeric(12,2) AS total_paid,
        COALESCE(SUM(i.balance_due), 0)::numeric(12,2) AS total_balance_due,

        COUNT(i.id)::int AS invoices_count,

        COUNT(i.id) FILTER (
          WHERE i.status = 'non_payee'
        )::int AS unpaid_invoices_count,

        COUNT(i.id) FILTER (
          WHERE i.status = 'partiellement_payee'
        )::int AS partial_invoices_count,

        COUNT(i.id) FILTER (
          WHERE i.status = 'payee'
        )::int AS paid_invoices_count,

        COUNT(i.id) FILTER (
          WHERE i.status = 'brouillon'
        )::int AS draft_invoices_count
      FROM invoices i
      WHERE i.company_id = $1
        AND i.status <> 'annulee'
    `,
    [companyId]
  );

  return result.rows[0];
}

export async function getClientsStats(companyId) {
  const result = await query(
    `
      SELECT
        COUNT(c.id)::int AS clients_count,
        COUNT(c.id) FILTER (WHERE c.status = 'actif')::int AS active_clients_count,
        COUNT(c.id) FILTER (WHERE c.status = 'archive')::int AS archived_clients_count,
        COUNT(c.id) FILTER (WHERE c.client_type = 'entreprise')::int AS company_clients_count,
        COUNT(c.id) FILTER (WHERE c.client_type = 'particulier')::int AS individual_clients_count
      FROM clients c
      WHERE c.company_id = $1
    `,
    [companyId]
  );

  return result.rows[0];
}

export async function getItemsStats(companyId) {
  const result = await query(
    `
      SELECT
        COUNT(i.id)::int AS items_count,
        COUNT(i.id) FILTER (WHERE i.status = 'actif')::int AS active_items_count,
        COUNT(i.id) FILTER (WHERE i.status = 'desactive')::int AS disabled_items_count,
        COUNT(i.id) FILTER (WHERE i.item_type = 'article')::int AS articles_count,
        COUNT(i.id) FILTER (WHERE i.item_type = 'service')::int AS services_count
      FROM items i
      WHERE i.company_id = $1
    `,
    [companyId]
  );

  return result.rows[0];
}

export async function getPaymentsStats(companyId) {
  const result = await query(
    `
      SELECT
        COUNT(p.id)::int AS payments_count,
        COALESCE(SUM(p.amount), 0)::numeric(12,2) AS payments_total
      FROM payments p
      WHERE p.company_id = $1
    `,
    [companyId]
  );

  return result.rows[0];
}

export async function getRecentInvoices(companyId, limit = 5) {
  const result = await query(
    `
      SELECT
        i.id,
        i.invoice_number,
        i.status,
        i.issue_date,
        i.due_date,
        i.total_amount,
        i.paid_amount,
        i.balance_due,
        i.pdf_url,
        c.full_name AS client_name,
        c.company_name,
        c.client_type
      FROM invoices i
      INNER JOIN clients c ON c.id = i.client_id
      WHERE i.company_id = $1
      ORDER BY i.created_at DESC
      LIMIT $2
    `,
    [companyId, limit]
  );

  return result.rows;
}

export async function getRecentPayments(companyId, limit = 5) {
  const result = await query(
    `
      SELECT
        p.id,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.reference,
        p.created_at,
        i.id AS invoice_id,
        i.invoice_number,
        c.full_name AS client_name,
        c.company_name,
        c.client_type
      FROM payments p
      INNER JOIN invoices i ON i.id = p.invoice_id
      INNER JOIN clients c ON c.id = p.client_id
      WHERE p.company_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2
    `,
    [companyId, limit]
  );

  return result.rows;
}

export async function getUnpaidClients(companyId, limit = 5) {
  const result = await query(
    `
      SELECT
        c.id,
        c.full_name,
        c.company_name,
        c.client_type,
        c.phone,
        c.email,
        COUNT(i.id)::int AS invoices_count,
        COALESCE(SUM(i.balance_due), 0)::numeric(12,2) AS balance_due
      FROM clients c
      INNER JOIN invoices i ON i.client_id = c.id
      WHERE c.company_id = $1
        AND i.company_id = $1
        AND i.status IN ('non_payee', 'partiellement_payee')
        AND i.balance_due > 0
      GROUP BY c.id
      ORDER BY balance_due DESC
      LIMIT $2
    `,
    [companyId, limit]
  );

  return result.rows;
}

export async function getInvoicesByStatus(companyId) {
  const result = await query(
    `
      SELECT
        status,
        COUNT(*)::int AS count,
        COALESCE(SUM(total_amount), 0)::numeric(12,2) AS total_amount,
        COALESCE(SUM(balance_due), 0)::numeric(12,2) AS balance_due
      FROM invoices
      WHERE company_id = $1
      GROUP BY status
      ORDER BY status ASC
    `,
    [companyId]
  );

  return result.rows;
}

export async function getReportsSummary(companyId, filters = {}) {
  const values = {
    params: [companyId],
    date_from: filters.date_from,
    date_to: filters.date_to
  };

  const conditions = [
    'i.company_id = $1',
    "i.status <> 'annulee'"
  ];

  conditions.push(...buildDateFilter(values, 'i', 'issue_date'));

  const result = await query(
    `
      SELECT
        COALESCE(SUM(i.total_amount), 0)::numeric(12,2) AS total_invoiced,
        COALESCE(SUM(i.paid_amount), 0)::numeric(12,2) AS total_paid,
        COALESCE(SUM(i.balance_due), 0)::numeric(12,2) AS total_balance_due,

        COUNT(i.id)::int AS invoices_count,

        COUNT(i.id) FILTER (WHERE i.status = 'brouillon')::int AS draft_invoices_count,
        COUNT(i.id) FILTER (WHERE i.status = 'non_payee')::int AS unpaid_invoices_count,
        COUNT(i.id) FILTER (WHERE i.status = 'partiellement_payee')::int AS partial_invoices_count,
        COUNT(i.id) FILTER (WHERE i.status = 'payee')::int AS paid_invoices_count,

        COALESCE(AVG(i.total_amount), 0)::numeric(12,2) AS average_invoice_amount
      FROM invoices i
      WHERE ${conditions.join(' AND ')}
    `,
    values.params
  );

  return result.rows[0];
}

export async function getReportsPaymentsSummary(companyId, filters = {}) {
  const values = {
    params: [companyId],
    date_from: filters.date_from,
    date_to: filters.date_to
  };

  const conditions = ['p.company_id = $1'];
  conditions.push(...buildDateFilter(values, 'p', 'payment_date'));

  const result = await query(
    `
      SELECT
        COUNT(p.id)::int AS payments_count,
        COALESCE(SUM(p.amount), 0)::numeric(12,2) AS payments_total,
        COALESCE(AVG(p.amount), 0)::numeric(12,2) AS average_payment_amount
      FROM payments p
      WHERE ${conditions.join(' AND ')}
    `,
    values.params
  );

  return result.rows[0];
}

export async function getReportsInvoicesByStatus(companyId, filters = {}) {
  const values = {
    params: [companyId],
    date_from: filters.date_from,
    date_to: filters.date_to
  };

  const conditions = ['i.company_id = $1'];
  conditions.push(...buildDateFilter(values, 'i', 'issue_date'));

  const result = await query(
    `
      SELECT
        i.status,
        COUNT(i.id)::int AS count,
        COALESCE(SUM(i.total_amount), 0)::numeric(12,2) AS total_amount,
        COALESCE(SUM(i.paid_amount), 0)::numeric(12,2) AS paid_amount,
        COALESCE(SUM(i.balance_due), 0)::numeric(12,2) AS balance_due
      FROM invoices i
      WHERE ${conditions.join(' AND ')}
      GROUP BY i.status
      ORDER BY i.status ASC
    `,
    values.params
  );

  return result.rows;
}

export async function getReportsPaymentsByMethod(companyId, filters = {}) {
  const values = {
    params: [companyId],
    date_from: filters.date_from,
    date_to: filters.date_to
  };

  const conditions = ['p.company_id = $1'];
  conditions.push(...buildDateFilter(values, 'p', 'payment_date'));

  const result = await query(
    `
      SELECT
        p.payment_method,
        COUNT(p.id)::int AS count,
        COALESCE(SUM(p.amount), 0)::numeric(12,2) AS total_amount
      FROM payments p
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.payment_method
      ORDER BY total_amount DESC
    `,
    values.params
  );

  return result.rows;
}

export async function getReportsTopClients(companyId, filters = {}, limit = 10) {
  const values = {
    params: [companyId],
    date_from: filters.date_from,
    date_to: filters.date_to
  };

  const conditions = [
    'i.company_id = $1',
    "i.status <> 'annulee'"
  ];

  conditions.push(...buildDateFilter(values, 'i', 'issue_date'));

  values.params.push(limit);

  const result = await query(
    `
      SELECT
        c.id,
        c.full_name,
        c.company_name,
        c.client_type,
        c.email,
        c.phone,
        COUNT(i.id)::int AS invoices_count,
        COALESCE(SUM(i.total_amount), 0)::numeric(12,2) AS total_invoiced,
        COALESCE(SUM(i.paid_amount), 0)::numeric(12,2) AS total_paid,
        COALESCE(SUM(i.balance_due), 0)::numeric(12,2) AS balance_due
      FROM invoices i
      INNER JOIN clients c ON c.id = i.client_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY c.id
      ORDER BY total_invoiced DESC
      LIMIT $${values.params.length}
    `,
    values.params
  );

  return result.rows;
}

export async function getReportsUnpaidInvoices(companyId, filters = {}, limit = 20) {
  const values = {
    params: [companyId],
    date_from: filters.date_from,
    date_to: filters.date_to
  };

  const conditions = [
    'i.company_id = $1',
    "i.status IN ('non_payee', 'partiellement_payee')",
    'i.balance_due > 0'
  ];

  conditions.push(...buildDateFilter(values, 'i', 'issue_date'));

  values.params.push(limit);

  const result = await query(
    `
      SELECT
        i.id,
        i.invoice_number,
        i.issue_date,
        i.due_date,
        i.status,
        i.total_amount,
        i.paid_amount,
        i.balance_due,
        c.full_name AS client_name,
        c.company_name,
        c.client_type,
        c.email AS client_email
      FROM invoices i
      INNER JOIN clients c ON c.id = i.client_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY i.due_date ASC NULLS LAST, i.issue_date DESC
      LIMIT $${values.params.length}
    `,
    values.params
  );

  return result.rows;
}

export async function getReportsMonthlyRevenue(companyId, filters = {}) {
  const values = {
    params: [companyId],
    date_from: filters.date_from,
    date_to: filters.date_to
  };

  const conditions = [
    'i.company_id = $1',
    "i.status <> 'annulee'"
  ];

  conditions.push(...buildDateFilter(values, 'i', 'issue_date'));

  const result = await query(
    `
      SELECT
        TO_CHAR(DATE_TRUNC('month', i.issue_date), 'YYYY-MM') AS month,
        COUNT(i.id)::int AS invoices_count,
        COALESCE(SUM(i.total_amount), 0)::numeric(12,2) AS total_invoiced,
        COALESCE(SUM(i.paid_amount), 0)::numeric(12,2) AS total_paid,
        COALESCE(SUM(i.balance_due), 0)::numeric(12,2) AS balance_due
      FROM invoices i
      WHERE ${conditions.join(' AND ')}
      GROUP BY DATE_TRUNC('month', i.issue_date)
      ORDER BY DATE_TRUNC('month', i.issue_date) ASC
    `,
    values.params
  );

  return result.rows;
}