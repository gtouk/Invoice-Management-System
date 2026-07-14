import fs from 'fs';
import path from 'path';
import * as bankStatementRepository from './bankStatement.repository.js';
import * as invoiceRepository from '../invoices/invoice.repository.js';
import {
  extractTextFromBankStatement,
  extractTransactionsFromText,
  buildStoredFileUrl
} from '../../services/bankStatementParser.service.js';
import { createAuditLog } from '../../utils/audit.util.js';
import {
  buildBankStatementPrivateRelativePath
} from '../../utils/storage.util.js';
import {
  deletePrivateFile,
  getPrivateFile,
  savePrivateFile
} from '../../services/storage.service.js';
import { buildBankStatementStoredFilename } from '../../middlewares/upload.middleware.js';
import {
  validateBankStatementFilters,
  validateCreateBankStatementPayload,
  validateCreateBankTransactionPayload,
  validateMatchClientPayload,
  validateCreateClientFromTransactionPayload,
  validateCreateInvoiceFromTransactionPayload
} from './bankStatement.validation.js';

function createHttpError(message, statusCode = 400, errors = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

function requireCompanyId(companyId) {
  if (!companyId) {
    throw createHttpError(
      'Aucune entreprise associée à cet utilisateur.',
      403
    );
  }
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getTransactionCompanyId(transaction, userCompanyId) {
  return transaction?.company_id || userCompanyId || null;
}

function ensureTransactionBelongsToCompany(transaction, companyId) {
  requireCompanyId(companyId);

  if (!transaction?.company_id || transaction.company_id !== companyId) {
    throw createHttpError(
      'Cette transaction bancaire n’appartient pas à votre entreprise.',
      403
    );
  }
}

export async function listBankStatements(queryParams = {}, companyId = null) {
  requireCompanyId(companyId);
  const filters = validateBankStatementFilters(queryParams);
  return bankStatementRepository.findBankStatements(filters, companyId);
}

export async function getBankStatementById(id, companyId = null) {
  requireCompanyId(companyId);

  const statement = await bankStatementRepository.findBankStatementById(
    id,
    companyId
  );

  if (!statement) {
    throw createHttpError('Relevé de compte introuvable.', 404);
  }

  const transactions =
    await bankStatementRepository.findTransactionsByStatementId(
      id,
      statement.company_id || companyId
    );

  return {
    statement,
    transactions
  };
}

export async function createBankStatement(payload, userId, companyId) {
  requireCompanyId(companyId);

  const validation = validateCreateBankStatementPayload(payload);

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  return bankStatementRepository.createBankStatement({
    ...validation.data,
    company_id: companyId,
    imported_by: userId || null
  });
}

export async function importBankStatementFile(
  file,
  payload = {},
  userId,
  companyId
) {
  requireCompanyId(companyId);

  if (!file) {
    throw createHttpError('Le fichier du relevé est obligatoire.', 422);
  }

  const sourceType = payload.source_type || 'upload';

  if (!['upload', 'scan'].includes(sourceType)) {
    throw createHttpError(
      "Le type de source doit être 'upload' ou 'scan'.",
      422
    );
  }

  const storedFilename =
    file.filename || buildBankStatementStoredFilename(file.originalname);
  const relativePath = buildBankStatementPrivateRelativePath(
    companyId,
    storedFilename
  );

  let buffer = file.buffer || null;

  if (!buffer && file.path) {
    buffer = fs.readFileSync(file.path);
  }

  if (!buffer) {
    throw createHttpError('Impossible de lire le fichier uploadé.', 422);
  }

  await savePrivateFile({
    relativePath,
    buffer,
    contentType: file.mimetype || 'application/octet-stream'
  });

  return bankStatementRepository.createBankStatement({
    company_id: companyId,
    file_name: file.originalname,
    file_url: relativePath || buildStoredFileUrl(storedFilename, companyId),
    source_type: sourceType,
    imported_by: userId || null,
    notes: payload.notes || null
  });
}

export async function processBankStatement(id, companyId) {
  requireCompanyId(companyId);

  const statement = await bankStatementRepository.findBankStatementById(
    id,
    companyId
  );

  if (!statement) {
    throw createHttpError('Relevé de compte introuvable.', 404);
  }

  if (!statement.company_id) {
    throw createHttpError(
      'Ce relevé bancaire n’est associé à aucune entreprise.',
      403
    );
  }

  if (!statement.file_url) {
    throw createHttpError(
      'Ce relevé ne contient aucun fichier à scanner.',
      422
    );
  }

  const privateFile = await getPrivateFile({ relativePath: statement.file_url });

  if (!privateFile?.buffer?.length) {
    throw createHttpError(
      'Fichier du relevé introuvable sur le serveur.',
      404
    );
  }

  const fileName = statement.file_url.toLowerCase();

  let mimeType = privateFile.contentType || 'application/pdf';

  if (fileName.endsWith('.png')) {
    mimeType = 'image/png';
  }

  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
    mimeType = 'image/jpeg';
  }

  const rawText = await extractTextFromBankStatement(
    privateFile.buffer,
    mimeType
  );

  if (!rawText || rawText.trim().length === 0) {
    await bankStatementRepository.updateBankStatementStatus(
      id,
      'erreur',
      statement.company_id
    );

    throw createHttpError(
      'Aucun texte exploitable n’a été extrait. Si c’est un PDF scanné, il faudra utiliser OCR image avancé.',
      422
    );
  }

  const transactions = extractTransactionsFromText(rawText);

  await bankStatementRepository.deleteTransactionsByStatementId(
    id,
    statement.company_id
  );

  const createdTransactions =
    await bankStatementRepository.bulkCreateBankTransactions(
      id,
      statement.company_id,
      transactions
    );

  const updatedStatement =
    await bankStatementRepository.updateBankStatementStatus(
      id,
      'traite',
      statement.company_id
    );

  return {
    statement: updatedStatement,
    transactions: createdTransactions,
    transactions_count: createdTransactions.length,
    raw_text_preview: rawText.slice(0, 15000)
  };
}

export async function deleteBankStatement(id, companyId = null) {
  requireCompanyId(companyId);

  const statement = await bankStatementRepository.findBankStatementById(
    id,
    companyId
  );

  if (!statement) {
    throw createHttpError('Relevé de compte introuvable.', 404);
  }

  const usedTransactionsCount =
    await bankStatementRepository.countUsedTransactionsByStatementId(
      id,
      statement.company_id || companyId
    );

  if (usedTransactionsCount > 0) {
    throw createHttpError(
      'Impossible de supprimer ce relevé : une ou plusieurs transactions ont déjà été utilisées pour créer une facture.',
      409
    );
  }

  await bankStatementRepository.deleteTransactionsByStatementId(
    id,
    statement.company_id || companyId
  );

  const deletedStatement =
    await bankStatementRepository.deleteBankStatementById(
      id,
      statement.company_id || companyId
    );

  if (statement.file_url) {
    await deletePrivateFile({ relativePath: statement.file_url });
  }

  return deletedStatement;
}

export async function addTransactionToStatement(
  bankStatementId,
  payload,
  companyId = null
) {
  requireCompanyId(companyId);

  const statement =
    await bankStatementRepository.findBankStatementById(
      bankStatementId,
      companyId
    );

  if (!statement) {
    throw createHttpError('Relevé de compte introuvable.', 404);
  }

  if (!statement.company_id) {
    throw createHttpError(
      'Ce relevé bancaire n’est associé à aucune entreprise.',
      403
    );
  }

  const validation = validateCreateBankTransactionPayload(payload);

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const transaction = await bankStatementRepository.createBankTransaction({
    ...validation.data,
    company_id: statement.company_id,
    bank_statement_id: bankStatementId
  });

  await bankStatementRepository.updateBankStatementStatus(
    bankStatementId,
    'traite',
    statement.company_id
  );

  return transaction;
}

export async function listTransactionsByStatement(
  bankStatementId,
  companyId = null
) {
  requireCompanyId(companyId);

  const statement =
    await bankStatementRepository.findBankStatementById(
      bankStatementId,
      companyId
    );

  if (!statement) {
    throw createHttpError('Relevé de compte introuvable.', 404);
  }

  return bankStatementRepository.findTransactionsByStatementId(
    bankStatementId,
    statement.company_id || companyId
  );
}

export async function correctTransaction(
  transactionId,
  payload,
  companyId = null
) {
  requireCompanyId(companyId);

  const transaction =
    await bankStatementRepository.findBankTransactionById(
      transactionId,
      companyId
    );

  if (!transaction) {
    throw createHttpError('Transaction introuvable.', 404);
  }

  ensureTransactionBelongsToCompany(transaction, companyId);

  if (transaction.status === 'utilise') {
    throw createHttpError(
      'Cette transaction est déjà utilisée pour créer une facture.',
      409
    );
  }

  const validation = validateCreateBankTransactionPayload(payload);

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  return bankStatementRepository.updateBankTransaction(
    transactionId,
    transaction.company_id || companyId,
    validation.data
  );
}

export async function matchTransactionClient(
  transactionId,
  payload,
  companyId = null
) {
  requireCompanyId(companyId);

  const transaction =
    await bankStatementRepository.findBankTransactionById(
      transactionId,
      companyId
    );

  if (!transaction) {
    throw createHttpError('Transaction introuvable.', 404);
  }

  ensureTransactionBelongsToCompany(transaction, companyId);

  if (transaction.status === 'utilise') {
    throw createHttpError(
      'Cette transaction est déjà utilisée pour créer une facture.',
      409
    );
  }

  const validation = validateMatchClientPayload(payload);

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const transactionCompanyId = getTransactionCompanyId(transaction, companyId);

  const client = await invoiceRepository.findClientById(
    validation.data.matched_client_id,
    transactionCompanyId
  );

  if (!client) {
    throw createHttpError(
      'Client introuvable pour cette entreprise.',
      404
    );
  }

  return bankStatementRepository.matchTransactionClient(
    transactionId,
    validation.data.matched_client_id,
    transactionCompanyId
  );
}

export async function createClientFromTransaction(
  transactionId,
  payload,
  userId,
  companyId = null
) {
  requireCompanyId(companyId);

  const transaction =
    await bankStatementRepository.findBankTransactionById(
      transactionId,
      companyId
    );

  if (!transaction) {
    throw createHttpError('Transaction introuvable.', 404);
  }

  ensureTransactionBelongsToCompany(transaction, companyId);

  if (transaction.status === 'utilise') {
    throw createHttpError(
      'Cette transaction est déjà utilisée pour créer une facture.',
      409
    );
  }

  const transactionCompanyId = getTransactionCompanyId(transaction, companyId);

  if (!transactionCompanyId) {
    throw createHttpError(
      'Aucune entreprise associée à cette transaction.',
      403
    );
  }

  const defaultName =
    transaction.extracted_client_name || payload.full_name || 'Client sans nom';

  const validation = validateCreateClientFromTransactionPayload({
    ...payload,
    full_name: payload.full_name || defaultName
  });

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const client = await bankStatementRepository.createClientFromTransaction({
    ...validation.data,
    company_id: transactionCompanyId,
    notes:
      validation.data.notes ||
      `Client créé depuis une transaction bancaire : ${transaction.reference || transaction.id}`,
    created_by: userId || null
  });

  const updatedTransaction =
    await bankStatementRepository.matchTransactionClient(
      transactionId,
      client.id,
      transactionCompanyId
    );

  return {
    client,
    transaction: updatedTransaction
  };
}

export async function validateTransaction(
  transactionId,
  userId,
  companyId = null
) {
  requireCompanyId(companyId);

  const transaction =
    await bankStatementRepository.findBankTransactionById(
      transactionId,
      companyId
    );

  if (!transaction) {
    throw createHttpError('Transaction introuvable.', 404);
  }

  ensureTransactionBelongsToCompany(transaction, companyId);

  if (transaction.status === 'utilise') {
    throw createHttpError(
      'Cette transaction est déjà utilisée pour créer une facture.',
      409
    );
  }

  if (!transaction.matched_client_id) {
    throw createHttpError(
      'Veuillez associer un client à cette transaction avant validation.',
      422
    );
  }

  if (!transaction.amount || Number(transaction.amount) <= 0) {
    throw createHttpError(
      'La transaction doit avoir un montant supérieur à zéro avant validation.',
      422
    );
  }

  return bankStatementRepository.validateBankTransaction(
    transactionId,
    userId || null,
    transaction.company_id || companyId
  );
}

export async function createInvoiceFromTransaction(
  transactionId,
  payload,
  userId,
  userCompanyId
) {
  requireCompanyId(userCompanyId);

  const transaction =
    await bankStatementRepository.findBankTransactionById(
      transactionId,
      userCompanyId
    );

  if (!transaction) {
    throw createHttpError('Transaction introuvable.', 404);
  }

  ensureTransactionBelongsToCompany(transaction, userCompanyId);

  const companyId = getTransactionCompanyId(transaction, userCompanyId);

  if (!companyId) {
    throw createHttpError(
      'Aucune entreprise associée à cette transaction.',
      403
    );
  }

  if (transaction.status === 'utilise' || transaction.created_invoice_id) {
    throw createHttpError(
      'Cette transaction est déjà utilisée pour créer une facture.',
      409
    );
  }

  if (transaction.status !== 'valide') {
    throw createHttpError(
      'La transaction doit être validée avant de créer une facture.',
      422
    );
  }

  if (transaction.transaction_type !== 'depot') {
    throw createHttpError(
      'Seules les transactions de type dépôt peuvent créer une facture client. Les retraits seront traités dans le module Dépenses.',
      422
    );
  }

  const validation = validateCreateInvoiceFromTransactionPayload({
    ...payload,
    client_id: payload.client_id || transaction.matched_client_id
  });

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const clientId = validation.data.client_id;

  const client = await invoiceRepository.findClientById(clientId, companyId);

  if (!client) {
    throw createHttpError('Client introuvable pour cette entreprise.', 404);
  }

  const invoiceItems = [];

  for (const item of validation.data.items) {
    let itemName = item.item_name;
    let description = item.description || null;
    let unitPrice = item.unit_price;
    let dbItem = null;

    if (item.item_id) {
      dbItem = await invoiceRepository.findItemById(item.item_id, companyId);

      if (!dbItem) {
        throw createHttpError('Article ou service introuvable.', 404);
      }

      if (dbItem.status && dbItem.status !== 'actif') {
        throw createHttpError(
          `L’article ou service "${dbItem.name}" est désactivé.`,
          409
        );
      }

      const isMemberClient = client.membership_status === 'membre';

      const catalogPrice = isMemberClient
        ? dbItem.member_price || dbItem.non_member_price || dbItem.default_price
        : dbItem.non_member_price || dbItem.default_price;

      itemName = dbItem.name;
      description = item.description || dbItem.description || null;

      unitPrice =
        item.unit_price !== undefined &&
        item.unit_price !== null &&
        item.unit_price !== ''
          ? Number(item.unit_price)
          : Number(catalogPrice);
    }

    const quantity = Number(item.quantity || 1);
    const numericUnitPrice = Number(unitPrice || 0);
    const lineTotal = roundMoney(quantity * numericUnitPrice);

    invoiceItems.push({
      item_id: item.item_id || null,
      item_name: itemName || 'Service bancaire',
      description,
      quantity,
      unit_price: roundMoney(numericUnitPrice),
      line_total: lineTotal
    });
  }

  const itemsTotal = roundMoney(
    invoiceItems.reduce((sum, item) => sum + Number(item.line_total || 0), 0)
  );

  const transactionAmount = roundMoney(transaction.amount);
  const difference = roundMoney(transactionAmount - itemsTotal);

  if (difference !== 0) {
    const adjustment = validation.data.adjustment;

    if (!adjustment?.enabled) {
      const reconciliationErrors = [
        `Montant transaction : ${transactionAmount.toFixed(2)}`,
        `Total articles : ${itemsTotal.toFixed(2)}`,
        `Écart : ${difference.toFixed(2)}`,
        'Suggestion : ajoutez une ligne Ajustement / frais / écart de rapprochement ou modifiez les articles.'
      ];

      throw createHttpError(
        'Le total des articles ne correspond pas au montant de la transaction bancaire.',
        409,
        reconciliationErrors
      );
    }

    if (!adjustment.reason || adjustment.reason.trim() === '') {
      throw createHttpError(
        'La raison de l’ajustement est obligatoire.',
        422
      );
    }

    invoiceItems.push({
      item_id: null,
      item_name: adjustment.label || 'Ajustement de rapprochement',
      description: adjustment.reason,
      quantity: 1,
      unit_price: difference,
      line_total: difference
    });
  }

  const subtotalAmount = roundMoney(
    invoiceItems.reduce((sum, item) => sum + Number(item.line_total || 0), 0)
  );

const invoice = await invoiceRepository.createInvoice({
  company_id: companyId,
  client_id: clientId,
  issue_date: validation.data.issue_date || transaction.transaction_date || null,
  due_date: validation.data.due_date || null,
  subtotal_amount: subtotalAmount,
  total_amount: subtotalAmount,

  // Important :
  // On crée seulement la facture ici.
  // Le paiement bancaire est lié via bank_transactions.created_invoice_id.
  paid_amount: 0,
  balance_due: subtotalAmount,

  taxes_enabled: false,
    gst_hst_rate: 0,
    gst_hst_amount: 0,
    qst_rate: 0,
    qst_amount: 0,
    custom_tax_label: null,
    custom_tax_rate: 0,
    custom_tax_amount: 0,
    tax_amount: 0,

    notes:
      validation.data.notes ||
      `Facture créée depuis transaction bancaire : ${transaction.description || transaction.reference || transaction.id}`,

    created_by: userId || null,
    items: invoiceItems
  });

  const finalDifference = roundMoney(transactionAmount - subtotalAmount);

  const updatedTransaction =
    await bankStatementRepository.markTransactionUsedForInvoice(
      transactionId,
      companyId,
      invoice.id,
      finalDifference,
      finalDifference === 0
        ? 'Rapprochement exact.'
        : `Écart ajusté : ${finalDifference.toFixed(2)}.`
    );

  if (!updatedTransaction) {
    throw createHttpError(
      'La facture a été créée, mais la transaction bancaire n’a pas pu être marquée comme utilisée.',
      500
    );
  }

  return {
    invoice,
    transaction: updatedTransaction,
    reconciliation: {
      transaction_amount: transactionAmount,
      items_total: itemsTotal,
      invoice_total: subtotalAmount,
      difference: finalDifference
    }
  };
}

export async function downloadBankStatementFile(id, user, auditContext = {}) {
  requireCompanyId(user?.company_id);

  if (!['admin', 'company_admin', 'employee', 'super_admin'].includes(user.role)) {
    throw createHttpError('Accès réservé aux utilisateurs internes.', 403);
  }

  const companyId = user.role === 'super_admin' ? null : user.company_id;
  const statement = await bankStatementRepository.findBankStatementById(
    id,
    companyId
  );

  if (!statement) {
    throw createHttpError('Relevé de compte introuvable.', 404);
  }

  if (
    user.role !== 'super_admin' &&
    statement.company_id !== user.company_id
  ) {
    throw createHttpError(
      'Ce relevé n’appartient pas à votre entreprise.',
      403
    );
  }

  if (!statement.file_url) {
    throw createHttpError('Aucun fichier associé à ce relevé.', 404);
  }

  const privateFile = await getPrivateFile({ relativePath: statement.file_url });

  if (!privateFile?.buffer?.length) {
    throw createHttpError('Fichier du relevé introuvable sur le serveur.', 404);
  }

  await createAuditLog({
    companyId: statement.company_id,
    userId: user.id,
    actorRole: user.role,
    action: 'bank_statement_file_downloaded',
    entityType: 'bank_statement',
    entityId: statement.id,
    ipAddress: auditContext.ipAddress,
    userAgent: auditContext.userAgent,
    metadata: {
      file_name: statement.file_name || null
    }
  });

  return {
    buffer: privateFile.buffer,
    contentType: privateFile.contentType || 'application/octet-stream',
    fileName:
      statement.file_name ||
      path.basename(privateFile.relativePath || statement.file_url)
  };
}