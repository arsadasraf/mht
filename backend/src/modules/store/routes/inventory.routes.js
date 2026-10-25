import { Router } from 'express';
import { getInventoryItems, createOrUpdateItem } from '../controllers/inventory.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/store/inventory'));

router.get('/', getInventoryItems);
router.post('/', createOrUpdateItem);

export default router;
