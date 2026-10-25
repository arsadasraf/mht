import { Router } from 'express';
import {
  getServiceTickets,
  createServiceTicket,
  updateTicketStatus
} from '../controllers/serviceTicket.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/after-sales/warranty'));

router.get('/', getServiceTickets);
router.post('/', createServiceTicket);
router.patch('/:id', updateTicketStatus);

export default router;
