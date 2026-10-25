const ipRequestMap = new Map();
const failedLoginMap = new Map();

/**
 * Authentication Rate Limiter (10 requests per minute per IP)
 */
export const authRateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;

  let record = ipRequestMap.get(ip);
  if (!record || now - record.startTime > windowMs) {
    record = { startTime: now, count: 1 };
  } else {
    record.count++;
  }

  ipRequestMap.set(ip, record);

  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again after 1 minute.'
    });
  }

  next();
};

/**
 * Account Lockout Checker (5 failed attempts locks account for 15 mins)
 */
export const checkAccountLockout = (email) => {
  const record = failedLoginMap.get(email.toLowerCase());
  if (!record) return { isLocked: false };

  const now = Date.now();
  const lockoutDuration = 15 * 60 * 1000; // 15 mins

  if (record.attempts >= 5) {
    if (now - record.lastAttemptTime < lockoutDuration) {
      const remainingMins = Math.ceil((lockoutDuration - (now - record.lastAttemptTime)) / 60000);
      return { isLocked: true, remainingMins };
    } else {
      // Lockout expired, reset
      failedLoginMap.delete(email.toLowerCase());
      return { isLocked: false };
    }
  }

  return { isLocked: false };
};

export const recordFailedLogin = (email) => {
  const key = email.toLowerCase();
  const record = failedLoginMap.get(key) || { attempts: 0, lastAttemptTime: 0 };
  record.attempts += 1;
  record.lastAttemptTime = Date.now();
  failedLoginMap.set(key, record);
  return record.attempts;
};

export const resetFailedLogin = (email) => {
  failedLoginMap.delete(email.toLowerCase());
};
