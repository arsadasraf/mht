import { Router } from 'express';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  calculateNetDemand
} from '../controllers/purchaseOrder.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/purchase/orders'));

router.get('/', getPurchaseOrders);
router.post('/', createPurchaseOrder);
router.get('/demand/:projectId', calculateNetDemand);

export default router;
