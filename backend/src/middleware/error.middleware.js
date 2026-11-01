/**
 * Central Error Handling Middleware
 * OWASP Top 10 - A05:2021 Security Misconfiguration Prevention
 * Transforms raw Prisma/PostgreSQL & Zod exceptions into friendly, human-actionable instructions.
 */

export const errorHandler = (err, req, res, next) => {
  console.error('[API Error]:', err.name || 'Error', err.code || '', err.message);

  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = "We couldn't complete this action right now. Please try again.";
  let fixHint = 'Please refresh the page or check your inputs.';

  // Handle Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    statusCode = 400;
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target || 'record';
    message = `A record with this ${target} already exists.`;
    fixHint = `Please enter a unique ${target} to continue.`;
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
