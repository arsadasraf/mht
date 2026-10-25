import { Router } from 'express';
import { getAssemblyStages, updateAssemblyStage } from '../controllers/assembly.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/production-trial/assembly'));

router.get('/', getAssemblyStages);
router.patch('/:id', updateAssemblyStage);

export default router;
