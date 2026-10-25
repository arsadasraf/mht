import { Router } from 'express';
import vendorRoutes from './vendor.routes.js';
import purchaseOrderRoutes from './purchaseOrder.routes.js';

const router = Router();

router.use('/vendors', vendorRoutes);
router.use('/orders', purchaseOrderRoutes);

export default router;
