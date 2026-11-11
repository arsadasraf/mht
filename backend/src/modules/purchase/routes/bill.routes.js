import { Router } from 'express';
import { getBills, createBill } from '../controllers/bill.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getBills);
router.post('/', createBill);

export default router;
