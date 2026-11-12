import { Router } from 'express';
import { loginController, logoutController, meController } from '../controllers/auth.controller';
import { requireAdmin } from '../auth/admin.middleware';

const authRoutes = Router();

authRoutes.post('/login', loginController);
authRoutes.get('/me', requireAdmin, meController);
authRoutes.post('/logout', requireAdmin, logoutController);

export default authRoutes;
