import { Role } from '../models/role.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.find().sort({ createdAt: 1 });
    res.status(200).json({ success: true, count: roles.length, roles });
  } catch (error) {
    next(error);
  }
};

export const updateRolePermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allowedRoutes, description } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    const beforeRoutes = [...role.allowedRoutes];
    if (allowedRoutes) role.allowedRoutes = allowedRoutes;
    if (description) role.description = description;
    role.updatedBy = req.user?._id;

    await role.save();

    await logAuditEvent({
      req,
      action: 'ROLE_PERMISSIONS_UPDATED',
      module: 'admin',
      entityId: role._id,
      entityType: 'Role',
      beforeData: { allowedRoutes: beforeRoutes },
      afterData: { allowedRoutes: role.allowedRoutes },
      notes: `Permissions updated for role ${role.name}`
    });

    res.status(200).json({
      success: true,
      message: `Permissions updated for role '${role.name}'.`,
      role
    });
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req, res, next) => {
  try {
    const { name, slug, description, allowedRoutes = [] } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Role name and unique slug are required.' });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const existing = await Role.findOne({ $or: [{ name }, { slug: cleanSlug }] });
    if (existing) {
      return res.status(400).json({ success: false, message: `Role '${name}' or slug '${cleanSlug}' already exists.` });
    }

    const newRole = new Role({
      name,
      slug: cleanSlug,
      description: description || '',
      allowedRoutes,
      isSystemRole: false,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await newRole.save();

    await logAuditEvent({
      req,
      action: 'ROLE_CREATED',
      module: 'admin',
      entityId: newRole._id,
      entityType: 'Role',
      afterData: { name: newRole.name, slug: newRole.slug, allowedRoutes: newRole.allowedRoutes },
      notes: `Custom role '${newRole.name}' created with ${newRole.allowedRoutes.length} allowed routes.`
    });

    res.status(201).json({
      success: true,
      message: `Role '${newRole.name}' created successfully.`,
      role: newRole
    });
  } catch (error) {
    next(error);
  }
};
