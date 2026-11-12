import { Router } from 'express';
import { requireAdmin } from '../auth/admin.middleware';
import { getCompanyController, updateCompanyController } from '../controllers/company.controller';

const companyRoutes = Router();

companyRoutes.get('/', getCompanyController);
companyRoutes.patch('/', requireAdmin, updateCompanyController);

export default companyRoutes;
