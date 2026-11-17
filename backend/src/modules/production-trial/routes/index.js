import { Router } from 'express';
import productionMasterRoutes from './productionMaster.routes.js';

const router = Router();

router.use('/masters', productionMasterRoutes);

export default router;
