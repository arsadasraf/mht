import { Router } from 'express';
import {
  getRmItems,
  getRmWhereUsed,
  createRmItem,
  updateRmItem,
  deleteRmItem,
  bulkImportRmItems
} from '../controllers/rmItem.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/design'));

router.get('/', getRmItems);
router.get('/:id/where-used', getRmWhereUsed);
router.post('/', createRmItem);
router.post('/bulk-import', bulkImportRmItems);
router.put('/:id', updateRmItem);
router.delete('/:id', deleteRmItem);

export default router;

