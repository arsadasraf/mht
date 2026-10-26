import { Router } from 'express';
import vendorRoutes from './vendor.routes.js';
import purchaseOrderRoutes from './purchaseOrder.routes.js';
import rfqRoutes from './rfq.routes.js';
import quotationRoutes from './quotation.routes.js';
import billRoutes from './bill.routes.js';

const router = Router();

router.use('/vendors', vendorRoutes);
router.use('/orders', purchaseOrderRoutes);
router.use('/rfq', rfqRoutes);
router.use('/quotations', quotationRoutes);
router.use('/bills', billRoutes);

export default router;

