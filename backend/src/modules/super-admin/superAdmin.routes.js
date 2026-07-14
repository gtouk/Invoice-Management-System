import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireSuperAdmin } from '../../middlewares/superAdmin.middleware.js';
import * as superAdminController from './superAdmin.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requireSuperAdmin);

router.get('/stats', superAdminController.getPlatformStats);
router.get('/companies', superAdminController.listCompanies);
router.get('/companies/:id', superAdminController.getCompanyDetails);
router.patch('/companies/:id/suspend', superAdminController.suspendCompany);
router.patch('/companies/:id/activate', superAdminController.activateCompany);
router.get('/companies/:id/users', superAdminController.getCompanyUsers);
router.get('/companies/:id/summary', superAdminController.getCompanySummary);
router.get('/audit-logs', superAdminController.listAuditLogs);
router.get('/audit-logs/filter-options', superAdminController.getAuditLogFilterOptions);

export default router;
