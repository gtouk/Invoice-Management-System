import { query } from '../../database/db.js';

export async function findClientByUserId(userId) {
  const result = await query(
    `SELECT
        c.id,
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
     LEFT JOIN invoices i ON i.client_id = c.id
     WHERE c.user_id = $1
     GROUP BY c.id
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
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
