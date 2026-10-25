import { Router } from 'express';
import {
  getCrmMasters,
  updateCrmMasters,
  testLeadSourceConnection,
  deleteProductFromMaster,
  deleteAllProductsFromMaster,
  addCategory,
  updateCategory,
  deleteCategory
} from '../controllers/crmMaster.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/crm/masters'));

router.get('/', getCrmMasters);
router.put('/', updateCrmMasters);
router.delete('/machines', deleteAllProductsFromMaster);
router.delete('/machines/:idOrCode', deleteProductFromMaster);
router.post('/sources/:slug/test-connection', testLeadSourceConnection);

// Category Management Routes
router.post('/categories', addCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

export default router;
