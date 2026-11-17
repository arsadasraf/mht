import { Router } from 'express';
import { getInventoryItems, createOrUpdateItem, assignItemLocation } from '../controllers/inventory.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/store/inventory'));

router.get('/', getInventoryItems);
router.post('/', createOrUpdateItem);
router.patch('/assign-location', assignItemLocation);
router.post('/assign-location', assignItemLocation);

export default router;
