import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireInternalUser } from '../../middlewares/permission.middleware.js';
import { uploadBankStatement } from '../../middlewares/upload.middleware.js';
import * as bankStatementController from './bankStatement.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requireInternalUser);

router.get('/', bankStatementController.listBankStatements);
router.post('/', bankStatementController.createBankStatement);

router.post(
  '/import',
  uploadBankStatement.single('file'),
  bankStatementController.importBankStatementFile
);

router.put(
  '/transactions/:transactionId/correct',
  bankStatementController.correctTransaction
);

router.patch(
  '/transactions/:transactionId/match-client',
  bankStatementController.matchTransactionClient
);

router.post(
  '/transactions/:transactionId/create-client',
  bankStatementController.createClientFromTransaction
);

router.patch(
  '/transactions/:transactionId/validate',
  bankStatementController.validateTransaction
);

router.get('/:id', bankStatementController.getBankStatementById);
router.get('/:id/file', bankStatementController.downloadBankStatementFile);
router.delete('/:id', bankStatementController.deleteBankStatement);

router.post('/:id/process', bankStatementController.processBankStatement);
router.post('/:id/scan', bankStatementController.processBankStatement);

router.post('/:id/transactions', bankStatementController.addTransactionToStatement);
router.get('/:id/transactions', bankStatementController.listTransactionsByStatement);

router.post(
  '/transactions/:transactionId/create-invoice',
  bankStatementController.createInvoiceFromTransaction
);

export default router;