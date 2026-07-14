import { query } from '../../database/db.js';

const invoiceFields = `
  i.id,
  i.company_id,
  i.invoice_number,
  i.client_id,

  c.full_name AS client_name,
  c.phone AS client_phone,
  c.email AS client_email,
  c.address AS client_address,
  c.client_type,
  c.membership_status,
  c.company_name,
  c.contact_person_name,
  c.tax_number,
  c.registration_number,
  c.national_id,
  c.website,
  c.billing_email,
  c.billing_phone,
  c.billing_address,

  i.status,
  i.issue_date,
  i.due_date,
  i.subtotal_amount,
  i.total_amount,
  i.paid_amount,
  i.balance_due,

  i.taxes_enabled,
  i.gst_hst_rate,
  i.gst_hst_amount,
  i.qst_rate,
  i.qst_amount,
  i.custom_tax_label,
  i.custom_tax_rate,
  i.custom_tax_amount,
  i.tax_amount,

  i.notes,
  i.pdf_url,

  COALESCE(i.reminders_enabled, true) AS reminders_enabled,
  i.last_reminder_sent_at,
  i.next_reminder_at,
  COALESCE(i.reminder_count, 0) AS reminder_count,

  i.created_by,
  i.created_at,
  i.updated_at,
  i.cancelled_at,
  i.cancelled_by,
  i.cancellation_reason
`;

const invoiceReturningFields = `
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

  taxes_enabled,
  gst_hst_rate,
  gst_hst_amount,
  qst_rate,
  qst_amount,
  custom_tax_label,
  custom_tax_rate,
  custom_tax_amount,
  tax_amount,

  notes,
  pdf_url,

  reminders_enabled,
  last_reminder_sent_at,
  next_reminder_at,
  reminder_count,

  created_by,
  created_at,
  updated_at,
  cancelled_at,
  cancelled_by,
  cancellation_reason
`;

export async function findClientById(clientId, companyId) {
  const result = await query(
    `
      SELECT
        id,
        company_id,
        full_name,
        phone,
        email,
        address,
        client_type,
        membership_status,
        status,
        notes,
        company_name,
        contact_person_name,
        tax_number,
        registration_number,
        national_id,
        website,
        billing_email,
        billing_phone,
        billing_address
      FROM clients
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
    `,
    [clientId, companyId]
  );

  return result.rows[0] || null;
}

export async function findItemById(itemId, companyId) {
  const result = await query(
    `
      SELECT
        id,
        company_id,
        name,
        description,
        item_type,
        default_price,
        member_price,
        non_member_price,
        status
      FROM items
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
    `,
    [itemId, companyId]
  );

  return result.rows[0] || null;
}

