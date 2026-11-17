import { Router } from 'express';
import { getStoreConfig, updateStoreConfig } from '../controllers/storeConfig.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, getStoreConfig);
router.put('/', authenticate, updateStoreConfig);

export default router;

