import { Router } from 'express';
import { databaseHealthController } from '../controllers/database.controller';

const databaseRoutes = Router();

databaseRoutes.get('/health', databaseHealthController);

export default databaseRoutes;
