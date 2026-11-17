'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  RotateCcw,
  LayoutGrid,
  List,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Calendar,
  X,
  FileCode2,
  ArrowUpDown,
  Mail,
  ShieldCheck,
  Award
} from 'lucide-react';
import DesignDashboardHeader from './DesignDashboardHeader';
import { useGetProjectsQuery } from '../../../project-setup/api/projectApi';
import { useGetDesignTeamUsersQuery } from '../../api/designApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../../components/ui/ExcelColumnFilter';
import WorkOrderBomBadge from '../../../../components/ui/WorkOrderBomBadge';

interface EngineerMetric {
  userId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  totalAssigned: number;
  completed: number;
  inProgress: number;
  underReview: number;
  notStarted: number;
  overdue: number;
  avgProgress: number;
  onTimeRate: number;
  subStages: Array<{
    id: string;
    subStageCode: string;
    title: string;
    status: string;
    progressPercent: number;
    targetDate: string | null;
    isOverdue: boolean;
    daysLeft: number | null;
    remarks: string;
    projectId: string;
    workOrderNumber: string;
    customerName: string;
    machineModel: string;
    bomAttached?: boolean;
    bomStatus?: string;
    isBomLocked?: boolean;
    attachedDrawingsCount?: number;
  }>;
}

export default function EngineerPerformanceSubTab() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEngineer, setSelectedEngineer] = useState<EngineerMetric | null>(null);

  // Column filters state for dense table
  const [columnFilters, setColumnFilters] = useState<Record<string, string[] | null>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Queries
  const { data: projectData, isLoading: isProjectsLoading } = useGetProjectsQuery({ approvedOnly: 'true' });
  const { data: teamData, isLoading: isTeamLoading } = useGetDesignTeamUsersQuery();

  const projects = useMemo(() => projectData?.projects || [], [projectData]);
  const teamUsers = useMemo(() => teamData?.users || [], [teamData]);

  // Compute Engineer Performance from all active sub-stages
  const engineerMetrics = useMemo<EngineerMetric[]>(() => {
    const now = new Date();
    const userMap = new Map<string, EngineerMetric>();

    // Seed all team users from Master
    teamUsers.forEach((u: any) => {
      const uId = String(u.id || u._id || '').trim();
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email || 'Design Engineer';
      if (uId) {
        userMap.set(uId, {
          userId: uId,
          name: fullName,
          email: u.email || '',
          role: u.role || 'Design Engineer',
          department: u.department || 'Mechanical Design',
          totalAssigned: 0,
          completed: 0,
          inProgress: 0,
          underReview: 0,
          notStarted: 0,
          overdue: 0,
          avgProgress: 0,
          onTimeRate: 100,
          subStages: []
        });
      }
    });

    // Filter projects if selectedProjectId is set
    const activeProjects = selectedProjectId
      ? projects.filter((p: any) => p.projectId === selectedProjectId || p.workOrderNumber === selectedProjectId)
      : projects;

    // Iterate through all projects and milestones
    activeProjects.forEach((proj: any) => {
      const milestones = Array.isArray(proj.milestones) ? proj.milestones : [];
      milestones.forEach((m: any) => {
        const subStages = Array.isArray(m.subStages) ? m.subStages : [];
        subStages.forEach((sub: any) => {
          const assignedId = String(sub.assignedToUserId || '').trim();
          const assignedName = sub.assignedToName || 'Unassigned';

          // Ensure entry exists in userMap
          if (assignedId && !userMap.has(assignedId)) {
            userMap.set(assignedId, {
              userId: assignedId,
              name: assignedName,
              email: sub.assignedToEmail || '',
              role: 'Design Engineer',
              department: 'Mechanical Design',
              totalAssigned: 0,
              completed: 0,
              inProgress: 0,
              underReview: 0,
              notStarted: 0,
              overdue: 0,
              avgProgress: 0,
              onTimeRate: 100,
              subStages: []
            });
          }

          const targetDateObj = sub.targetDate ? new Date(sub.targetDate) : null;
          const isOverdue = Boolean(targetDateObj && targetDateObj < now && sub.status !== 'COMPLETED');
          const daysLeft = targetDateObj
            ? Math.ceil((targetDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;

          const remarksText = Array.isArray(sub.remarks)
            ? sub.remarks.map((r: any) => (typeof r === 'string' ? r : r.text)).join('; ')
            : sub.remarks || sub.notes || '';

          const subStageItem = {
            id: sub.id || `${proj.projectId}-${sub.title}`,
            subStageCode: sub.stageCode || sub.code || 'SUB-STG',
            title: sub.title || 'Design Activity',
            status: String(sub.status || 'NOT_STARTED').toUpperCase(),
            progressPercent: Number(sub.progressPercent) || (sub.status === 'COMPLETED' ? 100 : 0),
            targetDate: sub.targetDate || null,
            isOverdue,
            daysLeft,
            remarks: remarksText,
            projectId: proj.projectId,
            workOrderNumber: proj.workOrderNumber || proj.projectId,
            customerName: proj.customerName || 'Customer',
            machineModel: proj.machineModel || 'Machine Unit',
            bomAttached: proj.bomAttached,
            bomStatus: proj.bomStatus,
            isBomLocked: proj.isBomLocked,
            attachedDrawingsCount: proj.attachedDrawingsCount
          };

          if (assignedId && userMap.has(assignedId)) {
            const entry = userMap.get(assignedId)!;
            entry.totalAssigned++;
            if (subStageItem.status === 'COMPLETED') entry.completed++;
            else if (subStageItem.status === 'IN_PROGRESS') entry.inProgress++;
            else if (subStageItem.status === 'REVIEW' || subStageItem.status === 'UNDER_REVIEW') entry.underReview++;
            else entry.notStarted++;

            if (isOverdue) entry.overdue++;
            entry.subStages.push(subStageItem);
          }
        });
      });
    });

    // Compute progress & on-time rates
    const list = Array.from(userMap.values()).map((eng) => {
      const sumProg = eng.subStages.reduce((acc, s) => acc + s.progressPercent, 0);
      const avgProg = eng.totalAssigned > 0 ? Math.round(sumProg / eng.totalAssigned) : 0;
      const onTimeRate =
        eng.completed > 0
          ? Math.max(0, Math.round(((eng.completed - eng.overdue) / eng.completed) * 100))
          : eng.totalAssigned > 0
          ? Math.max(0, 100 - Math.round((eng.overdue / eng.totalAssigned) * 100))
          : 100;

      return {
        ...eng,
        avgProgress: avgProg,
        onTimeRate
      };
    });

    // Sort by total assigned descending, then completed descending
    return list.sort((a, b) => b.totalAssigned - a.totalAssigned || b.completed - a.completed);
  }, [projects, teamUsers, selectedProjectId]);

  // Aggregate Team KPIs
  const teamKpis = useMemo(() => {
    let totalAssigned = 0;
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;
    let totalProgressSum = 0;

    engineerMetrics.forEach((m) => {
      totalAssigned += m.totalAssigned;
      completed += m.completed;
      inProgress += m.inProgress;
      overdue += m.overdue;
      totalProgressSum += m.avgProgress;
    });

    const activeCount = engineerMetrics.filter((m) => m.totalAssigned > 0).length;
    const avgTeamProgress =
      engineerMetrics.length > 0 ? Math.round(totalProgressSum / engineerMetrics.length) : 0;
    const onTimeRate =
      completed > 0
        ? Math.max(0, Math.round(((completed - overdue) / completed) * 100))
        : 100;

    return {
      activeEngineers: activeCount,
      totalEngineers: engineerMetrics.length,
      totalAssigned,
      completed,
      inProgress,
      overdue,
      avgTeamProgress,
      onTimeRate
    };
  }, [engineerMetrics]);

  // Distinct values for ExcelColumnFilter
  const distinctNames = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    engineerMetrics.forEach((e) => counts.set(e.name, (counts.get(e.name) || 0) + 1));
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [engineerMetrics]);

  const distinctRoles = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    engineerMetrics.forEach((e) => counts.set(e.role, (counts.get(e.role) || 0) + 1));
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [engineerMetrics]);

  // Filtered and Sorted engineers
  const filteredEngineers = useMemo(() => {
    let result = [...engineerMetrics];

    // Global keyword search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q)
      );
    }

    // Excel Column Filters
    if (columnFilters.name && columnFilters.name.length > 0) {
      result = result.filter((e) => columnFilters.name!.includes(e.name));
    }
    if (columnFilters.role && columnFilters.role.length > 0) {
      result = result.filter((e) => columnFilters.role!.includes(e.role));
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
  }, [engineerMetrics, searchTerm, columnFilters, sortConfig]);

  const isFiltered = Boolean(
    searchTerm.trim() || Object.values(columnFilters).some((arr) => arr && arr.length > 0)
  );

  const handleResetFilters = () => {
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

      {/* Aggregate Team Performance KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Design Engineers</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {teamKpis.activeEngineers} <span className="text-xs font-normal text-slate-500">/ {teamKpis.totalEngineers}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active squad members</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Sub-Stages</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{teamKpis.totalAssigned}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Assigned tasks</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Completed</div>
          <div className="text-xl font-extrabold text-emerald-700 mt-1">{teamKpis.completed}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5 font-bold">Finished sub-stages</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">In Progress</div>
          <div className="text-xl font-extrabold text-orange-600 mt-1">{teamKpis.inProgress}</div>
          <div className="text-[10px] text-orange-600 mt-0.5 font-bold">Currently ongoing</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Overdue</div>
          <div className="text-xl font-extrabold text-red-600 mt-1">{teamKpis.overdue}</div>
          <div className="text-[10px] text-red-600 mt-0.5 font-bold">Need attention</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Avg Team Progress</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{teamKpis.avgTeamProgress}%</div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden border border-slate-200">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${teamKpis.avgTeamProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Dedicated Toolbar (AGENTS.md Universal Table Architecture) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Side: Dedicated Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search engineer by name, role, email..."
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

        {/* Right Side: View Mode Toggle & Reset Button */}
        <div className="flex items-center gap-2 shrink-0">
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              title="Reset all filters"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}

          {/* Toggle between Card Grid and Dense Table */}
          <div className="inline-flex p-1 bg-slate-200/70 rounded-xl border border-slate-300/60">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'GRID'
                  ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'TABLE'
                  ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title="Dense Table View"
            >
              <List size={14} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
          Loading engineer performance metrics...
        </div>
      ) : filteredEngineers.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <Users size={36} className="mx-auto text-slate-300" />
          <div className="text-sm font-extrabold text-slate-700">No Engineers Found</div>
          <div className="text-xs text-slate-400">
            {isFiltered ? 'No engineers match the filter criteria.' : 'No design team members configured.'}
          </div>
        </div>
      ) : viewMode === 'GRID' ? (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEngineers.map((eng) => {
            const initials = eng.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'EN';

            return (
              <div
                key={eng.userId}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                {/* Header Profile */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-700 font-extrabold text-sm flex items-center justify-center shrink-0 border border-orange-200 shadow-2xs">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-slate-900 truncate">{eng.name}</h3>
                      <div className="text-[11px] font-semibold text-slate-500 truncate">{eng.role}</div>
                      {eng.email && (
                        <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <Mail size={10} className="shrink-0" />
                          <span>{eng.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                      eng.totalAssigned > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {eng.totalAssigned > 0 ? `${eng.totalAssigned} Active` : 'Available'}
                  </span>
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-slate-100">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Assigned</div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">{eng.totalAssigned}</div>
                  </div>
                  <div className="p-2 bg-emerald-50/70 rounded-xl">
                    <div className="text-[9px] font-bold text-emerald-600 uppercase">Done</div>
                    <div className="text-sm font-extrabold text-emerald-700 mt-0.5">{eng.completed}</div>
                  </div>
                  <div className="p-2 bg-orange-50/70 rounded-xl">
                    <div className="text-[9px] font-bold text-orange-600 uppercase">Ongoing</div>
                    <div className="text-sm font-extrabold text-orange-700 mt-0.5">{eng.inProgress}</div>
                  </div>
                  <div className="p-2 bg-red-50/70 rounded-xl">
                    <div className="text-[9px] font-bold text-red-600 uppercase">Overdue</div>
                    <div className="text-sm font-extrabold text-red-700 mt-0.5">{eng.overdue}</div>
                  </div>
                </div>

                {/* Progress Bar & On-Time Rating */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600">Average Completion</span>
                    <span className="text-orange-600 font-extrabold">{eng.avgProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-300"
                      style={{ width: `${eng.avgProgress}%` }}
                    />
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <Award size={13} className="text-amber-500" />
                    <span>{eng.onTimeRate}% On-Time</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEngineer(eng)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Eye size={13} />
                    <span>Portfolio ({eng.subStages.length})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DENSE TABLE VIEW (AGENTS.md Mandate with ExcelColumnFilters) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-left">#</th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Engineer Name"
                      columnKey="name"
                      distinctValues={distinctNames}
                      selectedValues={columnFilters.name}
                      currentSortDirection={sortConfig?.key === 'name' ? sortConfig.direction : undefined}
                      onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, name: vals }))}
                      onSortChange={(field, dir) => setSortConfig({ key: field, direction: dir })}
                    />
                  </th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Role / Designation"
                      columnKey="role"
                      distinctValues={distinctRoles}
                      selectedValues={columnFilters.role}
                      currentSortDirection={sortConfig?.key === 'role' ? sortConfig.direction : undefined}
                      onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, role: vals }))}
                      onSortChange={(field, dir) => setSortConfig({ key: field, direction: dir })}
                    />
                  </th>
                  <th className="py-3 px-4 text-center">Assigned</th>
                  <th className="py-3 px-4 text-center">Completed</th>
                  <th className="py-3 px-4 text-center">In Progress</th>
                  <th className="py-3 px-4 text-center">Under Review</th>
                  <th className="py-3 px-4 text-center">Overdue</th>
                  <th className="py-3 px-4 text-center">On-Time Rate</th>
                  <th className="py-3 px-4 text-center">Avg Progress</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEngineers.map((eng, idx) => {
                  const initials = eng.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'EN';

                  return (
                    <tr key={eng.userId || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 font-extrabold text-xs flex items-center justify-center shrink-0 border border-orange-200">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 truncate">{eng.name}</div>
                            {eng.email && (
                              <div className="text-[10px] text-slate-400 truncate">{eng.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{eng.role}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-extrabold text-slate-900">
                        {eng.totalAssigned}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {eng.completed}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-50 text-orange-700 border border-orange-200">
                          {eng.inProgress}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                          {eng.underReview}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {eng.overdue > 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                            {eng.overdue}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                        {eng.onTimeRate}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="w-28 mx-auto space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-600">{eng.avgProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-orange-500 rounded-full transition-all duration-300"
                              style={{ width: `${eng.avgProgress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedEngineer(eng)}
                          className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                          title="View Assigned Sub-Stages"
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
        </div>
      )}

      {/* ENGINEER SUB-STAGES PORTFOLIO MODAL (AGENTS.md Standard Action Form Token) */}
      {selectedEngineer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe (AGENTS.md mandate) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center font-extrabold text-sm shrink-0">
                  {selectedEngineer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold flex items-center gap-2">
                    <span>{selectedEngineer.name}</span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      {selectedEngineer.role}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-500">
                    {selectedEngineer.email || 'Design Engineering Squad'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEngineer(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Sub-Stages</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {selectedEngineer.totalAssigned}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">Completed</div>
                  <div className="text-base font-extrabold text-emerald-800 mt-0.5">
                    {selectedEngineer.completed}
                  </div>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="text-[10px] font-bold text-orange-700 uppercase">In Progress</div>
                  <div className="text-base font-extrabold text-orange-800 mt-0.5">
                    {selectedEngineer.inProgress}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Average Progress</div>
                  <div className="text-base font-extrabold text-orange-600 mt-0.5">
                    {selectedEngineer.avgProgress}%
                  </div>
                </div>
              </div>

              {/* Sub-Stages List */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Layers size={14} className="text-orange-600" />
                  <span>Assigned Sub-Stages Portfolio ({selectedEngineer.subStages.length})</span>
                </h4>

                {selectedEngineer.subStages.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="text-xs font-bold text-slate-700">No Sub-Stages Currently Assigned</div>
                    <div className="text-[11px] text-slate-400">
                      This engineer is currently free for new project allocations.
                    </div>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3 text-left">#</th>
                          <th className="py-2.5 px-3 text-left">Work Order & Customer</th>
                          <th className="py-2.5 px-3 text-left">Sub-Stage Title & Code</th>
                          <th className="py-2.5 px-3 text-left">Target Date</th>
                          <th className="py-2.5 px-3 text-left">Status</th>
                          <th className="py-2.5 px-3 text-center">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedEngineer.subStages.map((sub, sIdx) => (
                          <tr key={sub.id || sIdx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-400">#{sIdx + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-extrabold text-orange-600">
                                  {sub.workOrderNumber}
                                </span>
                                <WorkOrderBomBadge
                                  isBomLocked={sub.isBomLocked}
                                  bomStatus={sub.bomStatus}
                                  bomAttached={sub.bomAttached}
                                  attachedDrawingsCount={sub.attachedDrawingsCount}
                                />
                              </div>
                              <div className="text-[10px] text-slate-500 line-clamp-1">{sub.customerName}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{sub.title}</div>
                              <div className="text-[10px] font-mono text-slate-400">{sub.subStageCode}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              {sub.targetDate ? (
                                <div>
                                  <div className="text-slate-800">
                                    {new Date(sub.targetDate).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </div>
                                  {sub.isOverdue && (
                                    <span className="text-[9px] font-extrabold text-red-600 bg-red-50 px-1 rounded border border-red-200">
                                      Overdue
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">TBD</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  sub.status === 'COMPLETED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : sub.status === 'IN_PROGRESS'
                                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                                    : sub.status === 'REVIEW' || sub.status === 'UNDER_REVIEW'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {sub.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                              {sub.progressPercent}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedEngineer(null)}
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
