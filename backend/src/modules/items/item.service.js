import * as itemRepository from './item.repository.js';
import { query } from '../../database/db.js';
import {
  validateItemPayload,
  validateItemFilters
} from './item.validation.js';

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

async function writeAuditLog({
  userId,
  action,
  entityType,
  entityId,
  oldValues = null,
  newValues = null
}) {
  await query(
    `
      INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      userId || null,
      action,
      entityType,
      entityId || null,
      oldValues,
      newValues
    ]
  );
}

export async function listItems(queryParams = {}, companyId) {
  requireCompanyId(companyId);

  const filters = validateItemFilters(queryParams);

  return itemRepository.findAllItems(filters, companyId);
}

export async function getItem(id, companyId) {
  requireCompanyId(companyId);

  const item = await itemRepository.findItemById(id, companyId);

  if (!item) {
    throw createHttpError('Article ou service introuvable.', 404);
  }

  return item;
}

export async function createItem(payload, userId, companyId) {
  requireCompanyId(companyId);

  const validation = validateItemPayload(payload);

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const existing = await itemRepository.findActiveItemByName(
    validation.data.name,
    companyId
  );

  if (existing) {
    throw createHttpError(
      'Un article ou service actif avec ce nom existe déjà.',
      409
    );
  }

  const item = await itemRepository.createItem({
    ...validation.data,
    company_id: companyId,
    created_by: userId
  });

  await writeAuditLog({
    userId,
    action: 'item_created',
    entityType: 'item',
    entityId: item.id,
    newValues: item
  });

  return item;
}

export async function updateItem(id, payload, userId, companyId) {
  requireCompanyId(companyId);

  const existing = await itemRepository.findItemById(id, companyId);

  if (!existing) {
    throw createHttpError('Article ou service introuvable.', 404);
  }

  const validation = validateItemPayload(payload);

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const sameNameItem = await itemRepository.findActiveItemByName(
    validation.data.name,
    companyId
  );

  if (sameNameItem && sameNameItem.id !== id) {
    throw createHttpError(
      'Un autre article ou service actif avec ce nom existe déjà.',
      409
    );
  }

  const updated = await itemRepository.updateItem(
    id,
    validation.data,
    companyId
  );

  await writeAuditLog({
    userId,
    action: 'item_updated',
    entityType: 'item',
    entityId: id,
    oldValues: existing,
    newValues: updated
  });

  return updated;
}

export async function disableItem(id, userId, companyId) {
  requireCompanyId(companyId);

  const existing = await itemRepository.findItemById(id, companyId);

  if (!existing) {
    throw createHttpError('Article ou service introuvable.', 404);
  }

  if (existing.status === 'desactive') {
    throw createHttpError('Cet article ou service est déjà désactivé.', 409);
  }

  const disabled = await itemRepository.disableItem(id, companyId);

  await writeAuditLog({
    userId,
    action: 'item_disabled',
    entityType: 'item',
    entityId: id,
    oldValues: existing,
    newValues: disabled
  });

  return disabled;
}

export async function reactivateItem(id, userId, companyId) {
  requireCompanyId(companyId);

  const existing = await itemRepository.findItemById(id, companyId);

  if (!existing) {
    throw createHttpError('Article ou service introuvable.', 404);
  }

  if (existing.status === 'actif') {
    throw createHttpError('Cet article ou service est déjà actif.', 409);
  }

  const reactivated = await itemRepository.reactivateItem(id, companyId);

  await writeAuditLog({
    userId,
    action: 'item_reactivated',
    entityType: 'item',
    entityId: id,
    oldValues: existing,
    newValues: reactivated
  });

  return reactivated;
}

export async function deleteItem(id, userId, companyId) {
  requireCompanyId(companyId);

  const existing = await itemRepository.findItemById(id, companyId);

  if (!existing) {
    throw createHttpError('Article ou service introuvable.', 404);
  }

  const isUsed = await itemRepository.isItemUsedInInvoice(id, companyId);

  if (isUsed) {
    throw createHttpError(
      'Cet article ou service est déjà utilisé dans une facture. Il ne peut pas être supprimé. Vous pouvez le désactiver.',
      409
    );
  }

  const deleted = await itemRepository.deleteItem(id, companyId);

  await writeAuditLog({
    userId,
    action: 'item_deleted',
    entityType: 'item',
    entityId: id,
    oldValues: existing
  });

  return deleted;
}