import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/user.model.js';
import { Role } from '../models/role.model.js';
import { checkAccountLockout, recordFailedLogin, resetFailedLogin } from '../../../middleware/rateLimiter.middleware.js';
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
    userId: user._id,
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

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Check account lockout
    const lockout = checkAccountLockout(email);
    if (lockout.isLocked) {
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed login attempts. Try again in ${lockout.remainingMins} minute(s).`
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +currentRefreshToken').populate('role');

    if (!user) {
      recordFailedLogin(email);
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive || user.status === 'DEACTIVATED') {
      return res.status(403).json({ success: false, message: 'This account has been deactivated. Contact Administrator.' });
    }

    // STRICT AUTHENTICATION MODE ENFORCEMENT
    if (user.authMethod === 'GOOGLE_ONLY') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: This account is configured for Google Single Sign-On only. Please use the "Sign in with Google" button.',
        fixHint: 'Use the "Sign in with Google" button on the login screen.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const attempts = recordFailedLogin(email);
      const remaining = Math.max(0, 5 - attempts);
      return res.status(401).json({
        success: false,
        message: remaining > 0 ? `Invalid credentials. ${remaining} attempt(s) remaining before temporary lockout.` : 'Account locked for 15 minutes.'
      });
    }

    // STRICT ENTERPRISE RULE: Only the designated ADMIN_EMAIL in .env can log in as Super Admin
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'asrafali444u@gmail.com').toLowerCase();
    const isUserAdminRole = user.isSuperAdmin || user.role?.slug === 'super-admin';
    if (isUserAdminRole && user.email.toLowerCase() !== configuredAdminEmail) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Only the authorized system Administrator email is permitted to log in as Super Admin.',
        fixHint: `Please sign in with the configured administrator email (${configuredAdminEmail}).`
      });
    }

    // Login successful
    resetFailedLogin(email);
    user.lastLoginAt = new Date();
    user.isOnline = true;
    user.lastActiveAt = new Date();
    user.currentActiveTab = '/crm/dashboard';

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser Client';
    const deviceType = getDeviceType(userAgent);

    user.loginHistory = user.loginHistory || [];
    user.loginHistory.unshift({
      loginAt: new Date(),
      ipAddress: clientIp,
      userAgent,
      deviceType,
      authMethodUsed: 'EMAIL_PASSWORD',
      status: 'SUCCESS'
    });
    if (user.loginHistory.length > 10) user.loginHistory = user.loginHistory.slice(0, 10);

    const { accessToken, refreshToken, refreshExpiry } = generateTokens(user);
    user.currentRefreshToken = refreshToken;
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    await logAuditEvent({
      req,
      action: 'USER_LOGIN_PASSWORD',
      module: 'admin',
      entityId: user._id,
      entityType: 'User',
      notes: `User logged in successfully with password. Refresh expiry: ${refreshExpiry}`
    });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
        plantLocation: user.plantLocation,
        refreshTokenExpiry: user.refreshTokenExpiry,
        allowedRoutes: [
          ...(user.role?.allowedRoutes || []),
          ...(user.allowedRoutes || [])
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body; // Google ID Token
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential token is required.' });
    }

    let payload;
    try {
      // Decode or verify Google Token using configured Google Client ID
      const client = getGoogleClient();
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (gErr) {
      // Dev mock token decoding fallback if in development with mock client ID
      if (process.env.NODE_ENV === 'development') {
        const decoded = jwt.decode(credential);
        if (decoded?.email) {
          payload = decoded;
        } else {
          return res.status(401).json({ success: false, message: 'Invalid Google OAuth Token: ' + gErr.message });
        }
      } else {
        return res.status(401).json({ success: false, message: 'Google Authentication failed: ' + gErr.message });
      }
    }

    const email = payload.email.toLowerCase();
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'asrafali444u@gmail.com').toLowerCase();

    // Look up user
    let user = await User.findOne({ email }).select('+currentRefreshToken').populate('role');

    // If logging in with configured ADMIN_EMAIL, automatically ensure user is provisioned as Super Admin
    if (!user && email === configuredAdminEmail) {
      const superAdminRole = await Role.findOne({ slug: 'super-admin' });
      user = await User.create({
        firstName: payload.given_name || 'Asraf',
        lastName: payload.family_name || 'Ali',
        email: configuredAdminEmail,
        role: superAdminRole?._id,
        isSuperAdmin: true,
        department: 'ADMIN',
        plantLocation: 'Main Works - Unit 1',
        refreshTokenExpiry: '30d',
        googleId: payload.sub,
        isActive: true,
        status: 'ACTIVE'
      });
      user = await User.findById(user._id).populate('role');
    }

    // STRICT ENTERPRISE RULE: Pre-Registered Accounts Only
    if (!user) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: The Google account '${email}' is not pre-registered in the Machine House system. Please request an invitation from the Administrator.`
      });
    }

    // STRICT ENTERPRISE RULE: Only the designated ADMIN_EMAIL can possess Super Admin access
    const isUserAdminRole = user.isSuperAdmin || user.role?.slug === 'super-admin';
    if (isUserAdminRole && user.email.toLowerCase() !== configuredAdminEmail) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Only the authorized system Administrator email is permitted to log in as Super Admin.',
        fixHint: `Please sign in with the configured administrator email (${configuredAdminEmail}).`
      });
    }

    if (!user.isActive || user.status === 'DEACTIVATED') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact Administrator.' });
    }

    // STRICT AUTHENTICATION MODE ENFORCEMENT
    if (user.authMethod === 'PASSWORD_ONLY') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Google Sign-In is disabled for this account. Please log in using your corporate email and password.',
        fixHint: 'Enter your corporate email and password to log in.'
      });
    }

    if (!user.googleId && payload.sub) {
      user.googleId = payload.sub;
    }

    user.lastLoginAt = new Date();
    user.isOnline = true;
    user.lastActiveAt = new Date();
    user.currentActiveTab = '/crm/dashboard';

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser Client';
    const deviceType = getDeviceType(userAgent);

    user.loginHistory = user.loginHistory || [];
    user.loginHistory.unshift({
      loginAt: new Date(),
      ipAddress: clientIp,
      userAgent,
      deviceType,
      authMethodUsed: 'GOOGLE_SSO',
      status: 'SUCCESS'
    });
    if (user.loginHistory.length > 10) user.loginHistory = user.loginHistory.slice(0, 10);

    const { accessToken, refreshToken, refreshExpiry } = generateTokens(user);
    user.currentRefreshToken = refreshToken;
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    await logAuditEvent({
      req,
      action: 'USER_LOGIN_GOOGLE_OAUTH',
      module: 'admin',
      entityId: user._id,
      entityType: 'User',
      notes: `User logged in via Google SSO. Refresh expiry: ${refreshExpiry}`
    });

    res.status(200).json({
      success: true,
      message: 'Google Sign-in successful.',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
        plantLocation: user.plantLocation,
        refreshTokenExpiry: user.refreshTokenExpiry,
        allowedRoutes: [
          ...(user.role?.allowedRoutes || []),
          ...(user.allowedRoutes || [])
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refreshSession = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided.' });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'mht_refresh_secret_super_secure_key_2026_innovation', async (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Refresh token invalid or expired. Please log in again.' });
      }

      const user = await User.findById(decoded.userId).select('+currentRefreshToken').populate('role');

      if (!user || !user.isActive || user.status === 'DEACTIVATED') {
        return res.status(403).json({ success: false, message: 'User session revoked or deactivated.' });
      }

      // Refresh token rotation
      const tokens = generateTokens(user);
      user.currentRefreshToken = tokens.refreshToken;
      await user.save();

      setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

      res.status(200).json({
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      req.user.currentRefreshToken = null;
      req.user.isOnline = false;
      await req.user.save();

      await logAuditEvent({
        req,
        action: 'USER_LOGOUT',
        module: 'admin',
        entityId: req.user._id,
        entityType: 'User',
        notes: 'User logged out and session revoked.'
      });
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
      plantLocation: req.user.plantLocation,
      refreshTokenExpiry: req.user.refreshTokenExpiry,
      allowedRoutes: [
        ...(req.user.role?.allowedRoutes || []),
        ...(req.user.allowedRoutes || [])
      ]
    }
  });
};

export const getAuthConfig = async (req, res) => {
  res.status(200).json({
    success: true,
    googleClientId: process.env.GOOGLE_CLIENT_ID || '784057626241-eish7vufabh0d4ttmi910enchmbo8rk5.apps.googleusercontent.com'
  });
};

