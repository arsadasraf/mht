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

const router = Router();

// Public auth endpoints protected with rate limiting (10 req/min)
router.get('/config', getAuthConfig);
router.post('/login', authRateLimiter, login);
router.post('/google', authRateLimiter, googleLogin);
router.post('/refresh', refreshSession);

// Session-protected auth endpoints
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
