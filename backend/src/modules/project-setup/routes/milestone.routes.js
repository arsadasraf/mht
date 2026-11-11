import { Router } from 'express';
import {
  getMilestonesByProject,
  createMilestoneForProject,
  updateMilestoneStatus,
  addMilestoneRemark,
  updateMilestone,
  addSubStageToMilestone,
  updateSubStage,
  deleteSubStage,
  deleteMilestone
} from '../controllers/milestone.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/project/:projectId', getMilestonesByProject);
router.post('/project/:projectId', createMilestoneForProject);
router.patch('/sub-stages/:subStageId', updateSubStage);
router.delete('/sub-stages/:subStageId', deleteSubStage);
router.patch('/:id/status', updateMilestoneStatus);
router.post('/:id/remarks', addMilestoneRemark);
router.post('/:id/sub-stages', addSubStageToMilestone);
router.put('/:id', updateMilestone);
router.delete('/:id', deleteMilestone);

export default router;
