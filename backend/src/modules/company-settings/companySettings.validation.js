export function validateCompanySettingsPayload(payload) {
  const errors = [];

  const companyName = payload.company_name?.trim() || '';

  if (!companyName) {
    errors.push('Le nom de l’entreprise est obligatoire.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      company_name: companyName,
      company_phone: payload.company_phone?.trim() || null,
      company_email: payload.company_email?.trim() || null,
      company_address: payload.company_address?.trim() || null,

      business_number: payload.business_number?.trim() || null,
      gst_hst_number: payload.gst_hst_number?.trim() || null,
      qst_number: payload.qst_number?.trim() || null,

      invoice_footer_note: payload.invoice_footer_note?.trim() || null,

      bank_name: payload.bank_name?.trim() || null,
      bank_account_name: payload.bank_account_name?.trim() || null,
      bank_account: payload.bank_account?.trim() || null,
      bank_routing_number: payload.bank_routing_number?.trim() || null
    }
  };
}
