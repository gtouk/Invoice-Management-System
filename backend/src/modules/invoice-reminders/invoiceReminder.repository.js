import { query } from '../../database/db.js';

export async function findSettingsByCompanyId(companyId) {
  const result = await query(
    `
      SELECT
        id,
        company_id,
        enabled,
        start_after_due_days,
        frequency_days,
        max_reminders,
        send_time,
        email_subject,
        email_message,
        created_at,
        updated_at
      FROM invoice_reminder_settings
      WHERE company_id = $1
    `,
    [companyId]
  );

  return result.rows[0] || null;
}

export async function createDefaultSettings(companyId) {
  const result = await query(
    `
      INSERT INTO invoice_reminder_settings (
        company_id,
        enabled,
        start_after_due_days,
        frequency_days,
        max_reminders,
        send_time
      )
      VALUES ($1, true, 1, 7, NULL, '09:00')
      ON CONFLICT (company_id) DO UPDATE
      SET company_id = EXCLUDED.company_id
      RETURNING
        id,
        company_id,
        enabled,
        start_after_due_days,
        frequency_days,
        max_reminders,
        send_time,
        email_subject,
        email_message,
        created_at,
        updated_at
    `,
    [companyId]
  );

  return result.rows[0] || null;
}

export async function updateSettings(companyId, data) {
  const result = await query(
    `
      UPDATE invoice_reminder_settings
      SET
        enabled = $2,
        start_after_due_days = $3,
        frequency_days = $4,
        max_reminders = $5,
        send_time = $6,
        email_subject = $7,
        email_message = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = $1
      RETURNING
        id,
        company_id,
        enabled,
        start_after_due_days,
        frequency_days,
        max_reminders,
        send_time,
        email_subject,
        email_message,
        created_at,
        updated_at
    `,
    [
      companyId,
      data.enabled,
      data.start_after_due_days,
      data.frequency_days,
      data.max_reminders,
      data.send_time,
      data.email_subject,
      data.email_message
    ]
  );

  return result.rows[0] || null;
}

export async function findInvoiceForReminder(invoiceId, companyId) {
  const result = await query(
    `
      SELECT
        i.id,
        i.company_id,
        i.client_id,
        i.invoice_number,
        i.status,
        i.issue_date,
        i.due_date,
        i.subtotal_amount,
        i.tax_amount,
        i.total_amount,
        i.paid_amount,
        i.balance_due,
        i.pdf_url,
        i.reminders_enabled,
        i.last_reminder_sent_at,
        i.next_reminder_at,
        i.reminder_count,

        c.full_name AS client_name,
        c.email AS client_email,
        c.billing_email AS client_billing_email,
        c.company_name AS client_company_name,

        co.company_name,
        co.company_email,
        co.company_phone
      FROM invoices i
      INNER JOIN clients c ON c.id = i.client_id
      INNER JOIN companies co ON co.id = i.company_id
      WHERE i.id = $1
      AND i.company_id = $2
    `,
    [invoiceId, companyId]
  );

  return result.rows[0] || null;
}

