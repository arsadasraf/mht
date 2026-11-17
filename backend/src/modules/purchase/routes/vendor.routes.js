import { Router } from 'express';
import {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  getPriceAgreements,
  createVendorPriceAgreement,
  updateVendorPriceAgreement,
  deleteVendorPriceAgreement,
  getPurchaseConfig,
  updatePurchaseConfig
} from '../controllers/vendor.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/purchase/vendors'));

// Master Config Endpoint (MUST be defined before parameterized /:id routes)
router.get('/config', getPurchaseConfig);
router.put('/config', updatePurchaseConfig);

// Price Agreement Endpoints
router.get('/price-agreements', getPriceAgreements);
router.post('/price-agreements', createVendorPriceAgreement);
router.put('/price-agreements/:id', updateVendorPriceAgreement);
router.delete('/price-agreements/:id', deleteVendorPriceAgreement);
router.post('/price-agreement', createVendorPriceAgreement);

// Core Vendor Endpoints
router.get('/', getVendors);
router.post('/', createVendor);
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

export default router;
