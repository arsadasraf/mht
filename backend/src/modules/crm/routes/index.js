import { Router } from 'express';
import leadRoutes from './lead.routes.js';
import quotationRoutes from './quotation.routes.js';
import customerPoRoutes from './customerPo.routes.js';
import crmMasterRoutes from './crmMaster.routes.js';
import customerRoutes from './customer.routes.js';

const router = Router();

router.use('/leads', leadRoutes);
router.use('/quotations', quotationRoutes);
router.use('/deals', quotationRoutes);
router.use('/customer-pos', customerPoRoutes);
router.use('/customer-po', customerPoRoutes);
router.use('/customers', customerRoutes);
router.use('/masters', crmMasterRoutes);

export default router;
