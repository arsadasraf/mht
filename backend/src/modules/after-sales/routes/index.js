import { Router } from 'express';
import serviceTicketRoutes from './serviceTicket.routes.js';

const router = Router();

router.use('/tickets', serviceTicketRoutes);

export default router;
