import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware.js';
import {
  getAfterSalesTeam,
  createAfterSalesTeamMember,
  updateAfterSalesTeamMember,
  deleteAfterSalesTeamMember,
  getAfterSalesSubStages,
  createAfterSalesSubStage,
  updateAfterSalesSubStage,
  deleteAfterSalesSubStage
} from '../controllers/afterSalesMaster.controller.js';

const router = Router();

router.use(authenticate);

// Field Service & Commissioning Team
router.get('/team', getAfterSalesTeam);
router.post('/team', createAfterSalesTeamMember);
router.put('/team/:id', updateAfterSalesTeamMember);
router.delete('/team/:id', deleteAfterSalesTeamMember);

// Service Sub-Stages
router.get('/sub-stages', getAfterSalesSubStages);
router.post('/sub-stages', createAfterSalesSubStage);
router.put('/sub-stages/:id', updateAfterSalesSubStage);
router.delete('/sub-stages/:id', deleteAfterSalesSubStage);

export default router;
