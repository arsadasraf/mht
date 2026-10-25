'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X,
  Users,
  KeyRound,
  FileSearch,
  Inbox,
  FileSpreadsheet,
  FolderGit2,
  CalendarCheck,
  Layers,
  FileCode2,
  AlertTriangle,
  Receipt,
  IndianRupee,
  Calculator,
  Building2,
  ShieldCheck,
  CheckSquare,
  PackageSearch,
  Lock,
  Kanban,
  Activity,
  CheckCircle2,
  LifeBuoy,
  PieChart,
  Settings,
  LucideIcon
} from 'lucide-react';
import { getModuleBySlug } from '../../config/modules.config';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setMoreSheetOpen } from '../../store/uiSlice';
import { getAccessibleTabsForModule } from '../../utils/rbac';

const TAB_ICON_MAP: Record<string, LucideIcon> = {
  Users,
  KeyRound,
  FileSearch,
  Inbox,
  FileSpreadsheet,
  FolderGit2,
  CalendarCheck,
  Layers,
  FileCode2,
  AlertTriangle,
  Receipt,
  IndianRupee,
  Calculator,
  Building2,
  ShieldCheck,
  CheckSquare,
  PackageSearch,
  Lock,
  Kanban,
  Activity,
  CheckCircle2,
  LifeBuoy,
  PieChart,
  Settings
};

interface MoreSheetProps {
  moduleSlug: string;
}

export default function MoreSheet({ moduleSlug }: MoreSheetProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { isMoreSheetOpen } = useAppSelector((state) => state.ui);
  const currentModule = getModuleBySlug(moduleSlug);

  const allowedTabs = getAccessibleTabsForModule(moduleSlug, user);
  const remainingTabs = allowedTabs.slice(3);

  if (!isMoreSheetOpen || remainingTabs.length === 0) return null;

  const closeSheet = () => dispatch(setMoreSheetOpen(false));

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end animate-in fade-in"
      onClick={closeSheet}
    >
      <div
        className="w-full bg-white border-t border-slate-200 rounded-t-2xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            {currentModule.name} — Additional Views
          </span>
          <button
            onClick={closeSheet}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {remainingTabs.map((tab) => {
            const IconComponent = TAB_ICON_MAP[tab.icon] || Layers;
            const isActive = pathname === tab.path || pathname.startsWith(`${tab.path}/`);

            return (
              <Link
                key={tab.id}
                href={tab.path}
                className={`flex items-center gap-3 p-3 rounded-lg text-xs transition-all ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 font-semibold border border-orange-200'
                    : 'text-slate-700 bg-slate-50 hover:bg-slate-100'
                }`}
                onClick={closeSheet}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center ${
                    isActive ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  <IconComponent size={15} />
                </div>
                <span className="font-medium truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
