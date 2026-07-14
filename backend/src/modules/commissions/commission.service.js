function createHttpError(message, statusCode = 400, errors = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

function normalizeCurrency(value, fallback) {
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim().toUpperCase();

  return trimmed || fallback;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return fallback;
  }

  return number;
}

function getXeConfig() {
  return {
    apiId: process.env.XE_API_ID,
    apiKey: process.env.XE_API_KEY,
    baseUrl: process.env.XE_API_BASE_URL || 'https://xecdapi.xe.com'
  };
}

function buildBasicAuthHeader(apiId, apiKey) {
  return Buffer.from(`${apiId}:${apiKey}`).toString('base64');
}

async function fetchXeRate(fromCurrency, toCurrency) {
  const { apiId, apiKey, baseUrl } = getXeConfig();

  if (!apiId || !apiKey) {
    throw createHttpError(
      'Configuration XE manquante. Ajoutez XE_API_ID et XE_API_KEY dans le fichier .env.',
      503
    );
  }

  const url = new URL('/v1/convert_from.json', baseUrl);

  url.searchParams.set('from', fromCurrency);
  url.searchParams.set('to', toCurrency);
  url.searchParams.set('amount', '1');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${buildBasicAuthHeader(apiId, apiKey)}`,
      Accept: 'application/json'
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw createHttpError(
      data?.message || 'Impossible de récupérer le taux XE.',
      response.status,
      data ? [data] : []
    );
  }

  const target = Array.isArray(data?.to) ? data.to[0] : null;
  const mid = Number(target?.mid);

  if (!target || Number.isNaN(mid) || mid <= 0) {
    throw createHttpError(
      'Réponse XE invalide. Le taux de conversion est introuvable.',
      502,
      data ? [data] : []
    );
  }

  return {
    provider: 'XE Currency Data',
    from_currency: data.from || fromCurrency,
    to_currency: target.quotecurrency || toCurrency,
    rate: mid,
    inverse_rate: 1 / mid,
    timestamp: data.timestamp || new Date().toISOString(),
    raw: data
  };
}

export async function getExchangeRate(query = {}) {
  const fromCurrency = normalizeCurrency(query.from, 'XAF');
  const toCurrency = normalizeCurrency(query.to, 'CAD');

  if (fromCurrency === toCurrency) {
    return {
      provider: 'internal',
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: 1,
      inverse_rate: 1,
      timestamp: new Date().toISOString()
    };
  }

  return fetchXeRate(fromCurrency, toCurrency);
}

export async function calculateCommission(payload = {}) {
  const fromCurrency = normalizeCurrency(payload.from_currency, 'XAF');
  const toCurrency = normalizeCurrency(payload.to_currency, 'CAD');

  const sentAmount = toNumber(payload.sent_amount);
  const commissionPercent = toNumber(payload.commission_percent);
  const manualRate = toNumber(payload.manual_rate);
  const commissionMode = payload.commission_mode || 'added';

  if (sentAmount <= 0) {
    throw createHttpError('Le montant envoyé doit être supérieur à 0.', 422);
  }

  if (commissionPercent < 0) {
    throw createHttpError('Le pourcentage de commission ne peut pas être négatif.', 422);
  }

  let rateData;

  if (manualRate > 0) {
    /**
     * manual_rate représente le nombre de devise source pour 1 devise destination.
     * Exemple : 445 XAF = 1 CAD.
     */
    rateData = {
      provider: 'manual',
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: 1 / manualRate,
      inverse_rate: manualRate,
      timestamp: new Date().toISOString()
    };
  } else {
    rateData = await getExchangeRate({
      from: fromCurrency,
      to: toCurrency
    });
  }

  const commissionAmount = sentAmount * (commissionPercent / 100);

  let convertibleAmount = sentAmount;
  let totalPaidBySender = sentAmount + commissionAmount;

  if (commissionMode === 'deducted') {
    convertibleAmount = Math.max(sentAmount - commissionAmount, 0);
    totalPaidBySender = sentAmount;
  }

  const receivedAmount = convertibleAmount * rateData.rate;

  return {
    from_currency: fromCurrency,
    to_currency: toCurrency,
    sent_amount: Number(sentAmount.toFixed(2)),
    commission_percent: Number(commissionPercent.toFixed(2)),
    commission_amount: Number(commissionAmount.toFixed(2)),
    commission_mode: commissionMode,
    convertible_amount: Number(convertibleAmount.toFixed(2)),
    total_paid_by_sender: Number(totalPaidBySender.toFixed(2)),
    received_amount: Number(receivedAmount.toFixed(2)),
    rate: rateData.rate,
    inverse_rate: rateData.inverse_rate,
    displayed_rate_label: `1 ${toCurrency} = ${rateData.inverse_rate.toFixed(4)} ${fromCurrency}`,
    provider: rateData.provider,
    rate_timestamp: rateData.timestamp
  };
}
