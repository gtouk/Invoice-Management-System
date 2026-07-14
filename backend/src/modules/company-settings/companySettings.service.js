import * as companySettingsRepository from './companySettings.repository.js';
import { validateCompanySettingsPayload } from './companySettings.validation.js';

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

export async function getCompanySettings(companyId) {
  requireCompanyId(companyId);

  const existingSettings =
    await companySettingsRepository.getCompanySettings(companyId);

  if (existingSettings) {
    return existingSettings;
  }

  const company = await companySettingsRepository.getCompanyById(companyId);

  if (!company) {
    throw createHttpError('Entreprise introuvable.', 404);
  }

  return companySettingsRepository.createDefaultCompanySettings(
    companyId,
    company.company_name
  );
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

  return settings;
}

export async function updateCompanyLogo(file, companyId) {
  requireCompanyId(companyId);

  if (!file) {
    throw createHttpError('Le logo est obligatoire.', 422);
  }

  const logoUrl = `/storage/company/${file.filename}`;

  const settings = await companySettingsRepository.updateCompanyLogo(
    companyId,
    logoUrl
  );

  await companySettingsRepository.syncCompanyProfileFromSettings(
    companyId,
    settings
  );

  return settings;
}