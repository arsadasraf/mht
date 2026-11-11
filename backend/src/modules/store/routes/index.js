import { Router } from 'express';
import inventoryRoutes from './inventory.routes.js';
import allocationRoutes from './allocation.routes.js';
import {
  createGrn,
  getStoreMasters,
  createStoreMaster,
  getMaterialRequests,
  createMaterialRequest,
  issueMaterialRequest,
  getDeliveryChallans,
  createDeliveryChallan,
  getInventoryItems
} from '../controllers/inventory.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use('/inventory', inventoryRoutes);
router.use('/allocations', allocationRoutes);

router.post('/grn', authenticate, createGrn);
router.get('/masters', authenticate, getStoreMasters);
router.post('/masters', authenticate, createStoreMaster);

router.get('/wip/material-requests', authenticate, getMaterialRequests);
router.post('/wip/material-requests', authenticate, createMaterialRequest);
router.post('/wip/material-requests/:id/issue', authenticate, issueMaterialRequest);
router.get('/wip/inventory', authenticate, getInventoryItems);

router.get('/dc', authenticate, getDeliveryChallans);
router.post('/dc', authenticate, createDeliveryChallan);

export default router;
