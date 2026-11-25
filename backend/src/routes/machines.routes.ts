import { Router } from 'express';
import { getMachineController, listMachinesController } from '../controllers/machines.controller';
import { getMachineAvailabilityController } from '../controllers/allocations.controller';

const machinesRoutes = Router();

machinesRoutes.get('/', listMachinesController);
machinesRoutes.get('/:id/availability', getMachineAvailabilityController);
machinesRoutes.get('/:id', getMachineController);

export default machinesRoutes;
