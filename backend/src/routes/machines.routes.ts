import { Router } from 'express';
import { getMachineController, listMachinesController } from '../controllers/machines.controller';

const machinesRoutes = Router();

machinesRoutes.get('/', listMachinesController);
machinesRoutes.get('/:id', getMachineController);

export default machinesRoutes;
