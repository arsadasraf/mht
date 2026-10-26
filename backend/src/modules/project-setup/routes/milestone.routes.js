import { Router } from 'express';
import {
  getMilestonesByProject,
  createMilestoneForProject,
  updateMilestoneStatus,
  addMilestoneRemark,
  updateMilestone
} from '../controllers/milestone.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/project/:projectId', getMilestonesByProject);
router.post('/project/:projectId', createMilestoneForProject);
router.patch('/:id/status', updateMilestoneStatus);
router.post('/:id/remarks', addMilestoneRemark);
router.put('/:id', updateMilestone);

export default router;
