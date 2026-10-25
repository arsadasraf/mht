import { ServiceTicket } from '../models/serviceTicket.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getServiceTickets = async (req, res, next) => {
  try {
    const { projectId, status, serviceType } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId.toUpperCase();
    if (status) query.status = status;
    if (serviceType) query.serviceType = serviceType;

    const tickets = await ServiceTicket.find(query)
      .populate('fieldEngineer', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tickets.length, tickets });
  } catch (error) {
    next(error);
  }
};

export const createServiceTicket = async (req, res, next) => {
  try {
    const count = await ServiceTicket.countDocuments();
    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const { projectId, customerName, serviceType, title, description, severity, warrantyStatus, fieldEngineer } = req.body;

    const ticket = new ServiceTicket({
      ticketNumber,
      projectId: projectId.toUpperCase(),
      customerName,
      serviceType,
      title,
      description,
      severity: severity || 'MEDIUM',
      warrantyStatus: warrantyStatus || 'UNDER_WARRANTY',
      fieldEngineer,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await ticket.save();

    await logAuditEvent({
      req,
      action: 'SERVICE_TICKET_CREATED',
      module: 'after-sales',
      entityId: ticket._id,
      entityType: 'ServiceTicket',
      notes: `Service Ticket ${ticketNumber} logged for project ${projectId}. Severity: ${ticket.severity}`
    });

    res.status(201).json({ success: true, message: 'Service ticket created successfully.', ticket });
  } catch (error) {
    next(error);
  }
};

export const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes, fieldEngineer } = req.body;

    const ticket = await ServiceTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Service ticket not found.' });
    }

    if (status) ticket.status = status;
    if (resolutionNotes) ticket.resolutionNotes = resolutionNotes;
    if (fieldEngineer) ticket.fieldEngineer = fieldEngineer;

    if (status === 'RESOLVED_CLOSED') {
      ticket.resolvedAt = new Date();
    }

    ticket.updatedBy = req.user?._id;
    await ticket.save();

    await logAuditEvent({
      req,
      action: 'SERVICE_TICKET_UPDATED',
      module: 'after-sales',
      entityId: ticket._id,
      entityType: 'ServiceTicket',
      notes: `Ticket ${ticket.ticketNumber} marked as ${status}`
    });

    res.status(200).json({ success: true, message: 'Ticket updated successfully.', ticket });
  } catch (error) {
    next(error);
  }
};
