import { Router } from 'express';
import { getBoms, getBomByProject, createOrUpdateBom } from '../controllers/bom.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/design/bom'));

router.get('/', getBoms);
router.get('/project/:projectId', getBomByProject);
router.post('/', createOrUpdateBom);

export default router;
