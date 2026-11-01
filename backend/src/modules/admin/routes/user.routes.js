import { Router } from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getUserPreview,
  heartbeat,
  getActiveSessions,
  terminateSession
} from '../controllers/user.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { authorizeRouteAccess } from '../../../middleware/rbac.middleware.js';
import { validateRequest } from '../../../middleware/validate.middleware.js';
import {
  createUserSchema,
  updateUserSchema,
  toggleUserStatusSchema
} from '../validators/user.validator.js';

const router = Router();

// Heartbeat ping can be sent by any authenticated user
router.post('/heartbeat', authenticate, heartbeat);

// Live Sessions & Activity routes
router.get('/sessions/active', authenticate, getActiveSessions);
router.post('/sessions/:id/terminate', authenticate, terminateSession);

// User Directory management routes (require /admin/users permission)
router.get('/', authenticate, authorizeRouteAccess('/admin/users'), getUsers);
router.get('/:id/preview', authenticate, authorizeRouteAccess('/admin/users'), getUserPreview);
router.post(
  '/',
  authenticate,
  authorizeRouteAccess('/admin/users'),
  validateRequest(createUserSchema),
  createUser
);
router.put(
  '/:id',
  authenticate,
  authorizeRouteAccess('/admin/users'),
  validateRequest(updateUserSchema),
  updateUser
);
router.patch(
  '/:id/status',
  authenticate,
  authorizeRouteAccess('/admin/users'),
  validateRequest(toggleUserStatusSchema),
  toggleUserStatus
);
router.delete('/:id', authenticate, authorizeRouteAccess('/admin/users'), deleteUser);

export default router;
