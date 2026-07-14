import { Router } from 'express';
import * as companySettingsRepository from '../company-settings/companySettings.repository.js';
import { getCompanyLogoFile } from '../../services/storage.service.js';

const router = Router();

/**
 * Public company logo (browser + PDF safe). Bucket can stay private.
 * GET /api/public/companies/:companyId/logo
 */
router.get('/companies/:companyId/logo', async (req, res, next) => {
  try {
    const companyId = req.params.companyId;

    if (!companyId) {
      return res.status(404).end();
    }

    const settings =
      await companySettingsRepository.getCompanySettings(companyId);

    const logoFile = await getCompanyLogoFile({
      companyId,
      storedUrl: settings?.company_logo_url || null
    });

    if (!logoFile?.buffer?.length) {
      return res.status(404).json({
        success: false,
        message: 'Logo introuvable.'
      });
    }

    res.setHeader(
      'Content-Type',
      logoFile.contentType || 'application/octet-stream'
    );
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(logoFile.buffer);
  } catch (error) {
    return next(error);
  }
});

export default router;
