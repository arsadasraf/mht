import { Router } from 'express';
import {
  getCustomerPos,
  getCustomerPoById,
  createCustomerPo,
  updateCustomerPo,
  updateOrderAcceptanceStatus,
  generateOrderAcceptance,
  deleteCustomerPo,
  convertCustomerPoToProject
} from '../controllers/customerPo.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { validateRequest } from '../../../middleware/validate.middleware.js';
import {
  createCustomerPoSchema,
  updateCustomerPoSchema,
  updateOrderAcceptanceStatusSchema
} from '../validators/customerPo.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', getCustomerPos);
router.get('/:id', getCustomerPoById);
router.post('/', validateRequest(createCustomerPoSchema), createCustomerPo);
router.put('/:id', validateRequest(updateCustomerPoSchema), updateCustomerPo);
router.post('/:id/generate-oa', generateOrderAcceptance);
router.post('/:id/order-acceptance', validateRequest(updateOrderAcceptanceStatusSchema), updateOrderAcceptanceStatus);
router.delete('/:id', deleteCustomerPo);
router.post('/:id/convert-project', convertCustomerPoToProject);

export default router;
