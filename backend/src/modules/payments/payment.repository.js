import { query } from '../../database/db.js';

const paymentSelectFields = `
  p.id,
  p.company_id,
  p.invoice_id,
  i.invoice_number,
  p.client_id,
  c.full_name AS client_name,
  c.company_name,
  c.client_type,
  p.amount,
  p.payment_date,
  p.payment_method,
  p.reference,
  p.notes,
  p.created_by,
  u.full_name AS created_by_name,
  p.created_at,
  p.updated_at
`;

export async function findPayments(filters = {}, companyId) {
  const values = [companyId];
  const conditions = ['p.company_id = $1'];

  if (filters.invoice_id) {
    values.push(filters.invoice_id);
    conditions.push(`p.invoice_id = $${values.length}`);
  }

  if (filters.client_id) {
    values.push(filters.client_id);
    conditions.push(`p.client_id = $${values.length}`);
  }

  if (filters.payment_method) {
    values.push(filters.payment_method);
    conditions.push(`p.payment_method = $${values.length}`);
  }

  if (filters.date_from) {
    values.push(filters.date_from);
    conditions.push(`p.payment_date >= $${values.length}`);
  }

  if (filters.date_to) {
    values.push(filters.date_to);
    conditions.push(`p.payment_date <= $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`
      (
        i.invoice_number ILIKE $${values.length}
        OR c.full_name ILIKE $${values.length}
        OR c.company_name ILIKE $${values.length}
        OR p.reference ILIKE $${values.length}
        OR p.notes ILIKE $${values.length}
      )
    `);
  }

  const page = Number(filters.page || 1);
  const limit = Number(filters.limit || 20);
  const offset = (page - 1) * limit;

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM payments p
      INNER JOIN invoices i
        ON i.id = p.invoice_id
       AND i.company_id = p.company_id
      INNER JOIN clients c
        ON c.id = p.client_id
       AND c.company_id = p.company_id
      ${whereClause}
    `,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `
      SELECT
        ${paymentSelectFields}
      FROM payments p
      INNER JOIN invoices i
        ON i.id = p.invoice_id
       AND i.company_id = p.company_id
      INNER JOIN clients c
        ON c.id = p.client_id
       AND c.company_id = p.company_id
      LEFT JOIN users u ON u.id = p.created_by
      ${whereClause}
      ORDER BY p.payment_date DESC, p.created_at DESC
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
      total: countResult.rows[0].total
    }
  };
}

export async function findPaymentById(id, companyId) {
  const result = await query(
    `
      SELECT
        ${paymentSelectFields}
      FROM payments p
      INNER JOIN invoices i
        ON i.id = p.invoice_id
       AND i.company_id = p.company_id
      INNER JOIN clients c
        ON c.id = p.client_id
       AND c.company_id = p.company_id
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.id = $1
        AND p.company_id = $2
      LIMIT 1
    `,
    [id, companyId]
  );

  return result.rows[0] || null;
}

export async function findInvoiceForPayment(invoiceId, companyId) {
  const result = await query(
    `
      SELECT
        i.id,
        i.company_id,
        i.invoice_number,
        i.client_id,
        i.status,
        i.total_amount,
        i.paid_amount,
        i.balance_due,
        i.cancelled_at,
        c.full_name AS client_name,
        c.company_name,
        c.client_type
      FROM invoices i
      INNER JOIN clients c
        ON c.id = i.client_id
       AND c.company_id = i.company_id
      WHERE i.id = $1
        AND i.company_id = $2
      LIMIT 1
    `,
    [invoiceId, companyId]
  );

  return result.rows[0] || null;
}

export async function createPayment(data) {
  const result = await query(
    `
      INSERT INTO payments (
        company_id,
        invoice_id,
        client_id,
        amount,
        payment_date,
        payment_method,
        reference,
        notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        company_id,
        invoice_id,
        client_id,
        amount,
        payment_date,
        payment_method,
        reference,
        notes,
        created_by,
        created_at,
        updated_at
    `,
    [
      data.company_id,
      data.invoice_id,
      data.client_id,
      data.amount,
      data.payment_date,
      data.payment_method,
      data.reference || null,
      data.notes || null,
      data.created_by || null
    ]
  );

  return result.rows[0];
}

export async function updateInvoicePaymentSummary(invoiceId, companyId, summary) {
  const result = await query(
    `
      UPDATE invoices
      SET
        paid_amount = $1,
        balance_due = $2,
        status = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
        AND company_id = $5
      RETURNING
        id,
        company_id,
        invoice_number,
        client_id,
        status,
        issue_date,
        due_date,
        subtotal_amount,
        total_amount,
        paid_amount,
        balance_due,
        notes,
        pdf_url,
        created_by,
        created_at,
        updated_at
    `,
    [
      summary.paid_amount,
      summary.balance_due,
      summary.status,
      invoiceId,
      companyId
    ]
  );

  return result.rows[0] || null;
}

export async function findPaymentsByInvoice(invoiceId, companyId) {
  const result = await query(
    `
      SELECT
        ${paymentSelectFields}
      FROM payments p
      INNER JOIN invoices i
        ON i.id = p.invoice_id
       AND i.company_id = p.company_id
      INNER JOIN clients c
        ON c.id = p.client_id
       AND c.company_id = p.company_id
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.invoice_id = $1
        AND p.company_id = $2
      ORDER BY p.payment_date DESC, p.created_at DESC
    `,
    [invoiceId, companyId]
  );

  return result.rows;
}

export async function findPaymentsByClient(clientId, companyId) {
  const result = await query(
    `
      SELECT
        ${paymentSelectFields}
      FROM payments p
      INNER JOIN invoices i
        ON i.id = p.invoice_id
       AND i.company_id = p.company_id
      INNER JOIN clients c
        ON c.id = p.client_id
       AND c.company_id = p.company_id
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.client_id = $1
        AND p.company_id = $2
      ORDER BY p.payment_date DESC, p.created_at DESC
    `,
    [clientId, companyId]
  );

  return result.rows;
}