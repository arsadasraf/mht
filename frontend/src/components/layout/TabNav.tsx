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
  LucideIcon
} from 'lucide-react';
import { getModuleBySlug } from '../../config/modules.config';
import { useAppSelector } from '../../store/hooks';
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

interface TabNavProps {
  moduleSlug: string;
}

export default function TabNav({ moduleSlug }: TabNavProps) {
  const pathname = usePathname();
  const { user } = useAppSelector((state) => state.auth);
  const accessibleTabs = getAccessibleTabsForModule(moduleSlug, user);

  if (accessibleTabs.length === 0) {
    return null;
  }

  return (
    <div className="hidden lg:block bg-white border-b border-slate-200 px-6 py-2.5 select-none">
      {/* Modern Button-Type Pill Tabs (Zero Line-Underline Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        {accessibleTabs.map((tab) => {
          const IconComponent = TAB_ICON_MAP[tab.icon] || Layers;
          const isActive = pathname === tab.path || pathname.startsWith(`${tab.path}/`);

          return (
            <Link
              key={tab.id}
              href={tab.path}
              className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-semibold transition-all relative whitespace-nowrap ${
                isActive
                  ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                  : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              <IconComponent
                size={14}
                className={isActive ? 'text-white' : 'text-slate-500'}
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
