import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/login', authController.login);
router.post('/register-company', authController.registerCompany);

router.get('/me', requireAuth, authController.me);

export default router;