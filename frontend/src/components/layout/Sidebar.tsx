'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Briefcase,
  Cpu,
  Compass,
  ShoppingBag,
  ScanLine,
  Boxes,
  Wrench,
  Truck,
  Headphones,
  Sparkles,
  LucideIcon
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { CORE_MODULES } from '../../config/modules.config';
import { getAccessibleModules } from '../../utils/rbac';

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldAlert,
  Briefcase,
  Cpu,
  Compass,
  ShoppingBag,
  ScanLine,
  Boxes,
  Wrench,
  Truck,
  Headphones
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAppSelector((state) => state.auth);
  const { isSidebarCollapsed } = useAppSelector((state) => state.ui);

  const accessibleModules = getAccessibleModules(user);

  const isModuleActive = (moduleSlug: string): boolean => {
    return pathname.startsWith(`/${moduleSlug}`);
  };

  return (
    <aside
      className={`hidden lg:flex flex-col flex-shrink-0 bg-white border-r border-slate-200 select-none transition-all duration-200 ease-in-out ${
        isSidebarCollapsed ? 'w-[68px]' : 'w-64'
      }`}
    >
      {/* Module Links List: Filtered dynamically by assigned user permissions */}
      <nav className={`flex-1 py-3 overflow-y-auto space-y-1.5 ${isSidebarCollapsed ? 'px-2' : 'px-2.5'}`}>
        {accessibleModules.map((mod) => {
          const IconComponent = ICON_MAP[mod.icon] || Cpu;
          const active = isModuleActive(mod.slug);
          const isSpine = mod.isSpine;

          if (isSidebarCollapsed) {
            // Icon-Only Rail Mode (Default)
            return (
              <Link
                key={mod.id}
                href={mod.targetPath}
                title={`${mod.name}${isSpine ? ' (Master Spine)' : ''}`}
                className={`group relative flex items-center justify-center w-11 h-11 mx-auto rounded-xl transition-all cursor-pointer ${
                  active
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <IconComponent size={19} />

                {/* Spine Indicator Dot in Icon-Only Mode */}
                {isSpine && !active && (
                  <span
                    title="Central Project Spine"
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white"
                  ></span>
                )}
              </Link>
            );
          }

          // Full Expanded Sidebar Mode
          return (
            <Link
              key={mod.id}
              href={mod.targetPath}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                active
                  ? 'bg-orange-50 text-orange-600 font-semibold border-l-4 border-orange-500 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors flex-shrink-0 ${
                    active
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-800'
                  }`}
                >
                  <IconComponent size={15} />
                </div>
                <span className="truncate">{mod.name}</span>
              </div>

              {isSpine && (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 flex-shrink-0">
                  Spine
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Rail */}
      <div
        className={`border-t border-slate-100 bg-slate-50/60 flex items-center transition-all ${
          isSidebarCollapsed ? 'p-2.5 justify-center' : 'p-3 justify-between'
        }`}
      >
        <Sparkles size={14} className="text-orange-500 flex-shrink-0" />
        {!isSidebarCollapsed && (
          <span className="text-[11px] font-medium text-slate-600 truncate ml-2">
            Machine House ETO Engine
          </span>
        )}
      </div>
    </aside>
  );
}
