'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  RotateCcw,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  X,
  FileCode2,
  Filter,
  Users,
  FolderGit2,
  PackageCheck,
  Check
} from 'lucide-react';
import DesignDashboardHeader from './DesignDashboardHeader';
import { useGetProjectsQuery } from '../../../project-setup/api/projectApi';
import { useGetDesignTeamUsersQuery } from '../../api/designApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../../components/ui/ExcelColumnFilter';
import SearchableSelect, { SearchableSelectOption } from '../../../../components/ui/SearchableSelect';
import WorkOrderBomBadge from '../../../../components/ui/WorkOrderBomBadge';

interface SubStageActivityItem {
  id: string;
  subStageCode: string;
  title: string;
  status: string;
  progressPercent: number;
  assignedToUserId: string | null;
  assignedToName: string;
  assignedToEmail: string;
  targetDate: string | null;
  actualCompletionDate: string | null;
  isOverdue: boolean;
  daysLeft: number | null;
  remarks: string;
  priority: string;
  projectId: string;
  workOrderNumber: string;
  customerName: string;
  machineModel: string;
  milestoneTitle: string;
  bomAttached?: boolean;
  bomStatus?: string;
  isBomLocked?: boolean;
  attachedDrawingsCount?: number;
}

export default function ActivityReportsSubTab() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [engineerFilter, setEngineerFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewSubStage, setPreviewSubStage] = useState<SubStageActivityItem | null>(null);

  // Column filters state
  const [columnFilters, setColumnFilters] = useState<Record<string, string[] | null>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Queries
  const { data: projectData, isLoading: isProjectsLoading } = useGetProjectsQuery({ approvedOnly: 'true' });
  const { data: teamData, isLoading: isTeamLoading } = useGetDesignTeamUsersQuery();

  const projects = useMemo(() => projectData?.projects || [], [projectData]);
  const teamUsers = useMemo(() => teamData?.users || [], [teamData]);

  // Extract all sub-stages across all active projects
  const allSubStages = useMemo<SubStageActivityItem[]>(() => {
    const list: SubStageActivityItem[] = [];
    const now = new Date();

    projects.forEach((proj: any) => {
      const milestones = Array.isArray(proj.milestones) ? proj.milestones : [];
      milestones.forEach((m: any) => {
        const subStages = Array.isArray(m.subStages) ? m.subStages : [];
        subStages.forEach((sub: any) => {
          const targetDateObj = sub.targetDate ? new Date(sub.targetDate) : null;
          const status = String(sub.status || 'NOT_STARTED').toUpperCase();
          const isOverdue = Boolean(targetDateObj && targetDateObj < now && status !== 'COMPLETED');
          const daysLeft = targetDateObj
            ? Math.ceil((targetDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;

          const remarksText = Array.isArray(sub.remarks)
            ? sub.remarks.map((r: any) => (typeof r === 'string' ? r : r.text)).join('; ')
            : sub.remarks || sub.notes || '';

          list.push({
            id: sub.id || `${proj.projectId}-${sub.title}`,
            subStageCode: sub.stageCode || sub.code || 'SUB-STG',
            title: sub.title || 'Design Activity',
            status,
            progressPercent: Number(sub.progressPercent) || (status === 'COMPLETED' ? 100 : 0),
            assignedToUserId: sub.assignedToUserId || null,
            assignedToName: sub.assignedToName || 'Unassigned',
            assignedToEmail: sub.assignedToEmail || '',
            targetDate: sub.targetDate || null,
            actualCompletionDate: sub.actualCompletionDate || null,
            isOverdue,
            daysLeft,
            remarks: remarksText,
            priority: (sub.priority || 'MEDIUM').toUpperCase(),
            projectId: proj.projectId,
            workOrderNumber: proj.workOrderNumber || proj.projectId,
            customerName: proj.customerName || 'Customer',
            machineModel: proj.machineModel || 'Machine Unit',
            milestoneTitle: m.title || 'Design & Engineering',
            bomAttached: proj.bomAttached,
            bomStatus: proj.bomStatus,
            isBomLocked: proj.isBomLocked,
            attachedDrawingsCount: proj.attachedDrawingsCount
          });
        });
      });
    });

    return list;
  }, [projects]);

  // Aggregate Activity KPIs
  const activityKpis = useMemo(() => {
    const total = allSubStages.length;
    let completed = 0;
    let inProgress = 0;
    let underReview = 0;
    let notStarted = 0;
    let overdue = 0;
    let progressSum = 0;

    allSubStages.forEach((s) => {
      progressSum += s.progressPercent;
      if (s.status === 'COMPLETED') completed++;
      else if (s.status === 'IN_PROGRESS') inProgress++;
      else if (s.status === 'REVIEW' || s.status === 'UNDER_REVIEW') underReview++;
      else notStarted++;

      if (s.isOverdue) overdue++;
    });

    const avgProgress = total > 0 ? Math.round(progressSum / total) : 0;

    return {
      total,
      completed,
      inProgress,
      underReview,
      notStarted,
      overdue,
      avgProgress
    };
  }, [allSubStages]);

  // Engineer Filter Options for SearchableSelect
  const engineerFilterOptions = useMemo<SearchableSelectOption[]>(() => {
    const names = Array.from(new Set(allSubStages.map((s) => s.assignedToName).filter(Boolean)));
    return names.map((name) => ({
      value: name,
      label: name,
      subLabel: 'Design Squad'
    }));
  }, [allSubStages]);

  // Status Filter Options for SearchableSelect
  const statusFilterOptions: SearchableSelectOption[] = [
    { value: 'NOT_STARTED', label: 'Not Started', badge: 'Draft' },
    { value: 'IN_PROGRESS', label: 'In Progress', badge: 'Active' },
    { value: 'REVIEW', label: 'Under Review', badge: 'QC' },
    { value: 'COMPLETED', label: 'Completed', badge: 'Done' }
  ];

  // Distinct values for ExcelColumnFilter
  const distinctWorkOrders = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    allSubStages.forEach((s) => counts.set(s.workOrderNumber, (counts.get(s.workOrderNumber) || 0) + 1));
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [allSubStages]);

  const distinctTitles = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    allSubStages.forEach((s) => counts.set(s.title, (counts.get(s.title) || 0) + 1));
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [allSubStages]);

  const distinctEngineers = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    allSubStages.forEach((s) => counts.set(s.assignedToName, (counts.get(s.assignedToName) || 0) + 1));
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [allSubStages]);

  const distinctStatuses = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    allSubStages.forEach((s) => counts.set(s.status, (counts.get(s.status) || 0) + 1));
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [allSubStages]);

  const distinctModels = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    allSubStages.forEach((s) => counts.set(s.machineModel, (counts.get(s.machineModel) || 0) + 1));
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [allSubStages]);

  // Filtered & Sorted Sub-Stages
  const filteredSubStages = useMemo(() => {
    let result = [...allSubStages];

    // Project Filter (from header)
    if (selectedProjectId) {
      result = result.filter(
        (s) => s.projectId === selectedProjectId || s.workOrderNumber === selectedProjectId
      );
    }

    // Status Filter (from toolbar)
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'REVIEW') {
        result = result.filter((s) => s.status === 'REVIEW' || s.status === 'UNDER_REVIEW');
      } else {
        result = result.filter((s) => s.status === statusFilter);
      }
    }

    // Engineer Filter (from toolbar)
    if (engineerFilter !== 'ALL') {
      result = result.filter((s) => s.assignedToName.toLowerCase() === engineerFilter.toLowerCase());
    }

    // Global Search Bar
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.subStageCode.toLowerCase().includes(q) ||
          s.workOrderNumber.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.assignedToName.toLowerCase().includes(q) ||
          s.machineModel.toLowerCase().includes(q)
      );
    }

    // Column Filters (Excel style)
    if (columnFilters.workOrderNumber && columnFilters.workOrderNumber.length > 0) {
      result = result.filter((s) => columnFilters.workOrderNumber!.includes(s.workOrderNumber));
    }
    if (columnFilters.title && columnFilters.title.length > 0) {
      result = result.filter((s) => columnFilters.title!.includes(s.title));
    }
    if (columnFilters.assignedToName && columnFilters.assignedToName.length > 0) {
      result = result.filter((s) => columnFilters.assignedToName!.includes(s.assignedToName));
    }
    if (columnFilters.status && columnFilters.status.length > 0) {
      result = result.filter((s) => columnFilters.status!.includes(s.status));
    }
    if (columnFilters.machineModel && columnFilters.machineModel.length > 0) {
      result = result.filter((s) => columnFilters.machineModel!.includes(s.machineModel));
    }

    // Sorting
    if (sortConfig) {
      result.sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [
    allSubStages,
    selectedProjectId,
    statusFilter,
    engineerFilter,
    searchTerm,
    columnFilters,
    sortConfig
  ]);

  const isFiltered = Boolean(
    searchTerm.trim() ||
      selectedProjectId ||
      statusFilter !== 'ALL' ||
      engineerFilter !== 'ALL' ||
      Object.values(columnFilters).some((arr) => arr && arr.length > 0)
  );

  const handleResetFilters = () => {
    setSelectedProjectId('');
    setStatusFilter('ALL');
    setEngineerFilter('ALL');
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig(null);
  };

  const isLoading = isProjectsLoading || isTeamLoading;

  return (
    <div className="space-y-6">
      {/* Top Header Banner with Project Selector */}
      <DesignDashboardHeader
        selectedProjectId={selectedProjectId}
        onProjectChange={(pid) => setSelectedProjectId(pid)}
      />

      {/* Aggregate Activity KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Sub-Stages</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{activityKpis.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across active projects</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Completed</div>
          <div className="text-xl font-extrabold text-emerald-700 mt-1">{activityKpis.completed}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5 font-bold">Finished activities</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">In Progress</div>
          <div className="text-xl font-extrabold text-orange-600 mt-1">{activityKpis.inProgress}</div>
          <div className="text-[10px] text-orange-600 mt-0.5 font-bold">Active designing</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Under Review</div>
          <div className="text-xl font-extrabold text-sky-600 mt-1">{activityKpis.underReview}</div>
          <div className="text-[10px] text-sky-600 mt-0.5 font-bold">Awaiting sign-off</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Overdue</div>
          <div className="text-xl font-extrabold text-red-600 mt-1">{activityKpis.overdue}</div>
          <div className="text-[10px] text-red-600 mt-0.5 font-bold">Past target date</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Average Progress</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{activityKpis.avgProgress}%</div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden border border-slate-200">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${activityKpis.avgProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Dedicated Toolbar (AGENTS.md Universal Table Architecture) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Dedicated Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sub-stages, code, work order, engineer..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Center / Right Filters & Reset */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <SearchableSelect
            label="Status"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={statusFilterOptions}
            allOptionLabel="All Statuses"
            placeholder="Filter status..."
            className="w-40 sm:w-44"
          />

          {/* Engineer Filter */}
          <SearchableSelect
            label="Engineer"
            value={engineerFilter}
            onChange={(val) => setEngineerFilter(val)}
            options={engineerFilterOptions}
            allOptionLabel="All Engineers"
            placeholder="Filter engineer..."
            icon={Users}
            className="w-44 sm:w-52"
          />

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              title="Reset all filters"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Stages Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            Loading design activity sub-stages...
          </div>
        ) : filteredSubStages.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Layers size={36} className="mx-auto text-slate-300" />
            <div className="text-sm font-extrabold text-slate-700">No Sub-Stages Found</div>
            <div className="text-xs text-slate-400">
              {isFiltered ? 'No sub-stages match the filter criteria.' : 'No design sub-stages created yet.'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-left">#</th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Work Order & Customer"
                      columnKey="workOrderNumber"
                      distinctValues={distinctWorkOrders}
                      selectedValues={columnFilters.workOrderNumber}
                      currentSortDirection={sortConfig?.key === 'workOrderNumber' ? sortConfig.direction : undefined}
                      onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, workOrderNumber: vals }))}
                      onSortChange={(field, dir) => setSortConfig({ key: field, direction: dir })}
                    />
                  </th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Sub-Stage Title & Code"
                      columnKey="title"
                      distinctValues={distinctTitles}
                      selectedValues={columnFilters.title}
                      currentSortDirection={sortConfig?.key === 'title' ? sortConfig.direction : undefined}
                      onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, title: vals }))}
                      onSortChange={(field, dir) => setSortConfig({ key: field, direction: dir })}
                    />
                  </th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Machine Model"
                      columnKey="machineModel"
                      distinctValues={distinctModels}
                      selectedValues={columnFilters.machineModel}
                      currentSortDirection={sortConfig?.key === 'machineModel' ? sortConfig.direction : undefined}
                      onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, machineModel: vals }))}
                      onSortChange={(field, dir) => setSortConfig({ key: field, direction: dir })}
                    />
                  </th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Assigned Engineer"
                      columnKey="assignedToName"
                      distinctValues={distinctEngineers}
                      selectedValues={columnFilters.assignedToName}
                      currentSortDirection={sortConfig?.key === 'assignedToName' ? sortConfig.direction : undefined}
                      onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, assignedToName: vals }))}
                      onSortChange={(field, dir) => setSortConfig({ key: field, direction: dir })}
                    />
                  </th>
                  <th className="py-3 px-4 text-left">Target Date</th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Status"
                      columnKey="status"
                      distinctValues={distinctStatuses}
                      selectedValues={columnFilters.status}
                      currentSortDirection={sortConfig?.key === 'status' ? sortConfig.direction : undefined}
                      onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, status: vals }))}
                      onSortChange={(field, dir) => setSortConfig({ key: field, direction: dir })}
                    />
                  </th>
                  <th className="py-3 px-4 text-center">Progress</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubStages.map((sub, idx) => {
                  const isDone = sub.status === 'COMPLETED';
                  const inProg = sub.status === 'IN_PROGRESS';
                  const isRev = sub.status === 'REVIEW' || sub.status === 'UNDER_REVIEW';

                  return (
                    <tr key={sub.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setPreviewSubStage(sub)}
                            className="font-mono font-extrabold text-orange-600 hover:underline text-left"
                          >
                            {sub.workOrderNumber}
                          </button>
                          <WorkOrderBomBadge
                            isBomLocked={sub.isBomLocked}
                            bomStatus={sub.bomStatus}
                            bomAttached={sub.bomAttached}
                            attachedDrawingsCount={sub.attachedDrawingsCount}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[170px] mt-0.5">
                          {sub.customerName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{sub.title}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{sub.subStageCode}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <span className="truncate max-w-[150px] inline-block">{sub.machineModel}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {sub.assignedToName !== 'Unassigned' ? (
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-orange-200">
                              {sub.assignedToName.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate">{sub.assignedToName}</div>
                              {sub.assignedToEmail && (
                                <div className="text-[10px] text-slate-400 truncate">{sub.assignedToEmail}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {sub.targetDate ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-800">
                              {new Date(sub.targetDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            {sub.isOverdue ? (
                              <span className="inline-block text-[9px] font-extrabold text-red-700 bg-red-50 px-1.5 rounded border border-red-200">
                                Overdue by {Math.abs(sub.daysLeft || 0)}d
                              </span>
                            ) : sub.daysLeft !== null && sub.daysLeft <= 14 ? (
                              <span className="inline-block text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 rounded border border-amber-200">
                                {sub.daysLeft}d left
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">{sub.daysLeft}d left</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">TBD</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : inProg
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : isRev
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {sub.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="w-28 mx-auto space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-600">{sub.progressPercent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-orange-500 rounded-full transition-all duration-300"
                              style={{ width: `${sub.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setPreviewSubStage(sub)}
                          className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                          title="Preview Sub-Stage Dossier"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SUB-STAGE PREVIEW DOSSIER MODAL (AGENTS.md Standard Action Form Token) */}
      {previewSubStage && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe (AGENTS.md mandate) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold flex items-center gap-2">
                    <span>{previewSubStage.title}</span>
                    <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                      {previewSubStage.subStageCode}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    {previewSubStage.workOrderNumber} • {previewSubStage.customerName}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewSubStage(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Work Order</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono font-extrabold text-sm text-slate-900">
                      {previewSubStage.workOrderNumber}
                    </span>
                    <WorkOrderBomBadge
                      isBomLocked={previewSubStage.isBomLocked}
                      bomStatus={previewSubStage.bomStatus}
                      bomAttached={previewSubStage.bomAttached}
                      attachedDrawingsCount={previewSubStage.attachedDrawingsCount}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{previewSubStage.customerName}</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Machine Model</div>
                  <div className="font-extrabold text-sm text-slate-900 mt-1">{previewSubStage.machineModel}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{previewSubStage.milestoneTitle}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Status</div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border mt-1 ${
                      previewSubStage.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : previewSubStage.status === 'IN_PROGRESS'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : previewSubStage.status === 'REVIEW' || previewSubStage.status === 'UNDER_REVIEW'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {previewSubStage.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned Engineer</div>
                  <div className="font-extrabold text-slate-900 mt-1">{previewSubStage.assignedToName}</div>
                  {previewSubStage.assignedToEmail && (
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {previewSubStage.assignedToEmail}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Target Date</div>
                  <div className="font-mono font-extrabold text-slate-900 mt-1">
                    {previewSubStage.targetDate
                      ? new Date(previewSubStage.targetDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : 'TBD'}
                  </div>
                  {previewSubStage.isOverdue && (
                    <div className="text-[10px] font-bold text-red-600 mt-0.5">
                      Overdue by {Math.abs(previewSubStage.daysLeft || 0)}d
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Sub-Stage Execution Progress</span>
                  <span className="text-orange-600 font-extrabold">{previewSubStage.progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${previewSubStage.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Remarks / Latest Notes */}
              {previewSubStage.remarks && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Remarks & Notes</div>
                  <div className="text-xs text-slate-700 leading-relaxed">{previewSubStage.remarks}</div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setPreviewSubStage(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
