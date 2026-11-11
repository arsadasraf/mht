import { Router } from 'express';
import designMasterRoutes from './designMaster.routes.js';
import rmItemRoutes from './rmItem.routes.js';
import fgItemRoutes from './fgItem.routes.js';
import bomRoutes from './bom.routes.js';
import drawingRoutes from './drawing.routes.js';
import ecoRoutes from './eco.routes.js';
import designDashboardRoutes from './designDashboard.routes.js';

const router = Router();

router.use('/dashboard', designDashboardRoutes);
router.use('/masters/rm', rmItemRoutes);
router.use('/rm-items', rmItemRoutes);
router.use('/masters/fg', fgItemRoutes);
router.use('/fg-items', fgItemRoutes);
router.use('/masters', designMasterRoutes);
router.use('/bom', bomRoutes);
router.use('/drawings', drawingRoutes);
router.use('/eco', ecoRoutes);

export default router;
