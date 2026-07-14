import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const BANK_STATEMENT_STORAGE_DIR = path.resolve(
  process.cwd(),
  'storage',
  'bank-statements'
);

const MONTHS = {
  JAN: '01',
  JANV: '01',
  JANVIER: '01',

  FEV: '02',
  FEVR: '02',
  FÉV: '02',
  FÉVR: '02',
  FEVRIER: '02',
  FÉVRIER: '02',
  FEB: '02',
  FEBRUARY: '02',

  MAR: '03',
  MARS: '03',
  MARCH: '03',

  AVR: '04',
  AVRIL: '04',
  APR: '04',
  APRIL: '04',

  MAI: '05',
  MAY: '05',

  JUIN: '06',
  JUN: '06',
  JUNE: '06',

  JUIL: '07',
  JUL: '07',
  JULY: '07',
  JUILLET: '07',

  AOU: '08',
  AOÛ: '08',
  AOUT: '08',
  AOÛT: '08',
  AUG: '08',
  AUGUST: '08',

  SEP: '09',
  SEPT: '09',
  SEPTEMBER: '09',

  OCT: '10',
  OCTOBER: '10',

  NOV: '11',
  NOVEMBER: '11',

  DEC: '12',
  DÉC: '12',
  DECEMBER: '12',
  DÉCEMBRE: '12',
  DECEMBRE: '12'
};

function normalizeSpaces(value = '') {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ ]+/g, ' ')
    .trim();
}

function stripAccents(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeForSearch(value = '') {
  return stripAccents(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function splitLines(text = '') {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => normalizeSpaces(line))
    .filter(Boolean);
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function normalizeAmount(value) {
  if (value === undefined || value === null) {
    return null;
  }

  let normalized = String(value)
    .replace(/\$/g, '')
    .replace(/CAD/gi, '')
    .replace(/USD/gi, '')
    .replace(/\u00a0/g, ' ')
    .trim();

  const isNegative =
    normalized.startsWith('-') ||
    /^\(.*\)$/.test(normalized) ||
    /-$/.test(normalized);

  normalized = normalized
    .replace(/[()]/g, '')
    .replace(/-/g, '')
    .replace(/\s+/g, '');

  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');

    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    normalized = normalized.replace(',', '.');
  }

  const amount = Number(normalized);

  if (Number.isNaN(amount)) {
    return null;
  }

  return roundMoney(isNegative ? -amount : amount);
}

function extractMoneyTokens(line = '') {
  const matches = [
    ...String(line || '').matchAll(
      /-?\(?\$?\s*\d{1,3}(?:[ \u00a0,]\d{3})*(?:[.,]\d{2})\)?-?|-?\(?\$?\s*\d+[.,]\d{2}\)?-?/g
    )
  ];

  return matches
    .map((match) => ({
      raw: match[0],
      amount: normalizeAmount(match[0]),
      index: match.index || 0
    }))
    .filter((item) => item.amount !== null);
}

function extractStatementYear(rawText = '') {
  const text = normalizeForSearch(rawText);

  const periodMatch =
    text.match(/du\s+\d{1,2}(?:er)?\s+[a-z]+\s+au\s+\d{1,2}\s+[a-z]+\s+(\d{4})/) ||
    text.match(/from\s+[a-z]+\s+\d{1,2},?\s+(\d{4})\s+to\s+[a-z]+\s+\d{1,2},?\s+(\d{4})/) ||
    text.match(/statement\s+period.*?(\d{4})/);

  if (periodMatch) {
    return Number(periodMatch[periodMatch.length - 1]);
  }

  const anyYear = String(rawText || '').match(/\b(20\d{2}|19\d{2})\b/);

  if (anyYear) {
    return Number(anyYear[1]);
  }

  return new Date().getFullYear();
}

function parseDateFromParts(day, monthLabel, year) {
  const normalizedMonth = stripAccents(monthLabel || '')
    .toUpperCase()
    .replace(/\./g, '');

  const month =
    MONTHS[normalizedMonth] ||
    MONTHS[normalizedMonth.slice(0, 4)] ||
    MONTHS[normalizedMonth.slice(0, 3)];

  if (!month) {
    return null;
  }

  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

function parseTransactionDateFromLine(line, defaultYear) {
  const value = normalizeSpaces(line);

  let match = value.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,10})\b/);

  if (match) {
    return {
      date: parseDateFromParts(match[1], match[2], defaultYear),
      rest: value.slice(match[0].length).trim()
    };
  }

  match = value.match(/^([A-Za-zÀ-ÿ]{3,10})\s+(\d{1,2})\b/);

  if (match) {
    return {
      date: parseDateFromParts(match[2], match[1], defaultYear),
      rest: value.slice(match[0].length).trim()
    };
  }

  match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);

  if (match) {
    return {
      date: `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`,
      rest: value.slice(match[0].length).trim()
    };
  }

  match = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);

  if (match) {
    const year =
      match[3].length === 2 ? Number(`20${match[3]}`) : Number(match[3]);

    return {
      date: `${year}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`,
      rest: value.slice(match[0].length).trim()
    };
  }

  return {
    date: null,
    rest: value
  };
}

