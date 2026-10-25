import { Router } from 'express';
import { getRoles, updateRolePermissions, createRole } from '../controllers/role.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';

const router = Router();

// RBAC permissions matrix routes protected under /admin/roles
router.use(authenticate, authorizeRouteAccess('/admin/roles'));

router.get('/', getRoles);
router.post('/', createRole);
router.put('/:id', updateRolePermissions);

export default router;
