import { Router } from 'express';
import {
  getLeads,
  getCrmOverview,
  createLead,
  updateLead,
  updateLeadStage,
  bulkImportLeads,
  deleteLead
} from '../controllers/lead.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorizeRouteAccess('/crm/leads'));

router.get('/overview', getCrmOverview);
router.get('/', getLeads);
router.post('/', createLead);
router.post('/bulk-import', bulkImportLeads);
router.patch('/:id/stage', updateLeadStage);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

export default router;
