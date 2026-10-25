'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  X,
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
  ChevronRight,
  LucideIcon
} from 'lucide-react';
import { CORE_MODULES } from '../../config/modules.config';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setMobileDrawerOpen } from '../../store/uiSlice';
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

export default function MobileModuleDrawer() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { isMobileDrawerOpen } = useAppSelector((state) => state.ui);

  const accessibleModules = getAccessibleModules(user);

  if (!isMobileDrawerOpen) return null;

  const closeDrawer = () => dispatch(setMobileDrawerOpen(false));

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex animate-in fade-in"
      onClick={closeDrawer}
    >
      <div
        className="w-[85%] max-w-[320px] h-full bg-white border-r border-slate-200 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Image
              src="/branding/mh_icon.png"
              alt="Machine House"
              width={28}
              height={28}
              className="object-contain"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-xs text-slate-900 leading-tight">
                MACHINE HOUSE
              </span>
              <span className="text-[10px] font-semibold text-orange-600 tracking-wider uppercase leading-tight">
                Winding Technologies
              </span>
            </div>
          </div>
          <button
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            onClick={closeDrawer}
            aria-label="Close Navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section Label */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Lifecycle Modules
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
            {accessibleModules.length} Modules
          </span>
        </div>

        {/* Un-numbered Module List */}
        <div className="flex-1 p-2 space-y-1">
          {accessibleModules.map((mod) => {
            const IconComponent = ICON_MAP[mod.icon] || Cpu;
            const isActive = pathname.startsWith(`/${mod.slug}`);

            return (
              <Link
                key={mod.id}
                href={mod.targetPath}
                className={`flex items-center justify-between p-2.5 rounded-lg text-xs transition-all ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 font-semibold border-l-4 border-orange-500'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                onClick={closeDrawer}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center ${
                      isActive ? 'bg-orange-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <IconComponent size={15} />
                  </div>
                  <div className="truncate">
                    <span className="truncate block font-medium">{mod.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {mod.isSpine && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                      Spine
                    </span>
                  )}
                  <ChevronRight size={15} className="text-slate-400" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
