import { Router } from 'express';
import {
  getQuotations,
  getQuotationById,
  getQuotationRevisions,
  createQuotation,
  createQuotationRevision,
  updateQuotation,
  convertQuotationToProject
} from '../controllers/quotation.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, (req, res, next) => {
  if (req.user?.role?.slug === 'super-admin' || req.user?.isSuperAdmin) {
    return next();
  }
  return authorizeRouteAccess('/crm/deals')(req, res, next);
});

router.get('/', getQuotations);
router.get('/:id', getQuotationById);
router.get('/:id/revisions', getQuotationRevisions);
router.post('/', createQuotation);
router.post('/:id/revise', createQuotationRevision);
router.put('/:id', updateQuotation);
router.post('/:id/convert-po', convertQuotationToProject);

export default router;
