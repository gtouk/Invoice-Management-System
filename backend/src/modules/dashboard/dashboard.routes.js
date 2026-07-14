import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireInternalUser } from '../../middlewares/permission.middleware.js';
import * as dashboardController from './dashboard.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requireInternalUser);

router.get('/summary', dashboardController.getDashboardSummary);

export default router;
