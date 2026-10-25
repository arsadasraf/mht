import { Router } from 'express';
import { getMilestonesByProject, updateMilestone } from '../controllers/milestone.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/project-setup/milestones'));

router.get('/project/:projectId', getMilestonesByProject);
router.put('/:id', updateMilestone);

export default router;
