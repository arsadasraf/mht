import { Router } from 'express';
import { getDrawings, getDrawingViewUrl, registerDrawing } from '../controllers/drawing.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/design/drawings'));

router.get('/', getDrawings);
router.get('/:id/view', getDrawingViewUrl);
router.post('/', registerDrawing);

export default router;
