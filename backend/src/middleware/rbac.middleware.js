/**
 * Machine House (MH) ERP — Server-Side RBAC & Module Governance Middleware
 * Enforces strict module-wise and route-level authorization across all API endpoints.
 */

/**
 * Checks if requesting user has access to a specific module prefix (e.g. '/crm', '/design', '/admin')
 * or any sub-tab within that module.
 */
export const requireModulePermission = (modulePrefix) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in to access this workspace.'
      });
    }

    // Super Admin has universal access
    if (req.user.isSuperAdmin || req.user.role?.slug === 'super-admin') {
      return next();
    }

    // Combine role allowedRoutes and user custom allowedRoutes
    const userAllowedRoutes = [
      ...(req.user.role?.allowedRoutes || []),
      ...(req.user.allowedRoutes || [])
    ];

    const normalizedPrefix = modulePrefix.startsWith('/') ? modulePrefix : `/${modulePrefix}`;

    const hasAccess = userAllowedRoutes.some((route) => {
      if (route === '*' || route === '/*') return true;
      if (route === normalizedPrefix || route.startsWith(`${normalizedPrefix}/`) || route.startsWith(normalizedPrefix)) {
        return true;
      }
      return false;
    });

    if (!hasAccess) {
      const roleName = req.user.role?.name || 'Standard Personnel';
      return res.status(403).json({
        success: false,
        code: 'MODULE_ACCESS_DENIED',
        message: `Access Restricted: Your assigned role (${roleName}) does not have permission to access the '${normalizedPrefix.slice(1)}' module.`,
        fixHint: 'Contact your Machine House ERP System Administrator to adjust your role permissions in Admin & Governance.'
      });
    }

    next();
  };
};

/**
 * Specific Route-Based RBAC Middleware
 */
export const authorizeRouteAccess = (requiredRoute) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in.'
      });
    }

    if (req.user.isSuperAdmin || req.user.role?.slug === 'super-admin') {
      return next();
    }

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
