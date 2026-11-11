import bcrypt from 'bcryptjs';
import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'System';
};

/**
 * Strips sensitive fields (password, currentRefreshToken) from user records before sending to client.
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, currentRefreshToken, ...safeUser } = user;
  return {
    ...safeUser,
    _id: user.id
  };
};

const userInclude = {
  role: true,
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true }
  },
  updatedBy: {
    select: { id: true, firstName: true, lastName: true, email: true }
  },
  loginHistory: {
    orderBy: { loginAt: 'desc' },
    take: 10
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { department, status, search, page = 1, limit = 50 } = req.query;

    const where = {};
    if (department) where.department = department;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 50);

    const [total, rawUsers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      })
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      users: rawUsers.map(sanitizeUser)
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
      whitelistedIps = [],
      allowedRoutes = []
    } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `A user with email '${normalizedEmail}' already exists.`
      });
    }

    const rawPassword =
      password ||
      (authMethod === 'GOOGLE_ONLY'
        ? `GGL_${Date.now()}_${Math.random().toString(36).substring(2)}`
        : 'MHT@Initial2026');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        password: hashedPassword,
        roleId: role,
        department,
        plantLocation,
        authMethod,
        refreshTokenExpiry: refreshTokenExpiry || '7d',
        isIpRestricted: Boolean(isIpRestricted),
        whitelistedIps: Array.isArray(whitelistedIps)
          ? whitelistedIps
          : whitelistedIps
          ? [whitelistedIps]
          : [],
        allowedRoutes: Array.isArray(allowedRoutes) ? allowedRoutes : [],
        isActive: true,
        status: 'ACTIVE',
        createdById: req.user?.id || null,
        createdByName: getActorName(req.user),
        updatedById: req.user?.id || null,
        updatedByName: getActorName(req.user)
      },
      include: userInclude
    });

    await logAuditEvent({
      req,
      action: 'USER_CREATED',
      module: 'admin',
      entityId: newUser.id,
      entityType: 'User',
      afterData: {
        email: newUser.email,
        roleId: role,
        department,
        authMethod,
        refreshTokenExpiry
      },
      notes: `User ${newUser.email} created with authMethod: ${authMethod}, refresh expiry: ${refreshTokenExpiry}`
    });

    res.status(201).json({
      success: true,
      message: 'All set! User account created successfully.',
      user: sanitizeUser(newUser)
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

    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true }
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const beforeSnapshot = sanitizeUser(existingUser);

    const updateData = {
      updatedById: req.user?.id || null,
      updatedByName: getActorName(req.user)
    };

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (role !== undefined) updateData.roleId = role;
    if (department !== undefined) updateData.department = department;
    if (plantLocation !== undefined) updateData.plantLocation = plantLocation;
    if (authMethod !== undefined) updateData.authMethod = authMethod;
    if (refreshTokenExpiry !== undefined) updateData.refreshTokenExpiry = refreshTokenExpiry;
    if (isIpRestricted !== undefined) updateData.isIpRestricted = Boolean(isIpRestricted);
    if (whitelistedIps !== undefined) {
      updateData.whitelistedIps = Array.isArray(whitelistedIps) ? whitelistedIps : [whitelistedIps];
    }
    if (allowedRoutes !== undefined) {
      updateData.allowedRoutes = Array.isArray(allowedRoutes) ? allowedRoutes : [];
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: userInclude
    });

    const sanitizedUpdated = sanitizeUser(updatedUser);

    await logAuditEvent({
      req,
      action: 'USER_UPDATED',
      module: 'admin',
      entityId: updatedUser.id,
      entityType: 'User',
      beforeData: beforeSnapshot,
      afterData: sanitizedUpdated,
      notes: `User profile updated. AuthMethod: ${updatedUser.authMethod}, Refresh expiry: ${updatedUser.refreshTokenExpiry}`
    });

    res.status(200).json({
      success: true,
      message: 'Great! User details updated successfully.',
      user: sanitizedUpdated
    });
  } catch (error) {
    next(error);
  }
};

export const getUserPreview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: userInclude
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const last5Logins = (user.loginHistory || []).slice(0, 5);

    res.status(200).json({
      success: true,
      user: sanitizeUser(user),
      last5Logins
    });
  } catch (error) {
    next(error);
  }
};

export const heartbeat = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }
    const { currentActiveTab } = req.body;

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        isOnline: true,
        lastActiveAt: new Date(),
        ...(currentActiveTab ? { currentActiveTab } : {}),
        totalUsageMinutes: { increment: 1 }
      }
    });

    res.status(200).json({ success: true, timestamp: new Date() });
  } catch (error) {
    next(error);
  }
};

export const getActiveSessions = async (req, res, next) => {
  try {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { isOnline: true },
          { lastActiveAt: { gte: startOfToday } },
          { lastLoginAt: { gte: startOfToday } }
        ]
      },
      include: {
        role: true,
        loginHistory: {
          orderBy: { loginAt: 'desc' },
          take: 1
        }
      },
      orderBy: { lastActiveAt: 'desc' }
    });

    const sessions = users.map((u) => {
      const isCurrentlyActive = Boolean(
        u.lastActiveAt && u.lastActiveAt >= fifteenMinsAgo && u.isOnline
      );
      return {
        _id: u.id,
        id: u.id,
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
        currentActiveTab: u.currentActiveTab || '/admin/users',
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

export const terminateSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await prisma.user.update({
      where: { id },
      data: {
        currentRefreshToken: null,
        isOnline: false
      }
    });

    await logAuditEvent({
      req,
      action: 'SESSION_TERMINATED',
      module: 'admin',
      entityId: user.id,
      entityType: 'User',
      notes: `Admin terminated active session for user ${user.email}`
    });

    res.status(200).json({
      success: true,
      message: `Active session for ${user.firstName} ${user.lastName} has been ended.`
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE' or 'DEACTIVATED'

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newStatus = status || (user.isActive ? 'DEACTIVATED' : 'ACTIVE');
    const isActive = newStatus === 'ACTIVE';

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: newStatus,
        isActive,
        updatedById: req.user?.id || null,
        updatedByName: getActorName(req.user),
        deactivatedAt: isActive ? null : new Date(),
        deactivatedById: isActive ? null : req.user?.id || null,
        ...(isActive ? {} : { currentRefreshToken: null, isOnline: false })
      },
      include: userInclude
    });

    await logAuditEvent({
      req,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      module: 'admin',
      entityId: user.id,
      entityType: 'User',
      notes: `User ${user.email} marked as ${newStatus}`
    });

    res.status(200).json({
      success: true,
      message: `All set! User account ${isActive ? 'activated' : 'deactivated'} successfully.`,
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res) => {
  return res.status(405).json({
    success: false,
    message:
      'User accounts cannot be permanently deleted. Please deactivate the account instead to keep historical records intact.'
  });
};
