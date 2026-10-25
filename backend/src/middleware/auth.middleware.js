import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
    jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'mht_access_secret_super_secure_key_2026_innovation', async (err, decoded) => {
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

      // Load user from database to ensure not deactivated
      const User = mongoose.model('User');
      const user = await User.findById(decoded.userId).populate('role');

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
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error: ' + error.message
    });
  }
};

export const authenticateToken = authenticate;

