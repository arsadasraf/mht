'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert, ArrowRight, Lock, Home, LogOut } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { clearCredentials } from '../../store/authSlice';
import { isRouteAllowed, getFirstAccessibleRoute, hasRootAccess } from '../../utils/rbac';

interface RouteGuardProps {
  children: React.ReactNode;
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  // If still rehydrating or on login/public page, pass through
  if (isLoading || pathname === '/login' || pathname === '/') {
    return <>{children}</>;
  }

  // Super Admin / Root always permitted
  if (hasRootAccess(user)) {
    return <>{children}</>;
  }

  // Check if current route is allowed
  const allowed = isRouteAllowed(pathname, user);

  if (allowed) {
    return <>{children}</>;
  }

  const roleName = typeof user?.role === 'object' && user?.role !== null ? user.role.name : 'Standard Personnel';
  const fallbackRoute = getFirstAccessibleRoute(user);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/admin/auth/logout', { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mht_access_token');
      localStorage.removeItem('mht_refresh_token');
      localStorage.removeItem('mht_user');
    }
    dispatch(clearCredentials());
    router.push('/login');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full shadow-lg text-center animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
          HTTP 403 Forbidden
        </span>

        <h2 className="text-xl font-bold text-slate-900 mt-3">Access Restricted</h2>

        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Your assigned role (<strong className="text-slate-900">{roleName}</strong>) is not authorized to access this module tab:
        </p>

        <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-orange-600 font-semibold break-all">
          {pathname}
        </div>

        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Access to this area requires elevated system permissions. If you need this workspace for daily machine execution, please contact your Machine House System Administrator.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={fallbackRoute}
            className="w-full sm:w-auto px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Go to Authorized Workspace</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
