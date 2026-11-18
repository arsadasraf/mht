'use client';

import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  FolderGit2,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  Users,
  Wrench,
  Clock,
  UserCheck
} from 'lucide-react';
import {
  useGetProjectsQuery,
  useUpdateSubStageMutation
} from '../../project-setup/api/projectApi';
import { useGetProductionTeamQuery } from '../api/productionTrialApi';
import SearchableSelect, { SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import {
  PRODUCTION_LINES,
  ProductionLineKey,
  resolveSubStageLine
} from './ProductionProjectsTab';

type ViewMode = 'PROJECT' | 'TECHNICIAN';
type TimeScale = 'DAY' | 'WEEK' | 'MONTH';
type SubStageStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';

interface GanttSubStage {
  id: string;
  subStageCode: string;
  title: string;
  productionLine: ProductionLineKey;
  status: SubStageStatus;
  completionPercent: number;
  assignedToUserId?: string | null;
  assignedToUserName?: string;
  startDate: Date;
  endDate: Date;
  priority: string;
  estimatedHours: number;
  actualHours: number;
  projectId: string;
  workOrderNumber: string;
  customerName: string;
  machineModel: string;
  milestoneId: string;
}

interface GanttGroup {
  key: string;
  label: string;
  subLabel: string;
  items: GanttSubStage[];
}

export default function ProductionGanttTab() {
  const dispatch = useAppDispatch();

  const [viewMode, setViewMode] = useState<ViewMode>('PROJECT');
  const [timeScale, setTimeScale] = useState<TimeScale>('DAY');
  const [currentDateOffset, setCurrentDateOffset] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('ALL');
  const [selectedLine, setSelectedLine] = useState<'ALL' | ProductionLineKey>('ALL');

  // Accordion collapsed state for groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Quick Edit Modal State
  const [editingSubStage, setEditingSubStage] = useState<GanttSubStage | null>(null);
  const [editForm, setEditForm] = useState({
    status: 'NOT_STARTED' as SubStageStatus,
    completionPercent: 0,
    assignedToUserId: '',
    targetEndDate: '',
    priority: 'MEDIUM',
    estimatedHours: 0
  });

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({
    departmentModule: 'production'
  });
  const { data: teamData } = useGetProductionTeamQuery();
  const [updateSubStageTrigger, { isLoading: isUpdatingSubStage }] = useUpdateSubStageMutation();

  const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const teamMembers = useMemo(() => teamData?.members || [], [teamData]);

  // Extract all Gantt sub-stages
  const allSubStages = useMemo<GanttSubStage[]>(() => {
    const list: GanttSubStage[] = [];

    rawProjects.forEach((proj: any) => {
      const milestones = proj.milestones || [];
      const prodMilestone =
        milestones.find(
          (m: any) =>
            m.departmentModule?.toLowerCase() === 'production' ||
            m.stage?.toLowerCase().includes('production') ||
            m.title?.toLowerCase().includes('production')
        ) || milestones[0];

      if (prodMilestone && Array.isArray(prodMilestone.subStages)) {
        prodMilestone.subStages.forEach((s: any, idx: number) => {
          let st: SubStageStatus = 'NOT_STARTED';
          const rawStatus = (s.status || '').toUpperCase();
          if (rawStatus === 'COMPLETED' || rawStatus === 'DONE') st = 'COMPLETED';
          else if (rawStatus === 'IN_PROGRESS' || rawStatus === 'ACTIVE') st = 'IN_PROGRESS';
          else if (rawStatus === 'ON_HOLD' || rawStatus === 'BLOCKED') st = 'ON_HOLD';
          else st = 'NOT_STARTED';

          // Compute dates
          const baseStart = s.baselineStartDate
            ? new Date(s.baselineStartDate)
            : new Date(Date.now() + idx * 3 * 24 * 60 * 60 * 1000);
          const baseEnd = s.targetEndDate
            ? new Date(s.targetEndDate)
            : new Date(baseStart.getTime() + (s.standardDays || 5) * 24 * 60 * 60 * 1000);

          list.push({
            id: s.id,
            subStageCode: s.subStageCode || 'PRD-SS',
            title: s.title || 'Assembly Stage',
            productionLine: resolveSubStageLine(s),
            status: st,
            completionPercent: Number(s.completionPercent || (st === 'COMPLETED' ? 100 : st === 'IN_PROGRESS' ? 50 : 0)),
            assignedToUserId: s.assignedUserId || s.assignedToUserId,
            assignedToUserName: s.assignedUserName || s.assignedToUserName || 'Unassigned',
            startDate: baseStart,
            endDate: baseEnd,
            priority: (s.priority || 'MEDIUM').toUpperCase(),
            estimatedHours: Number(s.estimatedHours || 16),
            actualHours: Number(s.actualHours || 0),
            projectId: proj.projectId,
            workOrderNumber: proj.workOrderNumber || proj.projectId,
            customerName: proj.customerName || 'Customer',
            machineModel: proj.machineModel || 'Machine',
            milestoneId: prodMilestone.id
          });
        });
      }
    });

    return list;
  }, [rawProjects]);

  // Filtered Sub-Stages
  const filteredSubStages = useMemo(() => {
    return allSubStages.filter((s) => {
      if (selectedProjectId !== 'ALL' && s.workOrderNumber !== selectedProjectId && s.projectId !== selectedProjectId) {
        return false;
      }
      if (selectedTechnicianId !== 'ALL' && s.assignedToUserId !== selectedTechnicianId && s.assignedToUserName !== selectedTechnicianId) {
        return false;
      }
      if (selectedLine !== 'ALL' && s.productionLine !== selectedLine) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const code = s.subStageCode.toLowerCase();
        const title = s.title.toLowerCase();
        const wo = s.workOrderNumber.toLowerCase();
        const cust = s.customerName.toLowerCase();
        const tech = (s.assignedToUserName || '').toLowerCase();
        if (!code.includes(q) && !title.includes(q) && !wo.includes(q) && !cust.includes(q) && !tech.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allSubStages, selectedProjectId, selectedTechnicianId, selectedLine, searchTerm]);

  // Grouped by Project or Technician
  const groupedData = useMemo<GanttGroup[]>(() => {
    const groupsMap = new Map<string, GanttGroup>();

    if (viewMode === 'PROJECT') {
      filteredSubStages.forEach((s) => {
        const key = s.workOrderNumber;
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            key,
            label: `${s.workOrderNumber} • ${s.customerName}`,
            subLabel: s.machineModel,
            items: []
          });
        }
        groupsMap.get(key)!.items.push(s);
      });
    } else {
      filteredSubStages.forEach((s) => {
        const key = s.assignedToUserName || 'Unassigned';
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            key,
            label: key,
            subLabel: 'Assembly Technician',
            items: []
          });
        }
        groupsMap.get(key)!.items.push(s);
      });
    }

    return Array.from(groupsMap.values());
  }, [filteredSubStages, viewMode]);

  // Calendar Timeline Columns (14 days window)
  const timelineDays = useMemo(() => {
    const days: Date[] = [];
    const base = new Date();
    base.setDate(base.getDate() + currentDateOffset);
    base.setHours(0, 0, 0, 0);

    const totalDays = timeScale === 'WEEK' ? 28 : timeScale === 'MONTH' ? 60 : 14;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDateOffset, timeScale]);

  // Handle Quick Edit Save
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubStage) return;

    try {
      await updateSubStageTrigger({
        subStageId: editingSubStage.id,
        status: editForm.status,
        completionPercent: editForm.completionPercent,
        assignedUserId: editForm.assignedToUserId || undefined,
        targetEndDate: editForm.targetEndDate || undefined,
        priority: editForm.priority,
        estimatedHours: editForm.estimatedHours
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: `All set! Progress saved for ${editingSubStage.title}.`
        })
      );
      setEditingSubStage(null);
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: 'Could not save progress.'
        })
      );
    }
  };

  // Project Options for SearchableSelect
  const projectOptions: SearchableSelectOption[] = useMemo(() => {
    return rawProjects.map((p: any) => ({
      value: p.workOrderNumber || p.projectId,
      label: `${p.workOrderNumber || p.projectId} • ${p.customerName || 'Customer'}`,
      subLabel: `${p.machineModel || 'Machine'} • ${p.projectName}`
    }));
  }, [rawProjects]);

  return (
    <div className="space-y-4">
      {/* Top Controls Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Side: Work Order SearchableSelect & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('PROJECT')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'PROJECT' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Work Order
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TECHNICIAN')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'TECHNICIAN'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Technician
            </button>
          </div>

          {/* Work Order Searchable Filter */}
          <div className="w-full sm:w-64">
            <SearchableSelect
              label="Work Order"
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val)}
              options={projectOptions}
              allOptionLabel="All Work Orders"
              placeholder="Filter Work Order..."
            />
          </div>

          {/* 3 Parallel Production Line Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedLine('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedLine === 'ALL'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              All Lines
            </button>
            {PRODUCTION_LINES.map((line) => (
              <button
                key={line.key}
                type="button"
                onClick={() => setSelectedLine(line.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedLine === line.key
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {line.shortLabel}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search stage..."
              className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Timeline Navigation */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setCurrentDateOffset((prev) => prev - 7)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentDateOffset(0)}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCurrentDateOffset((prev) => prev + 7)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="Next Week"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Gantt Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Timeline Header Row */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold text-slate-600 uppercase tracking-wider select-none sticky top-0 z-10">
              <div className="w-80 p-3 shrink-0 border-r border-slate-200">
                {viewMode === 'PROJECT' ? 'Work Order / Sub-Stage' : 'Technician / Stage'}
              </div>
              <div className="flex-1 flex divide-x divide-slate-200">
                {timelineDays.map((d) => {
                  const isToday = d.toDateString() === new Date().toDateString();
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div
                      key={d.toISOString()}
                      className={`flex-1 py-2 text-center min-w-[50px] ${
                        isToday ? 'bg-orange-50 font-extrabold text-orange-700' : isWeekend ? 'bg-slate-100/50' : ''
                      }`}
                    >
                      <div className="text-[9px] text-slate-400">
                        {d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-xs">{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Groups Body */}
            {groupedData.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No active production schedules found matching criteria.
              </div>
            ) : (
              groupedData.map((group) => {
                const isCollapsed = collapsedGroups[group.key];
                return (
                  <div key={group.key} className="border-b border-slate-100 last:border-b-0">
                    {/* Group Header Banner */}
                    <div
                      onClick={() =>
                        setCollapsedGroups((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                      }
                      className="flex items-center justify-between p-2.5 bg-slate-50/60 hover:bg-slate-100/70 transition-colors cursor-pointer border-b border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          size={14}
                          className={`text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                        />
                        <span className="font-extrabold text-slate-900 text-xs">{group.label}</span>
                        <span className="text-[11px] text-slate-500 font-medium">({group.subLabel})</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 mr-2">
                        {group.items.length} sub-stages
                      </span>
                    </div>

                    {/* Group Sub-Stages Rows */}
                    {!isCollapsed &&
                      group.items.map((item) => {
                        const isDone = item.status === 'COMPLETED';
                        const isRunning = item.status === 'IN_PROGRESS';
                        const isOnHold = item.status === 'ON_HOLD';

                        // Bar color
                        let barColor = 'bg-slate-400';
                        if (isDone) barColor = 'bg-emerald-500';
                        else if (isRunning) barColor = 'bg-orange-500';
                        else if (isOnHold) barColor = 'bg-amber-400';

                        // Calculate visual position on timeline
                        const timelineStart = timelineDays[0].getTime();
                        const timelineEnd = timelineDays[timelineDays.length - 1].getTime() + 24 * 60 * 60 * 1000;
                        const itemStart = Math.max(timelineStart, item.startDate.getTime());
                        const itemEnd = Math.min(timelineEnd, item.endDate.getTime());
                        const totalDuration = timelineEnd - timelineStart;

                        const leftPercent = Math.max(0, Math.min(100, ((itemStart - timelineStart) / totalDuration) * 100));
                        const widthPercent = Math.max(
                          4,
                          Math.min(100 - leftPercent, ((itemEnd - itemStart) / totalDuration) * 100)
                        );

                        return (
                          <div
                            key={item.id}
                            className="flex items-center hover:bg-slate-50/50 transition-colors border-b border-slate-50 text-xs"
                          >
                            {/* Left Meta Info */}
                            <div className="w-80 p-2.5 shrink-0 border-r border-slate-200 space-y-0.5">
                              <div className="font-extrabold text-slate-900 text-xs flex items-center justify-between gap-1">
                                <span className="truncate max-w-[165px]">{item.title}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {(() => {
                                    const lineCfg = PRODUCTION_LINES.find((l) => l.key === item.productionLine) || PRODUCTION_LINES[0];
                                    return (
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${lineCfg.badgeClass}`}
                                      >
                                        {lineCfg.shortLabel}
                                      </span>
                                    );
                                  })()}
                                  <span className="font-mono text-[10px] text-orange-600 bg-orange-50 px-1 rounded">
                                    {item.subStageCode}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span>{item.assignedToUserName}</span>
                                <span className="font-mono font-bold text-slate-700">{item.completionPercent}%</span>
                              </div>
                            </div>

                            {/* Right Timeline Bar */}
                            <div className="flex-1 relative h-10 flex items-center px-2">
                              <div
                                onClick={() => {
                                  setEditingSubStage(item);
                                  setEditForm({
                                    status: item.status,
                                    completionPercent: item.completionPercent,
                                    assignedToUserId: item.assignedToUserId || '',
                                    targetEndDate: item.endDate.toISOString().split('T')[0],
                                    priority: item.priority,
                                    estimatedHours: item.estimatedHours
                                  });
                                }}
                                className={`absolute h-6 rounded-md shadow-xs flex items-center justify-between px-2 text-white text-[10px] font-bold cursor-pointer hover:opacity-95 transition-all ${barColor}`}
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`
                                }}
                                title={`${item.title} (${item.completionPercent}%) - Click to edit`}
                              >
                                <span className="truncate">{item.title}</span>
                                <span className="font-mono shrink-0 ml-1">{item.completionPercent}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingSubStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-slate-900 text-sm font-extrabold tracking-tight">
                  Update Schedule: {editingSubStage.title}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {editingSubStage.workOrderNumber} • {editingSubStage.subStageCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSubStage(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      status: e.target.value as SubStageStatus,
                      completionPercent: e.target.value === 'COMPLETED' ? 100 : editForm.completionPercent
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none cursor-pointer"
                >
                  <option value="NOT_STARTED">To Do / Pending</option>
                  <option value="IN_PROGRESS">In Assembly</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed / Gate Passed</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Completion Progress ({editForm.completionPercent}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={editForm.completionPercent}
                  onChange={(e) => setEditForm({ ...editForm, completionPercent: parseInt(e.target.value) })}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Assembly Technician
                </label>
                <select
                  value={editForm.assignedToUserId}
                  onChange={(e) => setEditForm({ ...editForm, assignedToUserId: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Unassigned --</option>
                  {teamMembers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Target End Date
                </label>
                <input
                  type="date"
                  value={editForm.targetEndDate}
                  onChange={(e) => setEditForm({ ...editForm, targetEndDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 -mx-6 -mb-6 mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEditingSubStage(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSubStage}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                >
                  {isUpdatingSubStage ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

