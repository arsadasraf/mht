import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

const formatEco = (e) => ({
  ...e,
  _id: e.id,
  affectedItemCodes: Array.isArray(e.affectedItemCodes) ? e.affectedItemCodes : []
});

export const getEcos = async (req, res, next) => {
  try {
    const { projectId, status } = req.query;
    const where = {};
    if (projectId) where.projectId = String(projectId).toUpperCase();
    if (status) where.status = String(status);

    const ecos = await prisma.eco.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: ecos.length,
      ecos: ecos.map(formatEco)
    });
  } catch (error) {
    next(error);
  }
};

export const createEco = async (req, res, next) => {
  try {
    const count = await prisma.eco.count();
    const ecoNumber = `ECO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const { projectId, title, reasonForChange, changeType = 'DESIGN_REVISION', affectedItemCodes = [] } = req.body;
    if (!projectId || !title || !reasonForChange) {
      return res.status(400).json({
        success: false,
        message: 'Project ID, Title, and Reason for Change are required.'
      });
    }

    const actorName = getActorName(req.user);
    const cleanCodes = Array.isArray(affectedItemCodes)
      ? affectedItemCodes.map((c) => String(c).toUpperCase().trim()).filter(Boolean)
      : [];

    const eco = await prisma.eco.create({
      data: {
        ecoNumber,
        projectId: String(projectId).toUpperCase().trim(),
        title: String(title).trim(),
        reasonForChange: String(reasonForChange).trim(),
        changeType,
        affectedItemCodes: cleanCodes,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'ECO_SUBMITTED',
      module: 'design',
      entityId: eco.id,
      entityType: 'Eco',
      notes: `ECO ${ecoNumber} submitted for project ${eco.projectId}. Affected items: ${cleanCodes.join(', ')}`
    });

    res.status(201).json({
      success: true,
      message: `All set! ECO ${ecoNumber} submitted.`,
      eco: formatEco(eco)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Automated ECO Freeze Rule:
 * Approving an Engineering Change Order automatically freezes affected active BOM lines.
 */
export const approveEcoAndFreeze = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    const existing = await prisma.eco.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'ECO not found.' });
    }

    const actorName = getActorName(req.user);
    const affectedCodes = Array.isArray(existing.affectedItemCodes) ? existing.affectedItemCodes : [];

    // Execute automated freeze on target Project BOM
    const bom = await prisma.bom.findUnique({ where: { projectId: existing.projectId } });
    let frozenCount = 0;

    if (bom && Array.isArray(bom.items)) {
      const updatedItems = bom.items.map((item) => {
        if (affectedCodes.includes(String(item.itemCode).toUpperCase())) {
          frozenCount++;
          return {
            ...item,
            ecoStatus: 'FROZEN_ECO',
            ecoReference: existing.ecoNumber
          };
        }
        return item;
      });

      await prisma.bom.update({
        where: { id: bom.id },
        data: {
          items: updatedItems,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    const eco = await prisma.eco.update({
      where: { id },
      data: {
        status: 'APPROVED_FREEZE',
        freezeActionTaken: true,
        approvedById: req.user?.id || null,
        approvedByName: actorName,
        approvedAt: new Date(),
        approvalNotes: approvalNotes || 'Approved. Automated freeze executed on affected items.',
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'ECO_APPROVED_AND_FROZEN',
      module: 'design',
      entityId: eco.id,
      entityType: 'Eco',
      notes: `ECO ${eco.ecoNumber} approved! Automated freeze enacted on ${frozenCount} BOM lines for project ${eco.projectId}`
    });

    res.status(200).json({
      success: true,
      message: `ECO ${eco.ecoNumber} approved. Automated freeze triggered on ${frozenCount} BOM line items.`,
      eco: formatEco(eco),
      frozenItemsCount: frozenCount
    });
  } catch (error) {
    next(error);
  }
};
