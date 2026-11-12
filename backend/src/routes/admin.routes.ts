import { Router } from 'express';
import { requireAdmin } from '../auth/admin.middleware';

const adminRoutes = Router();

adminRoutes.use(requireAdmin);
adminRoutes.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok', area: 'admin' } });
});

export default adminRoutes;
