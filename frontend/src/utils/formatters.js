function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(String(value).trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toValidDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMoney(value, currency = 'CAD') {
  const amount = toFiniteNumber(value);

  try {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: currency || 'CAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || 'CAD'}`;
  }
}

export function formatDate(value) {
  const date = toValidDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('fr-CA');
}

export function formatDateTime(value) {
  const date = toValidDate(value);
  if (!date) return '—';
  return date.toLocaleString('fr-CA');
}

export function formatNumber(value) {
  const amount = toFiniteNumber(value);
  return new Intl.NumberFormat('fr-CA').format(amount);
}

export function formatPercent(value) {
  const amount = toFiniteNumber(value);
  return `${new Intl.NumberFormat('fr-CA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)} %`;
}
