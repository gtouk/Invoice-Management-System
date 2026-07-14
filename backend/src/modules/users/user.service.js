import bcrypt from 'bcryptjs';
import * as userRepository from './user.repository.js';
import { query } from '../../database/db.js';

function createHttpError(message, statusCode = 400, errors = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

function requireCompanyId(companyId) {
  if (!companyId) {
    throw createHttpError('Aucune entreprise associée à cet utilisateur.', 403);
  }
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeEmail(value) {
  return normalizeText(value)?.toLowerCase() || null;
}

function validateUserPayload(payload = {}, { isCreate = true } = {}) {
  const errors = [];

  const fullName = normalizeText(payload.full_name);
  const email = normalizeEmail(payload.email);
  const username = normalizeText(payload.username);
  const phone = normalizeText(payload.phone);
  const role = normalizeText(payload.role) || 'employee';
  const password = payload.password || '';

  if (!fullName) {
    errors.push('Le nom complet est obligatoire.');
  }

  if (!email) {
    errors.push('L’email est obligatoire.');
  }

  if (!username) {
    errors.push('Le nom d’utilisateur est obligatoire.');
  }

  if (isCreate && (!password || password.length < 6)) {
    errors.push('Le mot de passe doit contenir au moins 6 caractères.');
  }

  if (!['employee', 'admin', 'company_admin'].includes(role)) {
    errors.push('Le rôle utilisateur est invalide.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      full_name: fullName,
      email,
      username,
      phone,
      role,
      password
    }
  };
}

function ensureCanManageRole(role) {
  /**
   * Pour l’instant, on autorise seulement la création d’employés depuis l’interface entreprise.
   * Cela évite qu’un admin entreprise crée d’autres admins sans contrôle.
   */
  if (role !== 'employee') {
    throw createHttpError(
      'Pour cette version, vous pouvez seulement créer ou modifier des utilisateurs avec le rôle employé.',
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

export async function listUsers(filters, companyId) {
  requireCompanyId(companyId);

  return userRepository.findUsers(filters, companyId);
}

export async function getUser(id, companyId) {
  requireCompanyId(companyId);

  const user = await userRepository.findUserById(id, companyId);

  if (!user) {
    throw createHttpError('Utilisateur introuvable.', 404);
  }

  return user;
}

export async function createUser(payload, currentUserId, companyId) {
  requireCompanyId(companyId);

  const validation = validateUserPayload(payload, { isCreate: true });

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const data = validation.data;

  ensureCanManageRole(data.role);

  const existing = await userRepository.findUserByEmailOrUsername({
    email: data.email,
    username: data.username
  });

  if (existing) {
    throw createHttpError(
      'Un utilisateur avec cet email ou ce nom d’utilisateur existe déjà.',
      409
    );
  }

  const role = await userRepository.findRoleByName(data.role);

  if (!role) {
    throw createHttpError('Rôle utilisateur introuvable.', 404);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const created = await userRepository.createUser({
    company_id: companyId,
    full_name: data.full_name,
    email: data.email,
    username: data.username,
    phone: data.phone,
    role_id: role.id,
    password_hash: passwordHash
  });

  const userWithRole = await userRepository.getUserWithRole(
    created.id,
    companyId
  );

  await writeAuditLog({
    userId: currentUserId,
    action: 'user_created',
    entityType: 'user',
    entityId: created.id,
    newValues: userWithRole
  });

  return userWithRole;
}

export async function updateUser(id, payload, currentUserId, companyId) {
  requireCompanyId(companyId);

  const existing = await userRepository.getUserWithRole(id, companyId);

  if (!existing) {
    throw createHttpError('Utilisateur introuvable.', 404);
  }

  const validation = validateUserPayload(payload, { isCreate: false });

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const data = validation.data;

  ensureCanManageRole(data.role);

  const duplicated = await userRepository.findUserByEmailOrUsername({
    email: data.email,
    username: data.username
  });

  if (duplicated && duplicated.id !== id) {
    throw createHttpError(
      'Un autre utilisateur utilise déjà cet email ou ce nom d’utilisateur.',
      409
    );
  }

  const role = await userRepository.findRoleByName(data.role);

  if (!role) {
    throw createHttpError('Rôle utilisateur introuvable.', 404);
  }

  const updated = await userRepository.updateUser(id, companyId, {
    full_name: data.full_name,
    email: data.email,
    username: data.username,
    phone: data.phone,
    role_id: role.id
  });

  const userWithRole = await userRepository.getUserWithRole(
    updated.id,
    companyId
  );

  await writeAuditLog({
    userId: currentUserId,
    action: 'user_updated',
    entityType: 'user',
    entityId: id,
    oldValues: existing,
    newValues: userWithRole
  });

  return userWithRole;
}

export async function updateUserPassword(id, payload, currentUserId, companyId) {
  requireCompanyId(companyId);

  const existing = await userRepository.getUserWithRole(id, companyId);

  if (!existing) {
    throw createHttpError('Utilisateur introuvable.', 404);
  }

  const password = payload?.password || '';

  if (!password || password.length < 6) {
    throw createHttpError(
      'Le mot de passe doit contenir au moins 6 caractères.',
      422
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await userRepository.updateUserPassword(id, companyId, passwordHash);

  await writeAuditLog({
    userId: currentUserId,
    action: 'user_password_updated',
    entityType: 'user',
    entityId: id,
    oldValues: existing,
    newValues: { id }
  });

  return { id };
}

export async function disableUser(id, currentUserId, companyId) {
  requireCompanyId(companyId);

  if (id === currentUserId) {
    throw createHttpError(
      'Vous ne pouvez pas désactiver votre propre compte.',
      409
    );
  }

  const existing = await userRepository.getUserWithRole(id, companyId);

  if (!existing) {
    throw createHttpError('Utilisateur introuvable.', 404);
  }

  if (existing.role === 'admin' || existing.role === 'company_admin') {
    throw createHttpError(
      'Vous ne pouvez pas désactiver un administrateur depuis cette interface.',
      403
    );
  }

  const disabled = await userRepository.updateUserStatus(
    id,
    companyId,
    'desactive'
  );

  await writeAuditLog({
    userId: currentUserId,
    action: 'user_disabled',
    entityType: 'user',
    entityId: id,
    oldValues: existing,
    newValues: disabled
  });

  return disabled;
}

export async function reactivateUser(id, currentUserId, companyId) {
  requireCompanyId(companyId);

  const existing = await userRepository.getUserWithRole(id, companyId);

  if (!existing) {
    throw createHttpError('Utilisateur introuvable.', 404);
  }

  const reactivated = await userRepository.updateUserStatus(
    id,
    companyId,
    'actif'
  );

  await writeAuditLog({
    userId: currentUserId,
    action: 'user_reactivated',
    entityType: 'user',
    entityId: id,
    oldValues: existing,
    newValues: reactivated
  });

  return reactivated;
}