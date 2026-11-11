import { Router } from 'express';
import customerRoutes from './customer.routes.js';
import crmMasterRoutes from './crmMaster.routes.js';
import customerPoRoutes from './customerPo.routes.js';
import leadRoutes from './lead.routes.js';
import quotationRoutes from './quotation.routes.js';

const router = Router();

router.use('/customers', customerRoutes);
router.use('/masters', crmMasterRoutes);
router.use('/customer-pos', customerPoRoutes);
router.use('/customer-po', customerPoRoutes);
router.use('/leads', leadRoutes);
router.use('/quotations', quotationRoutes);
router.use('/deals', quotationRoutes);

export default router;
