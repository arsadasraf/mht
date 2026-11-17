import { Router } from 'express';
import {
  getProductionTeam,
  createProductionTeamMember,
  updateProductionTeamMember,
  deleteProductionTeamMember,
  getProductionSubStages,
  createProductionSubStage,
  updateProductionSubStage,
  deleteProductionSubStage
} from '../controllers/productionMaster.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

// Production Team Roster Endpoints
router.get('/team', authenticate, getProductionTeam);
router.post('/team', authenticate, createProductionTeamMember);
router.put('/team/:id', authenticate, updateProductionTeamMember);
router.delete('/team/:id', authenticate, deleteProductionTeamMember);

// Production Sub-Stages Endpoints
router.get('/sub-stages', authenticate, getProductionSubStages);
router.post('/sub-stages', authenticate, createProductionSubStage);
router.put('/sub-stages/:id', authenticate, updateProductionSubStage);
router.delete('/sub-stages/:id', authenticate, deleteProductionSubStage);

export default router;

