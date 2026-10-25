/**
 * Route-Based RBAC Middleware
 * Checks if the requesting user's assigned role or user overrides permit access to the target route/tab.
 */
export const authorizeRouteAccess = (requiredRoute) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required.'
      });
    }

    // Super Admin has universal access
    if (req.user.role?.slug === 'super-admin' || req.user.isSuperAdmin) {
      return next();
    }

    // Combine role allowedRoutes and user custom allowedRoutes
    const userAllowedRoutes = [
      ...(req.user.role?.allowedRoutes || []),
      ...(req.user.allowedRoutes || [])
    ];

    const targetRoute = requiredRoute || req.baseUrl.replace('/api/v1', '');

    const hasPermission = userAllowedRoutes.some((route) => {
      if (route === '*' || route === '/*') return true;
      if (route.endsWith('/*')) {
        const prefix = route.slice(0, -2);
        return targetRoute.startsWith(prefix);
      }
      return targetRoute === route || targetRoute.startsWith(route);
    });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access Restricted: You do not have permission to access route '${targetRoute}'.`
      });
    }

    next();
  };
};
