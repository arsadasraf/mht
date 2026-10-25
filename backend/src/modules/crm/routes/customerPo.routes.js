import { Router } from 'express';
import {
  getCustomerPos,
  getCustomerPoById,
  createCustomerPo,
  updateCustomerPo,
  convertCustomerPoToProject
} from '../controllers/customerPo.controller.js';
import { authenticateToken } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getCustomerPos);
router.get('/:id', getCustomerPoById);
router.post('/', createCustomerPo);
router.put('/:id', updateCustomerPo);
router.post('/:id/convert-project', convertCustomerPoToProject);

export default router;
