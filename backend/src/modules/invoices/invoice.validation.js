export function validateCreateInvoicePayload(payload) {
  const errors = [];

  const clientId = payload.client_id;
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (!clientId) {
    errors.push('Le client est obligatoire.');
  }

  if (items.length === 0) {
    errors.push('La facture doit contenir au moins un article ou service.');
  }

  const normalizedItems = items.map((item, index) => {
    if (!item.item_id) {
      errors.push(`L’article ou service est obligatoire à la ligne ${index + 1}.`);
    }

    const quantity = Number(item.quantity);

    if (Number.isNaN(quantity) || quantity <= 0) {
      errors.push(`La quantité doit être supérieure à 0 à la ligne ${index + 1}.`);
    }

    let unitPrice = null;

    const hasManualUnitPrice =
      item.unit_price !== undefined &&
      item.unit_price !== null &&
      item.unit_price !== '';

    if (hasManualUnitPrice) {
      unitPrice = Number(item.unit_price);

      if (Number.isNaN(unitPrice)) {
        errors.push(`Le prix unitaire doit être un nombre valide à la ligne ${index + 1}.`);
      }

      if (!Number.isNaN(unitPrice) && unitPrice < 0) {
        errors.push(`Le prix unitaire ne peut pas être négatif à la ligne ${index + 1}.`);
      }
    }

    return {
      item_id: item.item_id,
      description: item.description?.trim() || null,
      quantity,
      unit_price: hasManualUnitPrice ? unitPrice : null
    };
  });

  const taxesEnabled = payload.taxes_enabled === true || payload.taxes_enabled === 'true';

  const gstHstRate = Number(payload.gst_hst_rate || 0);
  const qstRate = Number(payload.qst_rate || 0);
  const customTaxRate = Number(payload.custom_tax_rate || 0);

  if (taxesEnabled) {
    if (Number.isNaN(gstHstRate) || gstHstRate < 0) {
      errors.push('Le taux GST/HST doit être un nombre positif ou égal à 0.');
    }

    if (Number.isNaN(qstRate) || qstRate < 0) {
      errors.push('Le taux QST doit être un nombre positif ou égal à 0.');
    }

    if (Number.isNaN(customTaxRate) || customTaxRate < 0) {
      errors.push('Le taux de taxe personnalisée doit être un nombre positif ou égal à 0.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      client_id: clientId,
      issue_date: payload.issue_date || null,
      due_date: payload.due_date || null,
      notes: payload.notes?.trim() || null,

      taxes_enabled: taxesEnabled,
      gst_hst_rate: taxesEnabled ? gstHstRate : 0,
      qst_rate: taxesEnabled ? qstRate : 0,
      custom_tax_label: payload.custom_tax_label?.trim() || null,
      custom_tax_rate: taxesEnabled ? customTaxRate : 0,

      items: normalizedItems
    }
  };
}

export function validateInvoiceFilters(query) {
  const filters = {};

  if (query.search && query.search.trim() !== '') {
    filters.search = query.search.trim();
  }

  if (
    query.status &&
    ['brouillon', 'non_payee', 'partiellement_payee', 'payee', 'annulee'].includes(query.status)
  ) {
    filters.status = query.status;
  }

  if (query.client_id && query.client_id.trim() !== '') {
    filters.client_id = query.client_id.trim();
  }

  if (query.date_from && query.date_from.trim() !== '') {
    filters.date_from = query.date_from.trim();
  }

  if (query.date_to && query.date_to.trim() !== '') {
    filters.date_to = query.date_to.trim();
  }

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);

  filters.page = Number.isNaN(page) || page < 1 ? 1 : page;
  filters.limit = Number.isNaN(limit) || limit < 1 ? 20 : limit;

  return filters;
}