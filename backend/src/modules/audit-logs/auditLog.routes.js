import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireAdmin } from '../../middlewares/permission.middleware.js';
import * as auditLogController from './auditLog.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', auditLogController.listAuditLogs);
router.get('/filter-options', auditLogController.getAuditLogFilterOptions);

export default router;
