/**
 * IP Whitelist & Plant Geo-Fencing Middleware
 * Validates incoming client IP against plant/office whitelists if enforced.
 */
export const enforceIpWhitelist = async (req, res, next) => {
  // If user is authenticated and IP restriction is enabled for user/department
  if (req.user && req.user.isIpRestricted) {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip;

    const allowedIps = req.user.whitelistedIps || [];

    // Allow localhost during development
    const isLocalhost = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';

    if (process.env.NODE_ENV === 'development' && isLocalhost) {
      return next();
    }

    const isMatch = allowedIps.some((ip) => ip === clientIp || clientIp.startsWith(ip));

    if (!isMatch) {
      return res.status(403).json({
        success: false,
        message: `Security Block: Your current IP address (${clientIp}) is not authorized to access Machine House ERP.`
      });
    }
  }

  next();
};

export const ipWhitelistMiddleware = enforceIpWhitelist;
