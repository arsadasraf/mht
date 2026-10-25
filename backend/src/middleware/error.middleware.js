/**
 * Central Error Handling Middleware
 * OWASP Top 10 - A05:2021 Security Misconfiguration Prevention
 * Transforms raw database exceptions into meaningful, human-actionable instructions.
 */

export const errorHandler = (err, req, res, next) => {
  // Always log error server-side for audit & debugging
  console.error('[API Error]:', err.name || 'Error', err.message);

  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = 'An unexpected system error occurred. Please contact system support.';
  let fixHint = 'Please refresh the page or try the operation again.';

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'record';
    const value = err.keyValue ? err.keyValue[field] : '';
    message = `Duplicate Entry: A record with ${field} '${value}' already exists.`;
    fixHint = `Please specify a unique ${field} value to continue.`;
  }
  // Handle Mongoose validation errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors || {}).map((val) => val.message);
    message = `Validation Failed: ${errors.join(', ')}`;
    fixHint = 'Please check the required fields highlighted in the form.';
  }
  // Handle CastError (invalid ObjectId, invalid number)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid reference format for field '${err.path}'.`;
    fixHint = 'Please select a valid record from the dropdown or verify the identifier.';
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Authentication token is invalid or corrupt.';
    fixHint = 'Please log in again to establish a valid secure session.';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired.';
    fixHint = 'Please refresh your token or log in again.';
  }
  // Custom operational errors thrown in controllers with status
  else if (err.statusCode || err.status) {
    statusCode = err.statusCode || err.status;
    message = err.message;
    if (err.fixHint) fixHint = err.fixHint;
  }
  else if (err.message && !err.message.includes('ECONNREFUSED') && !err.message.includes('MongoError')) {
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    fixHint,
    timestamp: new Date().toISOString()
  });
};
