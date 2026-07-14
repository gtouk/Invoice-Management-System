import { query } from '../../database/db.js';

const companySettingsFields = `
  id,
  company_id,
  company_name,
  company_logo_url,
  company_phone,
  company_email,
  company_address,
  business_number,
  gst_hst_number,
  qst_number,
  invoice_footer_note,
  bank_name,
  bank_account_name,
  bank_account,
  bank_routing_number,
  created_at,
  updated_at
`;

export async function getCompanySettings(companyId) {
  const result = await query(
    `
      SELECT
        id,
        company_id,
        company_name,
        company_logo_url,
        company_phone,
        company_email,
        company_address,
        business_number,
        gst_hst_number,
        qst_number,
        invoice_footer_note,
        bank_name,
        bank_account_name,
        bank_account,
        bank_routing_number,
        created_at,
        updated_at
      FROM company_settings
      WHERE company_id = $1
      LIMIT 1
    `,
    [companyId]
  );

  return result.rows[0] || null;
}

export async function createDefaultCompanySettings(companyId, companyName = 'Company') {
  const result = await query(
    `
      INSERT INTO company_settings (
        company_id,
        company_name,
        invoice_footer_note,
        created_at
      )
      VALUES ($1, $2, 'Thank you for your business.', CURRENT_TIMESTAMP)
      ON CONFLICT (company_id)
      DO UPDATE SET
        company_name = company_settings.company_name
      RETURNING ${companySettingsFields}
    `,
    [companyId, companyName]
  );

  return result.rows[0];
}

export async function upsertCompanySettings(companyId, data) {
  const result = await query(
    `
      INSERT INTO company_settings (
        company_id,
        company_name,
        company_phone,
        company_email,
        company_address,
        business_number,
        gst_hst_number,
        qst_number,
        invoice_footer_note,
        bank_name,
        bank_account_name,
        bank_account,
        bank_routing_number,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (company_id)
      DO UPDATE SET
        company_name = EXCLUDED.company_name,
        company_phone = EXCLUDED.company_phone,
        company_email = EXCLUDED.company_email,
        company_address = EXCLUDED.company_address,
        business_number = EXCLUDED.business_number,
        gst_hst_number = EXCLUDED.gst_hst_number,
        qst_number = EXCLUDED.qst_number,
        invoice_footer_note = EXCLUDED.invoice_footer_note,
        bank_name = EXCLUDED.bank_name,
        bank_account_name = EXCLUDED.bank_account_name,
        bank_account = EXCLUDED.bank_account,
        bank_routing_number = EXCLUDED.bank_routing_number,
        updated_at = CURRENT_TIMESTAMP
      RETURNING ${companySettingsFields}
    `,
    [
      companyId,
      data.company_name,
      data.company_phone || null,
      data.company_email || null,
      data.company_address || null,
      data.business_number || null,
      data.gst_hst_number || null,
      data.qst_number || null,
      data.invoice_footer_note || null,
      data.bank_name || null,
      data.bank_account_name || null,
      data.bank_account || null,
      data.bank_routing_number || null
    ]
  );

  return result.rows[0];
}

export async function updateCompanyLogo(companyId, logoUrl) {
  const result = await query(
    `
      INSERT INTO company_settings (
        company_id,
        company_name,
        company_logo_url,
        invoice_footer_note,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        'Company',
        $2,
        'Thank you for your business.',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (company_id)
      DO UPDATE SET
        company_logo_url = EXCLUDED.company_logo_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING ${companySettingsFields}
    `,
    [companyId, logoUrl]
  );

  return result.rows[0] || null;
}

export async function syncCompanyProfileFromSettings(companyId, settings) {
  const result = await query(
    `
      UPDATE companies
      SET
        company_name = $1,
        company_email = $2,
        company_phone = $3,
        company_address = $4,
        company_logo_url = COALESCE($5, company_logo_url),
        business_number = $6,
        gst_hst_number = $7,
        qst_number = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING
        id,
        company_name,
        company_email,
        company_phone,
        company_address,
        company_logo_url,
        business_number,
        gst_hst_number,
        qst_number,
        status,
        created_at,
        updated_at
    `,
    [
      settings.company_name,
      settings.company_email || null,
      settings.company_phone || null,
      settings.company_address || null,
      settings.company_logo_url || null,
      settings.business_number || null,
      settings.gst_hst_number || null,
      settings.qst_number || null,
      companyId
    ]
  );

  return result.rows[0] || null;
}

export async function getCompanyById(companyId) {
  const result = await query(
    `
      SELECT
        id,
        company_name,
        company_email,
        company_phone,
        company_address,
        company_logo_url,
        business_number,
        gst_hst_number,
        qst_number,
        status,
        created_at,
        updated_at
      FROM companies
      WHERE id = $1
      LIMIT 1
    `,
    [companyId]
  );

  return result.rows[0] || null;
}