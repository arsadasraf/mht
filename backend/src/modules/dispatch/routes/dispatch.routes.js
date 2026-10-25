import { Router } from 'express';
import {
  getDispatchOrders,
  verifyZeroSnags,
  issueGatePass
} from '../controllers/dispatch.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/dispatch/verification'));

router.get('/', getDispatchOrders);
router.get('/zero-snag/:projectId', verifyZeroSnags);
router.post('/:id/issue-gate-pass', issueGatePass);

export default router;
