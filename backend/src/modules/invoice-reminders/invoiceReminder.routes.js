import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import * as reminderController from './invoiceReminder.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/settings', reminderController.getSettings);
router.put('/settings', reminderController.updateSettings);

router.get('/due-invoices', reminderController.getDueInvoicesPreview);

router.post('/invoices/:id/send', reminderController.sendManualReminder);
router.get('/invoices/:id/logs', reminderController.getInvoiceReminderLogs);

router.patch('/invoices/:id/enable', reminderController.enableInvoiceReminders);
router.patch('/invoices/:id/disable', reminderController.disableInvoiceReminders);

router.post('/run-now', reminderController.runAutomaticRemindersNow);

export default router;