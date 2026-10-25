import { User } from '../models/user.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getUsers = async (req, res, next) => {
  try {
    const { department, status, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (department) query.department = department;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('role')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      users
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      department,
      plantLocation = 'Main Works - Unit 1 (Bengaluru)',
      authMethod = 'BOTH',
      refreshTokenExpiry = '7d',
      isIpRestricted = false,
      whitelistedIps = []
    } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `A user with email '${email}' already exists.`
      });
    }

    // If GOOGLE_ONLY and password not provided, generate random secure hash fallback
    const effectivePassword = password || (authMethod === 'GOOGLE_ONLY' ? `GGL_${Date.now()}_${Math.random().toString(36).substring(2)}` : 'MHT@Initial2026');

    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: effectivePassword,
      role,
      department,
      plantLocation,
      authMethod,
      refreshTokenExpiry: refreshTokenExpiry || '7d',
      isIpRestricted,
      whitelistedIps: Array.isArray(whitelistedIps) ? whitelistedIps : (whitelistedIps ? [whitelistedIps] : []),
      isActive: true,
      status: 'ACTIVE',
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await newUser.save();
    const populatedUser = await User.findById(newUser._id).populate('role');

    await logAuditEvent({
      req,
      action: 'USER_CREATED',
      module: 'admin',
      entityId: newUser._id,
      entityType: 'User',
      afterData: { email: newUser.email, role, department, authMethod, refreshTokenExpiry },
      notes: `User ${newUser.email} created with authMethod: ${authMethod}, refresh expiry: ${refreshTokenExpiry}`
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: populatedUser
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      role,
      department,
      plantLocation,
      authMethod,
      password,
      refreshTokenExpiry,
      isIpRestricted,
      whitelistedIps,
      allowedRoutes
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const beforeSnapshot = user.toObject();

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (role) user.role = role;
    if (department) user.department = department;
    if (plantLocation) user.plantLocation = plantLocation;
    if (authMethod) user.authMethod = authMethod;
    if (password) user.password = password; // Will be hashed by pre-save hook
    if (refreshTokenExpiry) user.refreshTokenExpiry = refreshTokenExpiry;
    if (isIpRestricted !== undefined) user.isIpRestricted = isIpRestricted;
    if (whitelistedIps !== undefined) {
      user.whitelistedIps = Array.isArray(whitelistedIps) ? whitelistedIps : [whitelistedIps];
    }
    if (allowedRoutes !== undefined) user.allowedRoutes = allowedRoutes;

    user.updatedBy = req.user?._id;
    await user.save();

    const updatedUser = await User.findById(user._id).populate('role');

    await logAuditEvent({
      req,
      action: 'USER_UPDATED',
      module: 'admin',
      entityId: user._id,
      entityType: 'User',
      beforeData: beforeSnapshot,
      afterData: updatedUser.toObject(),
      notes: `User profile updated. AuthMethod: ${user.authMethod}, Refresh expiry: ${user.refreshTokenExpiry}`
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed User Preview including profile info and Last 5 Logins
 */
export const getUserPreview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .populate('role')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const last5Logins = (user.loginHistory || []).slice(0, 5);

    res.status(200).json({
      success: true,
      user,
      last5Logins
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Client Heartbeat Ping: updates isOnline, lastActiveAt, currentActiveTab, usage time
 */
export const heartbeat = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }
    const { currentActiveTab } = req.body;
    const user = await User.findById(req.user._id);
    if (user) {
      user.isOnline = true;
      user.lastActiveAt = new Date();
      if (currentActiveTab) user.currentActiveTab = currentActiveTab;
      user.totalUsageMinutes = (user.totalUsageMinutes || 0) + 1;
      await user.save();
    }
    res.status(200).json({ success: true, timestamp: new Date() });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active and recent user sessions for Live Activity Monitor
 */
export const getActiveSessions = async (req, res, next) => {
  try {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const users = await User.find({
      $or: [
        { isOnline: true },
        { lastActiveAt: { $gte: startOfToday } },
        { lastLoginAt: { $gte: startOfToday } }
      ]
    })
      .populate('role')
      .sort({ lastActiveAt: -1 });

    const sessions = users.map((u) => {
      const isCurrentlyActive = Boolean(u.lastActiveAt && u.lastActiveAt >= fifteenMinsAgo && u.isOnline);
      return {
        _id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        fullName: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
        department: u.department,
        plantLocation: u.plantLocation,
        authMethod: u.authMethod || 'BOTH',
        isOnline: isCurrentlyActive,
        lastActiveAt: u.lastActiveAt || u.lastLoginAt,
        lastLoginAt: u.lastLoginAt,
        currentActiveTab: u.currentActiveTab || '/crm/dashboard',
        totalUsageMinutes: u.totalUsageMinutes || 0,
        whitelistedIps: u.whitelistedIps || [],
        isIpRestricted: u.isIpRestricted,
        lastLogin: u.loginHistory?.[0] || null
      };
    });

    res.status(200).json({
      success: true,
      count: sessions.length,
      activeNowCount: sessions.filter((s) => s.isOnline).length,
      sessions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Terminate Active User Session (Force Logout)
 */
export const terminateSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.currentRefreshToken = null;
    user.isOnline = false;
    await user.save();

    await logAuditEvent({
      req,
      action: 'SESSION_TERMINATED',
      module: 'admin',
      entityId: user._id,
      entityType: 'User',
      notes: `Admin terminated active session for user ${user.email}`
    });

    res.status(200).json({
      success: true,
      message: `Active session for ${user.firstName} ${user.lastName} has been terminated.`
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE' or 'DEACTIVATED'

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newStatus = status || (user.isActive ? 'DEACTIVATED' : 'ACTIVE');
    const isActive = newStatus === 'ACTIVE';

    user.status = newStatus;
    user.isActive = isActive;
    user.updatedBy = req.user?._id;

    if (!isActive) {
      user.deactivatedAt = new Date();
      user.deactivatedBy = req.user?._id;
      user.currentRefreshToken = null; // Instantly revoke active session
    } else {
      user.deactivatedAt = null;
      user.deactivatedBy = null;
    }

    await user.save();

    await logAuditEvent({
      req,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      module: 'admin',
      entityId: user._id,
      entityType: 'User',
      notes: `User ${user.email} marked as ${newStatus}`
    });

    res.status(200).json({
      success: true,
      message: `User successfully ${isActive ? 'activated' : 'deactivated'}.`,
      user
    });
  } catch (error) {
    next(error);
  }
};

// Strict System Block: Reject hard delete requests
export const deleteUser = async (req, res) => {
  return res.status(405).json({
    success: false,
    message: 'Strict Security Rule: User accounts cannot be deleted from the database. Use deactivation instead to preserve historical integrity.'
  });
};
