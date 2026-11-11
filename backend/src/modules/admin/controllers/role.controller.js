import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'System';
};

export const getRoles = async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: 'asc' }
    });
    res.status(200).json({ success: true, count: roles.length, roles });
  } catch (error) {
    next(error);
  }
};

export const updateRolePermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allowedRoutes, description } = req.body;

    const existingRole = await prisma.role.findUnique({ where: { id } });
    if (!existingRole) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    const beforeRoutes = [...(existingRole.allowedRoutes || [])];

    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        ...(allowedRoutes !== undefined ? { allowedRoutes } : {}),
        ...(description !== undefined ? { description } : {}),
        updatedById: req.user?.id || null,
        updatedByName: getActorName(req.user)
      }
    });

    await logAuditEvent({
      req,
      action: 'ROLE_PERMISSIONS_UPDATED',
      module: 'admin',
      entityId: updatedRole.id,
      entityType: 'Role',
      beforeData: { allowedRoutes: beforeRoutes },
      afterData: { allowedRoutes: updatedRole.allowedRoutes },
      notes: `Permissions updated for role ${updatedRole.name}`
    });

    res.status(200).json({
      success: true,
      message: `All set! Permissions updated for '${updatedRole.name}'.`,
      role: updatedRole
    });
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req, res, next) => {
  try {
    const { name, slug, description, allowedRoutes = [] } = req.body;
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both a role name and a unique slug.'
      });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const existing = await prisma.role.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug: cleanSlug }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A role with name '${name}' or slug '${cleanSlug}' already exists.`
      });
    }

    const newRole = await prisma.role.create({
      data: {
        name: name.trim(),
        slug: cleanSlug,
        description: description || '',
        allowedRoutes: Array.isArray(allowedRoutes) ? allowedRoutes : [],
        isSystemRole: false,
        createdById: req.user?.id || null,
        createdByName: getActorName(req.user),
        updatedById: req.user?.id || null,
        updatedByName: getActorName(req.user)
      }
    });

    await logAuditEvent({
      req,
      action: 'ROLE_CREATED',
      module: 'admin',
      entityId: newRole.id,
      entityType: 'Role',
      afterData: {
        name: newRole.name,
        slug: newRole.slug,
        allowedRoutes: newRole.allowedRoutes
      },
      notes: `Custom role '${newRole.name}' created with ${newRole.allowedRoutes.length} allowed routes.`
    });

    res.status(201).json({
      success: true,
      message: `All set! Role '${newRole.name}' created successfully.`,
      role: newRole
    });
  } catch (error) {
    next(error);
  }
};
