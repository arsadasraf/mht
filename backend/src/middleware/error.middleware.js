/**
 * Central Error Handling Middleware
 * OWASP Top 10 - A05:2021 Security Misconfiguration Prevention
 * Transforms raw Prisma/PostgreSQL & Zod exceptions into friendly, human-actionable instructions.
 */

const FRIENDLY_FIELD_NAMES = {
  workOrderNumber: 'Work Order Number',
  projectId: 'Work Order Number',
  stageCode: 'Stage Code',
  subStageCode: 'Sub-Stage Code',
  poNumber: 'Purchase Order Number',
  orderAcceptanceNumber: 'Order Acceptance (OA) Number',
  leadNumber: 'Enquiry Number',
  quoteNumber: 'Quotation Number',
  customerCode: 'Customer Code',
  companyName: 'Company Name',
  modelCode: 'Product Model Code',
  itemCode: 'Item Code',
  bomNumber: 'BOM Number',
  ecoNumber: 'ECO Number',
  rfqNumber: 'RFQ Number',
  billNumber: 'Vendor Bill Number',
  vendorCode: 'Vendor Code',
  gateEntryNumber: 'Gate Entry Number',
  inspectionNumber: 'QC Inspection Number',
  grnNumber: 'GRN Number',
  mrNumber: 'Material Request Number',
  dcNumber: 'Delivery Challan Number',
  allocationNumber: 'Allocation Number',
  binCode: 'Bin Code',
  trialRunNumber: 'Trial Run Number',
  dispatchNumber: 'Dispatch Number',
  ticketNumber: 'Service Ticket Number',
  email: 'Email Address',
  name: 'Name',
  slug: 'Code / Slug'
};

export const errorHandler = (err, req, res, next) => {
  console.error('[API Error]:', err.name || 'Error', err.code || '', err.message);

  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = "We couldn't complete this action right now. Please try again.";
  let fixHint = 'Please refresh the page or check your inputs.';

  // Handle Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    statusCode = 400;
    const rawTargets = Array.isArray(err.meta?.target)
      ? err.meta.target
      : err.meta?.target
      ? [String(err.meta.target)]
      : ['record'];
    const friendlyTargets = rawTargets.map((t) => FRIENDLY_FIELD_NAMES[t] || t);
    const label = [...new Set(friendlyTargets)].join(' / ');
    message = `Just a heads up: a record with this ${label} already exists. Duplicate entries are not allowed.`;
    fixHint = `Please enter a unique ${label} to continue.`;
  }
  // Handle Prisma record not found (P2025)
  else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'The requested record could not be found.';
    fixHint = 'Please refresh the list and try again.';
  }
  // Handle Prisma invalid UUID / column data format (P2023)
  else if (err.code === 'P2023') {
    statusCode = 400;
    message = 'Invalid ID format provided.';
    fixHint = 'Please refresh the page and try again.';
  }
  // Handle Prisma foreign key constraint failure (P2003)
  else if (err.code === 'P2003') {
    statusCode = 400;
    message = 'This record is linked to another item that does not exist or cannot be removed.';
    fixHint = 'Please select a valid reference from the dropdown.';
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Your sign-in session is invalid.';
    fixHint = 'Please sign in again to continue.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired.';
    fixHint = 'Please refresh your session or sign in again.';
  }
  // Custom operational errors thrown in controllers with status
  else if (err.statusCode || err.status) {
    statusCode = err.statusCode || err.status;
    message = err.message;
    if (err.fixHint) fixHint = err.fixHint;
  } else if (err.message && !err.message.includes('ECONNREFUSED')) {
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    fixHint,
    timestamp: new Date().toISOString()
  });
};
