import { Router } from 'express';
import dispatchMasterRoutes from './dispatchMaster.routes.js';

const router = Router();

router.use('/masters', dispatchMasterRoutes);

export default router;
