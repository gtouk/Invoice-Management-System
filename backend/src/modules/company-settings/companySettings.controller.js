import { successResponse } from '../../utils/response.util.js';
import * as companySettingsService from './companySettings.service.js';

export async function getCompanySettings(req, res, next) {
  try {
    const settings = await companySettingsService.getCompanySettings(
      req.user?.company_id
    );

    return successResponse(
      res,
      'Paramètres entreprise',
      settings
    );
  } catch (error) {
    next(error);
  }
}

export async function updateCompanySettings(req, res, next) {
  try {
    const settings = await companySettingsService.updateCompanySettings(
      req.body,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Paramètres entreprise mis à jour avec succès',
      settings
    );
  } catch (error) {
    next(error);
  }
}

export async function uploadCompanyLogo(req, res, next) {
  try {
    const settings = await companySettingsService.updateCompanyLogo(
      req.file,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Logo entreprise mis à jour avec succès',
      settings
    );
  } catch (error) {
    next(error);
  }
}