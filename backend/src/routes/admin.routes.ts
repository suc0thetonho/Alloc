import { Router } from 'express';
import { requireAdmin } from '../auth/admin.middleware';
import {
  createMachineController,
  deleteMachineController,
  getAdminMachineController,
  listAdminMachinesController,
  updateMachineController,
} from '../controllers/machines.controller';
import {
  closeAllocationController,
  createAllocationController,
  getAllocationController,
  listAllocationsController,
  updateAllocationController,
} from '../controllers/allocations.controller';

const adminRoutes = Router();

adminRoutes.use(requireAdmin);
adminRoutes.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok', area: 'admin' } });
});
adminRoutes.get('/machines', listAdminMachinesController);
adminRoutes.post('/machines', createMachineController);
adminRoutes.get('/machines/:id', getAdminMachineController);
adminRoutes.put('/machines/:id', updateMachineController);
adminRoutes.delete('/machines/:id', deleteMachineController);
adminRoutes.get('/allocations', listAllocationsController);
adminRoutes.post('/allocations', createAllocationController);
adminRoutes.get('/allocations/:id', getAllocationController);
adminRoutes.put('/allocations/:id', updateAllocationController);
adminRoutes.patch('/allocations/:id', updateAllocationController);
adminRoutes.patch('/allocations/:id/return', closeAllocationController);

export default adminRoutes;
