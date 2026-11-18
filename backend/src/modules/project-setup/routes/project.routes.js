import { Router } from 'express';
import {
  getProjects,
  getProjectCostingDashboard,
  updateProjectBomItemPrices,
  getAvailableCustomerPos,
  getDepartmentUsers,
  getProjectById,
  createProject,
  approveProject,
  updateProject,
  deleteProject,
  updateProjectStage
} from '../controllers/project.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getProjects);
router.get('/costing', getProjectCostingDashboard);
router.get('/available-customer-pos', getAvailableCustomerPos);
router.get('/department-users', getDepartmentUsers);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.patch('/:id/approve', approveProject);
router.patch('/:id/bom-prices', updateProjectBomItemPrices);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.patch('/:id/stage', updateProjectStage);

export default router;
