import { Router } from 'express';
import {
  getDispatchTeam,
  createDispatchTeamMember,
  updateDispatchTeamMember,
  deleteDispatchTeamMember,
  getDispatchSubStages,
  createDispatchSubStage,
  updateDispatchSubStage,
  deleteDispatchSubStage
} from '../controllers/dispatchMaster.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

// Dispatch Team Roster Endpoints
router.get('/team', authenticate, getDispatchTeam);
router.post('/team', authenticate, createDispatchTeamMember);
router.put('/team/:id', authenticate, updateDispatchTeamMember);
router.delete('/team/:id', authenticate, deleteDispatchTeamMember);

// Dispatch Inspection Sub-Stages Endpoints
router.get('/sub-stages', authenticate, getDispatchSubStages);
router.post('/sub-stages', authenticate, createDispatchSubStage);
router.put('/sub-stages/:id', authenticate, updateDispatchSubStage);
router.delete('/sub-stages/:id', authenticate, deleteDispatchSubStage);

export default router;

