import { Router } from 'express';
import {
  getProjects,
  getAvailableCustomerPos,
  getDepartmentUsers,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  updateProjectStage
} from '../controllers/project.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getProjects);
router.get('/available-customer-pos', getAvailableCustomerPos);
router.get('/department-users', getDepartmentUsers);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.patch('/:id/stage', updateProjectStage);

export default router;
