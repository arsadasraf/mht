import { Router } from 'express';
import { getBills, createBill } from '../controllers/bill.controller.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getBills);
router.post('/', createBill);

export default router;
