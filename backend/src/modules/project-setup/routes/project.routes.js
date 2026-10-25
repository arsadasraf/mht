import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProjectStage
} from '../controllers/project.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/project-setup/projects'));

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.patch('/:id/stage', updateProjectStage);

export default router;
