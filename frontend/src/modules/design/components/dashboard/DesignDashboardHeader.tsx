'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  Layers,
  Calendar,
  FolderGit2
} from 'lucide-react';
import { useGetProjectsQuery } from '../../../project-setup/api/projectApi';
import SearchableSelect, { SearchableSelectOption } from '../../../../components/ui/SearchableSelect';

interface DesignDashboardHeaderProps {
  selectedProjectId?: string;
  onProjectChange?: (projectId: string) => void;
}

export default function DesignDashboardHeader({
  selectedProjectId = '',
  onProjectChange
}: DesignDashboardHeaderProps) {
  const pathname = usePathname();
  const { data: projectData } = useGetProjectsQuery({ approvedOnly: 'true' });
  const projects = projectData?.projects || [];

  const reportingDateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const SUB_TABS = [
    {
      id: 'engineer-performance',
      label: 'Engineer Performance',
      path: '/design/dashboard/engineer-performance',
      icon: Users
    },
    {
      id: 'activity-reports',
      label: 'Design Activity',
      path: '/design/dashboard/activity-reports',
      icon: Layers
    }
  ];

  const projectSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    return projects.map((p: any) => ({
      value: p.projectId,
      label: p.workOrderNumber || p.projectId,
      subLabel: `${p.customerName} • ${p.machineModel}`
    }));
  }, [projects]);

  return (
    <div className="space-y-4">
      {/* Top Banner with Industrial Identity & Project Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-amber-400 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0 shadow-xs">
            <Users size={22} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              Design & Mechanical Engineering Dashboard
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Universal Keyword-Searchable Project Selector */}
          {onProjectChange && (
            <SearchableSelect
              label="Work Order"
              value={selectedProjectId}
              onChange={(val) => onProjectChange(val === 'ALL' ? '' : val)}
              options={projectSelectOptions}
              allOptionLabel="All Projects"
              placeholder="Search Work Order..."
              icon={FolderGit2}
              className="w-56 sm:w-64"
            />
          )}

          {/* Date Chip */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">
            <Calendar size={14} className="text-orange-500" />
            <span>{reportingDateStr}</span>
          </div>
        </div>
      </div>

      {/* Button-Type Pill Sub-Tabs (Strictly Zero Line-Underline Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.path || pathname.startsWith(`${tab.path}/`);

          return (
            <Link
              key={tab.id}
              href={tab.path}
              className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
