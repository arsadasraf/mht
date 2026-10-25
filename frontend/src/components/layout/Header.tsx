'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu,
  LogOut,
  User as UserIcon,
  Cpu,
  Building,
  PanelLeft,
  PanelLeftClose,
  Briefcase,
  Compass,
  ShoppingBag,
  ScanLine,
  Boxes,
  Wrench,
  Truck,
  Headphones,
  ShieldAlert,
  LucideIcon
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  toggleMobileDrawer,
  toggleSidebarCollapse
} from '../../store/uiSlice';
import { clearCredentials } from '../../store/authSlice';
import { getModuleBySlug } from '../../config/modules.config';

const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  Cpu,
  Compass,
  ShoppingBag,
  ScanLine,
  Boxes,
  Wrench,
  Truck,
  Headphones,
  ShieldAlert
};

interface HeaderProps {
  currentModule?: string;
}

export default function Header({ currentModule }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const { user } = useAppSelector((state) => state.auth);
  const { isSidebarCollapsed } = useAppSelector((state) => state.ui);

  const segments = pathname.split('/').filter(Boolean);
  const activeSlug = currentModule || segments[0] || 'crm';
  const moduleData = getModuleBySlug(activeSlug);
  const activeTabId = segments[1];
  const activeTab = moduleData?.tabs?.find((t) => t.id === activeTabId) || moduleData?.tabs?.[0];

  const ModuleIcon = (moduleData && ICON_MAP[moduleData.icon]) || Cpu;

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/admin/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mht_access_token');
      localStorage.removeItem('mht_refresh_token');
      localStorage.removeItem('mht_user');
    }
    dispatch(clearCredentials());
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 h-[60px] bg-white border-b border-slate-200 px-3 md:px-5 flex items-center justify-between select-none shadow-xs">
      {/* Left Section: Mobile Drawer Trigger, Desktop Sidebar Toggle, Brand Logo, and Module Name */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          className="lg:hidden flex items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          onClick={() => dispatch(toggleMobileDrawer())}
          aria-label="Open Mobile Drawer"
        >
          <Menu size={18} />
        </button>

        {/* Desktop Sidebar Collapse / Expand Toggle Button */}
        <button
          onClick={() => dispatch(toggleSidebarCollapse())}
          title={isSidebarCollapsed ? 'Expand Sidebar (Show Names)' : 'Collapse Sidebar (Icons Only)'}
          className="hidden lg:flex items-center justify-center p-2 rounded-lg bg-slate-50 hover:bg-orange-50 hover:text-orange-600 text-slate-600 border border-slate-200 hover:border-orange-200 transition-colors cursor-pointer"
          aria-label="Toggle Sidebar Rail"
        >
          {isSidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Brand Identity */}
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0">
          <div className="flex-shrink-0">
            <Image
              src="/branding/mh_icon.png"
              alt="Machine House Icon"
              width={32}
              height={32}
              priority
              className="object-contain group-hover:scale-105 transition-transform"
            />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="font-extrabold text-xs md:text-sm tracking-tight text-slate-900 leading-none group-hover:text-orange-600 transition-colors">
              MACHINE HOUSE
            </span>
            <span className="text-[10px] font-semibold text-orange-600 tracking-wider uppercase leading-tight mt-0.5">
              Winding Technologies
            </span>
          </div>
        </Link>

        {/* Active Module Name Display */}
        {moduleData && (
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <ModuleIcon size={15} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide leading-none truncate max-w-[140px] lg:max-w-[240px]">
                  {moduleData.name}
                </span>
              </div>
              {activeTab && (
                <span className="text-[10px] text-slate-500 font-medium leading-tight truncate max-w-[140px] lg:max-w-[200px]">
                  {activeTab.label}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Section: Plant Tag, User Profile Badge, Sign Out */}
      <div className="flex items-center gap-2 md:gap-3.5 flex-shrink-0">
        <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium">
          <Building size={12} className="text-orange-500" />
          <span>Main Works — Unit 1</span>
        </div>

        <div className="flex items-center gap-2 pl-1 sm:pl-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-sm font-bold text-xs">
            {user?.firstName ? user.firstName[0].toUpperCase() : <UserIcon size={15} />}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-tight">
              {user ? `${user.firstName} ${user.lastName}` : 'Administrator'}
            </span>
            <span className="text-[10px] font-medium text-slate-500 leading-tight">
              {typeof user?.role === 'object' ? user.role.name : 'Super Admin'}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          aria-label="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
