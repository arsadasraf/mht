import { Router } from 'express';
import inventoryRoutes from './inventory.routes.js';
import storeConfigRoutes from './storeConfig.routes.js';
import locationRoutes from './location.routes.js';
import {
  createGrn,
  getGrnRecords,
  getGrnRecordById,
  updateGrnRecord,
  deleteGrnRecord,
  getNextGrnNumber,
  getOpenPurchaseOrders,
  getStoreMasters,
  createStoreMaster,
  getMaterialRequests,
  createMaterialRequest,
  issueMaterialRequest,
  updateMaterialRequest,
  deleteMaterialRequest,
  getWorkOrderBomItems,
  getWorkOrderWipSummary,
  completeWorkOrderWip,
  consumeMaterialRequest,
  getDeliveryChallans,
  createDeliveryChallan,
  getInventoryItems
} from '../controllers/inventory.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use('/inventory', inventoryRoutes);
router.use('/config', storeConfigRoutes);
router.use('/locations', locationRoutes);

// Goods Receipt Note (GRN) Endpoints
router.get('/grn', authenticate, getGrnRecords);
router.get('/grn/next-number', authenticate, getNextGrnNumber);
router.get('/grn/:id', authenticate, getGrnRecordById);
router.post('/grn', authenticate, createGrn);
router.put('/grn/:id', authenticate, updateGrnRecord);
router.delete('/grn/:id', authenticate, deleteGrnRecord);
router.get('/open-pos', authenticate, getOpenPurchaseOrders);
router.get('/masters', authenticate, getStoreMasters);
router.post('/masters', authenticate, createStoreMaster);

router.get('/wip/material-requests', authenticate, getMaterialRequests);
router.post('/wip/material-requests', authenticate, createMaterialRequest);
router.put('/wip/material-requests/:id', authenticate, updateMaterialRequest);
router.delete('/wip/material-requests/:id', authenticate, deleteMaterialRequest);
router.post('/wip/material-requests/:id/issue', authenticate, issueMaterialRequest);
router.post('/wip/material-requests/:id/consume', authenticate, consumeMaterialRequest);
router.get('/wip/work-orders/:projectId/items', authenticate, getWorkOrderBomItems);
router.get('/wip/work-orders', authenticate, getWorkOrderWipSummary);
router.post('/wip/work-orders/:projectId/complete', authenticate, completeWorkOrderWip);
router.get('/wip/inventory', authenticate, getInventoryItems);

router.get('/dc', authenticate, getDeliveryChallans);
router.post('/dc', authenticate, createDeliveryChallan);

export default router;
