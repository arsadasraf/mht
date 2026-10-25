import { Router } from 'express';
import { getVendors, createVendor } from '../controllers/vendor.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/purchase/vendors'));

router.get('/', getVendors);
router.post('/', createVendor);

export default router;
