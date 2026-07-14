import { query } from '../../database/db.js';

const clientSelectFields = `
  c.id,
  c.company_id,
  c.user_id,
  c.client_code,
  c.full_name,
  c.phone,
  c.email,
  c.address,
  c.client_type,
  c.membership_status,
  c.status,
  c.notes,
  c.company_name,
  c.contact_person_name,
  c.tax_number,
  c.registration_number,
  c.national_id,
  c.website,
  c.billing_email,
  c.billing_phone,
  c.billing_address,
  c.created_by,
  c.created_at,
  c.updated_at,
  c.archived_at
`;

export async function findClients(filters = {}, companyId) {
  const values = [companyId];
  const conditions = ['c.company_id = $1'];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`
      (
        c.full_name ILIKE $${values.length}
        OR c.phone ILIKE $${values.length}
        OR c.email ILIKE $${values.length}
        OR c.address ILIKE $${values.length}
        OR c.company_name ILIKE $${values.length}
        OR c.contact_person_name ILIKE $${values.length}
        OR c.tax_number ILIKE $${values.length}
        OR c.registration_number ILIKE $${values.length}
        OR c.national_id ILIKE $${values.length}
        OR c.billing_email ILIKE $${values.length}
        OR c.billing_phone ILIKE $${values.length}
        OR c.billing_address ILIKE $${values.length}
      )
    `);
  }

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`c.status = $${values.length}`);
  } else {
    conditions.push(`c.status = 'actif'`);
  }

  if (filters.type) {
    values.push(filters.type);
    conditions.push(`c.client_type = $${values.length}`);
  }

  if (filters.membership_status) {
    values.push(filters.membership_status);
    conditions.push(`c.membership_status = $${values.length}`);
  }

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM clients c
      ${whereClause}
    `,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `
      SELECT
        ${clientSelectFields},
        COALESCE(SUM(i.balance_due), 0)::numeric(12,2) AS balance_due
      FROM clients c
      LEFT JOIN invoices i
        ON i.client_id = c.id
       AND i.company_id = c.company_id
      ${whereClause}
      GROUP BY c.id
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
      total: countResult.rows[0].total
    }
  };
}

export async function findClientById(id, companyId) {
  const result = await query(
    `
      SELECT
        ${clientSelectFields},
        COALESCE(SUM(i.total_amount), 0)::numeric(12,2) AS total_invoiced,
        COALESCE(SUM(i.paid_amount), 0)::numeric(12,2) AS total_paid,
        COALESCE(SUM(i.balance_due), 0)::numeric(12,2) AS balance_due
      FROM clients c
      LEFT JOIN invoices i
        ON i.client_id = c.id
       AND i.company_id = c.company_id
      WHERE c.id = $1
        AND c.company_id = $2
      GROUP BY c.id
      LIMIT 1
    `,
    [id, companyId]
  );

  const client = result.rows[0] || null;

  if (!client) {
    return null;
  }

  return {
    ...client,
    financial_summary: {
      total_invoiced: Number(client.total_invoiced || 0),
      total_paid: Number(client.total_paid || 0),
      balance_due: Number(client.balance_due || 0)
    }
  };
}

export async function createClient(data) {
  const result = await query(
    `
      INSERT INTO clients (
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
        billing_address,
        created_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'actif', $8,
        $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
      RETURNING
        id,
        company_id,
        user_id,
        client_code,
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
        billing_address,
        created_by,
        created_at,
        updated_at,
        archived_at
    `,
    [
      data.company_id,
      data.full_name,
      data.phone,
      data.email,
      data.address,
      data.client_type,
      data.membership_status || 'non_membre',
      data.notes,
      data.company_name,
      data.contact_person_name,
      data.tax_number,
      data.registration_number,
      data.national_id,
      data.website,
      data.billing_email,
      data.billing_phone,
      data.billing_address,
      data.created_by || null
    ]
  );

  return result.rows[0];
}

export async function updateClient(id, data, companyId) {
  const result = await query(
    `
      UPDATE clients
      SET
        full_name = $1,
        phone = $2,
        email = $3,
        address = $4,
        client_type = $5,
        membership_status = $6,
        notes = $7,
        company_name = $8,
        contact_person_name = $9,
        tax_number = $10,
        registration_number = $11,
        national_id = $12,
        website = $13,
        billing_email = $14,
        billing_phone = $15,
        billing_address = $16,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
        AND company_id = $18
      RETURNING
        id,
        company_id,
        user_id,
        client_code,
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
        billing_address,
        created_by,
        created_at,
        updated_at,
        archived_at
    `,
    [
      data.full_name,
      data.phone,
      data.email,
      data.address,
      data.client_type,
      data.membership_status || 'non_membre',
      data.notes,
      data.company_name,
      data.contact_person_name,
      data.tax_number,
      data.registration_number,
      data.national_id,
      data.website,
      data.billing_email,
      data.billing_phone,
      data.billing_address,
      id,
      companyId
    ]
  );

  return result.rows[0] || null;
}

