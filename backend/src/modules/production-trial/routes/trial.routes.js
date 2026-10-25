import { Router } from 'express';
import { getMachineTrials, createMachineTrial, updateSnagStatus } from '../controllers/trial.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/production-trial/trials'));

router.get('/', getMachineTrials);
router.post('/', createMachineTrial);
router.patch('/:trialId/snags/:snagId', updateSnagStatus);

export default router;
