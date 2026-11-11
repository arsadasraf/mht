import { Router } from 'express';
import { getRfqs, createRfq } from '../controllers/rfq.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getRfqs);
router.post('/', createRfq);

export default router;
