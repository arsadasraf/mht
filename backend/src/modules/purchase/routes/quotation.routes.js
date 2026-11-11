import { Router } from 'express';
import { getQuotations, createQuotation } from '../controllers/quotation.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getQuotations);
router.post('/', createQuotation);

export default router;
