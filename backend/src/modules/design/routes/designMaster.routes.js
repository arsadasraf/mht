import { Router } from 'express';
import {
  getDesignMasters,
  getDesignTeamUsers,
  getDesignCategories,
  createDesignCategory,
  updateDesignCategory,
  deleteDesignCategory,
  createOrUpdateDesignItem,
  addDesignItemFileVersion,
  deleteDesignItem,
  updateDesignMasterConfig
} from '../controllers/designMaster.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/design'));

router.get('/team-users', getDesignTeamUsers);
router.get('/categories', getDesignCategories);
router.post('/categories', createDesignCategory);
router.put('/categories/:id', updateDesignCategory);
router.delete('/categories/:id', deleteDesignCategory);
router.get('/', getDesignMasters);
router.post('/item', createOrUpdateDesignItem);
router.post('/item/:id/version', addDesignItemFileVersion);
router.delete('/item/:id', deleteDesignItem);
router.put('/config', updateDesignMasterConfig);

export default router;

