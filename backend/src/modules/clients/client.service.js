import * as clientRepository from './client.repository.js';
import { query } from '../../database/db.js';
import {
  validateClientFilters,
  validateClientPayload
} from './client.validation.js';

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

export async function listClients(queryParams = {}, companyId) {
  requireCompanyId(companyId);

  const filters = validateClientFilters(queryParams);
  return clientRepository.findClients(filters, companyId);
}

export async function getClient(id, companyId) {
  requireCompanyId(companyId);

  const client = await clientRepository.findClientById(id, companyId);

  if (!client) {
    throw createHttpError('Client introuvable.', 404);
  }

  return client;
}

export async function createClient(payload, userId, companyId) {
  requireCompanyId(companyId);

  const validation = validateClientPayload(payload);

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const client = await clientRepository.createClient({
    ...validation.data,
    company_id: companyId,
    created_by: userId
  });

  await writeAuditLog({
    userId,
    action: 'client_created',
    entityType: 'client',
    entityId: client.id,
    newValues: client
  });

  return client;
}

export async function updateClient(id, payload, userId, companyId) {
  requireCompanyId(companyId);

  const existing = await clientRepository.findClientById(id, companyId);

  if (!existing) {
    throw createHttpError('Client introuvable.', 404);
  }

  const validation = validateClientPayload(payload);

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const updated = await clientRepository.updateClient(
    id,
    validation.data,
    companyId
  );

  await writeAuditLog({
    userId,
    action: 'client_updated',
    entityType: 'client',
    entityId: id,
    oldValues: existing,
    newValues: updated
  });

  return updated;
}

export async function deleteClient(id, userId, companyId) {
  requireCompanyId(companyId);

  const existing = await clientRepository.findClientById(id, companyId);

  if (!existing) {
    throw createHttpError('Client introuvable.', 404);
  }

  const invoicesCount = await clientRepository.countClientInvoices(
    id,
    companyId
  );

  const paymentsCount = await clientRepository.countClientPayments(
    id,
    companyId
  );

  if (invoicesCount > 0 || paymentsCount > 0) {
    throw createHttpError(
      'Ce client possède déjà un historique. Vous pouvez l’archiver.',
      409
    );
  }

  const deleted = await clientRepository.deleteClient(id, companyId);

  await writeAuditLog({
    userId,
    action: 'client_deleted',
    entityType: 'client',
    entityId: id,
    oldValues: existing
  });

  return deleted;
}

export async function archiveClient(id, userId, companyId) {
  requireCompanyId(companyId);

  const existing = await clientRepository.findClientById(id, companyId);

  if (!existing) {
    throw createHttpError('Client introuvable.', 404);
  }

  if (existing.status === 'archive') {
    throw createHttpError('Ce client est déjà archivé.', 409);
  }

  const archived = await clientRepository.archiveClient(id, companyId);

  await writeAuditLog({
    userId,
    action: 'client_archived',
    entityType: 'client',
    entityId: id,
    oldValues: existing,
    newValues: archived
  });

  return archived;
}

export async function reactivateClient(id, userId, companyId) {
  requireCompanyId(companyId);

  const existing = await clientRepository.findClientById(id, companyId);

  if (!existing) {
    throw createHttpError('Client introuvable.', 404);
  }

  if (existing.status === 'actif') {
    throw createHttpError('Ce client est déjà actif.', 409);
  }

  const reactivated = await clientRepository.reactivateClient(
    id,
    companyId
  );

  await writeAuditLog({
    userId,
    action: 'client_reactivated',
    entityType: 'client',
    entityId: id,
    oldValues: existing,
    newValues: reactivated
  });

  return reactivated;
}

export async function getClientHistory(clientId, companyId) {
  requireCompanyId(companyId);

  const history = await clientRepository.getClientHistory(
    clientId,
    companyId
  );

  if (!history) {
    throw createHttpError('Client introuvable.', 404);
  }

  return history;
}