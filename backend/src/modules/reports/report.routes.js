import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireInternalUser } from '../../middlewares/permission.middleware.js';
import * as reportController from './report.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requireInternalUser);

router.get('/dashboard', reportController.getDashboard);
router.get('/summary', reportController.getDashboard);
router.get('/business', reportController.getReports);

export default router;