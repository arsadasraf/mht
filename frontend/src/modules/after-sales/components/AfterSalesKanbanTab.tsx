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
  Headphones,
  ShieldCheck
} from 'lucide-react';
import {
  useGetProjectsQuery,
  useUpdateSubStageMutation
} from '../../project-setup/api/projectApi';
import { useGetAfterSalesTeamQuery } from '../api/afterSalesApi';
import SearchableSelect, { SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';

type KanbanColumnKey = 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';

interface AfterSalesSubStageItem {
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

export default function AfterSalesKanbanTab() {
  const dispatch = useAppDispatch();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Modals & Drawers
  const [activeItem, setActiveItem] = useState<AfterSalesSubStageItem | null>(null);
  const [newRemarkText, setNewRemarkText] = useState('');

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects, refetch } = useGetProjectsQuery({
    departmentModule: 'after-sales'
  });
  const { data: teamData } = useGetAfterSalesTeamQuery();

  // Mutations
  const [updateSubStageTrigger, { isLoading: isUpdating }] = useUpdateSubStageMutation();

  const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const teamMembers = useMemo(() => teamData?.members || [], [teamData]);

  // Extract all attached Sub-Stages from After-Sales Milestones
  const allSubStages: AfterSalesSubStageItem[] = useMemo(() => {
    const list: AfterSalesSubStageItem[] = [];

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
      subStages.forEach((s: any) => {
        let status: KanbanColumnKey = 'NOT_STARTED';
        const st = String(s.status || '').toUpperCase();
        if (st === 'COMPLETED' || st === 'DONE' || st === 'PASSED') status = 'COMPLETED';
        else if (st === 'IN_PROGRESS' || st === 'ACTIVE') status = 'IN_PROGRESS';
        else if (st === 'ON_HOLD' || st === 'BLOCKED' || st === 'SITE_HOLD') status = 'ON_HOLD';

        list.push({
          id: s.id,
          subStageCode: s.subStageCode || 'AST-SS',
          title: s.title || s.subStageName || 'Service Stage',
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
          milestoneId: afterSalesMilestone.id
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

  // Engineer options for SearchableSelect
  const engineerOptions: SearchableSelectOption[] = useMemo(() => {
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
        const eng = (item.assignedToUserName || '').toLowerCase();
        if (!code.includes(q) && !title.includes(q) && !wo.includes(q) && !cust.includes(q) && !eng.includes(q)) {
          return false;
        }
      }
      if (selectedProjectId !== 'ALL' && item.projectId !== selectedProjectId) return false;
      if (selectedEngineerId !== 'ALL' && item.assignedToUserId !== selectedEngineerId) return false;
      if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
      return true;
    });
  }, [allSubStages, searchTerm, selectedProjectId, selectedEngineerId, priorityFilter]);

  // Columns partition
  const columns: { key: KanbanColumnKey; label: string; count: number; borderClass: string; bgBadge: string }[] = useMemo(
    () => [
      {
        key: 'NOT_STARTED',
        label: 'Pending Deployment',
        count: filteredItems.filter((i) => i.status === 'NOT_STARTED').length,
        borderClass: 'border-t-slate-400',
        bgBadge: 'bg-slate-100 text-slate-700'
      },
      {
        key: 'IN_PROGRESS',
        label: 'Active On-Site',
        count: filteredItems.filter((i) => i.status === 'IN_PROGRESS').length,
        borderClass: 'border-t-amber-500',
        bgBadge: 'bg-amber-100 text-amber-800'
      },
      {
        key: 'ON_HOLD',
        label: 'Site Hold / Parts',
        count: filteredItems.filter((i) => i.status === 'ON_HOLD').length,
        borderClass: 'border-t-red-500',
        bgBadge: 'bg-red-100 text-red-800'
      },
      {
        key: 'COMPLETED',
        label: 'Commissioned & Signed',
        count: filteredItems.filter((i) => i.status === 'COMPLETED').length,
        borderClass: 'border-t-emerald-500',
        bgBadge: 'bg-emerald-100 text-emerald-800'
      }
    ],
    [filteredItems]
  );

  // Status changer
  const handleMoveStatus = async (item: AfterSalesSubStageItem, newStatus: KanbanColumnKey) => {
    try {
      await updateSubStageTrigger({
        subStageId: item.id,
        status: newStatus,
        completionPercent: newStatus === 'COMPLETED' ? 100 : newStatus === 'NOT_STARTED' ? 0 : item.completionPercent,
        actualCompletionDate: newStatus === 'COMPLETED' ? new Date().toISOString() : null
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: `All set! ${item.title} moved to ${newStatus.replace('_', ' ')}.`
        })
      );
      if (activeItem?.id === item.id) {
        setActiveItem({
          ...activeItem,
          status: newStatus,
          completionPercent: newStatus === 'COMPLETED' ? 100 : activeItem.completionPercent
        });
      }
      refetch();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err?.data?.message || 'Could not update status.' }));
    }
  };

  // Add Remark
  const handleAddRemark = async () => {
    if (!activeItem || !newRemarkText.trim()) return;
    const remarkObj = {
      text: newRemarkText.trim(),
      authorName: 'Field Service',
      createdAt: new Date().toISOString()
    };
    const updatedRemarks = [...activeItem.remarks, remarkObj];

    try {
      await updateSubStageTrigger({
        subStageId: activeItem.id,
        remarks: updatedRemarks
      }).unwrap();

      setActiveItem({ ...activeItem, remarks: updatedRemarks });
      setNewRemarkText('');
      dispatch(addToast({ type: 'success', message: 'Field note added.' }));
      refetch();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: 'Failed to add note.' }));
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedProjectId('ALL');
    setSelectedEngineerId('ALL');
    setPriorityFilter('ALL');
  };

  const hasActiveFilters =
    searchTerm.trim() || selectedProjectId !== 'ALL' || selectedEngineerId !== 'ALL' || priorityFilter !== 'ALL';

  return (
    <div className="space-y-4 pb-16">
      {/* Kanban Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Live Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search stage, WO, customer..."
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

          {/* SearchableSelect: Engineer Filter */}
          <SearchableSelect
            label="Field Engineer"
            options={engineerOptions}
            value={selectedEngineerId}
            onChange={(val) => setSelectedEngineerId(val)}
            placeholder="All Field Engineers"
            allOptionLabel="All Field Engineers"
            className="w-44 sm:w-52"
          />

          {/* Priority Filter */}
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

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-500">
            Total Service Tasks: <span className="text-slate-900">{filteredItems.length}</span>
          </span>
        </div>
      </div>

      {/* 4-Column Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const colItems = filteredItems.filter((it) => it.status === col.key);

          return (
            <div
              key={col.key}
              className={`bg-slate-50/80 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col max-h-[82vh] border-t-4 ${col.borderClass}`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white rounded-t-xl">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">{col.label}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${col.bgBadge}`}>
                    {col.count}
                  </span>
                </div>
              </div>

              {/* Items Container */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {colItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">No tasks in this stage</div>
                ) : (
                  colItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setActiveItem(item)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-orange-300 transition-all cursor-pointer space-y-2.5"
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                          {item.workOrderNumber}
                        </span>
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded ${
                            item.priority === 'CRITICAL'
                              ? 'bg-red-100 text-red-700'
                              : item.priority === 'HIGH'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </div>

                      {/* Title & Customer */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">{item.title}</h4>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.customerName} • {item.machineModel}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
                          <span>Progress</span>
                          <span className="font-mono">{item.completionPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${item.completionPercent >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                            style={{ width: `${item.completionPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer: Engineer & Quick Move */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 text-slate-600 truncate max-w-[120px]">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{item.assignedToUserName}</span>
                        </span>

                        <div className="flex items-center gap-1">
                          {item.status !== 'NOT_STARTED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const prevStatus: KanbanColumnKey =
                                  item.status === 'COMPLETED'
                                    ? 'IN_PROGRESS'
                                    : item.status === 'ON_HOLD'
                                    ? 'IN_PROGRESS'
                                    : 'NOT_STARTED';
                                handleMoveStatus(item, prevStatus);
                              }}
                              title="Move back"
                              className="px-1.5 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded"
                            >
                              ←
                            </button>
                          )}
                          {item.status !== 'COMPLETED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextStatus: KanbanColumnKey =
                                  item.status === 'NOT_STARTED'
                                    ? 'IN_PROGRESS'
                                    : item.status === 'IN_PROGRESS'
                                    ? 'COMPLETED'
                                    : 'IN_PROGRESS';
                                handleMoveStatus(item, nextStatus);
                              }}
                              title="Move forward"
                              className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-orange-500 hover:bg-orange-600 rounded"
                            >
                              →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAIL DRAWER / MODAL */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-slate-900 text-sm font-extrabold tracking-tight">{activeItem.title}</h2>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {activeItem.workOrderNumber} • {activeItem.customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Status Switcher Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Service Lifecycle Status</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'] as KanbanColumnKey[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleMoveStatus(activeItem, st)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all text-center ${
                        activeItem.status === st
                          ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st === 'NOT_STARTED'
                        ? 'Pending'
                        : st === 'IN_PROGRESS'
                        ? 'In Progress'
                        : st === 'ON_HOLD'
                        ? 'On Hold'
                        : 'Completed'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Task Completion</span>
                  <span className="font-mono text-orange-600">{activeItem.completionPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={activeItem.completionPercent}
                  onChange={async (e) => {
                    const val = Number(e.target.value);
                    const newStatus: KanbanColumnKey =
                      val === 100 ? 'COMPLETED' : val === 0 ? 'NOT_STARTED' : 'IN_PROGRESS';
                    setActiveItem({ ...activeItem, completionPercent: val, status: newStatus });
                    await updateSubStageTrigger({
                      subStageId: activeItem.id,
                      completionPercent: val,
                      status: newStatus,
                      actualCompletionDate: val === 100 ? new Date().toISOString() : null
                    });
                    refetch();
                  }}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Field Engineer</span>
                  <span className="font-bold text-slate-800">{activeItem.assignedToUserName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Est. Duration</span>
                  <span className="font-bold text-slate-800">{activeItem.estimatedHours} hrs</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Machine Model</span>
                  <span className="font-medium text-slate-700">{activeItem.machineModel}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Priority</span>
                  <span className="font-bold text-orange-600">{activeItem.priority}</span>
                </div>
              </div>

              {/* Field Notes & Remarks Stream */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Field Service Notes & Remarks</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {activeItem.remarks.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">No notes recorded yet.</p>
                  ) : (
                    activeItem.remarks.map((r, rIdx) => (
                      <div key={rIdx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                        <p className="text-slate-800">{r.text}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          {r.authorName || 'Field'} • {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add on-site observation or snag notes..."
                    value={newRemarkText}
                    onChange={(e) => setNewRemarkText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRemark()}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddRemark}
                    disabled={!newRemarkText.trim()}
                    className="px-3 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
