'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
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
  MoreHorizontal,
  LucideIcon
} from 'lucide-react';
import { getModuleBySlug } from '../../config/modules.config';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleMoreSheet } from '../../store/uiSlice';
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

interface BottomTabBarProps {
  moduleSlug: string;
}

export default function BottomTabBar({ moduleSlug }: BottomTabBarProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const tabs = getAccessibleTabsForModule(moduleSlug, user);
  if (tabs.length === 0) return null;

  const maxDirectTabs = 4;
  const showMoreButton = tabs.length > maxDirectTabs;
  const displayedTabs = showMoreButton ? tabs.slice(0, 3) : tabs;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 select-none pb-[env(safe-area-inset-bottom,0px)] shadow-lg"
      aria-label="Mobile Bottom Tab Navigation"
    >
      <div className="flex items-center justify-around h-14 px-2">
        {displayedTabs.map((tab) => {
          const IconComponent = TAB_ICON_MAP[tab.icon] || Layers;
          const isActive = pathname === tab.path || pathname.startsWith(`${tab.path}/`);

          return (
            <Link
              key={tab.id}
              href={tab.path}
              className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all active:scale-95 ${
                isActive ? 'text-orange-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <IconComponent size={19} />
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                {tab.label.split(' ')[0]}
              </span>
              {isActive && (
                <div className="absolute top-0 w-6 h-0.5 bg-orange-500 rounded-b shadow-sm" />
              )}
            </Link>
          );
        })}

        {showMoreButton && (
          <button
            onClick={() => dispatch(toggleMoreSheet())}
            className="flex flex-col items-center justify-center flex-1 h-full text-slate-500 hover:text-slate-800 active:scale-95"
            aria-label="View more tabs in this module"
          >
            <MoreHorizontal size={19} />
            <span className="text-[10px] mt-0.5 tracking-tight">More</span>
          </button>
        )}
      </div>
    </nav>
  );
}