function containsHeaderWords(line = '') {
  const normalized = normalizeForSearch(line);

  return (
    normalized.includes('date') &&
    (
      normalized.includes('description') ||
      normalized.includes('transaction') ||
      normalized.includes('details')
    ) &&
    (
      normalized.includes('solde') ||
      normalized.includes('balance') ||
      normalized.includes('depot') ||
      normalized.includes('deposit') ||
      normalized.includes('credit') ||
      normalized.includes('debit') ||
      normalized.includes('retrait') ||
      normalized.includes('withdrawal')
    )
  );
}

function isNoiseLine(line = '') {
  const normalized = normalizeForSearch(line);

  if (!normalized) return true;

  const noisePatterns = [
    /^page\s+\d+/,
    /^folio/,
    /^date\s+code/,
    /^description$/,
    /^solde$/,
    /^balance$/,
    /^retrait$/,
    /^depot$/,
    /^debit$/,
    /^credit$/,
    /^frais$/,
    /^fees?$/,
    /^total$/,
    /^sous-total$/,
    /^subtotal$/,
    /^nouveau solde/,
    /^opening balance/,
    /^closing balance/,
    /^solde d'ouverture/,
    /^solde de fermeture/,
    /^important/,
    /^avis/,
    /^notice/,
    /^service a la clientele/,
    /^customer service/
  ];

  return noisePatterns.some((pattern) => pattern.test(normalized));
}

function hasBankKeyword(rawText = '') {
  const normalized = normalizeForSearch(rawText);

  const bankKeywords = [
    'desjardins',
    'rbc',
    'royal bank',
    'banque royale',
    'td canada trust',
    'td bank',
    'bmo',
    'bank of montreal',
    'banque de montreal',
    'scotiabank',
    'banque scotia',
    'cibc',
    'tangerine',
    'national bank',
    'banque nationale',
    'releve de compte',
    'statement of account',
    'bank statement'
  ];

  return bankKeywords.some((keyword) => normalized.includes(keyword));
}

function detectTransactionTypeFromDescription(description = '') {
  const normalized = normalizeForSearch(description);

  const depositKeywords = [
    'depot',
    'deposit',
    'credit',
    'paie',
    'payroll',
    'salary',
    'salaire',
    'interet',
    'interest',
    'refund',
    'remboursement',
    'transfer in',
    'virement recu',
    'e-transfer received',
    'incoming',
    'versement'
  ];

  const withdrawalKeywords = [
    'retrait',
    'withdrawal',
    'debit',
    'achat',
    'purchase',
    'payment',
    'paiement',
    'prelevement',
    'pre-authorized',
    'preautorise',
    'fee',
    'frais',
    'charge',
    'service charge',
    'atm',
    'guichet',
    'transfer out',
    'virement envoye',
    'e-transfer sent',
    'sortant'
  ];

  if (depositKeywords.some((keyword) => normalized.includes(keyword))) {
    return 'depot';
  }

  if (withdrawalKeywords.some((keyword) => normalized.includes(keyword))) {
    return 'retrait';
  }

  return null;
}

