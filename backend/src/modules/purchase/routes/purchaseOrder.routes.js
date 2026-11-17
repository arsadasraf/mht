import { Router } from 'express';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  calculateNetDemand,
  approvePurchaseOrder,
  updatePurchaseOrderStatus,
  addPurchaseOrderComment,
  getPurchaseOrderGrnHistory,
  updatePurchaseOrder,
  deletePurchaseOrder
} from '../controllers/purchaseOrder.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/purchase/orders'));

router.get('/', getPurchaseOrders);
router.post('/', createPurchaseOrder);
router.get('/demand/:projectId', calculateNetDemand);
router.patch('/:id/approve', approvePurchaseOrder);
router.patch('/:id/status', updatePurchaseOrderStatus);
router.post('/:id/comments', addPurchaseOrderComment);
router.get('/:id/grn-history', getPurchaseOrderGrnHistory);
router.put('/:id', updatePurchaseOrder);
router.delete('/:id', deletePurchaseOrder);

export default router;
