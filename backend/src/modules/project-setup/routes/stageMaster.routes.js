import { Router } from 'express';
import {
  getStageMasters,
  createStageMaster,
  updateStageMaster,
  deleteStageMaster,
  getSubStageMasters,
  createSubStageMaster,
  updateSubStageMaster,
  deleteSubStageMaster,
  updateProjectSetupConfig
} from '../controllers/stageMaster.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getStageMasters);
router.post('/', createStageMaster);
router.put('/config', updateProjectSetupConfig);
router.get('/sub-stages', getSubStageMasters);
router.post('/sub-stages', createSubStageMaster);
router.put('/sub-stages/:id', updateSubStageMaster);
router.delete('/sub-stages/:id', deleteSubStageMaster);
router.put('/:id', updateStageMaster);
router.delete('/:id', deleteStageMaster);

export default router;
