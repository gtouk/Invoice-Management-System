import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireAdmin } from '../../middlewares/permission.middleware.js';
import { uploadCompanyLogo } from '../../middlewares/upload.middleware.js';
import * as companySettingsController from './companySettings.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', companySettingsController.getCompanySettings);

router.put(
  '/',
  requireAdmin,
  companySettingsController.updateCompanySettings
);

router.post(
  '/logo',
  requireAdmin,
  uploadCompanyLogo.single('logo'),
  companySettingsController.uploadCompanyLogo
);

export default router;