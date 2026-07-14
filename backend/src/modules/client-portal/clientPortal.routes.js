import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireClient } from '../../middlewares/permission.middleware.js';
import * as clientPortalController from './clientPortal.controller.js';

const router = Router();

router.use(requireAuth, requireClient);

router.get('/profile', clientPortalController.getProfile);
router.get('/summary', clientPortalController.getSummary);
router.get('/dashboard', clientPortalController.getDashboard);
router.get('/invoices', clientPortalController.listInvoices);
router.get('/invoices/:id', clientPortalController.getInvoice);
router.get('/invoices/:id/pdf', clientPortalController.getInvoicePdf);
router.get('/invoices/:id/download', clientPortalController.downloadInvoicePdf);
router.get('/payments', clientPortalController.listPayments);

export default router;
