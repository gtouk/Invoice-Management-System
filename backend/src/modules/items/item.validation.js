export function validateItemPayload(payload) {
  const errors = [];

  if (!payload.name || payload.name.trim() === '') {
    errors.push('Le nom de l’article ou service est obligatoire.');
  }

  if (!payload.item_type || !['article', 'service'].includes(payload.item_type)) {
    errors.push("Le type doit être 'article' ou 'service'.");
  }

  const hasNonMemberPrice =
    payload.non_member_price !== undefined &&
    payload.non_member_price !== null &&
    payload.non_member_price !== '';

  const hasDefaultPrice =
    payload.default_price !== undefined &&
    payload.default_price !== null &&
    payload.default_price !== '';

  if (!hasNonMemberPrice && !hasDefaultPrice) {
    errors.push('Le prix non membre est obligatoire.');
  }

  const nonMemberPrice = hasNonMemberPrice
    ? Number(payload.non_member_price)
    : Number(payload.default_price);

  const memberPrice =
    payload.member_price !== undefined &&
    payload.member_price !== null &&
    payload.member_price !== ''
      ? Number(payload.member_price)
      : nonMemberPrice;

  if (Number.isNaN(nonMemberPrice)) {
    errors.push('Le prix non membre doit être un nombre valide.');
  }

  if (Number.isNaN(memberPrice)) {
    errors.push('Le prix membre doit être un nombre valide.');
  }

  if (!Number.isNaN(nonMemberPrice) && nonMemberPrice < 0) {
    errors.push('Le prix non membre ne peut pas être négatif.');
  }

  if (!Number.isNaN(memberPrice) && memberPrice < 0) {
    errors.push('Le prix membre ne peut pas être négatif.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      name: payload.name?.trim(),
      description: payload.description?.trim() || null,
      item_type: payload.item_type,
      default_price: nonMemberPrice,
      non_member_price: nonMemberPrice,
      member_price: memberPrice
    }
  };
}

export function validateItemFilters(query) {
  const filters = {};

  if (query.search && query.search.trim() !== '') {
    filters.search = query.search.trim();
  }

  if (query.item_type && ['article', 'service'].includes(query.item_type)) {
    filters.item_type = query.item_type;
  }

  if (query.status && ['actif', 'desactive'].includes(query.status)) {
    filters.status = query.status;
  }

  return filters;
}