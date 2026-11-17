import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const getLocations = async (req, res, next) => {
  try {
    const { search, type, includeInactive } = req.query;
    const where = {};

    if (includeInactive !== 'true') {
      where.isActive = true;
    }
    if (type) {
      where.locationType = String(type);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { locationName: { contains: q, mode: 'insensitive' } },
        { locationType: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ];
    }

    const locations = await prisma.storeLocationMaster.findMany({
      where,
      orderBy: { locationName: 'asc' }
    });

    res.status(200).json({
      success: true,
      count: locations.length,
      locations: locations.map((loc) => ({ ...loc, _id: loc.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const createLocation = async (req, res, next) => {
  try {
    const { locationName, locationType = 'Rack', description = '' } = req.body;
    const cleanName = String(locationName || '').trim();

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: 'Location Name is required.'
      });
    }

    // Layer 2: Pre-save duplicate check
    const existing = await prisma.storeLocationMaster.findFirst({
      where: { locationName: { equals: cleanName, mode: 'insensitive' } }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Location "${cleanName}" already exists. Please choose a distinct location name.`
      });
    }

    const actorName = getActorName(req.user);

    const location = await prisma.storeLocationMaster.create({
      data: {
        locationName: cleanName,
        locationType: String(locationType).trim() || 'Rack',
        description: String(description || '').trim(),
        isActive: true,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'STORE_LOCATION_CREATED',
      module: 'store',
      entityId: location.id,
      entityType: 'StoreLocationMaster',
      notes: `Storage Location "${location.locationName}" (${location.locationType}) created`
    });

    res.status(201).json({
      success: true,
      message: 'All set! Storage location created successfully.',
      location: { ...location, _id: location.id }
    });
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { locationName, locationType, description, isActive } = req.body;
    const cleanName = String(locationName || '').trim();

    const existing = await prisma.storeLocationMaster.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Storage location record not found.'
      });
    }

    // Check duplicate name on edit (excluding current record)
    if (cleanName && cleanName.toLowerCase() !== existing.locationName.toLowerCase()) {
      const duplicate = await prisma.storeLocationMaster.findFirst({
        where: {
          locationName: { equals: cleanName, mode: 'insensitive' },
          id: { not: id }
        }
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Location name "${cleanName}" is already taken by another location.`
        });
      }
    }

    const actorName = getActorName(req.user);

    const updated = await prisma.storeLocationMaster.update({
      where: { id },
      data: {
        locationName: cleanName || existing.locationName,
        locationType: locationType !== undefined ? String(locationType).trim() : existing.locationType,
        description: description !== undefined ? String(description).trim() : existing.description,
        isActive: typeof isActive === 'boolean' ? isActive : existing.isActive,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'STORE_LOCATION_UPDATED',
      module: 'store',
      entityId: updated.id,
      entityType: 'StoreLocationMaster',
      notes: `Storage Location "${updated.locationName}" updated`
    });

    res.status(200).json({
      success: true,
      message: 'Great! Storage location updated successfully.',
      location: { ...updated, _id: updated.id }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const location = await prisma.storeLocationMaster.findUnique({ where: { id } });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Storage location not found.'
      });
    }

    // Toggle active state
    const updated = await prisma.storeLocationMaster.update({
      where: { id },
      data: { isActive: !location.isActive }
    });

    res.status(200).json({
      success: true,
      message: updated.isActive ? 'Storage location activated.' : 'Storage location deactivated.',
      location: { ...updated, _id: updated.id }
    });
  } catch (error) {
    next(error);
  }
};

