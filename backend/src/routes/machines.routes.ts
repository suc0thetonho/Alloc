import { Router } from 'express';
import { listMachinesController } from '../controllers/machines.controller';

const machinesRoutes = Router();

machinesRoutes.get('/', listMachinesController);

export default machinesRoutes;
