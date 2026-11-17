import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { generateUniqueSequenceCode } from '../../../utils/sequenceGenerator.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const getServiceTickets = async (req, res, next) => {
  try {
    const { projectId, status, serviceType } = req.query;
    const where = {};
    if (projectId) where.projectId = String(projectId).toUpperCase();
    if (status) where.status = String(status);
    if (serviceType) where.serviceType = String(serviceType);

    const tickets = await prisma.serviceTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets: tickets.map((t) => ({ ...t, _id: t.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const createServiceTicket = async (req, res, next) => {
  try {
    const ticketNumber = await generateUniqueSequenceCode({
      model: 'serviceTicket',
      field: 'ticketNumber',
      prefix: `TKT-${new Date().getFullYear()}-`,
      startSeq: 1,
      padLength: 4
    });
    const actorName = getActorName(req.user);

    const {
      projectId,
      customerName = 'Customer',
      serviceType = 'WARRANTY_CLAIM',
      title,
      description = '',
      severity = 'MEDIUM',
      warrantyStatus = 'UNDER_WARRANTY',
      fieldEngineerName = ''
    } = req.body;

    const ticket = await prisma.serviceTicket.create({
      data: {
        ticketNumber,
        projectId: String(projectId || 'WO-2026-1001').toUpperCase(),
        customerName,
        serviceType,
        title: title || 'Field Service Request',
        description,
        severity,
        warrantyStatus,
        fieldEngineerName,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'SERVICE_TICKET_CREATED',
      module: 'after-sales',
      entityId: ticket.id,
      entityType: 'ServiceTicket',
      notes: `Service Ticket ${ticketNumber} logged for project ${ticket.projectId}.`
    });

    res.status(201).json({
      success: true,
      message: `All set! Service ticket ${ticketNumber} created.`,
      ticket: { ...ticket, _id: ticket.id }
    });
  } catch (error) {
    next(error);
  }
};

export const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes, fieldEngineerName } = req.body;
    const actorName = getActorName(req.user);

    const existing = await prisma.serviceTicket.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Service ticket not found.' });
    }

    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(resolutionNotes !== undefined ? { resolutionNotes } : {}),
        ...(fieldEngineerName !== undefined ? { fieldEngineerName } : {}),
        ...(status === 'RESOLVED_CLOSED' ? { resolvedAt: new Date() } : {}),
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    if (status === 'RESOLVED_CLOSED' && existing.serviceType === 'COMMISSIONING' && existing.projectId) {
      const prj = await prisma.project.findFirst({
        where: {
          OR: [
            { projectId: existing.projectId },
            { workOrderNumber: existing.projectId }
          ]
        }
      }).catch(() => null);

      const poOr = [
        ...(prj?.customerPoId ? [{ id: prj.customerPoId }] : []),
        { convertedProjectId: existing.projectId },
        ...(prj?.projectId ? [{ convertedProjectId: prj.projectId }] : []),
        ...(prj?.customerPoNumber ? [{ poNumber: prj.customerPoNumber }] : [])
      ];

      await prisma.customerPo.updateMany({
        where: { OR: poOr },
        data: {
          status: 'COMMISSIONED',
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      }).catch(() => {});
    }

    await logAuditEvent({
      req,
      action: 'SERVICE_TICKET_UPDATED',
      module: 'after-sales',
      entityId: ticket.id,
      entityType: 'ServiceTicket',
      notes: `Ticket ${ticket.ticketNumber} marked as ${ticket.status}`
    });

    res.status(200).json({
      success: true,
      message: 'All set! Service ticket updated.',
      ticket: { ...ticket, _id: ticket.id }
    });
  } catch (error) {
    next(error);
  }
};
