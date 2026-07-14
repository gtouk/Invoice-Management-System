import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireInternalUser } from '../../middlewares/permission.middleware.js';
import * as commissionController from './commission.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requireInternalUser);

router.get('/rate', commissionController.getExchangeRate);
router.post('/calculate', commissionController.calculateCommission);

export default router;
