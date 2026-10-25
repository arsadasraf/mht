/**
 * NoSQL Query Injection Sanitization Middleware
 * OWASP Top 10 - A03:2021 Injection
 * Recursively strips keys starting with '$' or containing '.' from request body, query, and params.
 */

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    // Strip keys starting with $ (MongoDB operators) or containing . (path traversal/prototype poisoning)
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = sanitizeObject(value);
  }
  return clean;
}

export function sanitizeMiddleware(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}
