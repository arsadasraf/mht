import { Router } from 'express';
import gateEntryRoutes from './gateEntry.routes.js';
import qcInspectionRoutes from './qcInspection.routes.js';

const router = Router();

router.use('/gate-entry', gateEntryRoutes);
router.use('/inspections', qcInspectionRoutes);

export default router;
