import { Router } from 'express';
import {
  getStageMasters,
  createStageMaster,
  updateStageMaster,
  deleteStageMaster
} from '../controllers/stageMaster.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getStageMasters);
router.post('/', createStageMaster);
router.put('/:id', updateStageMaster);
router.delete('/:id', deleteStageMaster);

export default router;
