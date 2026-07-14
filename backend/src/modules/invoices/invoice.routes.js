import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireInternalUser } from '../../middlewares/permission.middleware.js';
import * as invoiceController from './invoice.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requireInternalUser);

router.get('/', invoiceController.listInvoices);
router.post('/', invoiceController.createDraftInvoice);
router.get('/:id/email/prepare', invoiceController.prepareInvoiceEmail);
router.post('/:id/send-email', invoiceController.sendInvoiceEmail);
router.get('/:id/email/logs', invoiceController.listInvoiceEmailLogs);
router.get('/:id', invoiceController.getInvoiceById);
router.patch('/:id/generate', invoiceController.generateInvoice);

router.post('/:id/generate-pdf', invoiceController.generateInvoicePdf);
router.get('/:id/pdf', invoiceController.getInvoicePdf);

export default router;