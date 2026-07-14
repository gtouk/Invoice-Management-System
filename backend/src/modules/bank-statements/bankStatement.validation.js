export function validateCreateBankStatementPayload(payload) {
  const errors = [];

  if (!payload.file_name || payload.file_name.trim() === '') {
    errors.push('Le nom du fichier est obligatoire.');
  }

  if (
    !payload.source_type ||
    !['upload', 'scan', 'manuel'].includes(payload.source_type)
  ) {
    errors.push("Le type de source doit être 'upload', 'scan' ou 'manuel'.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      file_name: payload.file_name?.trim(),
      file_url: payload.file_url?.trim() || null,
      source_type: payload.source_type,
      notes: payload.notes?.trim() || null
    }
  };
}

export function validateBankStatementFilters(query) {
  const filters = {};

  if (query.search && query.search.trim() !== '') {
    filters.search = query.search.trim();
  }

  if (query.status && ['importe', 'traite', 'erreur'].includes(query.status)) {
    filters.status = query.status;
  }

  if (
    query.source_type &&
    ['upload', 'scan', 'manuel'].includes(query.source_type)
  ) {
    filters.source_type = query.source_type;
  }

  return filters;
}

export function inferTransactionAmountAndType(payload) {
  const depositAmount = Number(payload.deposit_amount || 0);
  const withdrawalAmount = Number(payload.withdrawal_amount || 0);

  if (depositAmount > 0) {
    return {
      transaction_type: 'depot',
      amount: depositAmount,
      deposit_amount: depositAmount,
      withdrawal_amount: 0
    };
  }

  if (withdrawalAmount > 0) {
    return {
      transaction_type: payload.transaction_type === 'frais' ? 'frais' : 'retrait',
      amount: withdrawalAmount,
      deposit_amount: 0,
      withdrawal_amount: withdrawalAmount
    };
  }

  const amount = Number(payload.amount || 0);
  const transactionType = ['depot', 'retrait', 'frais'].includes(payload.transaction_type)
    ? payload.transaction_type
    : 'depot';

  return {
    transaction_type: transactionType,
    amount,
    deposit_amount: transactionType === 'depot' ? amount : 0,
    withdrawal_amount: transactionType !== 'depot' ? amount : 0
  };
}

export function validateCreateBankTransactionPayload(payload) {
  const errors = [];

  const inferred = inferTransactionAmountAndType(payload);

  if (Number.isNaN(inferred.amount)) {
    errors.push('Le montant doit être un nombre valide.');
  }

  if (!Number.isNaN(inferred.amount) && inferred.amount <= 0) {
    errors.push('Le montant de la transaction doit être supérieur à zéro.');
  }

  const balanceAfter =
    payload.balance_after !== undefined &&
    payload.balance_after !== null &&
    payload.balance_after !== ''
      ? Number(payload.balance_after)
      : null;

  if (balanceAfter !== null && Number.isNaN(balanceAfter)) {
    errors.push('Le solde après transaction doit être un nombre valide.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      extracted_client_name: payload.extracted_client_name?.trim() || null,
      matched_client_id: payload.matched_client_id || null,
      transaction_date: payload.transaction_date || null,
      transaction_type: inferred.transaction_type,
      description:
        payload.description?.trim() ||
        payload.raw_text?.trim() ||
        payload.extracted_client_name?.trim() ||
        null,
      amount: inferred.amount,
      withdrawal_amount: inferred.withdrawal_amount,
      deposit_amount: inferred.deposit_amount,
      balance_after: balanceAfter,
      reference: payload.reference?.trim() || null,
      raw_text: payload.raw_text?.trim() || null,
      correction_notes: payload.correction_notes?.trim() || null
    }
  };
}

export function validateMatchClientPayload(payload) {
  const errors = [];

  if (!payload.matched_client_id) {
    errors.push('Le client à associer est obligatoire.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      matched_client_id: payload.matched_client_id
    }
  };
}

export function validateCreateClientFromTransactionPayload(payload) {
  const errors = [];

  if (!payload.full_name || payload.full_name.trim() === '') {
    errors.push('Le nom du client est obligatoire.');
  }

  if (
    payload.client_type &&
    !['particulier', 'entreprise'].includes(payload.client_type)
  ) {
    errors.push("Le type de client doit être 'particulier' ou 'entreprise'.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      full_name: payload.full_name?.trim(),
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      address: payload.address?.trim() || null,
      client_type: payload.client_type || 'particulier',
      membership_status:
        payload.membership_status === 'membre' ? 'membre' : 'non_membre',
      notes: payload.notes?.trim() || null
    }
  };
}

export function validateCreateInvoiceFromTransactionPayload(payload) {
  const errors = [];

  if (!payload.client_id) {
    errors.push('Le client est obligatoire.');
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push('La facture doit contenir au moins un article ou service.');
  }

  for (const item of payload.items || []) {
    if (!item.item_id && !item.item_name) {
      errors.push('Chaque ligne doit contenir un article ou un nom de service.');
    }

    const quantity = Number(item.quantity || 0);

    if (Number.isNaN(quantity) || quantity <= 0) {
      errors.push('La quantité doit être supérieure à zéro.');
    }

    if (
      item.unit_price !== undefined &&
      item.unit_price !== null &&
      item.unit_price !== '' &&
      Number(item.unit_price) < 0
    ) {
      errors.push('Le prix unitaire ne peut pas être négatif.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      client_id: payload.client_id,
      issue_date: payload.issue_date || null,
      due_date: payload.due_date || null,
      notes: payload.notes?.trim() || null,
      items: payload.items || [],
      adjustment: payload.adjustment || null
    }
  };
}