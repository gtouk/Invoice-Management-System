import path from 'path';
import fs from 'fs';
import * as companySettingsRepository from './companySettings.repository.js';
import { validateCompanySettingsPayload } from './companySettings.validation.js';
import {
  buildCompanyLogoRelativePath,
  getCompanyLogoApiPath
} from '../../utils/storage.util.js';
import {
  getCompanyLogoFile,
  publicFileExists,
  savePublicFile
} from '../../services/storage.service.js';

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

function extensionFromUpload(file) {
  const fromName = path.extname(file.originalname || '').toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(fromName)) {
    return fromName === '.jpeg' ? '.jpg' : fromName;
  }

  if (file.mimetype === 'image/png') return '.png';
  if (file.mimetype === 'image/webp') return '.webp';
  if (file.mimetype === 'image/jpeg') return '.jpg';

  return '.png';
}

async function presentCompanySettings(settings) {
  if (!settings) {
    return settings;
  }

  const companyId = settings.company_id;
  let hasLogo = false;

  if (companyId) {
    const logoFile = await getCompanyLogoFile({
      companyId,
      storedUrl: settings.company_logo_url
    });
    hasLogo = Boolean(logoFile?.buffer?.length);
  } else if (settings.company_logo_url) {
    hasLogo = await publicFileExists({
      relativePath: settings.company_logo_url
    });
  }

  return {
    ...settings,
    company_logo_url: hasLogo && companyId ? getCompanyLogoApiPath(companyId) : null,
    company_logo_path: settings.company_logo_url || null
  };
}

export async function getCompanySettings(companyId) {
  requireCompanyId(companyId);

  const existingSettings =
    await companySettingsRepository.getCompanySettings(companyId);

  if (existingSettings) {
    return presentCompanySettings(existingSettings);
  }

  const company = await companySettingsRepository.getCompanyById(companyId);

  if (!company) {
    throw createHttpError('Entreprise introuvable.', 404);
  }

  const created = await companySettingsRepository.createDefaultCompanySettings(
    companyId,
    company.company_name
  );

  return presentCompanySettings(created);
}

export async function updateCompanySettings(payload, companyId) {
  requireCompanyId(companyId);

  const validation = validateCompanySettingsPayload(payload);

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const settings = await companySettingsRepository.upsertCompanySettings(
    companyId,
    validation.data
  );

  await companySettingsRepository.syncCompanyProfileFromSettings(
    companyId,
    settings
  );

  return presentCompanySettings(settings);
}

export async function updateCompanyLogo(file, companyId) {
  requireCompanyId(companyId);

  if (!file) {
    throw createHttpError('Le logo est obligatoire.', 422);
  }

  let buffer = file.buffer || null;

  if (!buffer && file.path) {
    buffer = fs.readFileSync(file.path);
  }

  if (!buffer) {
    throw createHttpError('Impossible de lire le fichier logo.', 422);
  }

  const extension = extensionFromUpload(file);
  const relativePath = buildCompanyLogoRelativePath(companyId, extension);

  await savePublicFile({
    relativePath,
    buffer,
    contentType: file.mimetype || 'image/png'
  });

  const settings = await companySettingsRepository.updateCompanyLogo(
    companyId,
    relativePath
  );

  await companySettingsRepository.syncCompanyProfileFromSettings(
    companyId,
    settings
  );

  return presentCompanySettings(settings);
}
