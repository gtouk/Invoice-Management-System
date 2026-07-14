import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireInternalUser } from '../../middlewares/permission.middleware.js';
import * as reportController from './report.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requireInternalUser);

router.get('/dashboard', reportController.getDashboard);
router.get('/business', reportController.getReports);
router.get('/summary', reportController.getReportsSummary);
router.get('/revenue-by-month', reportController.getRevenueByMonth);
router.get('/invoices-by-status', reportController.getInvoicesByStatus);
router.get('/top-clients', reportController.getTopClients);
router.get('/payments-by-method', reportController.getPaymentsByMethod);

export default router;