function inferTypeFromAmounts({ debitAmount, creditAmount, amount, previousBalance, balanceAfter, description }) {
  if (creditAmount && creditAmount > 0) {
    return 'depot';
  }

  if (debitAmount && debitAmount > 0) {
    return 'retrait';
  }

  if (
    previousBalance !== null &&
    previousBalance !== undefined &&
    balanceAfter !== null &&
    balanceAfter !== undefined
  ) {
    const diff = roundMoney(Number(balanceAfter) - Number(previousBalance));

    if (diff > 0) {
      return 'depot';
    }

    if (diff < 0) {
      return 'retrait';
    }
  }

  const byDescription = detectTransactionTypeFromDescription(description);

  if (byDescription) {
    return byDescription;
  }

  if (Number(amount) < 0) {
    return 'retrait';
  }

  return 'depot';
}

function cleanDescriptionFromMoney(description = '') {
  return normalizeSpaces(
    String(description || '')
      .replace(
        /-?\(?\$?\s*\d{1,3}(?:[ \u00a0,]\d{3})*(?:[.,]\d{2})\)?-?|-?\(?\$?\s*\d+[.,]\d{2}\)?-?/g,
        ' '
      )
      .replace(/\b(CAD|USD)\b/gi, ' ')
  );
}

function removeDuplicateTransactions(transactions = []) {
  const seen = new Set();
  const result = [];

  for (const transaction of transactions) {
    const key = [
      transaction.transaction_date || '',
      transaction.transaction_type || '',
      transaction.description || '',
      Number(transaction.amount || 0).toFixed(2),
      transaction.balance_after !== null && transaction.balance_after !== undefined
        ? Number(transaction.balance_after || 0).toFixed(2)
        : ''
    ].join('|');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(transaction);
  }

  return result;
}

function buildTransaction({
  transactionDate,
  transactionType,
  description,
  amount,
  balanceAfter = null,
  reference = null,
  rawText,
  correctionNotes = 'Transaction extraite automatiquement depuis un relevé bancaire.'
}) {
  const normalizedAmount = Math.abs(roundMoney(amount));
  const type = transactionType === 'retrait' ? 'retrait' : 'depot';

  return {
    extracted_client_name: null,
    matched_client_id: null,
    transaction_date: transactionDate,
    transaction_type: type,
    description: description || null,
    amount: normalizedAmount,
    withdrawal_amount: type === 'retrait' ? normalizedAmount : 0,
    deposit_amount: type === 'depot' ? normalizedAmount : 0,
    balance_after:
      balanceAfter === null || balanceAfter === undefined
        ? null
        : roundMoney(balanceAfter),
    reference: reference || null,
    raw_text: rawText || null,
    correction_notes: correctionNotes
  };
}

function parseInlineTransactionLine(line, defaultYear, previousBalance = null) {
  const parsedDate = parseTransactionDateFromLine(line, defaultYear);

  if (!parsedDate.date) {
    return null;
  }

  const moneyTokens = extractMoneyTokens(parsedDate.rest);

  if (moneyTokens.length === 0) {
    return null;
  }

  const balanceAfter =
    moneyTokens.length >= 2
      ? moneyTokens[moneyTokens.length - 1].amount
      : null;

  let amountToken;

  if (moneyTokens.length >= 2) {
    amountToken = moneyTokens[moneyTokens.length - 2];
  } else {
    amountToken = moneyTokens[0];
  }

  const rawDescription = parsedDate.rest.slice(0, amountToken.index).trim();
  const description = cleanDescriptionFromMoney(rawDescription);

  if (!description || description.length < 2) {
    return null;
  }

  const transactionType = inferTypeFromAmounts({
    debitAmount: null,
    creditAmount: null,
    amount: amountToken.amount,
    previousBalance,
    balanceAfter,
    description
  });

  return buildTransaction({
    transactionDate: parsedDate.date,
    transactionType,
    description,
    amount: amountToken.amount,
    balanceAfter,
    reference: null,
    rawText: line
  });
}

function collectLogicalRows(lines, defaultYear) {
  const rows = [];
  let current = null;

  for (const line of lines) {
    if (isNoiseLine(line)) {
      continue;
    }

    const parsedDate = parseTransactionDateFromLine(line, defaultYear);

    if (parsedDate.date) {
      if (current) {
        rows.push(current);
      }

      current = line;
      continue;
    }

    if (current) {
      current = `${current} ${line}`;
    }
  }

  if (current) {
    rows.push(current);
  }

  return rows;
}

