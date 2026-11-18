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

type KanbanColumnKey = 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';

interface ProductionSubStageItem {
  id: string;
  subStageCode: string;
  title: string;
  productionLine: ProductionLineKey;
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

export default function ProductionKanbanTab() {
  const dispatch = useAppDispatch();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('ALL');
  const [selectedLine, setSelectedLine] = useState<'ALL' | ProductionLineKey>('ALL');

  // Drag-and-Drop State
  const [draggedSubStageId, setDraggedSubStageId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnKey | null>(null);

  // Remarks Drawer State
  const [activeRemarkSubStage, setActiveRemarkSubStage] = useState<ProductionSubStageItem | null>(null);
  const [newRemarkText, setNewRemarkText] = useState('');

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({
    departmentModule: 'production'
  });
  const { data: teamData } = useGetProductionTeamQuery();
  const [updateSubStageTrigger, { isLoading: isUpdatingSubStage }] = useUpdateSubStageMutation();

  const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const teamMembers = useMemo(() => teamData?.members || [], [teamData]);

  // Extract all production sub-stages across all active projects
  const allProductionSubStages = useMemo<ProductionSubStageItem[]>(() => {
    const list: ProductionSubStageItem[] = [];

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
        prodMilestone.subStages.forEach((s: any) => {
          let st: KanbanColumnKey = 'NOT_STARTED';
          const rawStatus = (s.status || '').toUpperCase();
          if (rawStatus === 'COMPLETED' || rawStatus === 'DONE') st = 'COMPLETED';
          else if (rawStatus === 'IN_PROGRESS' || rawStatus === 'ACTIVE') st = 'IN_PROGRESS';
          else if (rawStatus === 'ON_HOLD' || rawStatus === 'BLOCKED') st = 'ON_HOLD';
          else st = 'NOT_STARTED';

          list.push({
            id: s.id,
            subStageCode: s.subStageCode || 'PRD-SS',
            title: s.title || 'Assembly Stage',
            productionLine: resolveSubStageLine(s),
            status: st,
            completionPercent: Number(s.completionPercent || (st === 'COMPLETED' ? 100 : st === 'IN_PROGRESS' ? 50 : 0)),
            assignedToUserId: s.assignedUserId || s.assignedToUserId,
            assignedToUserName: s.assignedUserName || s.assignedToUserName || 'Unassigned',
            baselineStartDate: s.baselineStartDate,
            targetEndDate: s.targetEndDate,
            actualCompletionDate: s.actualCompletionDate,
            priority: (s.priority || 'MEDIUM').toUpperCase(),
            estimatedHours: Number(s.estimatedHours || 16),
            actualHours: Number(s.actualHours || 0),
            remarks: Array.isArray(s.remarks) ? s.remarks : [],
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
    return allProductionSubStages.filter((item) => {
      if (selectedProjectId !== 'ALL' && item.workOrderNumber !== selectedProjectId && item.projectId !== selectedProjectId) {
        return false;
      }
      if (selectedTechnicianId !== 'ALL' && item.assignedToUserId !== selectedTechnicianId && item.assignedToUserName !== selectedTechnicianId) {
        return false;
      }
      if (selectedLine !== 'ALL' && item.productionLine !== selectedLine) {
        return false;
      }
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
      return true;
    });
  }, [allProductionSubStages, selectedProjectId, selectedTechnicianId, selectedLine, searchTerm]);

  // Group by Column
  const columns = useMemo(() => {
    return {
      NOT_STARTED: filteredSubStages.filter((s) => s.status === 'NOT_STARTED'),
      IN_PROGRESS: filteredSubStages.filter((s) => s.status === 'IN_PROGRESS'),
      ON_HOLD: filteredSubStages.filter((s) => s.status === 'ON_HOLD'),
      COMPLETED: filteredSubStages.filter((s) => s.status === 'COMPLETED')
    };
  }, [filteredSubStages]);

  // Handle Drag & Drop move
  const handleDropOnColumn = async (targetColumn: KanbanColumnKey) => {
    if (!draggedSubStageId) return;
    const targetItem = allProductionSubStages.find((s) => s.id === draggedSubStageId);
    if (!targetItem || targetItem.status === targetColumn) {
      setDraggedSubStageId(null);
      setDragOverColumn(null);
      return;
    }

    try {
      await updateSubStageTrigger({
        subStageId: targetItem.id,
        status: targetColumn,
        completionPercent: targetColumn === 'COMPLETED' ? 100 : targetColumn === 'IN_PROGRESS' ? 50 : 0
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: `Moved "${targetItem.title}" to ${targetColumn.replace('_', ' ')}.`
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: 'Could not update status right now.'
        })
      );
    } finally {
      setDraggedSubStageId(null);
      setDragOverColumn(null);
    }
  };

  // Quick move via button click
  const handleMoveStatus = async (item: ProductionSubStageItem, targetColumn: KanbanColumnKey) => {
    try {
      await updateSubStageTrigger({
        subStageId: item.id,
        status: targetColumn,
        completionPercent: targetColumn === 'COMPLETED' ? 100 : targetColumn === 'IN_PROGRESS' ? 50 : 0
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: `Updated "${item.title}" to ${targetColumn.replace('_', ' ')}.`
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: 'Could not update status.'
        })
      );
    }
  };

  // Add Remark
  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRemarkSubStage || !newRemarkText.trim()) return;

    try {
      await updateSubStageTrigger({
        subStageId: activeRemarkSubStage.id,
        remark: newRemarkText.trim()
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: 'Assembly note recorded successfully.'
        })
      );
      setNewRemarkText('');
      setActiveRemarkSubStage(null);
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: 'Failed to record assembly note.'
        })
      );
    }
  };

  // Project Filter Options for SearchableSelect
  const projectOptions: SearchableSelectOption[] = useMemo(() => {
    return rawProjects.map((p: any) => ({
      value: p.workOrderNumber || p.projectId,
      label: `${p.workOrderNumber || p.projectId} • ${p.customerName || 'Customer'}`,
      subLabel: `${p.machineModel || 'Machine'} • ${p.projectName}`
    }));
  }, [rawProjects]);

  // Column Headers Config
  const COLUMN_CONFIG: Record<
    KanbanColumnKey,
    { label: string; bg: string; border: string; badge: string; text: string }
  > = {
    NOT_STARTED: {
      label: 'To Do / Pending',
      bg: 'bg-slate-50/70',
      border: 'border-slate-200',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      text: 'text-slate-700'
    },
    IN_PROGRESS: {
      label: 'In Assembly',
      bg: 'bg-sky-50/50',
      border: 'border-sky-200',
      badge: 'bg-sky-100 text-sky-800 border-sky-300',
      text: 'text-sky-800'
    },
    ON_HOLD: {
      label: 'On Hold / Snags',
      bg: 'bg-amber-50/50',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      text: 'text-amber-800'
    },
    COMPLETED: {
      label: 'Completed / Gate Passed',
      bg: 'bg-emerald-50/50',
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      text: 'text-emerald-800'
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Side: Work Order SearchableSelect & Search */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
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

          {/* Technician Filter */}
          <select
            value={selectedTechnicianId}
            onChange={(e) => setSelectedTechnicianId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Technicians</option>
            {teamMembers.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.fullName} ({t.designation})
              </option>
            ))}
          </select>

          {/* Keyword Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search stage code, title..."
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

        {/* Right Side: Total Summary */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {(selectedProjectId !== 'ALL' || selectedTechnicianId !== 'ALL' || selectedLine !== 'ALL' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSelectedProjectId('ALL');
                setSelectedTechnicianId('ALL');
                setSelectedLine('ALL');
                setSearchTerm('');
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}

          <div className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-xl text-xs font-bold text-orange-800 flex items-center gap-1.5">
            <Kanban className="w-3.5 h-3.5 text-orange-600" />
            <span>{filteredSubStages.length} Sub-Stages</span>
          </div>
        </div>
      </div>

      {/* Kanban Board 4-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {(Object.keys(COLUMN_CONFIG) as KanbanColumnKey[]).map((colKey) => {
          const cfg = COLUMN_CONFIG[colKey];
          const items = columns[colKey];
          const isDragTarget = dragOverColumn === colKey;

          return (
            <div
              key={colKey}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(colKey);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={() => handleDropOnColumn(colKey)}
              className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-3.5 flex flex-col min-h-[500px] transition-all ${
                isDragTarget ? 'ring-2 ring-orange-500 ring-offset-2' : ''
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <h3 className={`text-xs font-extrabold uppercase tracking-wider ${cfg.text}`}>
                    {cfg.label}
                  </h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.badge}`}>
                  {items.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No tasks in this stage
                  </div>
                ) : (
                  items.map((item) => {
                    const isDragging = draggedSubStageId === item.id;
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => setDraggedSubStageId(item.id)}
                        className={`bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-orange-300 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
                          isDragging ? 'opacity-40 scale-95' : ''
                        }`}
                      >
                        {/* Work Order Tag & Parallel Line Badge */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-[10px] font-extrabold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                            {item.workOrderNumber}
                          </span>
                          {(() => {
                            const lineCfg = PRODUCTION_LINES.find((l) => l.key === item.productionLine) || PRODUCTION_LINES[0];
                            return (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${lineCfg.badgeClass}`}
                              >
                                {lineCfg.shortLabel}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Title & Code */}
                        <div className="space-y-0.5 mb-2.5">
                          <div className="text-xs font-extrabold text-slate-900 leading-tight">
                            {item.title}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 font-semibold truncate">
                            {item.subStageCode} • {item.customerName}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1 mb-2.5">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-500">Assembly Progress</span>
                            <span className="font-mono text-slate-800">{item.completionPercent}%</span>
                          </div>
                          <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                colKey === 'COMPLETED' ? 'bg-emerald-500' : 'bg-orange-500'
                              }`}
                              style={{ width: `${item.completionPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Assigned Technician & Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium truncate max-w-[140px]">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{item.assignedToUserName}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveRemarkSubStage(item);
                                setNewRemarkText('');
                              }}
                              className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                              title="Assembly Remarks & Notes"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>

                            {/* Quick Move Trigger */}
                            {colKey !== 'COMPLETED' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleMoveStatus(
                                    item,
                                    colKey === 'NOT_STARTED'
                                      ? 'IN_PROGRESS'
                                      : 'COMPLETED'
                                  )
                                }
                                className="px-2 py-0.5 bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-700 text-[10px] font-bold rounded transition-colors"
                              >
                                {colKey === 'NOT_STARTED' ? 'Start' : 'Complete'}
                              </button>
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
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

      {/* Remarks Slide-over / Modal */}
      {activeRemarkSubStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-slate-900 text-sm font-extrabold tracking-tight">
                  Assembly Remarks: {activeRemarkSubStage.title}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {activeRemarkSubStage.workOrderNumber} • {activeRemarkSubStage.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveRemarkSubStage(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Existing Remarks List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeRemarkSubStage.remarks.length === 0 ? (
                  <div className="text-xs text-slate-400 italic text-center py-4">
                    No remarks recorded yet for this stage.
                  </div>
                ) : (
                  activeRemarkSubStage.remarks.map((r, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold text-slate-700">{r.authorName || 'Technician'}</span>
                        <span>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
                      </div>
                      <p className="text-slate-700">{r.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Remark Form */}
              <form onSubmit={handleAddRemark} className="space-y-3 pt-2 border-t border-slate-100">
                <textarea
                  rows={3}
                  value={newRemarkText}
                  onChange={(e) => setNewRemarkText(e.target.value)}
                  placeholder="Record an assembly update, torque check, or snag note..."
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-none"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveRemarkSubStage(null)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingSubStage || !newRemarkText.trim()}
                    className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                  >
                    {isUpdatingSubStage ? 'Saving...' : 'Add Note'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

