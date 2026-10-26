import { Router } from 'express';
import { getRfqs, createRfq } from '../controllers/rfq.controller.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getRfqs);
router.post('/', createRfq);

export default router;
