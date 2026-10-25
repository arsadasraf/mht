import { Router } from 'express';
import dispatchRoutes from './dispatch.routes.js';

const router = Router();

router.use('/', dispatchRoutes);

export default router;
