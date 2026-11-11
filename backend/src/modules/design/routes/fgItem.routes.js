import { Router } from 'express';
import {
  getFgItems,
  getFgWhereUsed,
  createFgItem,
  updateFgItem,
  createFgRevision,
  deleteFgItem,
  bulkImportFgItems
} from '../controllers/fgItem.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/design'));

router.get('/', getFgItems);
router.get('/:id/where-used', getFgWhereUsed);
router.post('/', createFgItem);
router.post('/bulk-import', bulkImportFgItems);
router.put('/:id', updateFgItem);
router.post('/:id/revision', createFgRevision);
router.delete('/:id', deleteFgItem);

export default router;

