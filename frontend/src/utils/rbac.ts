import { CORE_MODULES, CoreModule, ModuleTab } from '../config/modules.config';
import { User, Role } from '../types/auth';

export interface AccessibleModule extends Omit<CoreModule, 'tabs'> {
  tabs: ModuleTab[];
  allowedTabs: ModuleTab[];
  targetPath: string;
}

/**
 * Checks whether user has Super Admin or Root unrestricted access ('*')
 */
export function hasRootAccess(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;

  const roleObj = typeof user.role === 'object' && user.role !== null ? (user.role as Role) : null;
  const roleSlug = roleObj ? roleObj.slug : typeof user.role === 'string' ? user.role : '';

  if (roleSlug === 'super-admin') return true;
  if (roleObj?.allowedRoutes?.includes('*')) return true;
  if (user.allowedRoutes?.includes('*')) return true;

  return false;
}

/**
 * Retrieves all distinct permitted route strings for a user
 */
export function getUserAllowedRoutes(user: User | null | undefined): string[] {
  if (!user) return [];
  if (hasRootAccess(user)) return ['*'];

  const roleObj = typeof user.role === 'object' && user.role !== null ? (user.role as Role) : null;
  const roleRoutes = roleObj?.allowedRoutes || [];
  const userRoutes = user.allowedRoutes || [];

  return Array.from(new Set([...roleRoutes, ...userRoutes]));
}

/**
 * Checks if a specific URL route path is permitted for the user
 */
export function isRouteAllowed(routePath: string, user: User | null | undefined): boolean {
  if (!user) return false;
  if (hasRootAccess(user)) return true;

  const allowedRoutes = getUserAllowedRoutes(user);
  if (allowedRoutes.includes('*')) return true;

  const cleanPath = routePath.split('?')[0].replace(/\/+$/, '') || '/';

  return allowedRoutes.some((allowed) => {
    const cleanAllowed = allowed.replace(/\/+$/, '') || '/';
    return cleanPath === cleanAllowed || cleanPath.startsWith(`${cleanAllowed}/`);
  });
}

/**
 * Filters the 10 core modules to only those containing at least one permitted tab,
 * dynamically resolving the user's first accessible tab path as the module target link.
 */
export function getAccessibleModules(user: User | null | undefined): AccessibleModule[] {
  if (!user) return [];

  if (hasRootAccess(user)) {
    return CORE_MODULES.map((mod) => ({
      ...mod,
      allowedTabs: mod.tabs,
      targetPath: mod.tabs[0]?.path || mod.path
    }));
  }

  return CORE_MODULES.map((mod) => {
    const allowedTabs = mod.tabs.filter((tab) => isRouteAllowed(tab.path, user));
    if (allowedTabs.length === 0) return null;

    return {
      ...mod,
      tabs: allowedTabs,
      allowedTabs,
      targetPath: allowedTabs[0]?.path || mod.path
    };
  }).filter((mod): mod is AccessibleModule => mod !== null);
}

/**
 * Returns only the sub-tabs within a specific module that the user is permitted to access
 */
export function getAccessibleTabsForModule(moduleSlug: string, user: User | null | undefined): ModuleTab[] {
  if (!user) return [];

  const mod = CORE_MODULES.find((m) => m.slug === moduleSlug);
  if (!mod) return [];

  if (hasRootAccess(user)) {
    return mod.tabs;
  }

  return mod.tabs.filter((tab) => isRouteAllowed(tab.path, user));
}

/**
 * Resolves the primary fallback route a user should be redirected to upon login or 403
 */
export function getFirstAccessibleRoute(user: User | null | undefined): string {
  if (!user) return '/login';
  if (hasRootAccess(user)) return '/crm/dashboard';

  const accessibleModules = getAccessibleModules(user);
  if (accessibleModules.length > 0 && accessibleModules[0].targetPath) {
    return accessibleModules[0].targetPath;
  }

  const allowed = getUserAllowedRoutes(user);
  if (allowed.length > 0 && allowed[0] !== '*') {
    return allowed[0];
  }

  return '/login';
}
