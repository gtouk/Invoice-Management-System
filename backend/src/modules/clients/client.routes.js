import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireAdmin } from '../../middlewares/permission.middleware.js';
import * as clientController from './client.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', clientController.listClients);
router.post('/', clientController.createClient);

router.get('/:id/history', clientController.getClientHistory);

router.get('/:id', clientController.getClient);
router.put('/:id', clientController.updateClient);

router.delete('/:id', requireAdmin, clientController.deleteClient);
router.patch('/:id/archive', requireAdmin, clientController.archiveClient);
router.patch('/:id/reactivate', requireAdmin, clientController.reactivateClient);

export default router;