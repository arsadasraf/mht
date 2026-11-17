'use client';

import React, { useState, useMemo } from 'react';
import {
  Kanban,
  Search,
  RotateCcw,
  Clock,
  Layers,
  PauseCircle,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  MessageSquare,
  Send,
  X,
  ChevronDown,
  Wrench,
  UserCheck,
  Truck,
  ShieldCheck
} from 'lucide-react';
import {
  useGetProjectsQuery,
  useUpdateSubStageMutation
} from '../../project-setup/api/projectApi';
import { useGetDispatchTeamQuery } from '../api/dispatchApi';
import SearchableSelect, { SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';

type KanbanColumnKey = 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';

interface DispatchSubStageItem {
  id: string;
  subStageCode: string;
  title: string;
  status: KanbanColumnKey;
  completionPercent: number;
  assignedToUserId?: string | null;
  assignedToUserName?: string;
  baselineStartDate?: string;
  targetEndDate?: string;
  actualCompletionDate?: string | null;
  priority: string;
  estimatedHours: number;
  actualHours: number;
  remarks: Array<{ text: string; authorName?: string; createdAt?: string }>;
  projectId: string;
  workOrderNumber: string;
  customerName: string;
  machineModel: string;
  milestoneId: string;
}

export default function DispatchKanbanTab() {
  const dispatch = useAppDispatch();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [selectedInspectorId, setSelectedInspectorId] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Modals & Drawers
  const [activeItem, setActiveItem] = useState<DispatchSubStageItem | null>(null);
  const [newRemarkText, setNewRemarkText] = useState('');

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects, refetch } = useGetProjectsQuery({
    departmentModule: 'dispatch'
  });
  const { data: teamData } = useGetDispatchTeamQuery();

  // Mutations
  const [updateSubStageTrigger, { isLoading: isUpdating }] = useUpdateSubStageMutation();

  const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const teamMembers = useMemo(() => teamData?.members || [], [teamData]);

  // Extract all attached Sub-Stages from Dispatch Milestones
  const allSubStages: DispatchSubStageItem[] = useMemo(() => {
    const list: DispatchSubStageItem[] = [];

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
      subStages.forEach((s: any) => {
        // Normalize status
        let status: KanbanColumnKey = 'NOT_STARTED';
        const st = String(s.status || '').toUpperCase();
        if (st === 'COMPLETED' || st === 'DONE' || st === 'PASSED') status = 'COMPLETED';
        else if (st === 'IN_PROGRESS' || st === 'ACTIVE') status = 'IN_PROGRESS';
        else if (st === 'ON_HOLD' || st === 'BLOCKED' || st === 'SNAG_HOLD') status = 'ON_HOLD';

        list.push({
          id: s.id,
          subStageCode: s.subStageCode || 'DSP-SS',
          title: s.title || s.subStageName || 'Inspection Stage',
          status,
          completionPercent: Number(s.completionPercent || (status === 'COMPLETED' ? 100 : 0)),
          assignedToUserId: s.assignedToUserId,
          assignedToUserName: s.assignedToUserName || s.technicianName || 'Unassigned',
          baselineStartDate: s.baselineStartDate,
          targetEndDate: s.targetEndDate,
          actualCompletionDate: s.actualCompletionDate,
          priority: s.priority || 'MEDIUM',
          estimatedHours: Number(s.estimatedHours || 12),
          actualHours: Number(s.actualHours || 0),
          remarks: Array.isArray(s.remarks) ? s.remarks : [],
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

  // Project options for SearchableSelect
  const projectOptions: SearchableSelectOption[] = useMemo(() => {
    return rawProjects.map((p: any) => ({
      value: p.id,
      label: p.workOrderNumber || p.projectId,
      subLabel: `${p.customerName || 'Customer'} • ${p.machineModel || p.projectName}`
    }));
  }, [rawProjects]);

  // Inspector options for SearchableSelect
  const inspectorOptions: SearchableSelectOption[] = useMemo(() => {
    return teamMembers.map((m: any) => ({
      value: m.id || m._id,
      label: m.fullName,
      subLabel: `${m.designation} (${m.memberCode})`
    }));
  }, [teamMembers]);

  // Filtered Sub-Stages
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
      if (selectedInspectorId !== 'ALL' && item.assignedToUserId !== selectedInspectorId) return false;
      if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
      return true;
    });
  }, [allSubStages, searchTerm, selectedProjectId, selectedInspectorId, priorityFilter]);

  // Group into Kanban Columns
  const columns: Record<KanbanColumnKey, DispatchSubStageItem[]> = useMemo(() => {
    const map: Record<KanbanColumnKey, DispatchSubStageItem[]> = {
      NOT_STARTED: [],
      IN_PROGRESS: [],
      ON_HOLD: [],
      COMPLETED: []
    };
    filteredItems.forEach((item) => {
      if (map[item.status]) {
        map[item.status].push(item);
      } else {
        map['NOT_STARTED'].push(item);
      }
    });
    return map;
  }, [filteredItems]);

  // Status Column Configurations
  const columnConfigs: Array<{
    key: KanbanColumnKey;
    label: string;
    badgeClass: string;
    borderClass: string;
    bgHeader: string;
    icon: any;
  }> = [
    {
      key: 'NOT_STARTED',
      label: 'Pre-Inspection / Backlog',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      borderClass: 'border-slate-300',
      bgHeader: 'bg-slate-50',
      icon: Clock
    },
    {
      key: 'IN_PROGRESS',
      label: 'In Inspection & Trials',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      borderClass: 'border-sky-400',
      bgHeader: 'bg-sky-50/50',
      icon: Wrench
    },
    {
      key: 'ON_HOLD',
      label: 'Snag Hold',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      borderClass: 'border-amber-400',
      bgHeader: 'bg-amber-50/50',
      icon: PauseCircle
    },
    {
      key: 'COMPLETED',
      label: 'Inspection Cleared',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      borderClass: 'border-emerald-400',
      bgHeader: 'bg-emerald-50/50',
      icon: CheckCircle2
    }
  ];

  // Quick Move Status Handler
  const handleMoveStatus = async (item: DispatchSubStageItem, nextStatus: KanbanColumnKey) => {
    try {
      const payload: any = {
        status: nextStatus,
        completionPercent: nextStatus === 'COMPLETED' ? 100 : nextStatus === 'NOT_STARTED' ? 0 : 50
      };
      if (nextStatus === 'COMPLETED') {
        payload.actualCompletionDate = new Date().toISOString();
      }

      await updateSubStageTrigger({
        subStageId: item.id,
        ...payload
      }).unwrap();

      dispatch(
        addToast({
          title: 'Stage Moved',
          message: `All set! ${item.title} moved to ${nextStatus.replace('_', ' ')}.`,
          type: 'success'
        })
      );
      refetch();
    } catch (err: any) {
      dispatch(
        addToast({
          title: 'Update Failed',
          message: err?.data?.message || 'Could not move stage status.',
          type: 'error'
        })
      );
    }
  };

  // Add Remark Handler
  const handleAddRemark = async () => {
    if (!activeItem || !newRemarkText.trim()) return;
    try {
      const updatedRemarks = [
        ...activeItem.remarks,
        {
          text: newRemarkText.trim(),
          createdAt: new Date().toISOString()
        }
      ];

      await updateSubStageTrigger({
        subStageId: activeItem.id,
        remarks: updatedRemarks
      }).unwrap();

      setActiveItem({
        ...activeItem,
        remarks: updatedRemarks
      });
      setNewRemarkText('');
      refetch();
      dispatch(
        addToast({
          title: 'Remark Added',
          message: 'Inspection note recorded successfully.',
          type: 'success'
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          title: 'Could Not Save',
          message: err?.data?.message || 'Failed to save note.',
          type: 'error'
        })
      );
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedProjectId('ALL');
    setSelectedInspectorId('ALL');
    setPriorityFilter('ALL');
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      selectedProjectId !== 'ALL' ||
      selectedInspectorId !== 'ALL' ||
      priorityFilter !== 'ALL'
  );

  return (
    <div className="space-y-4">
      {/* Kanban Filters & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Keyword Search */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search stage, WO, customer, inspector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Work Order Searchable Select */}
          <div className="min-w-[170px]">
            <SearchableSelect
              label="Work Order"
              options={projectOptions}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              placeholder="Filter Work Order"
              allOptionLabel="All Work Orders"
            />
          </div>

          {/* Inspector Searchable Select */}
          <div className="min-w-[170px]">
            <SearchableSelect
              label="Inspector"
              options={inspectorOptions}
              value={selectedInspectorId}
              onChange={setSelectedInspectorId}
              placeholder="Filter Inspector"
              allOptionLabel="All Inspectors"
            />
          </div>

          {/* Priority Pill Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:border-orange-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* 4-Column Modern Industrial Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columnConfigs.map((col) => {
          const items = columns[col.key];
          const IconComponent = col.icon;

          return (
            <div
              key={col.key}
              className="bg-slate-100/70 rounded-2xl border border-slate-200 p-3 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div
                className={`p-3 rounded-xl border border-slate-200 ${col.bgHeader} flex items-center justify-between mb-3 shadow-2xs`}
              >
                <div className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-black text-slate-800 tracking-tight">{col.label}</h3>
                </div>
                <span className="w-5 h-5 rounded-full bg-white text-slate-700 font-extrabold text-[11px] flex items-center justify-center border border-slate-200 shadow-2xs">
                  {items.length}
                </span>
              </div>

              {/* Column Task Cards */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-[11px] font-semibold text-slate-400">No inspection tasks</p>
                  </div>
                ) : (
                  items.map((item) => {
                    let priorityBadge = 'bg-slate-100 text-slate-600 border-slate-200';
                    if (item.priority === 'CRITICAL') priorityBadge = 'bg-red-50 text-red-700 border-red-200';
                    else if (item.priority === 'HIGH') priorityBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                    else if (item.priority === 'LOW') priorityBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 space-y-2.5 group"
                      >
                        {/* Top: Work Order & Priority Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-orange-600 text-[11px] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                            {item.workOrderNumber}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${priorityBadge}`}
                          >
                            {item.priority}
                          </span>
                        </div>

                        {/* Title & Customer */}
                        <div>
                          <h4
                            onClick={() => setActiveItem(item)}
                            className="text-xs font-extrabold text-slate-900 group-hover:text-orange-600 cursor-pointer transition-colors leading-snug"
                          >
                            {item.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                            {item.customerName} • {item.machineModel}
                          </p>
                        </div>

                        {/* Progress Meter */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                            <span>Inspection Progress</span>
                            <span className="font-bold text-slate-800">{item.completionPercent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                item.status === 'COMPLETED'
                                  ? 'bg-emerald-500'
                                  : item.status === 'ON_HOLD'
                                  ? 'bg-amber-500'
                                  : 'bg-sky-500'
                              }`}
                              style={{ width: `${item.completionPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Inspector & Target Date */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <div className="flex items-center gap-1 font-semibold text-slate-700">
                            <UserCheck className="w-3 h-3 text-orange-500" />
                            <span className="truncate max-w-[100px]">{item.assignedToUserName}</span>
                          </div>
                          {item.targetEndDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{new Date(item.targetEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                            </div>
                          )}
                        </div>

                        {/* Quick Status Transition Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                          {col.key !== 'NOT_STARTED' && (
                            <button
                              onClick={() =>
                                handleMoveStatus(
                                  item,
                                  col.key === 'COMPLETED'
                                    ? 'IN_PROGRESS'
                                    : col.key === 'ON_HOLD'
                                    ? 'IN_PROGRESS'
                                    : 'NOT_STARTED'
                                )
                              }
                              title="Move back"
                              className="px-2 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              ← Back
                            </button>
                          )}
                          <div className="flex items-center gap-1 ml-auto">
                            {col.key !== 'ON_HOLD' && col.key !== 'COMPLETED' && (
                              <button
                                onClick={() => handleMoveStatus(item, 'ON_HOLD')}
                                title="Hold for Snag"
                                className="px-2 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                              >
                                Hold
                              </button>
                            )}
                            {col.key !== 'COMPLETED' && (
                              <button
                                onClick={() =>
                                  handleMoveStatus(
                                    item,
                                    col.key === 'NOT_STARTED' || col.key === 'ON_HOLD'
                                      ? 'IN_PROGRESS'
                                      : 'COMPLETED'
                                  )
                                }
                                title="Advance"
                                className="px-2 py-1 text-[10px] font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-2xs transition-colors"
                              >
                                {col.key === 'NOT_STARTED'
                                  ? 'Start →'
                                  : col.key === 'ON_HOLD'
                                  ? 'Resume →'
                                  : 'Pass ✓'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAIL DOSSIER / REMARKS MODAL */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header Ribbon */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">{activeItem.title}</h2>
                </div>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Order</p>
                  <p className="font-mono font-bold text-orange-600 text-xs mt-0.5">{activeItem.workOrderNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{activeItem.status.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</p>
                  <p className="font-semibold text-slate-800 text-xs mt-0.5">{activeItem.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Machine Model</p>
                  <p className="font-semibold text-slate-800 text-xs mt-0.5">{activeItem.machineModel}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Inspector</p>
                  <p className="font-semibold text-orange-600 text-xs mt-0.5">{activeItem.assignedToUserName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Hours</p>
                  <p className="font-semibold text-slate-800 text-xs mt-0.5">{activeItem.estimatedHours} hrs</p>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Inspection Completion</span>
                  <span>{activeItem.completionPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={activeItem.completionPercent}
                  onChange={(e) =>
                    setActiveItem({ ...activeItem, completionPercent: Number(e.target.value) })
                  }
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              {/* Inspection Notes & Snags */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inspection Notes & Snags</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {activeItem.remarks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No notes recorded yet.</p>
                  ) : (
                    activeItem.remarks.map((r, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <p className="text-slate-700 font-medium">{r.text}</p>
                        {r.createdAt && (
                          <p className="text-[10px] text-slate-400">
                            {new Date(r.createdAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add an inspection observation or snag note..."
                    value={newRemarkText}
                    onChange={(e) => setNewRemarkText(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                  />
                  <button
                    onClick={handleAddRemark}
                    disabled={!newRemarkText.trim() || isUpdating}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => setActiveItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    try {
                      await updateSubStageTrigger({
                        subStageId: activeItem.id,
                        completionPercent: activeItem.completionPercent,
                        status:
                          activeItem.completionPercent >= 100
                            ? 'COMPLETED'
                            : activeItem.completionPercent > 0
                            ? 'IN_PROGRESS'
                            : activeItem.status
                      }).unwrap();
                      dispatch(
                        addToast({
                          title: 'Changes Saved',
                          message: 'Inspection stage updated successfully.',
                          type: 'success'
                        })
                      );
                      setActiveItem(null);
                      refetch();
                    } catch (err: any) {
                      dispatch(
                        addToast({
                          title: 'Save Failed',
                          message: err?.data?.message || 'Could not update stage.',
                          type: 'error'
                        })
                      );
                    }
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