function extractInlineTableTransactions(rawText) {
  const defaultYear = extractStatementYear(rawText);
  const lines = splitLines(rawText);
  const logicalRows = collectLogicalRows(lines, defaultYear);
  const transactions = [];

  let previousBalance = null;

  for (const row of logicalRows) {
    const transaction = parseInlineTransactionLine(row, defaultYear, previousBalance);

    if (!transaction) {
      continue;
    }

    transactions.push(transaction);

    if (transaction.balance_after !== null && transaction.balance_after !== undefined) {
      previousBalance = transaction.balance_after;
    }
  }

  return removeDuplicateTransactions(transactions);
}

function extractDateRows(lines, defaultYear) {
  const rows = [];

  for (const line of lines) {
    const match = line.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,10})\s+([A-Z0-9]{1,8})$/i);

    if (!match) {
      continue;
    }

    rows.push({
      transaction_date: parseDateFromParts(match[1], match[2], defaultYear),
      reference: match[3],
      raw: line
    });
  }

  return rows;
}

function isLikelyDescriptionStart(line) {
  const normalized = normalizeForSearch(line);

  const starts = [
    'paie',
    'achat',
    'assurance',
    'retrait',
    'virement',
    'depot',
    'paiement',
    'remboursement',
    'interet',
    'frais',
    'deposit',
    'withdrawal',
    'payment',
    'purchase',
    'transfer',
    'interest',
    'fee',
    'service charge',
    'pre-authorized',
    'debit',
    'credit'
  ];

  return starts.some((start) => normalized.startsWith(start));
}

function extractDescriptionsAfterHeader(lines) {
  const headerIndex = lines.findIndex((line) => containsHeaderWords(line));
  const startIndex =
    headerIndex >= 0
      ? headerIndex + 1
      : lines.findIndex((line) => /^solde reporte|opening balance|balance forward/i.test(normalizeForSearch(line))) + 1;

  if (startIndex <= 0) {
    return [];
  }

  const descriptions = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (isNoiseLine(line)) {
      continue;
    }

    if (parseTransactionDateFromLine(line, extractStatementYear(lines.join('\n'))).date) {
      continue;
    }

    if (extractMoneyTokens(line).length > 0) {
      continue;
    }

    if (/^\d+$/.test(line)) {
      continue;
    }

    if (!isLikelyDescriptionStart(line) && descriptions.length > 0) {
      descriptions[descriptions.length - 1] = `${descriptions[descriptions.length - 1]} ${line}`.trim();
      continue;
    }

    if (line.length > 2) {
      descriptions.push(line);
    }
  }

  return descriptions;
}

function extractAmountBalanceRows(lines) {
  const rows = [];

  for (const line of lines) {
    if (isNoiseLine(line)) {
      continue;
    }

    const tokens = extractMoneyTokens(line);

    if (tokens.length === 1) {
      rows.push({
        amount: null,
        balance_after: tokens[0].amount,
        raw: line
      });
      continue;
    }

    if (tokens.length >= 2 && tokens.length <= 3) {
      rows.push({
        amount: tokens[tokens.length - 2].amount,
        balance_after: tokens[tokens.length - 1].amount,
        raw: line
      });
    }
  }

  return rows;
}

