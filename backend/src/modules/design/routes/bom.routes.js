import { Router } from 'express';
import {
  getBoms,
  getBomByProject,
  createOrUpdateBom,
  attachAssemblyToProject,
  attachDrawingToProject,
  removeAttachedDrawing,
  approveBom,
  rejectBom
} from '../controllers/bom.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/design/bom'));

router.get('/', getBoms);
router.get('/project/:projectId', getBomByProject);
router.post('/', createOrUpdateBom);
router.post('/attach-assembly', attachAssemblyToProject);
router.post('/attach-drawing', attachDrawingToProject);
router.post('/remove-drawing', removeAttachedDrawing);
router.patch('/project/:projectId/approve', approveBom);
router.patch('/project/:projectId/reject', rejectBom);

export default router;
