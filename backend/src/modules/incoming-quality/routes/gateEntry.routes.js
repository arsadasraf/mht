import { Router } from 'express';
import { getGateEntries, createGateEntry } from '../controllers/gateEntry.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/incoming-quality/gate-entry'));

router.get('/', getGateEntries);
router.post('/', createGateEntry);

export default router;
