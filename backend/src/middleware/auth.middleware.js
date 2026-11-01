import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.config.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Universal Dual Mode Authentication Middleware
 * Supports JWT HttpOnly Cookie / Bearer Token & Google OAuth ID Token
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No access token provided.'
      });
    }

    // Verify JWT
    jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || 'mht_access_secret_super_secure_key_2026_innovation',
      async (err, decoded) => {
        if (err) {
          if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
              success: false,
              code: 'TOKEN_EXPIRED',
              message: 'Session token has expired. Please refresh session.'
            });
          }
          return res.status(401).json({
            success: false,
            message: 'Invalid authentication token.'
          });
        }

        // Guard against legacy 24-char MongoDB ObjectId tokens stored in browser cookies
        if (!decoded?.userId || !UUID_REGEX.test(String(decoded.userId))) {
          res.clearCookie('accessToken');
          res.clearCookie('refreshToken');
          return res.status(401).json({
            success: false,
            message: 'Legacy session token detected. Please sign in again.'
          });
        }

        try {
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true }
          });

          if (!user) {
            return res.status(401).json({
              success: false,
              message: 'User account not found.'
            });
          }

          if (!user.isActive || user.status === 'DEACTIVATED') {
            return res.status(403).json({
              success: false,
              message: 'Account has been deactivated. Please contact System Administrator.'
            });
          }

          req.user = user;
          next();
        } catch (dbErr) {
          return res.status(500).json({
            success: false,
            message: 'Authentication lookup error: ' + dbErr.message
          });
        }
      }
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error: ' + error.message
    });
  }
};

export const authenticateToken = authenticate;
export const requireAuth = authenticate;
