import { Router } from 'express';
import {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  convertQuotationToProject
} from '../controllers/quotation.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

// Allow access if user has /crm/deals or /crm/quotations
router.use(authenticate, (req, res, next) => {
  // Let super-admin pass through
  if (req.user?.role?.slug === 'super-admin' || req.user?.isSuperAdmin) {
    return next();
  }
  return authorizeRouteAccess('/crm/deals')(req, res, next);
});

router.get('/', getQuotations);
router.get('/:id', getQuotationById);
router.post('/', createQuotation);
router.put('/:id', updateQuotation);
router.post('/:id/convert-po', convertQuotationToProject);

export default router;
