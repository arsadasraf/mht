import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

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
    const count = await prisma.serviceTicket.count();
    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
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
        projectId: String(projectId || 'PRJ-2026-1001').toUpperCase(),
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
