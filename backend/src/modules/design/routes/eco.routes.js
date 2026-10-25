import { Router } from 'express';
import { getEcos, createEco, approveEcoAndFreeze } from '../controllers/eco.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/design/eco'));

router.get('/', getEcos);
router.post('/', createEco);
router.post('/:id/approve-freeze', approveEcoAndFreeze);

export default router;
