import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireAdmin } from '../../middlewares/permission.middleware.js';
import * as itemController from './item.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', itemController.listItems);
router.post('/', itemController.createItem);
router.get('/:id', itemController.getItem);
router.put('/:id', itemController.updateItem);

router.delete('/:id', requireAdmin, itemController.deleteItem);
router.patch('/:id/disable', requireAdmin, itemController.disableItem);
router.patch('/:id/reactivate', requireAdmin, itemController.reactivateItem);

export default router;