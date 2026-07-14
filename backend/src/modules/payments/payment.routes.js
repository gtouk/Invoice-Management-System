import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireInternalUser } from '../../middlewares/permission.middleware.js';
import * as paymentController from './payment.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requireInternalUser);

router.get('/', paymentController.listPayments);
router.post('/', paymentController.createPayment);

router.get('/invoice/:invoiceId', paymentController.listPaymentsByInvoice);
router.get('/client/:clientId', paymentController.listPaymentsByClient);

router.get('/:id', paymentController.getPaymentById);

export default router;