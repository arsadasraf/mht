import { Router } from 'express';
import {
  getAllocations,
  getAllocationsByProject,
  requestTransfer,
  approveTransfer
} from '../controllers/allocation.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/store/allocations'));

router.get('/', getAllocations);
router.get('/project/:projectId', getAllocationsByProject);
router.post('/:id/request-transfer', requestTransfer);
router.post('/:id/approve-transfer', approveTransfer);

export default router;