export async function archiveClient(id, companyId) {
  const result = await query(
    `
      UPDATE clients
      SET
        status = 'archive',
        archived_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND company_id = $2
      RETURNING
        id,
        company_id,
        user_id,
        client_code,
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
        billing_address,
        created_by,
        created_at,
        updated_at,
        archived_at
    `,
    [id, companyId]
  );

  return result.rows[0] || null;
}

export async function reactivateClient(id, companyId) {
  const result = await query(
    `
      UPDATE clients
      SET
        status = 'actif',
        archived_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND company_id = $2
      RETURNING
        id,
        company_id,
        user_id,
        client_code,
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
        billing_address,
        created_by,
        created_at,
        updated_at,
        archived_at
    `,
    [id, companyId]
  );

  return result.rows[0] || null;
}

export async function deleteClient(id, companyId) {
  const result = await query(
    `
      DELETE FROM clients
      WHERE id = $1
        AND company_id = $2
      RETURNING id
    `,
    [id, companyId]
  );

  return result.rows[0] || null;
}

export async function countClientInvoices(id, companyId) {
  const result = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM invoices
      WHERE client_id = $1
        AND company_id = $2
    `,
    [id, companyId]
  );

  return result.rows[0].total;
}

export async function countClientPayments(id, companyId) {
  const result = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM payments
      WHERE client_id = $1
        AND company_id = $2
    `,
    [id, companyId]
  );

  return result.rows[0].total;
}

export async function getClientHistory(id, companyId) {
  const client = await findClientById(id, companyId);

  if (!client) {
    return null;
  }

  const summaryResult = await query(
    `
      SELECT
        COALESCE(SUM(total_amount), 0)::numeric(12,2) AS total_invoiced,
        COALESCE(SUM(paid_amount), 0)::numeric(12,2) AS total_paid,
        COALESCE(SUM(balance_due), 0)::numeric(12,2) AS total_balance_due,
        COUNT(*)::int AS invoices_count,
        COUNT(*) FILTER (WHERE status = 'payee')::int AS paid_invoices_count,
        COUNT(*) FILTER (WHERE status = 'partiellement_payee')::int AS partial_invoices_count,
        COUNT(*) FILTER (WHERE status = 'non_payee')::int AS unpaid_invoices_count
      FROM invoices
      WHERE client_id = $1
        AND company_id = $2
    `,
    [id, companyId]
  );

  const paymentSummaryResult = await query(
    `
      SELECT
        COALESCE(SUM(amount), 0)::numeric(12,2) AS total_payments,
        COUNT(*)::int AS payments_count
      FROM payments
      WHERE client_id = $1
        AND company_id = $2
    `,
    [id, companyId]
  );

  const invoicesResult = await query(
    `
      SELECT
        id,
        invoice_number,
        client_id,
        company_id,
        status,
        issue_date,
        due_date,
        subtotal_amount,
        total_amount,
        paid_amount,
        balance_due,
        notes,
        pdf_url,
        created_at,
        updated_at,
        cancelled_at,
        cancellation_reason
      FROM invoices
      WHERE client_id = $1
        AND company_id = $2
      ORDER BY created_at DESC
    `,
    [id, companyId]
  );

  const paymentsResult = await query(
    `
      SELECT
        p.id,
        p.invoice_id,
        i.invoice_number,
        p.client_id,
        p.company_id,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.reference,
        p.notes,
        p.created_by,
        p.created_at,
        p.updated_at
      FROM payments p
      LEFT JOIN invoices i
        ON i.id = p.invoice_id
       AND i.company_id = p.company_id
      WHERE p.client_id = $1
        AND p.company_id = $2
      ORDER BY p.payment_date DESC, p.created_at DESC
    `,
    [id, companyId]
  );

  return {
    client,
    summary: {
      ...summaryResult.rows[0],
      ...paymentSummaryResult.rows[0]
    },
    invoices: invoicesResult.rows,
    payments: paymentsResult.rows
  };
}