export async function findAutomaticReminderCandidates() {
  const result = await query(
    `
      SELECT
        i.id,
        i.company_id,
        i.client_id,
        i.invoice_number,
        i.status,
        i.issue_date,
        i.due_date,
        i.subtotal_amount,
        i.tax_amount,
        i.total_amount,
        i.paid_amount,
        i.balance_due,
        i.pdf_url,
        i.reminders_enabled,
        i.last_reminder_sent_at,
        i.next_reminder_at,
        i.reminder_count,

        c.full_name AS client_name,
        c.email AS client_email,
        c.billing_email AS client_billing_email,
        c.company_name AS client_company_name,

        co.company_name,
        co.company_email,
        co.company_phone,

        s.enabled AS settings_enabled,
        s.start_after_due_days,
        s.frequency_days,
        s.max_reminders,
        s.send_time,
        s.email_subject,
        s.email_message
      FROM invoices i
      INNER JOIN clients c ON c.id = i.client_id
      INNER JOIN companies co ON co.id = i.company_id
      INNER JOIN invoice_reminder_settings s ON s.company_id = i.company_id
      WHERE s.enabled = true
      AND i.reminders_enabled = true
      AND i.due_date IS NOT NULL
      AND i.balance_due > 0
      AND i.status IN ('non_payee', 'partiellement_payee')
      AND (
        s.max_reminders IS NULL
        OR i.reminder_count < s.max_reminders
      )
      AND (
        i.next_reminder_at IS NULL
        OR i.next_reminder_at <= CURRENT_TIMESTAMP
      )
      AND (
        i.due_date + (s.start_after_due_days || ' days')::interval
      ) <= CURRENT_TIMESTAMP
      ORDER BY i.due_date ASC
      LIMIT 100
    `
  );

  return result.rows;
}

export async function updateInvoiceReminderAfterSend(invoiceId, companyId, frequencyDays) {
  const result = await query(
    `
      UPDATE invoices
      SET
        last_reminder_sent_at = CURRENT_TIMESTAMP,
        next_reminder_at = CURRENT_TIMESTAMP + ($3 || ' days')::interval,
        reminder_count = reminder_count + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      AND company_id = $2
      RETURNING
        id,
        reminder_count,
        last_reminder_sent_at,
        next_reminder_at
    `,
    [invoiceId, companyId, frequencyDays]
  );

  return result.rows[0] || null;
}

export async function createReminderLog(data) {
  const result = await query(
    `
      INSERT INTO invoice_reminder_logs (
        company_id,
        invoice_id,
        client_id,
        recipient_email,
        subject,
        message,
        reminder_type,
        status,
        error_message,
        sent_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id,
        company_id,
        invoice_id,
        client_id,
        recipient_email,
        subject,
        message,
        reminder_type,
        status,
        error_message,
        sent_by,
        sent_at
    `,
    [
      data.company_id,
      data.invoice_id,
      data.client_id,
      data.recipient_email,
      data.subject,
      data.message,
      data.reminder_type,
      data.status,
      data.error_message || null,
      data.sent_by || null
    ]
  );

  return result.rows[0] || null;
}

export async function findLogsByInvoiceId(invoiceId, companyId) {
  const result = await query(
    `
      SELECT
        id,
        company_id,
        invoice_id,
        client_id,
        recipient_email,
        subject,
        message,
        reminder_type,
        status,
        error_message,
        sent_by,
        sent_at
      FROM invoice_reminder_logs
      WHERE invoice_id = $1
      AND company_id = $2
      ORDER BY sent_at DESC
    `,
    [invoiceId, companyId]
  );

  return result.rows;
}

export async function setInvoiceRemindersEnabled(invoiceId, companyId, enabled) {
  const result = await query(
    `
      UPDATE invoices
      SET
        reminders_enabled = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      AND company_id = $2
      RETURNING
        id,
        invoice_number,
        reminders_enabled
    `,
    [invoiceId, companyId, enabled]
  );

  return result.rows[0] || null;
}

export async function findDueInvoicesPreview(companyId) {
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
        i.reminders_enabled,
        i.last_reminder_sent_at,
        i.next_reminder_at,
        i.reminder_count,
        c.full_name AS client_name,
        c.email AS client_email,
        c.billing_email AS client_billing_email
      FROM invoices i
      INNER JOIN clients c ON c.id = i.client_id
      INNER JOIN invoice_reminder_settings s ON s.company_id = i.company_id
      WHERE i.company_id = $1
      AND s.enabled = true
      AND i.reminders_enabled = true
      AND i.due_date IS NOT NULL
      AND i.balance_due > 0
      AND i.status IN ('non_payee', 'partiellement_payee')
      ORDER BY i.due_date ASC
    `,
    [companyId]
  );

  return result.rows;
}