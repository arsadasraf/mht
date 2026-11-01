import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../../config/db.config.js';
import {
  checkAccountLockout,
  recordFailedLogin,
  resetFailedLogin
} from '../../../middleware/rateLimiter.middleware.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getGoogleClient = () => {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
};

const getDeviceType = (userAgent = '') => {
  if (/mobile/i.test(userAgent)) return 'Mobile';
  if (/ipad|tablet/i.test(userAgent)) return 'Tablet';
  return 'Desktop';
};

const generateTokens = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role?.slug || user.role,
    department: user.department
  };

  // 15-minute access token
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET || 'mht_access_secret_super_secure_key_2026_innovation',
    { expiresIn: '15m' }
  );

  // Dynamic user-level refresh token expiry (e.g. '8h', '24h', '7d', '30d')
  const refreshExpiry = user.refreshTokenExpiry || '7d';

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'mht_refresh_secret_super_secure_key_2026_innovation',
    { expiresIn: refreshExpiry }
  );

  return { accessToken, refreshToken, refreshExpiry };
};

const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // up to 30 days
  });
};

const recordLoginHistory = async ({ userId, ipAddress, userAgent, deviceType, authMethodUsed, status = 'SUCCESS' }) => {
  await prisma.userLoginHistory.create({
    data: {
      userId,
      ipAddress,
      userAgent,
      deviceType,
      authMethodUsed,
      status
    }
  });

  // Retain only the latest 10 login history records per user
  const oldRecords = await prisma.userLoginHistory.findMany({
    where: { userId },
    orderBy: { loginAt: 'desc' },
    skip: 10,
    select: { id: true }
  });

  if (oldRecords.length > 0) {
    await prisma.userLoginHistory.deleteMany({
      where: { id: { in: oldRecords.map((r) => r.id) } }
    });
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter both your email and password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check account lockout
    const lockout = checkAccountLockout(normalizedEmail);
    if (lockout.isLocked) {
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed sign-in attempts. Please try again in ${lockout.remainingMins} minute(s).`
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { role: true }
    });

    if (!user) {
      recordFailedLogin(normalizedEmail);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive || user.status === 'DEACTIVATED') {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact your Administrator.'
      });
    }

    // STRICT AUTHENTICATION MODE ENFORCEMENT
    if (user.authMethod === 'GOOGLE_ONLY') {
      return res.status(403).json({
        success: false,
        message: 'This account uses Google Sign-In only. Please click "Sign in with Google" to continue.',
        fixHint: 'Use the "Sign in with Google" button on the sign-in screen.'
      });
    }

    const isMatch = user.password ? await bcrypt.compare(password, user.password) : false;
    if (!isMatch) {
      const attempts = recordFailedLogin(normalizedEmail);
      const remaining = Math.max(0, 5 - attempts);
      return res.status(401).json({
        success: false,
        message:
          remaining > 0
            ? `Invalid credentials. ${remaining} attempt(s) left before a 15-minute lockout.`
            : 'Account locked for 15 minutes due to repeated failed attempts.'
      });
    }

    // STRICT ENTERPRISE RULE: Only the designated ADMIN_EMAIL in .env can log in as Super Admin
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'asrafali444u@gmail.com').toLowerCase();
    const isUserAdminRole = user.isSuperAdmin || user.role?.slug === 'super-admin';
    if (isUserAdminRole && user.email.toLowerCase() !== configuredAdminEmail) {
      return res.status(403).json({
        success: false,
        message: 'Only the designated system Administrator email is permitted to sign in as Super Admin.',
        fixHint: `Please sign in with the configured administrator email (${configuredAdminEmail}).`
      });
    }

    resetFailedLogin(normalizedEmail);

    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser Client';
    const deviceType = getDeviceType(userAgent);

    const { accessToken, refreshToken, refreshExpiry } = generateTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        isOnline: true,
        lastActiveAt: new Date(),
        currentActiveTab: '/admin/users',
        currentRefreshToken: refreshToken
      }
    });

    await recordLoginHistory({
      userId: user.id,
      ipAddress: clientIp,
      userAgent,
      deviceType,
      authMethodUsed: 'EMAIL_PASSWORD',
      status: 'SUCCESS'
    });

    setTokenCookies(res, accessToken, refreshToken);

    await logAuditEvent({
      req: { ...req, user },
      action: 'USER_LOGIN_PASSWORD',
      module: 'admin',
      entityId: user.id,
      entityType: 'User',
      notes: `User signed in with password. Refresh expiry: ${refreshExpiry}`
    });

    res.status(200).json({
      success: true,
      message: 'Welcome back! Signed in successfully.',
      accessToken,
      refreshToken,
      user: {
        _id: user.id,
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
        plantLocation: user.plantLocation,
        refreshTokenExpiry: user.refreshTokenExpiry,
        isSuperAdmin: user.isSuperAdmin,
        isActive: user.isActive,
        status: user.status,
        allowedRoutes: [...(user.role?.allowedRoutes || []), ...(user.allowedRoutes || [])]
      }
    });
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google sign-in token is required.' });
    }

    let payload;
    try {
      const client = getGoogleClient();
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (gErr) {
      if (process.env.NODE_ENV === 'development') {
        const decoded = jwt.decode(credential);
        if (decoded?.email) {
          payload = decoded;
        } else {
          return res.status(401).json({ success: false, message: 'Invalid Google OAuth token: ' + gErr.message });
        }
      } else {
        return res.status(401).json({ success: false, message: 'Google authentication failed: ' + gErr.message });
      }
    }

    const email = payload.email.toLowerCase();
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'asrafali444u@gmail.com').toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    // Auto-provision Super Admin if logging in with configured ADMIN_EMAIL
    if (!user && email === configuredAdminEmail) {
      let superAdminRole = await prisma.role.findUnique({ where: { slug: 'super-admin' } });
      if (!superAdminRole) {
        superAdminRole = await prisma.role.create({
          data: {
            name: 'Super Admin',
            slug: 'super-admin',
            description: 'Complete unrestricted system access across all modules & system governance',
            allowedRoutes: ['*'],
            isSystemRole: true
          }
        });
      }

      user = await prisma.user.create({
        data: {
          firstName: payload.given_name || 'Asraf',
          lastName: payload.family_name || 'Ali',
          email: configuredAdminEmail,
          roleId: superAdminRole.id,
          isSuperAdmin: true,
          department: 'ADMIN',
          plantLocation: 'Main Works - Unit 1 (Bengaluru)',
          refreshTokenExpiry: '30d',
          googleId: payload.sub,
          isActive: true,
          status: 'ACTIVE'
        },
        include: { role: true }
      });
    }

    // STRICT ENTERPRISE RULE: Pre-Registered Accounts Only
    if (!user) {
      return res.status(403).json({
        success: false,
        message: `The Google account '${email}' is not registered in Machine House ERP. Please ask your Administrator for an invite.`
      });
    }

    const isUserAdminRole = user.isSuperAdmin || user.role?.slug === 'super-admin';
    if (isUserAdminRole && user.email.toLowerCase() !== configuredAdminEmail) {
      return res.status(403).json({
        success: false,
        message: 'Only the authorized system Administrator email can sign in as Super Admin.',
        fixHint: `Please sign in with the configured administrator email (${configuredAdminEmail}).`
      });
    }

    if (!user.isActive || user.status === 'DEACTIVATED') {
      return res.status(403).json({
        success: false,
        message: 'This account is deactivated. Please contact your Administrator.'
      });
    }

    if (user.authMethod === 'PASSWORD_ONLY') {
      return res.status(403).json({
        success: false,
        message: 'Google Sign-In is turned off for this account. Please sign in with your corporate email and password.',
        fixHint: 'Enter your corporate email and password to sign in.'
      });
    }

    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser Client';
    const deviceType = getDeviceType(userAgent);

    const { accessToken, refreshToken, refreshExpiry } = generateTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: user.googleId || payload.sub || null,
        lastLoginAt: new Date(),
        isOnline: true,
        lastActiveAt: new Date(),
        currentActiveTab: '/admin/users',
        currentRefreshToken: refreshToken
      }
    });

    await recordLoginHistory({
      userId: user.id,
      ipAddress: clientIp,
      userAgent,
      deviceType,
      authMethodUsed: 'GOOGLE_SSO',
      status: 'SUCCESS'
    });

    setTokenCookies(res, accessToken, refreshToken);

    await logAuditEvent({
      req: { ...req, user },
      action: 'USER_LOGIN_GOOGLE_OAUTH',
      module: 'admin',
      entityId: user.id,
      entityType: 'User',
      notes: `User signed in via Google SSO. Refresh expiry: ${refreshExpiry}`
    });

    res.status(200).json({
      success: true,
      message: 'All set! Signed in with Google.',
      accessToken,
      refreshToken,
      user: {
        _id: user.id,
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
        plantLocation: user.plantLocation,
        refreshTokenExpiry: user.refreshTokenExpiry,
        isSuperAdmin: user.isSuperAdmin,
        isActive: user.isActive,
        status: user.status,
        allowedRoutes: [...(user.role?.allowedRoutes || []), ...(user.allowedRoutes || [])]
      }
    });
  } catch (error) {
    next(error);
  }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const refreshSession = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided.' });
    }

    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'mht_refresh_secret_super_secure_key_2026_innovation',
      async (err, decoded) => {
        try {
          if (err || !decoded?.userId || !UUID_REGEX.test(String(decoded.userId))) {
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return res.status(401).json({
              success: false,
              message: 'Your session has expired. Please sign in again.'
            });
          }

          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true }
          });

          if (!user || !user.isActive || user.status === 'DEACTIVATED') {
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return res.status(403).json({
              success: false,
              message: 'Your session was revoked or deactivated.'
            });
          }

          const tokens = generateTokens(user);
          await prisma.user.update({
            where: { id: user.id },
            data: { currentRefreshToken: tokens.refreshToken }
          });

          setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

          res.status(200).json({
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
          });
        } catch (innerError) {
          res.clearCookie('accessToken');
          res.clearCookie('refreshToken');
          return res.status(401).json({
            success: false,
            message: 'Session could not be refreshed. Please sign in again.'
          });
        }
      }
    );
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          currentRefreshToken: null,
          isOnline: false
        }
      });

      await logAuditEvent({
        req,
        action: 'USER_LOGOUT',
        module: 'admin',
        entityId: req.user.id,
        entityType: 'User',
        notes: 'User signed out and session revoked.'
      });
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({ success: true, message: 'Signed out successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      _id: req.user.id,
      id: req.user.id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
      plantLocation: req.user.plantLocation,
      refreshTokenExpiry: req.user.refreshTokenExpiry,
      isSuperAdmin: req.user.isSuperAdmin,
      isActive: req.user.isActive,
      status: req.user.status,
      allowedRoutes: [...(req.user.role?.allowedRoutes || []), ...(req.user.allowedRoutes || [])]
    }
  });
};

export const getAuthConfig = async (req, res) => {
  res.status(200).json({
    success: true,
    googleClientId:
      process.env.GOOGLE_CLIENT_ID ||
      '784057626241-eish7vufabh0d4ttmi910enchmbo8rk5.apps.googleusercontent.com'
  });
};
