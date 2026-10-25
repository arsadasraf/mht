import { Router } from 'express';
import bomRoutes from './bom.routes.js';
import drawingRoutes from './drawing.routes.js';
import ecoRoutes from './eco.routes.js';

const router = Router();

router.use('/bom', bomRoutes);
router.use('/drawings', drawingRoutes);
router.use('/eco', ecoRoutes);

export default router;