export async function findInvoices(filters = {}, companyId) {
  const values = [companyId];
  const conditions = ['i.company_id = $1'];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`i.status = $${values.length}`);
  }

  if (filters.client_id) {
    values.push(filters.client_id);
    conditions.push(`i.client_id = $${values.length}`);
  }

  if (filters.date_from) {
    values.push(filters.date_from);
    conditions.push(`i.issue_date >= $${values.length}`);
  }

  if (filters.date_to) {
    values.push(filters.date_to);
    conditions.push(`i.issue_date <= $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`
      (
        i.invoice_number ILIKE $${values.length}
        OR c.full_name ILIKE $${values.length}
        OR c.company_name ILIKE $${values.length}
        OR c.email ILIKE $${values.length}
        OR c.billing_email ILIKE $${values.length}
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
      FROM invoices i
      INNER JOIN clients c
        ON c.id = i.client_id
       AND c.company_id = i.company_id
      ${whereClause}
    `,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `
      SELECT ${invoiceFields}
      FROM invoices i
      INNER JOIN clients c
        ON c.id = i.client_id
       AND c.company_id = i.company_id
      ${whereClause}
      ORDER BY i.created_at DESC
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

export async function createInvoice(data) {
  const invoiceResult = await query(
    `
      INSERT INTO invoices (
        company_id,
        client_id,
        status,
        issue_date,
        due_date,
        subtotal_amount,
        total_amount,
        paid_amount,
        balance_due,

        taxes_enabled,
        gst_hst_rate,
        gst_hst_amount,
        qst_rate,
        qst_amount,
        custom_tax_label,
        custom_tax_rate,
        custom_tax_amount,
        tax_amount,

        notes,
        reminders_enabled,
        reminder_count,
        created_by,
        created_at
      )
      VALUES (
        $1,
        $2,
        'brouillon',
        $3,
        $4,
        $5,
        $6,
        COALESCE($7, 0),
        $8,

        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,

        $18,
        true,
        0,
        $19,
        CURRENT_TIMESTAMP
      )
      RETURNING ${invoiceReturningFields}
    `,
    [
      data.company_id,
      data.client_id,
      data.issue_date,
      data.due_date || null,
      data.subtotal_amount,
      data.total_amount,
      data.paid_amount || 0,
      data.balance_due,

      data.taxes_enabled || false,
      data.gst_hst_rate || 0,
      data.gst_hst_amount || 0,
      data.qst_rate || 0,
      data.qst_amount || 0,
      data.custom_tax_label || null,
      data.custom_tax_rate || 0,
      data.custom_tax_amount || 0,
      data.tax_amount || 0,

      data.notes || null,
      data.created_by || null
    ]
  );

  const invoice = invoiceResult.rows[0];

  for (const item of data.items || []) {
    await query(
      `
        INSERT INTO invoice_items (
          invoice_id,
          item_id,
          item_name,
          description,
          quantity,
          unit_price,
          line_total,
          payment_status,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'non_paye', CURRENT_TIMESTAMP)
      `,
      [
        invoice.id,
        item.item_id,
        item.item_name,
        item.description || null,
        item.quantity,
        item.unit_price,
        item.line_total
      ]
    );
  }

  return findInvoiceById(invoice.id, data.company_id);
}

export async function findInvoiceById(id, companyId) {
  const invoiceResult = await query(
    `
      SELECT ${invoiceFields}
      FROM invoices i
      INNER JOIN clients c
        ON c.id = i.client_id
       AND c.company_id = i.company_id
      WHERE i.id = $1
        AND i.company_id = $2
      LIMIT 1
    `,
    [id, companyId]
  );

  const invoice = invoiceResult.rows[0];

  if (!invoice) {
    return null;
  }

  const itemsResult = await query(
    `
      SELECT
        ii.id,
        ii.invoice_id,
        ii.item_id,
        ii.item_name,
        ii.description,
        ii.quantity,
        ii.unit_price,
        ii.line_total,
        ii.payment_status,
        ii.created_at,
        ii.updated_at
      FROM invoice_items ii
      WHERE ii.invoice_id = $1
      ORDER BY ii.created_at ASC
    `,
    [id]
  );

  return {
    ...invoice,
    items: itemsResult.rows
  };
}

export async function getNextInvoiceNumber(companyId, year) {
  const prefix = `FAC-${year}-`;

  const result = await query(
    `
      SELECT invoice_number
      FROM invoices
      WHERE company_id = $1
        AND invoice_number LIKE $2
      ORDER BY invoice_number DESC
      LIMIT 1
    `,
    [companyId, `${prefix}%`]
  );

  const lastInvoiceNumber = result.rows[0]?.invoice_number;

  if (!lastInvoiceNumber) {
    return `${prefix}000001`;
  }

  const lastSequence = Number(lastInvoiceNumber.replace(prefix, ''));

  if (Number.isNaN(lastSequence)) {
    return `${prefix}000001`;
  }

  const nextSequence = lastSequence + 1;

  return `${prefix}${String(nextSequence).padStart(6, '0')}`;
}

export async function generateInvoice(id, companyId, invoiceNumber) {
  const result = await query(
    `
      UPDATE invoices
      SET
        invoice_number = $1,
        status = CASE
          WHEN balance_due <= 0 THEN 'payee'
          ELSE 'non_payee'
        END,
        reminders_enabled = COALESCE(reminders_enabled, true),
        reminder_count = COALESCE(reminder_count, 0),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
        AND company_id = $3
        AND status = 'brouillon'
      RETURNING ${invoiceReturningFields}
    `,
    [invoiceNumber, id, companyId]
  );

  return result.rows[0] || null;
}

export async function updateInvoicePdfUrl(invoiceId, companyId, pdfUrl) {
  const result = await query(
    `
      UPDATE invoices
      SET
        pdf_url = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
        AND company_id = $3
      RETURNING ${invoiceReturningFields}
    `,
    [pdfUrl, invoiceId, companyId]
  );

  return result.rows[0] || null;
}

export async function cancelInvoice(id, companyId, userId, reason) {
  const result = await query(
    `
      UPDATE invoices
      SET
        status = 'annulee',
        cancelled_at = CURRENT_TIMESTAMP,
        cancelled_by = $1,
        cancellation_reason = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
        AND company_id = $4
        AND status <> 'annulee'
      RETURNING ${invoiceReturningFields}
    `,
    [userId || null, reason || null, id, companyId]
  );

  return result.rows[0] || null;
}

export async function createInvoiceEmailLog(data) {
  const result = await query(
    `
      INSERT INTO invoice_email_logs (
        company_id,
        invoice_id,
        sender_email,
        sender_name,
        recipient_email,
        cc_email,
        bcc_email,
        subject,
        body,
        attachment_url,
        attachment_name,
        status,
        error_message,
        sent_by,
        sent_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14,
        CURRENT_TIMESTAMP
      )
      RETURNING
        id,
        company_id,
        invoice_id,
        sender_email,
        sender_name,
        recipient_email,
        cc_email,
        bcc_email,
        subject,
        body,
        attachment_url,
        attachment_name,
        status,
        error_message,
        sent_by,
        sent_at
    `,
    [
      data.company_id,
      data.invoice_id,
      data.sender_email || null,
      data.sender_name || null,
      data.recipient_email,
      data.cc_email || null,
      data.bcc_email || null,
      data.subject,
      data.body || null,
      data.attachment_url || null,
      data.attachment_name || null,
      data.status,
      data.error_message || null,
      data.sent_by || null
    ]
  );

  return result.rows[0];
}

export async function findInvoiceEmailLogs(invoiceId, companyId) {
  const result = await query(
    `
      SELECT
        iel.id,
        iel.company_id,
        iel.invoice_id,
        iel.sender_email,
        iel.sender_name,
        iel.recipient_email,
        iel.cc_email,
        iel.bcc_email,
        iel.subject,
        iel.body,
        iel.attachment_url,
        iel.attachment_name,
        iel.status,
        iel.error_message,
        iel.sent_by,
        u.full_name AS sent_by_name,
        iel.sent_at
      FROM invoice_email_logs iel
      LEFT JOIN users u ON u.id = iel.sent_by
      WHERE iel.invoice_id = $1
        AND iel.company_id = $2
      ORDER BY iel.sent_at DESC
    `,
    [invoiceId, companyId]
  );

  return result.rows;
}