function extractColumnSeparatedTransactions(rawText) {
  const text = String(rawText || '');

  if (!hasBankKeyword(text)) {
    return [];
  }

  const lines = splitLines(text);
  const defaultYear = extractStatementYear(text);

  const dateRows = extractDateRows(lines, defaultYear);

  if (dateRows.length === 0) {
    return [];
  }

  const firstBalanceLabelIndex = lines.findIndex((line) =>
    /^Solde reporté$|^Balance forward$|^Opening balance$/i.test(line)
  );

  if (firstBalanceLabelIndex === -1) {
    return [];
  }

  const descriptions = [];

  for (let index = firstBalanceLabelIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^Solde reporté$|^Balance forward$|^Opening balance$/i.test(line)) {
      break;
    }

    if (/^du\s+\d{1,2}/i.test(line)) {
      break;
    }

    if (/^Page\s+\d+/i.test(line)) {
      break;
    }

    if (isNoiseLine(line)) {
      continue;
    }

    if (extractMoneyTokens(line).length > 0) {
      continue;
    }

    if (parseTransactionDateFromLine(line, defaultYear).date) {
      continue;
    }

    if (/^\d+$/.test(line)) {
      continue;
    }

    if (!isLikelyDescriptionStart(line) && descriptions.length > 0) {
      descriptions[descriptions.length - 1] =
        `${descriptions[descriptions.length - 1]} ${line}`.trim();
      continue;
    }

    descriptions.push(line);
  }

  if (descriptions.length === 0) {
    return [];
  }

  const amountRows = [];
  let openingBalance = null;
  let startedAmounts = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!startedAmounts) {
      if (/^Page\s+\d+/i.test(line)) {
        startedAmounts = true;
      }

      continue;
    }

    if (/Folio/i.test(line)) {
      break;
    }

    if (/^Date\s+Code\s+Description/i.test(line)) {
      break;
    }

    const tokens = extractMoneyTokens(line);

    if (tokens.length === 0) {
      continue;
    }

    if (openingBalance === null && tokens.length === 1) {
      openingBalance = tokens[0].amount;
      continue;
    }

    if (tokens.length >= 2) {
      amountRows.push({
        amount: tokens[tokens.length - 2].amount,
        balance_after: tokens[tokens.length - 1].amount,
        raw: line
      });
    }
  }

  if (openingBalance === null || amountRows.length === 0) {
    return [];
  }

  const count = Math.min(dateRows.length, descriptions.length, amountRows.length);

  if (count === 0) {
    return [];
  }

  const transactions = [];
  let previousBalance = openingBalance;

  for (let index = 0; index < count; index += 1) {
    const dateRow = dateRows[index];
    const description = descriptions[index];
    const amountRow = amountRows[index];

    const balanceDiff = roundMoney(
      Number(amountRow.balance_after || 0) - Number(previousBalance || 0)
    );

    const transactionType =
      balanceDiff > 0
        ? 'depot'
        : balanceDiff < 0
          ? 'retrait'
          : inferTypeFromAmounts({
              debitAmount: null,
              creditAmount: null,
              amount: amountRow.amount,
              previousBalance,
              balanceAfter: amountRow.balance_after,
              description
            });

    transactions.push(
      buildTransaction({
        transactionDate: dateRow.transaction_date,
        transactionType,
        description,
        amount: amountRow.amount,
        balanceAfter: amountRow.balance_after,
        reference: dateRow.reference,
        rawText: `${dateRow.raw} ${description} ${amountRow.raw}`.trim(),
        correctionNotes:
          'Transaction extraite automatiquement depuis un relevé bancaire à colonnes séparées.'
      })
    );

    previousBalance = amountRow.balance_after;
  }

  return removeDuplicateTransactions(transactions);
}

