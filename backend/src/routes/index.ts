import { Router } from 'express';
import healthRoutes from './health.routes';
import databaseRoutes from './database.routes';
import machinesRoutes from './machines.routes';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/database', databaseRoutes);
router.use('/v1/machines', machinesRoutes);
router.use('/v1/auth', authRoutes);
router.use('/v1/admin', adminRoutes);

export default router;
