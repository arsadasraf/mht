import { Router } from 'express';
import gateEntryRoutes from './gateEntry.routes.js';
import qcInspectionRoutes from './qcInspection.routes.js';

const router = Router();

router.use('/gate-entry', gateEntryRoutes);
router.use('/inspections', qcInspectionRoutes);

router.get('/process', (req, res) => {
  res.status(200).json({ success: true, count: 0, inspections: [] });
});

router.get('/pdi', (req, res) => {
  res.status(200).json({ success: true, count: 0, pdiRecords: [] });
});

router.get('/masters', (req, res) => {
  res.status(200).json({ success: true, count: 0, masters: [] });
});

export default router;
