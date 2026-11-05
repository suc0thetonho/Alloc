import { Router } from 'express';
import healthRoutes from './health.routes';
import databaseRoutes from './database.routes';
import machinesRoutes from './machines.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/database', databaseRoutes);
router.use('/v1/machines', machinesRoutes);

export default router;