function extractEquitableFundTransferTransactions(rawText) {
  const text = String(rawText || '').replace(/\r/g, '\n').replace(/\u00a0/g, ' ');
  const normalized = normalizeForSearch(text);

  const isEquitableTransfer =
    normalized.includes('equitable') &&
    normalized.includes('transfert') &&
    normalized.includes('fonds');

  if (!isEquitableTransfer) {
    return [];
  }

  const contractMatch = text.match(/Num[ée]ro de contrat\s*:\s*([0-9]+)/i);
  const reference = contractMatch?.[1] || null;

  const holderMatch = text.match(/Titulaire de contrat\s*:\s*([^\n]+)(?:\n([A-ZÀ-Ÿ' -]{3,}))?/i);
  const holderName = normalizeSpaces(
    `${holderMatch?.[1] || ''} ${holderMatch?.[2] || ''}`
  ) || null;

  const dateMatch = text.match(/en date du\s+(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,12})\s+(\d{4})/i);
  const transactionDate = dateMatch
    ? parseDateFromParts(dateMatch[1], dateMatch[2], Number(dateMatch[3]))
    : null;

  const lines = splitLines(text);
  const transactions = [];
  let section = null;

  for (const line of lines) {
    if (/Provenance du transfert/i.test(line)) {
      section = 'retrait';
      continue;
    }

    if (/Destination du transfert/i.test(line)) {
      section = 'depot';
      continue;
    }

    if (!section) {
      continue;
    }

    if (!/fonds/i.test(line)) {
      continue;
    }

    const tokens = extractMoneyTokens(line);

    if (tokens.length === 0) {
      continue;
    }

    const amount = tokens[0].amount;

    const description = cleanDescriptionFromMoney(line);

    transactions.push({
      ...buildTransaction({
        transactionDate,
        transactionType: section,
        description:
          section === 'retrait'
            ? `Transfert sortant - ${description}`
            : `Transfert entrant - ${description}`,
        amount,
        balanceAfter: null,
        reference,
        rawText: line,
        correctionNotes:
          'Transaction extraite automatiquement depuis un document de transfert de fonds.'
      }),
      extracted_client_name: holderName
    });
  }

  return removeDuplicateTransactions(transactions);
}

function extractFallbackFinancialTransactions(rawText) {
  const defaultYear = extractStatementYear(rawText);
  const lines = splitLines(rawText);
  const transactions = [];
  let previousBalance = null;

  for (const line of lines) {
    const parsed = parseInlineTransactionLine(line, defaultYear, previousBalance);

    if (!parsed) {
      continue;
    }

    transactions.push(parsed);

    if (parsed.balance_after !== null && parsed.balance_after !== undefined) {
      previousBalance = parsed.balance_after;
    }
  }

  return removeDuplicateTransactions(transactions);
}

export function extractTransactionsFromText(rawText) {
  const columnSeparatedTransactions = extractColumnSeparatedTransactions(rawText);

  if (columnSeparatedTransactions.length > 0) {
    return columnSeparatedTransactions;
  }

  const inlineTableTransactions = extractInlineTableTransactions(rawText);

  if (inlineTableTransactions.length > 0) {
    return inlineTableTransactions;
  }

  const equitableTransferTransactions =
    extractEquitableFundTransferTransactions(rawText);

  if (equitableTransferTransactions.length > 0) {
    return equitableTransferTransactions;
  }

  return extractFallbackFinancialTransactions(rawText);
}

async function extractPdfText(fileBuffer) {
  const pdfParseModule = await import('pdf-parse');

  if (typeof pdfParseModule.PDFParse === 'function') {
    const parser = new pdfParseModule.PDFParse({
      data: fileBuffer
    });

    try {
      const result = await parser.getText();
      return result?.text || '';
    } finally {
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    }
  }

  if (typeof pdfParseModule.default === 'function') {
    const result = await pdfParseModule.default(fileBuffer);
    return result?.text || '';
  }

  throw new Error('Impossible de parser le PDF du relevé.');
}

export async function extractTextFromBankStatement(source, mimeType) {
  let fileBuffer = null;

  if (Buffer.isBuffer(source)) {
    fileBuffer = source;
  } else if (typeof source === 'string') {
    if (!fs.existsSync(source)) {
      throw new Error('Fichier du relevé introuvable.');
    }
    fileBuffer = fs.readFileSync(source);
  } else {
    throw new Error('Source fichier du relevé invalide.');
  }

  if (mimeType === 'application/pdf') {
    return extractPdfText(fileBuffer);
  }

  throw new Error(
    'Extraction OCR image non configurée. Veuillez importer un PDF texte pour le moment.'
  );
}

export function buildStoredFileUrl(filename, companyId = null) {
  if (companyId) {
    return `private/companies/${companyId}/bank-statements/${filename}`;
  }

  // Legacy fallback path (old public storage layout)
  return `/storage/bank-statements/${filename}`;
}

export function resolveStoredFilePath(fileUrl, companyId = null) {
  if (!fileUrl) {
    return null;
  }

  const normalized = String(fileUrl).replace(/^\/+/, '');

  if (normalized.startsWith('private/')) {
    return path.resolve(process.cwd(), 'storage', normalized);
  }

  if (normalized.startsWith('storage/')) {
    return path.resolve(process.cwd(), normalized);
  }

  const filename = path.basename(fileUrl);

  if (companyId) {
    const privateCandidate = path.resolve(
      process.cwd(),
      'storage',
      'private',
      'companies',
      String(companyId),
      'bank-statements',
      filename
    );

    if (fs.existsSync(privateCandidate)) {
      return privateCandidate;
    }
  }

  return path.join(BANK_STATEMENT_STORAGE_DIR, filename);
}