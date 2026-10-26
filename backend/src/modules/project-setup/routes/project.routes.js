import { Router } from 'express';
import {
  getProjects,
  getAvailableCustomerPos,
  getProjectById,
  createProject,
  updateProjectStage
} from '../controllers/project.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getProjects);
router.get('/available-customer-pos', getAvailableCustomerPos);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.patch('/:id/stage', updateProjectStage);

export default router;
