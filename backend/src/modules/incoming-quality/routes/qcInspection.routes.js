import { Router } from 'express';
import { getInspections, createInspection } from '../controllers/qcInspection.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/incoming-quality/inspections'));

router.get('/', getInspections);
router.post('/', createInspection);

export default router;
