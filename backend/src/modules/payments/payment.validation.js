const allowedPaymentMethods = [
  'cash',
  'virement_bancaire',
  'mobile_money',
  'carte_bancaire',
  'cheque',
  'autre'
];

export function validatePaymentPayload(payload) {
  const errors = [];

  if (!payload.invoice_id) {
    errors.push('La facture est obligatoire.');
  }

  if (
    payload.amount === undefined ||
    payload.amount === null ||
    payload.amount === ''
  ) {
    errors.push('Le montant du paiement est obligatoire.');
  }

  const amount = Number(payload.amount);

  if (Number.isNaN(amount)) {
    errors.push('Le montant du paiement doit être un nombre valide.');
  }

  if (!Number.isNaN(amount) && amount <= 0) {
    errors.push('Le montant du paiement doit être supérieur à zéro.');
  }

  if (
    !payload.payment_method ||
    !allowedPaymentMethods.includes(payload.payment_method)
  ) {
    errors.push(
      "Le mode de paiement doit être : cash, virement_bancaire, mobile_money, carte_bancaire, cheque ou autre."
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      invoice_id: payload.invoice_id,
      amount,
      payment_date: payload.payment_date || new Date().toISOString().slice(0, 10),
      payment_method: payload.payment_method,
      reference: payload.reference?.trim() || null,
      notes: payload.notes?.trim() || null
    }
  };
}

export function validatePaymentFilters(query) {
  const filters = {};

  if (query.invoice_id) {
    filters.invoice_id = query.invoice_id;
  }

  if (query.client_id) {
    filters.client_id = query.client_id;
  }

  if (query.payment_method && allowedPaymentMethods.includes(query.payment_method)) {
    filters.payment_method = query.payment_method;
  }

  if (query.date_from) {
    filters.date_from = query.date_from;
  }

  if (query.date_to) {
    filters.date_to = query.date_to;
  }

  return filters;
}
