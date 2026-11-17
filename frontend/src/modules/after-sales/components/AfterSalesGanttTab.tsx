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
  Headphones
} from 'lucide-react';
import {
  useGetProjectsQuery,
  useUpdateSubStageMutation
} from '../../project-setup/api/projectApi';
import { useGetAfterSalesTeamQuery } from '../api/afterSalesApi';
import SearchableSelect, { SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';

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

export default function AfterSalesGanttTab() {
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
    departmentModule: 'after-sales'
  });
  const { data: teamData } = useGetAfterSalesTeamQuery();

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

  // Extract all attached Sub-Stages from After-Sales Milestones
  const allSubStages: GanttSubStage[] = useMemo(() => {
    const list: GanttSubStage[] = [];
    const now = new Date();

    rawProjects.forEach((proj: any) => {
      const milestones = proj.milestones || [];
      const afterSalesMilestone =
        milestones.find(
          (m: any) =>
            m.departmentModule?.toLowerCase() === 'after-sales' ||
            m.stage?.toLowerCase().includes('service') ||
            m.stage?.toLowerCase().includes('after') ||
            m.title?.toLowerCase().includes('service')
        ) || milestones[0];

      if (!afterSalesMilestone) return;

      const subStages = afterSalesMilestone.subStages || [];
      subStages.forEach((s: any, idx: number) => {
        let status: SubStageStatus = 'NOT_STARTED';
        const st = String(s.status || '').toUpperCase();
        if (st === 'COMPLETED' || st === 'DONE' || st === 'PASSED') status = 'COMPLETED';
        else if (st === 'IN_PROGRESS' || st === 'ACTIVE') status = 'IN_PROGRESS';
        else if (st === 'ON_HOLD' || st === 'BLOCKED' || st === 'SITE_HOLD') status = 'ON_HOLD';

        let sDate = s.baselineStartDate ? new Date(s.baselineStartDate) : new Date(now.getTime() + idx * 86400000 * 2);
        let eDate = s.targetEndDate
          ? new Date(s.targetEndDate)
          : new Date(sDate.getTime() + (Number(s.standardDays) || 3) * 86400000);

        if (isNaN(sDate.getTime())) sDate = new Date();
        if (isNaN(eDate.getTime()) || eDate <= sDate) eDate = new Date(sDate.getTime() + 86400000 * 3);

        list.push({
          id: s.id,
          subStageCode: s.subStageCode || 'AST-SS',
          title: s.title || s.subStageName || 'Service Stage',
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
          milestoneId: afterSalesMilestone.id
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
        const eng = (item.assignedToUserName || '').toLowerCase();
        if (!code.includes(q) && !title.includes(q) && !wo.includes(q) && !cust.includes(q) && !eng.includes(q)) {
          return false;
        }
      }
      if (selectedProjectId !== 'ALL' && item.projectId !== selectedProjectId) return false;
      return true;
    });
  }, [allSubStages, searchTerm, selectedProjectId]);

  // Group items by ViewMode
  const groupedData: GanttGroup[] = useMemo(() => {
    if (viewMode === 'PROJECT') {
      const map: Record<string, { label: string; subLabel: string; items: GanttSubStage[] }> = {};
      filteredItems.forEach((it) => {
        if (!map[it.projectId]) {
          map[it.projectId] = {
            label: it.workOrderNumber,
            subLabel: `${it.customerName} • ${it.machineModel}`,
            items: []
          };
        }
        map[it.projectId].items.push(it);
      });
      return Object.entries(map).map(([key, data]) => ({
        key,
        label: data.label,
        subLabel: data.subLabel,
        items: data.items.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      }));
    } else {
      const map: Record<string, { label: string; subLabel: string; items: GanttSubStage[] }> = {};
      filteredItems.forEach((it) => {
        const engKey = it.assignedToUserId || 'UNASSIGNED';
        const engName = it.assignedToUserName || 'Unassigned Field Engineer';
        if (!map[engKey]) {
          map[engKey] = {
            label: engName,
            subLabel: engKey === 'UNASSIGNED' ? 'Pending Allocation' : 'Field Service Specialist',
            items: []
          };
        }
        map[engKey].items.push(it);
      });
      return Object.entries(map).map(([key, data]) => ({
        key,
        label: data.label,
        subLabel: data.subLabel,
        items: data.items.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      }));
    }
  }, [filteredItems, viewMode]);

  // Timeline Columns Generation (14 days window default)
  const timelineColumns: TimelineCol[] = useMemo(() => {
    const cols: TimelineCol[] = [];
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    baseDate.setDate(baseDate.getDate() + currentDateOffset);

    const numCols = timeScale === 'DAY' ? 14 : timeScale === 'WEEK' ? 28 : 42;
    for (let i = 0; i < numCols; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const isToday =
        d.getDate() === new Date().getDate() &&
        d.getMonth() === new Date().getMonth() &&
        d.getFullYear() === new Date().getFullYear();
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      cols.push({
        date: d,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-GB', { weekday: 'narrow' }),
        monthName: d.toLocaleDateString('en-GB', { month: 'short' }),
        isToday,
        isWeekend
      });
    }
    return cols;
  }, [currentDateOffset, timeScale]);

  // Save changes from Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await updateSubStageTrigger({
        subStageId: editingItem.id,
        completionPercent: modalForm.completionPercent,
        status: modalForm.status,
        targetEndDate: modalForm.targetEndDate ? new Date(modalForm.targetEndDate).toISOString() : undefined,
        actualCompletionDate: modalForm.status === 'COMPLETED' ? new Date().toISOString() : null
      }).unwrap();

      dispatch(addToast({ type: 'success', message: 'All set! Task schedule updated.' }));
      setEditingItem(null);
      refetch();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: 'Failed to update schedule.' }));
    }
  };

  const handleOpenEdit = (item: GanttSubStage) => {
    setEditingItem(item);
    setModalForm({
      completionPercent: item.completionPercent,
      status: item.status,
      targetEndDate: item.endDate.toISOString().split('T')[0],
      estimatedHours: item.estimatedHours
    });
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Filter & View Mode Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Live Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Gantt stages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* SearchableSelect: Work Order Filter */}
          <SearchableSelect
            label="Work Order"
            options={projectOptions}
            value={selectedProjectId}
            onChange={(val) => setSelectedProjectId(val)}
            placeholder="All Work Orders"
            allOptionLabel="All Work Orders"
            className="w-48 sm:w-56"
          />

          {/* Grouping Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('PROJECT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'PROJECT'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>By Project</span>
            </button>
            <button
              onClick={() => setViewMode('ENGINEER')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'ENGINEER'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>By Engineer</span>
            </button>
          </div>
        </div>

        {/* Date Window Navigation */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setCurrentDateOffset((prev) => prev - 7)}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              title="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDateOffset(0)}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDateOffset((prev) => prev + 7)}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              title="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Gantt Matrix Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header Timeline Row */}
            <div className="flex border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-600 sticky top-0 z-10">
              <div className="w-72 p-3 border-r border-slate-200 uppercase tracking-wider shrink-0 bg-slate-50">
                {viewMode === 'PROJECT' ? 'Work Order / Stage' : 'Field Engineer / Task'}
              </div>

              <div className="flex-1 flex">
                {timelineColumns.map((col, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 min-w-[36px] py-2 text-center border-r border-slate-200/60 ${
                      col.isToday
                        ? 'bg-orange-50/80 text-orange-700 font-black'
                        : col.isWeekend
                        ? 'bg-slate-100/60 text-slate-400'
                        : ''
                    }`}
                  >
                    <span className="block text-[9px] uppercase">{col.monthName}</span>
                    <span className="block text-xs font-mono">{col.dayNum}</span>
                    <span className="block text-[8px] text-slate-400">{col.dayName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Groups & Items Rows */}
            <div className="divide-y divide-slate-100">
              {isLoadingProjects ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading timeline data...</div>
              ) : groupedData.length === 0 ? (
                <div className="p-12 text-center">
                  <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No scheduled tasks match criteria</p>
                </div>
              ) : (
                groupedData.map((group) => (
                  <div key={group.key} className="bg-white">
                    {/* Group Header */}
                    <div className="flex bg-slate-50/60 border-b border-slate-100 px-3 py-2 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900">{group.label}</span>
                        <span className="text-[11px] text-slate-500 font-medium">({group.subLabel})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        {group.items.length} tasks
                      </span>
                    </div>

                    {/* Group Sub-Stages */}
                    <div className="divide-y divide-slate-100/80">
                      {group.items.map((item) => {
                        const startIdx = timelineColumns.findIndex(
                          (c) => c.date.toDateString() === item.startDate.toDateString()
                        );
                        const endIdx = timelineColumns.findIndex(
                          (c) => c.date.toDateString() === item.endDate.toDateString()
                        );

                        const leftPercent =
                          startIdx >= 0 ? (startIdx / timelineColumns.length) * 100 : 0;
                        const widthPercent =
                          startIdx >= 0 && endIdx >= startIdx
                            ? Math.max(((endIdx - startIdx + 1) / timelineColumns.length) * 100, 3)
                            : 8;

                        return (
                          <div
                            key={item.id}
                            className="flex items-center hover:bg-slate-50/60 transition-colors group py-1.5"
                          >
                            {/* Left Meta Column */}
                            <div className="w-72 px-3 border-r border-slate-200 shrink-0">
                              <div
                                onClick={() => handleOpenEdit(item)}
                                className="cursor-pointer hover:text-orange-600 transition-colors"
                              >
                                <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span className="font-mono font-bold text-orange-600">{item.subStageCode}</span>
                                  <span>•</span>
                                  <span>{item.assignedToUserName}</span>
                                </div>
                              </div>
                            </div>

                            {/* Timeline Bar Canvas */}
                            <div className="flex-1 relative h-7 flex items-center">
                              <div
                                onClick={() => handleOpenEdit(item)}
                                style={{
                                  left: `${Math.min(Math.max(leftPercent, 0), 90)}%`,
                                  width: `${Math.min(Math.max(widthPercent, 6), 100)}%`
                                }}
                                className={`absolute h-5 rounded-lg shadow-2xs border cursor-pointer transition-all flex items-center px-2 text-[10px] font-bold text-white overflow-hidden ${
                                  item.status === 'COMPLETED'
                                    ? 'bg-emerald-500 border-emerald-600'
                                    : item.status === 'ON_HOLD'
                                    ? 'bg-red-500 border-red-600'
                                    : 'bg-orange-500 border-orange-600'
                                }`}
                              >
                                <span className="truncate">{item.completionPercent}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-slate-900 text-sm font-extrabold tracking-tight">{editingItem.title}</h2>
                  <p className="text-[11px] text-slate-500 font-mono">{editingItem.workOrderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={modalForm.status}
                  onChange={(e) => setModalForm({ ...modalForm, status: e.target.value as SubStageStatus })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Completion Percentage</span>
                  <span className="font-mono text-orange-600">{modalForm.completionPercent}%</span>
                </div>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Target End Date</label>
                <input
                  type="date"
                  value={modalForm.targetEndDate}
                  onChange={(e) => setModalForm({ ...modalForm, targetEndDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
                  className="px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
