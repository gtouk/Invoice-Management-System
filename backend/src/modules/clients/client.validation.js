export function validateClientPayload(payload) {
  const errors = [];

  const clientType = payload.client_type || 'particulier';
  const fullName = payload.full_name?.trim() || '';
  const companyName = payload.company_name?.trim() || '';

  const membershipStatus =
    payload.membership_status === 'membre' ? 'membre' : 'non_membre';

  if (!['particulier', 'entreprise'].includes(clientType)) {
    errors.push("Le type de client doit être 'particulier' ou 'entreprise'.");
  }

  if (!['membre', 'non_membre'].includes(membershipStatus)) {
    errors.push("Le statut membre doit être 'membre' ou 'non_membre'.");
  }

  if (clientType === 'particulier' && fullName === '') {
    errors.push('Le nom complet du client est obligatoire.');
  }

  if (clientType === 'entreprise' && fullName === '' && companyName === '') {
    errors.push("Le nom de l’entreprise ou le nom principal est obligatoire.");
  }

  const normalizedFullName =
    clientType === 'entreprise' && fullName === ''
      ? companyName
      : fullName;

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      full_name: normalizedFullName,
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      address: payload.address?.trim() || null,
      client_type: clientType,
      membership_status: membershipStatus,
      notes: payload.notes?.trim() || null,

      company_name: companyName || null,
      contact_person_name: payload.contact_person_name?.trim() || null,
      tax_number: payload.tax_number?.trim() || null,
      registration_number: payload.registration_number?.trim() || null,
      national_id: payload.national_id?.trim() || null,
      website: payload.website?.trim() || null,
      billing_email: payload.billing_email?.trim() || null,
      billing_phone: payload.billing_phone?.trim() || null,
      billing_address: payload.billing_address?.trim() || null
    }
  };
}

export function validateClientFilters(query) {
  const filters = {};

  if (query.search && query.search.trim() !== '') {
    filters.search = query.search.trim();
  }

  if (query.status && ['actif', 'archive'].includes(query.status)) {
    filters.status = query.status;
  }

  if (query.type && ['particulier', 'entreprise'].includes(query.type)) {
    filters.type = query.type;
  }

  if (
    query.membership_status &&
    ['membre', 'non_membre'].includes(query.membership_status)
  ) {
    filters.membership_status = query.membership_status;
  }

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);

  filters.page = Number.isNaN(page) || page < 1 ? 1 : page;
  filters.limit = Number.isNaN(limit) || limit < 1 ? 20 : limit;

  return filters;
}