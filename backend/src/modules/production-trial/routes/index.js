import { Router } from 'express';
import assemblyRoutes from './assembly.routes.js';
import trialRoutes from './trial.routes.js';

const router = Router();

router.use('/assembly', assemblyRoutes);
router.use('/trials', trialRoutes);

export default router;
