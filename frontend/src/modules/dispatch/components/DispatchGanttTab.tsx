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
  UserCheck,
  Truck
} from 'lucide-react';
import {
  useGetProjectsQuery,
  useUpdateSubStageMutation
} from '../../project-setup/api/projectApi';
import { useGetDispatchTeamQuery } from '../api/dispatchApi';
import SearchableSelect, { SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';

type ViewMode = 'PROJECT' | 'INSPECTOR';
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

interface TimelineCol {
  date: Date;
  dayNum: number;
  dayName: string;
  monthName: string;
  isToday: boolean;
  isWeekend: boolean;
}

interface GanttGroup {
  key: string;
  label: string;
  subLabel: string;
  items: GanttSubStage[];
}

export default function DispatchGanttTab() {
  const dispatch = useAppDispatch();

  // Filters & View Modes
  const [viewMode, setViewMode] = useState<ViewMode>('PROJECT');
  const [timeScale, setTimeScale] = useState<TimeScale>('DAY');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');

  // Timeline Navigation Window (anchored around today)
  const [currentDateOffset, setCurrentDateOffset] = useState<number>(0);

  // Edit / Details Modal State
  const [editingItem, setEditingItem] = useState<GanttSubStage | null>(null);
  const [modalForm, setModalForm] = useState({
    completionPercent: 0,
    status: 'IN_PROGRESS' as SubStageStatus,
    targetEndDate: '',
    estimatedHours: 12
  });

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects, refetch } = useGetProjectsQuery({
    departmentModule: 'dispatch'
  });
  const { data: teamData } = useGetDispatchTeamQuery();

  // Mutations
  const [updateSubStageTrigger, { isLoading: isUpdating }] = useUpdateSubStageMutation();

  const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const teamMembers = useMemo(() => teamData?.members || [], [teamData]);

  // Project options for SearchableSelect
  const projectOptions: SearchableSelectOption[] = useMemo(() => {
    return rawProjects.map((p: any) => ({
      value: p.id,
      label: p.workOrderNumber || p.projectId,
      subLabel: `${p.customerName || 'Customer'} • ${p.machineModel || p.projectName}`
    }));
  }, [rawProjects]);

  // Extract all attached Sub-Stages from Dispatch Milestones
  const allSubStages: GanttSubStage[] = useMemo(() => {
    const list: GanttSubStage[] = [];
    const now = new Date();

    rawProjects.forEach((proj: any) => {
      const milestones = proj.milestones || [];
      const dispatchMilestone =
        milestones.find(
          (m: any) =>
            m.departmentModule?.toLowerCase() === 'dispatch' ||
            m.stage?.toLowerCase().includes('dispatch') ||
            m.stage?.toLowerCase().includes('trial') ||
            m.title?.toLowerCase().includes('dispatch')
        ) || milestones[0];

      if (!dispatchMilestone) return;

      const subStages = dispatchMilestone.subStages || [];
      subStages.forEach((s: any, idx: number) => {
        let status: SubStageStatus = 'NOT_STARTED';
        const st = String(s.status || '').toUpperCase();
        if (st === 'COMPLETED' || st === 'DONE' || st === 'PASSED') status = 'COMPLETED';
        else if (st === 'IN_PROGRESS' || st === 'ACTIVE') status = 'IN_PROGRESS';
        else if (st === 'ON_HOLD' || st === 'BLOCKED' || st === 'SNAG_HOLD') status = 'ON_HOLD';

        // Calculate dates
        let sDate = s.baselineStartDate ? new Date(s.baselineStartDate) : new Date(now.getTime() + idx * 86400000 * 2);
        let eDate = s.targetEndDate
          ? new Date(s.targetEndDate)
          : new Date(sDate.getTime() + (Number(s.standardDays) || 3) * 86400000);

        if (isNaN(sDate.getTime())) sDate = new Date();
        if (isNaN(eDate.getTime()) || eDate <= sDate) eDate = new Date(sDate.getTime() + 86400000 * 3);

        list.push({
          id: s.id,
          subStageCode: s.subStageCode || 'DSP-SS',
          title: s.title || s.subStageName || 'Inspection Stage',
          status,
          completionPercent: Number(s.completionPercent || (status === 'COMPLETED' ? 100 : 0)),
          assignedToUserId: s.assignedToUserId,
          assignedToUserName: s.assignedToUserName || s.technicianName || 'Unassigned',
          startDate: sDate,
          endDate: eDate,
          priority: s.priority || 'MEDIUM',
          estimatedHours: Number(s.estimatedHours || 12),
          actualHours: Number(s.actualHours || 0),
          projectId: proj.id,
          workOrderNumber: proj.workOrderNumber || proj.projectId,
          customerName: proj.customerName || 'Customer',
          machineModel: proj.machineModel || 'Standard Winder',
          milestoneId: dispatchMilestone.id
        });
      });
    });

    return list;
  }, [rawProjects]);

  // Filter items
  const filteredItems = useMemo(() => {
    return allSubStages.filter((item) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const code = item.subStageCode.toLowerCase();
        const title = item.title.toLowerCase();
        const wo = item.workOrderNumber.toLowerCase();
        const cust = item.customerName.toLowerCase();
        const tech = (item.assignedToUserName || '').toLowerCase();
        if (!code.includes(q) && !title.includes(q) && !wo.includes(q) && !cust.includes(q) && !tech.includes(q)) {
          return false;
        }
      }
      if (selectedProjectId !== 'ALL' && item.projectId !== selectedProjectId) return false;
      return true;
    });
  }, [allSubStages, searchTerm, selectedProjectId]);

  // Group items by View Mode (PROJECT or INSPECTOR)
  const groupedData: GanttGroup[] = useMemo(() => {
    const map = new Map<string, GanttGroup>();

    filteredItems.forEach((item) => {
      let key = item.projectId;
      let label = item.workOrderNumber;
      let subLabel = `${item.customerName} • ${item.machineModel}`;

      if (viewMode === 'INSPECTOR') {
        key = item.assignedToUserId || 'unassigned';
        label = item.assignedToUserName || 'Unassigned Inspector';
        subLabel = 'Trial & QC Inspection Team';
      }

      if (!map.has(key)) {
        map.set(key, { key, label, subLabel, items: [] });
      }
      map.get(key)!.items.push(item);
    });

    return Array.from(map.values());
  }, [filteredItems, viewMode]);

  // Timeline Column Header Dates
  const totalDays = timeScale === 'DAY' ? 21 : timeScale === 'WEEK' ? 42 : 60;
  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 5 + currentDateOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDateOffset]);

  const timelineColumns = useMemo(() => {
    const cols: TimelineCol[] = [];
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const isToday =
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      cols.push({
        date,
        dayNum: date.getDate(),
        dayName: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        monthName: date.toLocaleDateString('en-GB', { month: 'short' }),
        isToday,
        isWeekend
      });
    }
    return cols;
  }, [startDate, totalDays]);

  // Calculate Bar Positioning for a sub-stage
  const getBarPosition = (item: GanttSubStage) => {
    const startMs = item.startDate.getTime();
    const endMs = item.endDate.getTime();
    const timelineStartMs = startDate.getTime();
    const oneDayMs = 86400000;

    const leftDays = (startMs - timelineStartMs) / oneDayMs;
    const durationDays = Math.max(0.8, (endMs - startMs) / oneDayMs);

    const dayWidthPx = 36;
    const leftPx = Math.max(0, leftDays * dayWidthPx);
    const widthPx = Math.max(28, durationDays * dayWidthPx);

    return { left: `${leftPx}px`, width: `${widthPx}px` };
  };

  // Open Edit Modal
  const handleOpenEdit = (item: GanttSubStage) => {
    setEditingItem(item);
    setModalForm({
      completionPercent: item.completionPercent,
      status: item.status,
      targetEndDate: item.endDate.toISOString().split('T')[0],
      estimatedHours: item.estimatedHours
    });
  };

  // Submit Modal Edit
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await updateSubStageTrigger({
        subStageId: editingItem.id,
        completionPercent: Number(modalForm.completionPercent),
        status:
          Number(modalForm.completionPercent) >= 100
            ? 'COMPLETED'
            : modalForm.status,
        targetEndDate: modalForm.targetEndDate,
        estimatedHours: Number(modalForm.estimatedHours)
      }).unwrap();

      dispatch(
        addToast({
          title: 'Timeline Updated',
          message: `All set! ${editingItem.title} updated successfully.`,
          type: 'success'
        })
      );
      setEditingItem(null);
      refetch();
    } catch (err: any) {
      dispatch(
        addToast({
          title: 'Update Failed',
          message: err?.data?.message || 'Could not update timeline.',
          type: 'error'
        })
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar: View Switchers, Time Scale & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('PROJECT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'PROJECT'
                  ? 'bg-orange-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>By Project</span>
            </button>
            <button
              onClick={() => setViewMode('INSPECTOR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'INSPECTOR'
                  ? 'bg-orange-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>By Inspector</span>
            </button>
          </div>

          {/* Work Order Searchable Select */}
          <div className="min-w-[180px]">
            <SearchableSelect
              label="Work Order"
              options={projectOptions}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              placeholder="Filter Work Order"
              allOptionLabel="All Work Orders"
            />
          </div>

          {/* Keyword Search */}
          <div className="relative min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search stage or inspector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Date Navigator & Scale Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={() => setCurrentDateOffset((prev) => prev - 7)}
              title="Previous 7 days"
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDateOffset(0)}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDateOffset((prev) => prev + 7)}
              title="Next 7 days"
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Gantt Timeline Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1100px]">
            {/* Header Timeline Row */}
            <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
              <div className="w-72 shrink-0 p-3.5 text-xs font-extrabold text-slate-700 uppercase tracking-wider border-r border-slate-200 bg-slate-50">
                {viewMode === 'PROJECT' ? 'Work Order / Inspection Stage' : 'Inspector / Stage'}
              </div>
              <div className="flex-1 flex">
                {timelineColumns.map((col, idx) => (
                  <div
                    key={idx}
                    className={`w-[36px] shrink-0 py-2 text-center border-r border-slate-200 text-[10px] ${
                      col.isToday
                        ? 'bg-orange-50 font-black text-orange-600 border-b-2 border-b-orange-500'
                        : col.isWeekend
                        ? 'bg-slate-100/50 text-slate-400 font-medium'
                        : 'text-slate-600 font-semibold'
                    }`}
                  >
                    <span className="block text-[9px] uppercase leading-none">{col.dayName.slice(0, 1)}</span>
                    <span className="block mt-0.5">{col.dayNum}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Groups & Sub-Stage Rows */}
            {isLoadingProjects ? (
              <div className="p-16 text-center text-slate-400 text-xs">Loading Gantt schedule...</div>
            ) : groupedData.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs">
                No inspection stages scheduled. Attach sub-stages in the Work Orders tab to view timeline.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {groupedData.map((group) => (
                  <div key={group.key} className="space-y-0">
                    {/* Group Header Banner */}
                    <div className="flex bg-slate-100/70 border-b border-slate-200">
                      <div className="w-72 shrink-0 px-4 py-2 text-xs font-black text-slate-800 border-r border-slate-200 flex items-center justify-between">
                        <span className="truncate">{group.label}</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-md border border-slate-200">
                          {group.items.length} stages
                        </span>
                      </div>
                      <div className="flex-1 px-4 py-2 text-[11px] font-semibold text-slate-500 truncate">
                        {group.subLabel}
                      </div>
                    </div>

                    {/* Stage Rows */}
                    {group.items.map((item) => {
                      const pos = getBarPosition(item);

                      let barBg = 'bg-sky-500';
                      if (item.status === 'COMPLETED') barBg = 'bg-emerald-500';
                      else if (item.status === 'ON_HOLD') barBg = 'bg-amber-500';
                      else if (item.status === 'NOT_STARTED') barBg = 'bg-slate-400';

                      return (
                        <div key={item.id} className="flex hover:bg-slate-50/70 transition-colors group">
                          {/* Row Left Label */}
                          <div className="w-72 shrink-0 p-3 border-r border-slate-200 flex flex-col justify-center">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="text-xs font-bold text-slate-900 group-hover:text-orange-600 text-left truncate transition-colors"
                            >
                              {item.title}
                            </button>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                              <span className="font-mono text-orange-600 font-bold">{item.subStageCode}</span>
                              <span>•</span>
                              <span>{item.completionPercent}%</span>
                              <span>•</span>
                              <span className="truncate">{item.assignedToUserName}</span>
                            </div>
                          </div>

                          {/* Row Gantt Timeline Bar Canvas */}
                          <div className="flex-1 relative h-14 flex items-center overflow-hidden">
                            {/* Background Grid Lines */}
                            <div className="absolute inset-0 flex pointer-events-none">
                              {timelineColumns.map((col, idx) => (
                                <div
                                  key={idx}
                                  className={`w-[36px] shrink-0 h-full border-r border-slate-100 ${
                                    col.isToday ? 'bg-orange-50/30' : col.isWeekend ? 'bg-slate-50/40' : ''
                                  }`}
                                />
                              ))}
                            </div>

                            {/* Timeline Bar */}
                            <div
                              onClick={() => handleOpenEdit(item)}
                              style={{ left: pos.left, width: pos.width }}
                              className={`absolute h-7 rounded-lg ${barBg} text-white shadow-xs cursor-pointer hover:brightness-110 transition-all flex items-center px-2 z-10`}
                            >
                              <span className="text-[10px] font-bold truncate">{item.title}</span>
                              <span className="ml-auto text-[9px] font-black opacity-90 pl-1">
                                {item.completionPercent}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT TIMELINE MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Update Schedule</h2>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              <div>
                <p className="text-xs font-extrabold text-slate-800">{editingItem.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {editingItem.workOrderNumber} • {editingItem.assignedToUserName}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={modalForm.status}
                  onChange={(e) => setModalForm({ ...modalForm, status: e.target.value as SubStageStatus })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                >
                  <option value="NOT_STARTED">Pre-Inspection / Backlog</option>
                  <option value="IN_PROGRESS">In Inspection & Trials</option>
                  <option value="ON_HOLD">Snag Hold</option>
                  <option value="COMPLETED">Inspection Cleared</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Inspection Progress ({modalForm.completionPercent}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={modalForm.completionPercent}
                  onChange={(e) => setModalForm({ ...modalForm, completionPercent: Number(e.target.value) })}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target End Date
                </label>
                <input
                  type="date"
                  value={modalForm.targetEndDate}
                  onChange={(e) => setModalForm({ ...modalForm, targetEndDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
