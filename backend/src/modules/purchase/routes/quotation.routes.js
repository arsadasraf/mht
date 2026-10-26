import { Router } from 'express';
import { getQuotations, createQuotation } from '../controllers/quotation.controller.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getQuotations);
router.post('/', createQuotation);

export default router;
