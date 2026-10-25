import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditLog.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

// Immutable audit trail logs route protected under /admin/audit-logs
router.use(authenticate, authorizeRouteAccess('/admin/audit-logs'));

router.get('/', getAuditLogs);

export default router;
