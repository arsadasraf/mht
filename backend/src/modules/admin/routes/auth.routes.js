import { Router } from 'express';
import {
  login,
  googleLogin,
  refreshSession,
  logout,
  getMe,
  getAuthConfig
} from '../controllers/auth.controller.js';
import { authRateLimiter } from '../../../middleware/rateLimiter.middleware.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { validateRequest } from '../../../middleware/validate.middleware.js';
import { loginSchema, googleLoginSchema } from '../validators/auth.validator.js';

const router = Router();

// Public auth endpoints protected with rate limiting (10 req/min) & Zod validation
router.get('/config', getAuthConfig);
router.post('/login', authRateLimiter, validateRequest(loginSchema), login);
router.post('/google', authRateLimiter, validateRequest(googleLoginSchema), googleLogin);
router.post('/refresh', refreshSession);

// Session-protected auth endpoints
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
