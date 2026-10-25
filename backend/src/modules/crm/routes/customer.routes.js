import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  deleteAllCustomers,
  bulkImportCustomers
} from '../controllers/customer.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

// Protect customer routes with authentication and RBAC for /crm/masters
router.use(authenticate, authorizeRouteAccess('/crm/masters'));

router.get('/', getCustomers);
router.post('/', createCustomer);
router.post('/bulk-import', bulkImportCustomers);
router.delete('/', deleteAllCustomers);
router.get('/:id', getCustomerById);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
