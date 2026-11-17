import { Router } from 'express';
import serviceTicketRoutes from './serviceTicket.routes.js';
import afterSalesMasterRoutes from './afterSalesMaster.routes.js';

const router = Router();

router.use('/tickets', serviceTicketRoutes);
router.use('/masters', afterSalesMasterRoutes);

export default router;
