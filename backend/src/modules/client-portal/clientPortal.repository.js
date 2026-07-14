import { query } from '../../database/db.js';

export async function findClientByUserId(userId) {
  const result = await query(
    `SELECT
        c.id,
        c.company_id,
        c.user_id,
        c.client_code,
        c.full_name,
        c.phone,
        c.email,
        c.address,
        c.client_type,
        c.status,
        c.created_at,
        c.updated_at,
        c.archived_at,
        COALESCE(SUM(CASE WHEN i.status <> 'annulee' THEN i.total_amount ELSE 0 END), 0)::numeric(12,2) AS total_invoiced,
        COALESCE(SUM(CASE WHEN i.status <> 'annulee' THEN i.paid_amount ELSE 0 END), 0)::numeric(12,2) AS total_paid,
        COALESCE(SUM(CASE WHEN i.status <> 'annulee' THEN i.balance_due ELSE 0 END), 0)::numeric(12,2) AS balance_due
     FROM clients c
     LEFT JOIN invoices i ON i.client_id = c.id AND i.company_id = c.company_id
     WHERE c.user_id = $1
     GROUP BY c.id
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
}

export async function getClientDashboardStats(clientId, companyId) {
  const result = await query(
    `
      SELECT
        COUNT(i.id)::int AS invoices_count,
        COUNT(i.id) FILTER (WHERE i.status = 'payee')::int AS paid_invoices_count,
        COUNT(i.id) FILTER (WHERE i.status = 'non_payee')::int AS unpaid_invoices_count,
        COUNT(i.id) FILTER (WHERE i.status = 'partiellement_payee')::int AS partial_invoices_count,
        COUNT(i.id) FILTER (
          WHERE i.status IN ('non_payee', 'partiellement_payee')
            AND i.due_date IS NOT NULL
            AND i.due_date < CURRENT_DATE
        )::int AS overdue_invoices_count,
        COALESCE(SUM(i.total_amount) FILTER (WHERE i.status <> 'annulee'), 0)::numeric(12,2)
          AS total_invoiced,
        COALESCE(SUM(i.paid_amount) FILTER (WHERE i.status <> 'annulee'), 0)::numeric(12,2)
          AS total_paid,
        COALESCE(SUM(i.balance_due) FILTER (WHERE i.status <> 'annulee'), 0)::numeric(12,2)
          AS total_balance_due
      FROM invoices i
      WHERE i.client_id = $1
        AND i.company_id = $2
    `,
    [clientId, companyId]
  );

  return result.rows[0] || {};
}

export async function listRecentInvoicesForClient(clientId, companyId, limit = 5) {
  const result = await query(
    `
      SELECT
        id,
        invoice_number,
        status,
        issue_date,
        due_date,
        total_amount,
        paid_amount,
        balance_due,
        created_at
      FROM invoices
      WHERE client_id = $1
        AND company_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `,
    [clientId, companyId, limit]
  );

  return result.rows;
}

export async function listRecentPaymentsForClient(clientId, companyId, limit = 5) {
  const result = await query(
    `
      SELECT
        p.id,
        p.invoice_id,
        i.invoice_number,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.reference,
        p.created_at
      FROM payments p
      LEFT JOIN invoices i ON i.id = p.invoice_id
      WHERE p.client_id = $1
        AND p.company_id = $2
      ORDER BY p.payment_date DESC, p.created_at DESC
      LIMIT $3
    `,
    [clientId, companyId, limit]
  );

  return result.rows;
}

export async function listInvoicesByClientId(clientId) {
  const result = await query(
    `SELECT
        id,
        invoice_number,
        status,
        issue_date,
        due_date,
        total_amount,
        paid_amount,
        balance_due,
        pdf_url,
        created_at
     FROM invoices
     WHERE client_id = $1
     ORDER BY created_at DESC`,
    [clientId]
  );

  return result.rows;
}

export async function findInvoiceForClient(invoiceId, clientId) {
  const invoiceResult = await query(
    `SELECT
        id,
        company_id,
        invoice_number,
        status,
        issue_date,
        due_date,
        subtotal_amount,
        total_amount,
        paid_amount,
        balance_due,
        notes,
        pdf_url,
        created_at
     FROM invoices
     WHERE id = $1 AND client_id = $2
     LIMIT 1`,
    [invoiceId, clientId]
  );

  const invoice = invoiceResult.rows[0];
  if (!invoice) return null;

  const itemsResult = await query(
    `SELECT id, item_name, description, quantity, unit_price, line_total, payment_status
     FROM invoice_items
     WHERE invoice_id = $1
     ORDER BY created_at ASC`,
    [invoiceId]
  );

  return {
    ...invoice,
    items: itemsResult.rows
  };
}

export async function listPaymentsByClientId(clientId) {
  const result = await query(
    `SELECT
        p.id,
        p.invoice_id,
        i.invoice_number,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.reference,
        p.created_at
     FROM payments p
     LEFT JOIN invoices i ON i.id = p.invoice_id
     WHERE p.client_id = $1
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    [clientId]
  );

  return result.rows;
}
