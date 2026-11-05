import { Router } from 'express';
import healthRoutes from './health.routes';
import databaseRoutes from './database.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/database', databaseRoutes);

export default router;
