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
  Users
} from 'lucide-react';
import {
  useGetProjectsQuery,
  useUpdateSubStageMutation
} from '../../project-setup/api/projectApi';
import { useGetDesignTeamUsersQuery } from '../api/designApi';
import SearchableSelect, { SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import WorkOrderBomBadge from '../../../components/ui/WorkOrderBomBadge';

type ViewMode = 'PROJECT' | 'ENGINEER';
type TimeScale = 'DAY' | 'WEEK' | 'MONTH';
type SubStageStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';

interface GanttSubStage {
  id: string;
  subStageCode: string;
  title: string;
  status: SubStageStatus;
  completionPercent: number;
  assignedToUserId?: string | null;
  assignedToUserName?: string;
  assignedToUserEmail?: string;
  startDate: Date;
  endDate: Date;
  priority: string;
  estimatedHours: number;
  actualHours: number;
  remarks: Array<{ text: string; authorName?: string; createdAt?: string }>;
  projectId: string;
  workOrderNumber: string;
  customerName: string;
  machineModel: string;
  milestoneId: string;
  bomAttached?: boolean;
  bomStatus?: string;
  isBomLocked?: boolean;
  attachedDrawingsCount?: number;
}

interface GanttGroup {
  key: string;
  label: string;
  subLabel: string;
  items: GanttSubStage[];
  bomAttached?: boolean;
  bomStatus?: string;
  isBomLocked?: boolean;
  attachedDrawingsCount?: number;
}

export default function DesignGanttTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('PROJECT');
  const [timeScale, setTimeScale] = useState<TimeScale>('DAY');
  const [currentDateOffset, setCurrentDateOffset] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>('ALL');

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
    estimatedHours: 0,
    actualHours: 0,
    remarkText: ''
  });

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({
    departmentModule: 'design'
  });
  const { data: designTeamData } = useGetDesignTeamUsersQuery();
  const [updateSubStage, { isLoading: isUpdatingSubStage }] = useUpdateSubStageMutation();

  const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const teamUsers = useMemo(() => designTeamData?.users || [], [designTeamData]);
  const activeTeamMembers = useMemo(() => teamUsers.filter((u: any) => u.isInTeam), [teamUsers]);

  // Extract all design sub-stages across all active projects
  const allSubStages = useMemo<GanttSubStage[]>(() => {
    const list: GanttSubStage[] = [];

    rawProjects.forEach((proj: any) => {
      const milestones = proj.milestones || [];
      const designMilestone =
        milestones.find(
          (m: any) =>
            (m.departmentModule && m.departmentModule.toLowerCase() === 'design') ||
            (m.stageCode && m.stageCode.toLowerCase().includes('design')) ||
            (m.title && m.title.toLowerCase().includes('design'))
        ) || milestones[0];

      if (!designMilestone) return;

      const subStages = designMilestone.subStages || [];
      subStages.forEach((sub: any) => {
        let st: SubStageStatus = 'NOT_STARTED';
        const upperSt = (sub.status || '').toUpperCase();
        if (upperSt === 'COMPLETED') st = 'COMPLETED';
        else if (upperSt === 'IN_PROGRESS') st = 'IN_PROGRESS';
        else if (upperSt === 'ON_HOLD' || upperSt === 'BLOCKED' || upperSt === 'PENDING') st = 'ON_HOLD';
        else st = 'NOT_STARTED';

        const rawStart = sub.baselineStartDate ? new Date(sub.baselineStartDate) : new Date();
        const rawEnd = sub.targetEndDate ? new Date(sub.targetEndDate) : new Date(Date.now() + 7 * 86400000);

        // Ensure start is valid
        const startDate = isNaN(rawStart.getTime()) ? new Date() : rawStart;
        const endDate = isNaN(rawEnd.getTime()) ? new Date(Date.now() + 7 * 86400000) : rawEnd;

        list.push({
          id: sub.id || sub._id,
          subStageCode: sub.subStageCode || 'DES-SUB',
          title: sub.title || sub.subStageName || 'Design Sub-Stage',
          status: st,
          completionPercent: sub.completionPercent ?? (st === 'COMPLETED' ? 100 : st === 'IN_PROGRESS' ? 50 : 0),
          assignedToUserId: sub.assignedToUserId,
          assignedToUserName: sub.assignedToUserName || '',
          assignedToUserEmail: sub.assignedToUserEmail || '',
          startDate,
          endDate,
          priority: (sub.priority || 'MEDIUM').toUpperCase(),
          estimatedHours: sub.estimatedHours || 0,
          actualHours: sub.actualHours || 0,
          remarks: Array.isArray(sub.remarks) ? sub.remarks : [],
          projectId: proj.projectId,
          workOrderNumber: proj.workOrderNumber || proj.projectId || 'WO-PENDING',
          customerName: proj.customerName || 'Customer',
          machineModel: proj.machineModel || 'Precision Winding Unit',
          milestoneId: designMilestone.id || designMilestone._id,
          bomAttached: proj.bomAttached,
          bomStatus: proj.bomStatus,
          isBomLocked: proj.isBomLocked,
          attachedDrawingsCount: proj.attachedDrawingsCount
        });
      });
    });

    return list;
  }, [rawProjects]);

  // Work Order options for SearchableSelect
  const projectFilterOptions = useMemo<SearchableSelectOption[]>(() => {
    return rawProjects.map((p: any) => ({
      value: p.projectId,
      label: p.workOrderNumber || p.projectId,
      subLabel: `${p.customerName} • ${p.machineModel}`
    }));
  }, [rawProjects]);

  // Engineer options for SearchableSelect
  const engineerFilterOptions = useMemo<SearchableSelectOption[]>(() => {
    const opts: SearchableSelectOption[] = [
      {
        value: 'UNASSIGNED',
        label: 'Unassigned Sub-Stages',
        subLabel: 'Pending engineer allocation'
      }
    ];

    activeTeamMembers.forEach((eng: any) => {
      opts.push({
        value: eng.id,
        label: eng.name || `${eng.firstName || ''} ${eng.lastName || ''}`.trim(),
        subLabel: eng.roleName || eng.email,
        badge: 'Design Squad'
      });
    });

    return opts;
  }, [activeTeamMembers]);

  // Filter sub-stages by Project, Engineer & Search
  const filteredSubStages = useMemo(() => {
    return allSubStages.filter((sub) => {
      if (selectedProjectId !== 'ALL' && sub.projectId !== selectedProjectId) return false;
      if (selectedEngineerId !== 'ALL') {
        if (selectedEngineerId === 'UNASSIGNED') {
          if (sub.assignedToUserId) return false;
        } else if (sub.assignedToUserId !== selectedEngineerId) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const mCode = sub.subStageCode.toLowerCase().includes(q);
        const mTitle = sub.title.toLowerCase().includes(q);
        const mWo = sub.workOrderNumber.toLowerCase().includes(q);
        const mCust = sub.customerName.toLowerCase().includes(q);
        const mModel = sub.machineModel.toLowerCase().includes(q);
        const mUser = (sub.assignedToUserName || '').toLowerCase().includes(q);
        if (!mCode && !mTitle && !mWo && !mCust && !mModel && !mUser) return false;
      }
      return true;
    });
  }, [allSubStages, selectedProjectId, selectedEngineerId, searchTerm]);

  // Determine Gantt View Time Window (Days Array)
  const { days, rangeStart, rangeEnd, todayIndex } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysCount = 14;
    if (timeScale === 'WEEK') daysCount = 28;
    if (timeScale === 'MONTH') daysCount = 60;

    const start = new Date(today);
    start.setDate(today.getDate() + currentDateOffset);

    const resultDays: Date[] = [];
    let todayIdx = -1;

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      resultDays.push(d);
      if (d.getTime() === today.getTime()) {
        todayIdx = i;
      }
    }

    const end = new Date(resultDays[resultDays.length - 1]);
    end.setHours(23, 59, 59, 999);

    return {
      days: resultDays,
      rangeStart: start,
      rangeEnd: end,
      todayIndex: todayIdx
    };
  }, [timeScale, currentDateOffset]);

  // Group sub-stages according to viewMode (By Project or By Engineer)
  const groupedData = useMemo(() => {
    if (viewMode === 'PROJECT') {
      const map = new Map<string, GanttGroup>();

      filteredSubStages.forEach((item) => {
        const groupKey = item.projectId;
        if (!map.has(groupKey)) {
          map.set(groupKey, {
            key: groupKey,
            label: `${item.workOrderNumber} • ${item.customerName}`,
            subLabel: item.machineModel,
            items: [],
            bomAttached: item.bomAttached,
            bomStatus: item.bomStatus,
            isBomLocked: item.isBomLocked,
            attachedDrawingsCount: item.attachedDrawingsCount
          });
        }
        map.get(groupKey)!.items.push(item);
      });

      return Array.from(map.values());
    } else {
      // Group by Assigned Engineer
      const map = new Map<string, GanttGroup>();

      filteredSubStages.forEach((item) => {
        const groupKey = item.assignedToUserId || 'UNASSIGNED';
        const label = item.assignedToUserName || 'Unassigned Sub-Stages';
        if (!map.has(groupKey)) {
          map.set(groupKey, {
            key: groupKey,
            label,
            subLabel: groupKey === 'UNASSIGNED' ? 'Pending Engineer Allocation' : 'Design Engineering Squad',
            items: []
          });
        }
        map.get(groupKey)!.items.push(item);
      });

      return Array.from(map.values());
    }
  }, [filteredSubStages, viewMode]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Open Quick Edit Modal
  const handleOpenEdit = (sub: GanttSubStage) => {
    setEditingSubStage(sub);
    setEditForm({
      status: sub.status,
      completionPercent: sub.completionPercent,
      assignedToUserId: sub.assignedToUserId || '',
      targetEndDate: sub.endDate ? sub.endDate.toISOString().split('T')[0] : '',
      priority: sub.priority,
      estimatedHours: sub.estimatedHours,
      actualHours: sub.actualHours,
      remarkText: ''
    });
  };

  // Submit Quick Edit Modal (Global DB Update)
  const handleSaveSubStageEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubStage) return;

    try {
      const assignedUser = activeTeamMembers.find((u: any) => u.id === editForm.assignedToUserId);
      const assignedToUserName = assignedUser
        ? (assignedUser.name || `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() || assignedUser.email)
        : editForm.assignedToUserId === '' ? '' : editingSubStage.assignedToUserName;
      const assignedToUserEmail = assignedUser?.email || '';

      await updateSubStage({
        subStageId: editingSubStage.id,
        status: editForm.status,
        completionPercent: editForm.completionPercent,
        assignedToUserId: editForm.assignedToUserId || null,
        assignedToUserName,
        assignedToUserEmail,
        targetEndDate: editForm.targetEndDate ? new Date(editForm.targetEndDate).toISOString() : undefined,
        priority: editForm.priority,
        estimatedHours: editForm.estimatedHours,
        actualHours: editForm.actualHours,
        remarkText: editForm.remarkText.trim() || undefined
      }).unwrap();

      showToast(`All set! Updated ${editingSubStage.subStageCode} globally.`, 'success');
      setEditingSubStage(null);
    } catch (err: any) {
      showToast(err?.data?.message || err?.message || 'Could not update sub-stage right now.', 'error');
    }
  };

  // Date range string for header
  const dateRangeBanner = useMemo(() => {
    if (days.length === 0) return '';
    const f = (d: Date) =>
      d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    return `${f(days[0])} — ${f(days[days.length - 1])}`;
  }, [days]);

  return (
    <div className="space-y-4">
      {/* Toast Notification Standard */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold text-white transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600'
              : toastMessage.type === 'info'
              ? 'bg-slate-800'
              : 'bg-red-600'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner with Industrial Identity & Grouping Mode Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 border-t-4 border-t-amber-400 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0 shadow-xs">
            <CalendarCheck size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              Design Sub-Stages Gantt Timeline
            </h1>
            <div className="text-[11px] font-medium text-slate-500">
              Machine House — Interactive Schedule &amp; Delivery Tracking
            </div>
          </div>
        </div>

        {/* View Grouping Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('PROJECT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'PROJECT'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderGit2 size={13} />
            <span>By Work Order</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('ENGINEER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'ENGINEER'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={13} />
            <span>By Engineer</span>
          </button>
        </div>
      </div>

      {/* Gantt Timeline Controls Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Time Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-0.5">
            <button
              type="button"
              onClick={() => setCurrentDateOffset((prev) => prev - (timeScale === 'DAY' ? 7 : 14))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentDateOffset(0)}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCurrentDateOffset((prev) => prev + (timeScale === 'DAY' ? 7 : 14))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <span className="font-mono text-xs font-extrabold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            {dateRangeBanner}
          </span>
        </div>

        {/* Center: Scale Toggle Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {(['DAY', 'WEEK', 'MONTH'] as TimeScale[]).map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => {
                setTimeScale(sc);
                setCurrentDateOffset(0);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeScale === sc
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {sc === 'DAY' ? '14 Days' : sc === 'WEEK' ? '4 Weeks' : '2 Months'}
            </button>
          ))}
        </div>

        {/* Right: Search & Searchable Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-44">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sub-stages..."
              className="w-full pl-8 pr-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-orange-500 text-slate-800"
            />
          </div>

          {/* Work Order Searchable Filter */}
          <SearchableSelect
            label="Work Order"
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            allOptionLabel={`All Work Orders (${rawProjects.length})`}
            placeholder="Search work order, customer, model..."
            options={projectFilterOptions}
          />

          {/* Assigned Engineer Searchable Filter */}
          <SearchableSelect
            label="Engineer"
            value={selectedEngineerId}
            onChange={setSelectedEngineerId}
            allOptionLabel="All Design Engineers"
            placeholder="Search engineer name, role..."
            options={engineerFilterOptions}
          />

          {(searchTerm || selectedProjectId !== 'ALL' || selectedEngineerId !== 'ALL' || currentDateOffset !== 0) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedProjectId('ALL');
                setSelectedEngineerId('ALL');
                setCurrentDateOffset(0);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Reset Filters"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] px-2 text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-300" />
          <span>Not Started</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-sky-500" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500" />
          <span>On Hold</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5 text-orange-600 font-bold ml-auto">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>Click any sub-stage bar to edit status globally</span>
        </div>
      </div>

      {/* GANTT TIMELINE TABLE CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Timeline Column Headers */}
            <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
              {/* Left Freeze Header: Group / Sub-Stage Title */}
              <div className="col-span-4 p-3 border-r border-slate-200 flex items-center justify-between">
                <span className="uppercase text-[10px] tracking-wider text-slate-500 font-extrabold">
                  {viewMode === 'PROJECT' ? 'Work Order / Design Sub-Stages' : 'Engineer / Design Tasks'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {groupedData.reduce((acc, g) => acc + g.items.length, 0)} Tasks
                </span>
              </div>

              {/* Right: Date Columns Grid */}
              <div className="col-span-8 grid relative" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                {days.map((d, idx) => {
                  const isToday = idx === todayIndex;
                  const dayName = d.toLocaleDateString('en-IN', { weekday: 'narrow' });
                  const dayNum = d.getDate();
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                  return (
                    <div
                      key={idx}
                      className={`py-2 px-0.5 text-center border-r border-slate-200/60 last:border-r-0 ${
                        isToday
                          ? 'bg-orange-500/10 text-orange-600 font-extrabold'
                          : isWeekend
                          ? 'bg-slate-100/50 text-slate-400'
                          : 'text-slate-600'
                      }`}
                    >
                      <div className="text-[9px] uppercase font-bold">{dayName}</div>
                      <div className="text-xs font-mono font-extrabold">{dayNum}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline Rows Body */}
            {groupedData.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                No design sub-stages match the current filters.
              </div>
            ) : (
              groupedData.map((group) => {
                const isCollapsed = collapsedGroups[group.key];
                const totalInGroup = group.items.length;
                const doneInGroup = group.items.filter((i) => i.status === 'COMPLETED').length;
                const groupProgress = totalInGroup > 0 ? Math.round((doneInGroup / totalInGroup) * 100) : 0;

                return (
                  <div key={group.key} className="border-b border-slate-200 last:border-b-0">
                    {/* Group Header Row */}
                    <div
                      onClick={() => toggleGroup(group.key)}
                      className="grid grid-cols-12 bg-slate-100/70 hover:bg-slate-100 py-2.5 px-3 cursor-pointer transition-colors items-center"
                    >
                      <div className="col-span-4 flex items-center justify-between pr-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronDown
                            size={16}
                            className={`text-slate-500 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                          />
                          <div className="min-w-0">
                            <div className="font-extrabold text-xs text-slate-900 truncate flex items-center gap-1.5">
                              <span>{group.label}</span>
                              {viewMode === 'PROJECT' && (
                                <WorkOrderBomBadge
                                  isBomLocked={group.isBomLocked}
                                  bomStatus={group.bomStatus}
                                  bomAttached={group.bomAttached}
                                  attachedDrawingsCount={group.attachedDrawingsCount}
                                />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {group.subLabel}
                            </div>
                          </div>
                        </div>

                        {/* Progress Badge */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                            {doneInGroup}/{totalInGroup}
                          </span>
                          <span className="font-mono text-[10px] font-extrabold text-orange-600">
                            {groupProgress}%
                          </span>
                        </div>
                      </div>

                      {/* Group Level Progress Bar span across right columns */}
                      <div className="col-span-8 px-2">
                        <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-orange-500 h-full rounded-full transition-all"
                            style={{ width: `${groupProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sub-Stage Task Rows (Visible when not collapsed) */}
                    {!isCollapsed &&
                      group.items.map((sub) => {
                        // Calculate left % and width % relative to current range
                        const startTs = sub.startDate.getTime();
                        const endTs = sub.endDate.getTime();
                        const rangeStartTs = rangeStart.getTime();
                        const rangeEndTs = rangeEnd.getTime();
                        const totalRangeDuration = rangeEndTs - rangeStartTs;

                        // Bounds check
                        const isVisible = endTs >= rangeStartTs && startTs <= rangeEndTs;

                        let leftPercent = 0;
                        let widthPercent = 0;

                        if (isVisible && totalRangeDuration > 0) {
                          const clampedStart = Math.max(startTs, rangeStartTs);
                          const clampedEnd = Math.min(endTs, rangeEndTs);
                          leftPercent = ((clampedStart - rangeStartTs) / totalRangeDuration) * 100;
                          widthPercent = Math.max(2, ((clampedEnd - clampedStart) / totalRangeDuration) * 100);
                        }

                        const isDone = sub.status === 'COMPLETED';
                        const isInProgress = sub.status === 'IN_PROGRESS';
                        const isOnHold = sub.status === 'ON_HOLD';
                        const isOverdue = !isDone && sub.endDate.getTime() < Date.now();

                        const barBg = isDone
                          ? 'bg-emerald-500 hover:bg-emerald-600'
                          : isOnHold
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : isInProgress
                          ? 'bg-sky-500 hover:bg-sky-600'
                          : 'bg-slate-300 hover:bg-slate-400 text-slate-800';

                        return (
                          <div
                            key={sub.id}
                            className="grid grid-cols-12 py-2 px-3 border-t border-slate-100 hover:bg-slate-50/80 transition-colors items-center text-xs"
                          >
                            {/* Left Side: Sub-Stage Metadata */}
                            <div className="col-span-4 pr-3 flex items-center justify-between min-w-0">
                              <div className="min-w-0 pl-6">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-bold text-orange-600 bg-orange-50 px-1 py-0.5 rounded border border-orange-200">
                                    {sub.subStageCode}
                                  </span>
                                  <span className="font-bold text-slate-800 truncate" title={sub.title}>
                                    {sub.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span className="truncate">
                                    {sub.assignedToUserName || 'Unassigned'}
                                  </span>
                                  <span>•</span>
                                  <span className="font-mono">
                                    Due: {sub.endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(sub)}
                                className="text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-lg border border-orange-200 shrink-0 transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                            </div>

                            {/* Right Side: Interactive Gantt Bar along Timeline */}
                            <div className="col-span-8 relative py-1 h-8 flex items-center">
                              {/* Background grid line guides */}
                              <div
                                className="absolute inset-0 grid pointer-events-none"
                                style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
                              >
                                {days.map((_, i) => (
                                  <div
                                    key={i}
                                    className={`border-r border-slate-100 last:border-r-0 ${
                                      i === todayIndex ? 'bg-orange-500/5' : ''
                                    }`}
                                  />
                                ))}
                              </div>

                              {/* Today vertical line marker */}
                              {todayIndex >= 0 && (
                                <div
                                  className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-orange-500"
                                  style={{
                                    left: `${((todayIndex + 0.5) / days.length) * 100}%`
                                  }}
                                />
                              )}

                              {/* Horizontal Gantt Bar */}
                              {isVisible ? (
                                <div
                                  onClick={() => handleOpenEdit(sub)}
                                  className={`absolute h-6 rounded-lg ${barBg} text-white font-extrabold text-[10px] px-2 flex items-center justify-between shadow-xs cursor-pointer truncate transition-all z-20 ${
                                    isOverdue ? 'ring-2 ring-red-500' : ''
                                  }`}
                                  style={{
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`
                                  }}
                                  title={`${sub.subStageCode}: ${sub.title} (${sub.status.replace(/_/g, ' ')})`}
                                >
                                  <span className="truncate mr-1">
                                    {sub.subStageCode} • {sub.status.replace(/_/g, ' ')}
                                  </span>
                                  <span className="font-mono text-[9px] opacity-90 shrink-0">
                                    {sub.completionPercent}%
                                  </span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic pl-2">
                                  Outside current time window ({sub.startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – {sub.endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})
                                </div>
                              )}
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

      {/* QUICK EDIT SUB-STAGE MODAL (Standard Crisp White Header + Amber Stripe) */}
      {editingSubStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <CalendarCheck size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    Edit Design Sub-Stage
                  </h3>
                  <div className="text-[11px] font-mono text-slate-500">
                    {editingSubStage.subStageCode} • {editingSubStage.workOrderNumber}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSubStage(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveSubStageEdit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Sub-Stage Title
                </label>
                <div className="p-2.5 bg-slate-100 rounded-xl font-bold text-slate-900 text-xs border border-slate-200">
                  {editingSubStage.title}
                </div>
              </div>

              {/* Status & Completion % */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => {
                      const st = e.target.value as SubStageStatus;
                      setEditForm((prev) => ({
                        ...prev,
                        status: st,
                        completionPercent: st === 'COMPLETED' ? 100 : st === 'IN_PROGRESS' ? 50 : 0
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Completion ({editForm.completionPercent}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={editForm.completionPercent}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        completionPercent: Number(e.target.value)
                      }))
                    }
                    className="w-full accent-orange-500 mt-2"
                  />
                </div>
              </div>

              {/* Assigned Design Engineer */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Assigned Design Engineer
                </label>
                <select
                  value={editForm.assignedToUserId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, assignedToUserId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                >
                  <option value="">-- Unassigned --</option>
                  {activeTeamMembers.map((eng: any) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name || `${eng.firstName || ''} ${eng.lastName || ''}`.trim()} ({eng.roleName || 'Design Engineer'})
                    </option>
                  ))}
                </select>
                {activeTeamMembers.length === 0 && (
                  <p className="mt-1 text-[11px] text-amber-600 font-medium">
                    No active members in Design Team. Add engineers in Design &gt; Masters &gt; Design Team.
                  </p>
                )}
              </div>

              {/* Target Date & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.targetEndDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, targetEndDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              {/* Estimated Hours & Actual Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editForm.estimatedHours}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Actual Hours Logged
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editForm.actualHours}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, actualHours: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Optional Progress Remark */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Add Progress Remark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3D flyer shaft modeling complete, moving to drawing generation..."
                  value={editForm.remarkText}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, remarkText: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingSubStage(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSubStage}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{isUpdatingSubStage ? 'Saving...' : 'Save Globally'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

