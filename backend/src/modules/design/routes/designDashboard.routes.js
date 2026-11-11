import { Router } from 'express';
import {
  getEngineerPerformance,
  getActivityReports,
  getDocumentControl,
  releaseDrawing,
  createDrawingRevision
} from '../controllers/designDashboard.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/design/dashboard'));

router.get('/engineer-performance', getEngineerPerformance);
router.get('/activity-reports', getActivityReports);
router.get('/document-control', getDocumentControl);
router.post('/drawings/:id/release', releaseDrawing);
router.post('/revisions', createDrawingRevision);

export default router;

