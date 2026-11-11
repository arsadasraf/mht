import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const getInspections = async (req, res, next) => {
  try {
    const { projectId, verdict, search } = req.query;
    const where = {};
    if (projectId) where.projectId = String(projectId).toUpperCase();
    if (verdict) where.overallVerdict = String(verdict);
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { inspectionNumber: { contains: q, mode: 'insensitive' } },
        { poNumber: { contains: q, mode: 'insensitive' } },
        { itemCode: { contains: q, mode: 'insensitive' } }
      ];
    }

    const inspections = await prisma.qcInspection.findMany({
      where,
      orderBy: { inspectedAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: inspections.length,
      inspections: inspections.map((i) => ({ ...i, _id: i.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const createInspection = async (req, res, next) => {
  try {
    const count = await prisma.qcInspection.count();
    const inspectionNumber = `QC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const actorName = getActorName(req.user);

    const {
      gateEntryId,
      grnNumber = '',
      projectId,
      poNumber,
      itemCode,
      itemName,
      receivedQty = { baseQty: 1, baseUom: 'Nos' },
      acceptedQty = { baseQty: 1, baseUom: 'Nos' },
      rejectedQty = { baseQty: 0, baseUom: 'Nos' },
      reworkQty = { baseQty: 0, baseUom: 'Nos' },
      overallVerdict = 'ACCEPTED',
      defects = [],
      inspectorRemarks = ''
    } = req.body;

    const cleanPrj = String(projectId || 'PRJ-2026-1001').toUpperCase().trim();
    const cleanPo = String(poNumber || 'PO-2026-0001').toUpperCase().trim();
    const cleanCode = String(itemCode).toUpperCase().trim();

    const inspection = await prisma.qcInspection.create({
      data: {
        inspectionNumber,
        gateEntryId: gateEntryId || null,
        grnNumber,
        projectId: cleanPrj,
        poNumber: cleanPo,
        itemCode: cleanCode,
        itemName: itemName || cleanCode,
        receivedQty: typeof receivedQty === 'object' ? receivedQty : { baseQty: Number(receivedQty), baseUom: 'Nos' },
        acceptedQty: typeof acceptedQty === 'object' ? acceptedQty : { baseQty: Number(acceptedQty), baseUom: 'Nos' },
        rejectedQty: typeof rejectedQty === 'object' ? rejectedQty : { baseQty: Number(rejectedQty || 0), baseUom: 'Nos' },
        reworkQty: typeof reworkQty === 'object' ? reworkQty : { baseQty: Number(reworkQty || 0), baseUom: 'Nos' },
        overallVerdict,
        defects: Array.isArray(defects) ? defects : [],
        inspectorRemarks,
        inspectedAt: new Date(),
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    if (gateEntryId) {
      await prisma.gateEntry.update({
        where: { id: gateEntryId },
        data: {
          status: overallVerdict === 'REJECTED_RTV' ? 'REJECTED_AT_GATE' : 'QC_CLEARED',
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      }).catch(() => null);
    }

    if (grnNumber) {
      await prisma.grnRecord.update({
        where: { grnNumber },
        data: {
          qcStatus: overallVerdict === 'REJECTED_RTV' ? 'QC_REJECTED' : 'QC_ACCEPTED',
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      }).catch(() => null);
    }

    const recQty = Number(receivedQty?.baseQty ?? receivedQty ?? 0);
    const accQty = Number(acceptedQty?.baseQty ?? acceptedQty ?? 0);
    const uom = String(acceptedQty?.baseUom || 'Nos').toUpperCase();

    if (accQty > 0) {
      const existingInv = await prisma.inventoryItem.findUnique({ where: { itemCode: cleanCode } });
      if (!existingInv) {
        await prisma.inventoryItem.create({
          data: {
            itemCode: cleanCode,
            itemName: itemName || cleanCode,
            baseUom: uom,
            alternateUom: uom,
            acceptedQty: accQty,
            reservedQuantity: accQty,
            createdById: req.user?.id || null,
            createdByName: actorName,
            updatedById: req.user?.id || null,
            updatedByName: actorName
          }
        });
      } else {
        await prisma.inventoryItem.update({
          where: { itemCode: cleanCode },
          data: {
            inQcQty: Math.max(0, (existingInv.inQcQty || 0) - recQty),
            acceptedQty: (existingInv.acceptedQty || 0) + accQty,
            reservedQuantity: (existingInv.reservedQuantity || 0) + accQty,
            updatedById: req.user?.id || null,
            updatedByName: actorName
          }
        });
      }

      const countAlloc = await prisma.stockAllocation.count();
      await prisma.stockAllocation.create({
        data: {
          allocationNumber: `ALC-${String(countAlloc + 1).padStart(4, '0')}`,
          projectId: cleanPrj,
          itemCode: cleanCode,
          itemName: itemName || cleanCode,
          allocatedQty: accQty,
          baseUom: uom,
          status: 'HARD_LOCKED',
          createdById: req.user?.id || null,
          createdByName: actorName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    await logAuditEvent({
      req,
      action: 'QC_INSPECTION_COMPLETED',
      module: 'incoming-quality',
      entityId: inspection.id,
      entityType: 'QcInspection',
      notes: `QC ${inspectionNumber} completed for item ${cleanCode}. Verdict: ${overallVerdict}, Accepted: ${accQty}`
    });

    res.status(201).json({
      success: true,
      message: `All set! QC inspection ${inspectionNumber} recorded and ${accQty} ${uom} hard-locked to ${cleanPrj}.`,
      inspection: { ...inspection, _id: inspection.id }
    });
  } catch (error) {
    next(error);
  }
};
