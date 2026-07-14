import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireAdmin } from '../../middlewares/permission.middleware.js';
import * as userController from './user.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', userController.listUsers);
router.post('/', userController.createUser);

router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);
router.patch('/:id/password', userController.updateUserPassword);
router.patch('/:id/disable', userController.disableUser);
router.patch('/:id/reactivate', userController.reactivateUser);

export default router;