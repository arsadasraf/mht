'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import {
  useGetProjectsQuery,
  useUpdateSubStageMutation,
  useGetDepartmentUsersQuery
} from '../../project-setup/api/projectApi';
import SearchableSelect, { SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import WorkOrderBomBadge from '../../../components/ui/WorkOrderBomBadge';
import Link from 'next/link';

type KanbanColumnKey = 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';

interface PurchaseSubStageItem {
  id: string;
  subStageCode: string;
  title: string;
  status: KanbanColumnKey;
  completionPercent: number;
  assignedToUserId?: string | null;
  assignedToUserName?: string;
  assignedToUserEmail?: string;
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
  milestoneTitle: string;
  bomAttached?: boolean;
  bomStatus?: string;
  isBomLocked?: boolean;
  attachedDrawingsCount?: number;
}

export interface PurchaseKanbanTabProps {
  initialProjectId?: string;
}

export default function PurchaseKanbanTab({ initialProjectId }: PurchaseKanbanTabProps = {}) {
  const searchParams = useSearchParams();
  const effectiveInitialProjectId =
    initialProjectId && initialProjectId !== 'ALL'
      ? initialProjectId
      : searchParams?.get('projectId') || 'ALL';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(effectiveInitialProjectId);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  useEffect(() => {
    if (initialProjectId && initialProjectId !== 'ALL') {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  useEffect(() => {
    const urlProj = searchParams?.get('projectId');
    if (urlProj && urlProj !== 'ALL') {
      setSelectedProjectId(urlProj);
    }
  }, [searchParams]);

  // Drag-and-Drop State
  const [draggedSubStageId, setDraggedSubStageId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnKey | null>(null);

  // Remarks Drawer State
  const [activeRemarkSubStage, setActiveRemarkSubStage] = useState<PurchaseSubStageItem | null>(null);
  const [newRemarkText, setNewRemarkText] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({
    departmentModule: 'purchase'
  });
  const { data: deptUsersData } = useGetDepartmentUsersQuery();
  const [updateSubStage, { isLoading: isUpdatingSubStage }] = useUpdateSubStageMutation();

  const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const departmentUsers = useMemo(() => deptUsersData?.users || [], [deptUsersData]);

  // Filter purchase & procurement eligible team members
  const purchaseUsers = useMemo(() => {
    return departmentUsers.filter((u: any) => {
      const dept = String(u.department || '').toLowerCase();
      const role = String(u.role?.name || u.role || '').toLowerCase();
      return (
        dept.includes('purchase') ||
        dept.includes('procurement') ||
        dept.includes('store') ||
        dept.includes('supply') ||
        role.includes('purchase') ||
        role.includes('buyer') ||
        role.includes('procurement') ||
        role.includes('admin') ||
        role.includes('manager')
      );
    });
  }, [departmentUsers]);

  // Extract all purchase sub-stages across all active projects
  const allPurchaseSubStages = useMemo<PurchaseSubStageItem[]>(() => {
    const list: PurchaseSubStageItem[] = [];

    rawProjects.forEach((proj: any) => {
      const milestones = proj.milestones || [];
      const purchaseMilestone =
        milestones.find(
          (m: any) =>
            (m.departmentModule && m.departmentModule.toLowerCase() === 'purchase') ||
            (m.stageCode && m.stageCode.toLowerCase().includes('purch')) ||
            (m.title && m.title.toLowerCase().includes('purch'))
        ) || null;

      if (!purchaseMilestone) return;

      const subStages = purchaseMilestone.subStages || [];
      subStages.forEach((sub: any) => {
        let colKey: KanbanColumnKey = 'NOT_STARTED';
        const st = (sub.status || '').toUpperCase();
        if (st === 'COMPLETED') colKey = 'COMPLETED';
        else if (st === 'IN_PROGRESS') colKey = 'IN_PROGRESS';
        else if (st === 'ON_HOLD' || st === 'BLOCKED' || st === 'PENDING') colKey = 'ON_HOLD';
        else colKey = 'NOT_STARTED';

        list.push({
          id: sub.id || sub._id,
          subStageCode: sub.subStageCode || 'PUR-SUB',
          title: sub.title || sub.subStageName || 'Procurement Activity',
          status: colKey,
          completionPercent:
            sub.completionPercent ?? (colKey === 'COMPLETED' ? 100 : colKey === 'IN_PROGRESS' ? 50 : 0),
          assignedToUserId: sub.assignedToUserId,
          assignedToUserName: sub.assignedToUserName || '',
          assignedToUserEmail: sub.assignedToUserEmail || '',
          baselineStartDate: sub.baselineStartDate,
          targetEndDate: sub.targetEndDate,
          actualCompletionDate: sub.actualCompletionDate,
          priority: (sub.priority || 'MEDIUM').toUpperCase(),
          estimatedHours: sub.estimatedHours || 0,
          actualHours: sub.actualHours || 0,
          remarks: Array.isArray(sub.remarks) ? sub.remarks : [],
          projectId: proj.projectId,
          workOrderNumber: proj.workOrderNumber || proj.projectId || 'WO-PENDING',
          customerName: proj.customerName || 'Customer',
          machineModel: proj.machineModel || 'Precision Winding Unit',
          milestoneId: purchaseMilestone.id || purchaseMilestone._id,
          milestoneTitle: purchaseMilestone.title || 'Purchase & Sourcing',
          bomAttached: proj.bomAttached || proj.hasBom,
          bomStatus: proj.bomStatus,
          isBomLocked: proj.isBomLocked,
          attachedDrawingsCount: proj.attachedDrawingsCount || proj.drawingsCount
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

  // Buyer options for SearchableSelect
  const buyerFilterOptions = useMemo<SearchableSelectOption[]>(() => {
    const opts: SearchableSelectOption[] = [
      {
        value: 'UNASSIGNED',
        label: 'Unassigned Activities',
        subLabel: 'Pending buyer allocation'
      }
    ];

    purchaseUsers.forEach((buyer: any) => {
      opts.push({
        value: buyer.id,
        label: buyer.name || `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim(),
        subLabel: buyer.role?.name || buyer.email,
        badge: 'Procurement'
      });
    });

    return opts;
  }, [purchaseUsers]);

  // Priority options for SearchableSelect
  const priorityFilterOptions = useMemo<SearchableSelectOption[]>(() => {
    return [
      { value: 'CRITICAL', label: 'Critical Priority', badge: 'Critical' },
      { value: 'HIGH', label: 'High Priority', badge: 'High' },
      { value: 'MEDIUM', label: 'Medium Priority', badge: 'Medium' },
      { value: 'LOW', label: 'Low Priority', badge: 'Low' }
    ];
  }, []);

  // Filter sub-stages
  const filteredSubStages = useMemo(() => {
    return allPurchaseSubStages.filter((sub) => {
      // 1. Project filter
      if (selectedProjectId !== 'ALL' && sub.projectId !== selectedProjectId) {
        return false;
      }

      // 2. Buyer filter
      if (selectedBuyerId !== 'ALL') {
        if (selectedBuyerId === 'UNASSIGNED') {
          if (sub.assignedToUserId) return false;
        } else if (sub.assignedToUserId !== selectedBuyerId) {
          return false;
        }
      }

      // 3. Priority filter
      if (selectedPriority !== 'ALL' && sub.priority !== selectedPriority) {
        return false;
      }

      // 4. In-line Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesCode = sub.subStageCode.toLowerCase().includes(q);
        const matchesTitle = sub.title.toLowerCase().includes(q);
        const matchesWo = sub.workOrderNumber.toLowerCase().includes(q);
        const matchesCust = sub.customerName.toLowerCase().includes(q);
        const matchesModel = sub.machineModel.toLowerCase().includes(q);
        const matchesUser = (sub.assignedToUserName || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle && !matchesWo && !matchesCust && !matchesModel && !matchesUser) {
          return false;
        }
      }

      return true;
    });
  }, [allPurchaseSubStages, selectedProjectId, selectedBuyerId, selectedPriority, searchTerm]);

  // Group into the 4 standard Kanban columns
  const columns = useMemo(() => {
    return {
      NOT_STARTED: filteredSubStages.filter((s) => s.status === 'NOT_STARTED'),
      IN_PROGRESS: filteredSubStages.filter((s) => s.status === 'IN_PROGRESS'),
      ON_HOLD: filteredSubStages.filter((s) => s.status === 'ON_HOLD'),
      COMPLETED: filteredSubStages.filter((s) => s.status === 'COMPLETED')
    };
  }, [filteredSubStages]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      selectedProjectId !== 'ALL' ||
      selectedBuyerId !== 'ALL' ||
      selectedPriority !== 'ALL'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedProjectId('ALL');
    setSelectedBuyerId('ALL');
    setSelectedPriority('ALL');
  };

  // Move Sub-Stage to a new status (Global DB Synchronization via RTK Query)
  const handleMoveSubStage = async (subStageId: string, nextStatus: KanbanColumnKey) => {
    const targetItem = allPurchaseSubStages.find((s) => s.id === subStageId);
    if (!targetItem || targetItem.status === nextStatus) return;

    try {
      await updateSubStage({
        subStageId,
        status: nextStatus
      }).unwrap();

      showToast(`All set! ${targetItem.title} moved to ${nextStatus.replace(/_/g, ' ')}.`, 'success');
    } catch (err: any) {
      showToast(err?.data?.message || err?.message || 'We could not update the sub-stage status right now.', 'error');
    }
  };

  // HTML5 Drag-and-Drop Handlers
  const handleDragStart = (e: React.DragEvent, subStageId: string) => {
    e.dataTransfer.setData('text/plain', subStageId);
    setDraggedSubStageId(subStageId);
  };

  const handleDragEnd = () => {
    setDraggedSubStageId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, colKey: KanbanColumnKey) => {
    e.preventDefault();
    if (dragOverColumn !== colKey) {
      setDragOverColumn(colKey);
    }
  };

  const handleDrop = (e: React.DragEvent, colKey: KanbanColumnKey) => {
    e.preventDefault();
    const subStageId = e.dataTransfer.getData('text/plain') || draggedSubStageId;
    if (subStageId) {
      handleMoveSubStage(subStageId, colKey);
    }
    setDraggedSubStageId(null);
    setDragOverColumn(null);
  };

  // Add Remark Handler
  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRemarkSubStage || !newRemarkText.trim()) return;

    try {
      await updateSubStage({
        subStageId: activeRemarkSubStage.id,
        remarkText: newRemarkText.trim()
      }).unwrap();

      showToast('Remark posted successfully.', 'success');
      setNewRemarkText('');
      setActiveRemarkSubStage((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          remarks: [
            ...prev.remarks,
            {
              text: newRemarkText.trim(),
              createdAt: new Date().toISOString()
            }
          ]
        };
      });
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not post remark right now.', 'error');
    }
  };

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = allPurchaseSubStages.length;
    const inProgress = allPurchaseSubStages.filter((s) => s.status === 'IN_PROGRESS').length;
    const onHold = allPurchaseSubStages.filter((s) => s.status === 'ON_HOLD').length;
    const completed = allPurchaseSubStages.filter((s) => s.status === 'COMPLETED').length;
    const overdue = allPurchaseSubStages.filter((s) => {
      if (s.status === 'COMPLETED') return false;
      if (!s.targetEndDate) return false;
      return new Date(s.targetEndDate).getTime() < Date.now();
    }).length;

    return { total, inProgress, onHold, completed, overdue };
  }, [allPurchaseSubStages]);

  // Width percentage to pure Tailwind CSS class
  const getProgressWidthClass = (percent: number, status: KanbanColumnKey) => {
    if (status === 'COMPLETED') return 'w-full';
    if (percent >= 90) return 'w-11/12';
    if (percent >= 75) return 'w-3/4';
    if (percent >= 50) return 'w-1/2';
    if (percent >= 25) return 'w-1/4';
    if (percent > 0) return 'w-1/12';
    return 'w-0';
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
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
          ) : toastMessage.type === 'info' ? (
            <AlertTriangle size={16} className="text-amber-400" />
          ) : (
            <AlertTriangle size={16} />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner with Industrial Identity & KPI Chips */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 border-t-4 border-t-amber-400 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0 shadow-xs">
            <Kanban size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              Purchase Sub-Stages Kanban
            </h1>
            <div className="text-[11px] font-medium text-slate-500">
              Procurement Workflow &amp; Task Progression Board
            </div>
          </div>
        </div>

        {/* Global KPI Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <span className="text-[10px] font-bold uppercase text-slate-700 mr-1.5">Sub-Stages:</span>
            <span className="font-mono font-extrabold text-slate-900">{metrics.total}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-xs">
            <span className="text-[10px] font-bold uppercase text-sky-800 mr-1.5">In Progress:</span>
            <span className="font-mono font-extrabold text-sky-900">{metrics.inProgress}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
            <span className="text-[10px] font-bold uppercase text-amber-800 mr-1.5">On Hold:</span>
            <span className="font-mono font-extrabold text-amber-900">{metrics.onHold}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
            <span className="text-[10px] font-bold uppercase text-emerald-800 mr-1.5">Completed:</span>
            <span className="font-mono font-extrabold text-emerald-900">{metrics.completed}</span>
          </div>
          {metrics.overdue > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-xs animate-pulse">
              <span className="text-[10px] font-bold uppercase text-red-800 mr-1.5">Overdue:</span>
              <span className="font-mono font-extrabold text-red-900">{metrics.overdue}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated In-Line Search & Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Dedicated Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search activity code, title, customer..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-orange-500 text-slate-800 font-medium placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Center & Right Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Work Order / Project Searchable Filter */}
          <SearchableSelect
            label="Work Order"
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            allOptionLabel={`All Work Orders (${rawProjects.length})`}
            placeholder="Search work order, customer, model..."
            options={projectFilterOptions}
          />

          {/* Assigned Buyer Searchable Filter */}
          <SearchableSelect
            label="Buyer"
            value={selectedBuyerId}
            onChange={setSelectedBuyerId}
            allOptionLabel="All Buyers"
            placeholder="Search buyer name, role..."
            options={buyerFilterOptions}
          />

          {/* Priority Searchable Filter */}
          <SearchableSelect
            label="Priority"
            value={selectedPriority}
            onChange={setSelectedPriority}
            allOptionLabel="All Priorities"
            placeholder="Filter by priority..."
            options={priorityFilterOptions}
          />

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-COLUMN KANBAN BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {/* Column 1: NOT STARTED */}
        {renderKanbanColumn(
          'NOT_STARTED',
          'Not Started',
          'border-t-slate-400',
          'bg-slate-100/70',
          Clock,
          'text-slate-500',
          columns.NOT_STARTED
        )}

        {/* Column 2: IN PROGRESS */}
        {renderKanbanColumn(
          'IN_PROGRESS',
          'In Progress',
          'border-t-sky-500',
          'bg-sky-50/30',
          Layers,
          'text-sky-600',
          columns.IN_PROGRESS
        )}

        {/* Column 3: ON HOLD / REVIEW */}
        {renderKanbanColumn(
          'ON_HOLD',
          'On Hold / Review',
          'border-t-amber-500',
          'bg-amber-50/30',
          PauseCircle,
          'text-amber-600',
          columns.ON_HOLD
        )}

        {/* Column 4: COMPLETED */}
        {renderKanbanColumn(
          'COMPLETED',
          'Completed',
          'border-t-emerald-500',
          'bg-emerald-50/30',
          CheckCircle2,
          'text-emerald-600',
          columns.COMPLETED
        )}
      </div>

      {/* REMARKS & AUDIT DRAWER / MODAL */}
      {activeRemarkSubStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-xl max-h-[88vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    Activity Remarks &amp; Updates
                  </h3>
                  <div className="text-[11px] font-mono text-slate-500">
                    {activeRemarkSubStage.subStageCode} • {activeRemarkSubStage.workOrderNumber}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveRemarkSubStage(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub-Stage Summary Box */}
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 text-xs">
              <div className="font-bold text-slate-900 text-sm">{activeRemarkSubStage.title}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {activeRemarkSubStage.customerName} • {activeRemarkSubStage.machineModel}
              </div>
            </div>

            {/* Remarks Timeline Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3 min-h-[220px]">
              {activeRemarkSubStage.remarks.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No commercial remarks logged yet. Post an update below.
                </div>
              ) : (
                activeRemarkSubStage.remarks.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                      <span className="font-bold text-slate-700">{r.authorName || 'Procurement Buyer'}</span>
                      <span className="font-mono">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : 'Just now'}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium whitespace-pre-wrap">{r.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Post Remark Form */}
            <form onSubmit={handleAddRemark} className="p-4 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                required
                placeholder="Type commercial note, vendor follow-up, or status remark..."
                value={newRemarkText}
                onChange={(e) => setNewRemarkText(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!newRemarkText.trim() || isUpdatingSubStage}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send size={13} />
                <span>Post</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to render a Kanban Column
  function renderKanbanColumn(
    colKey: KanbanColumnKey,
    title: string,
    accentBorder: string,
    columnBg: string,
    IconComponent: any,
    iconColor: string,
    items: PurchaseSubStageItem[]
  ) {
    const isDragOver = dragOverColumn === colKey;

    return (
      <div
        onDragOver={(e) => handleDragOver(e, colKey)}
        onDrop={(e) => handleDrop(e, colKey)}
        className={`${columnBg} border rounded-2xl overflow-hidden flex flex-col transition-all ${
          isDragOver ? 'border-orange-500 ring-2 ring-orange-400/30' : 'border-slate-200'
        }`}
      >
        {/* Column Header Ribbon */}
        <div
          className={`bg-white px-4 py-3 border-b border-slate-200 border-t-4 ${accentBorder} flex items-center justify-between shadow-xs`}
        >
          <div className="flex items-center gap-2">
            <IconComponent size={15} className={iconColor} />
            <span className="text-xs font-extrabold text-slate-900 tracking-tight">{title}</span>
          </div>
          <span className="text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {items.length}
          </span>
        </div>

        {/* Cards Container */}
        <div className="p-3 space-y-3 min-h-[460px]">
          {items.map((sub) => renderSubStageCard(sub, colKey))}
          {items.length === 0 && (
            <div className="h-36 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-center p-4">
              <span className="text-[11px] font-medium text-slate-400">
                {colKey === 'NOT_STARTED'
                  ? 'No procurement activities waiting'
                  : colKey === 'IN_PROGRESS'
                  ? 'No procurement activities in progress'
                  : colKey === 'ON_HOLD'
                  ? 'No activities on hold'
                  : 'No completed activities yet'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Helper function to render a single Sub-Stage Card
  function renderSubStageCard(sub: PurchaseSubStageItem, currentColKey: KanbanColumnKey) {
    const isOverdue =
      sub.status !== 'COMPLETED' &&
      sub.targetEndDate &&
      new Date(sub.targetEndDate).getTime() < Date.now();

    const priorityBadge =
      sub.priority === 'CRITICAL'
        ? 'bg-red-50 text-red-700 border-red-200'
        : sub.priority === 'HIGH'
        ? 'bg-orange-50 text-orange-700 border-orange-200'
        : sub.priority === 'LOW'
        ? 'bg-slate-100 text-slate-600 border-slate-200'
        : 'bg-blue-50 text-blue-700 border-blue-200';

    const isDragging = draggedSubStageId === sub.id;

    return (
      <div
        key={sub.id}
        draggable
        onDragStart={(e) => handleDragStart(e, sub.id)}
        onDragEnd={handleDragEnd}
        className={`bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs hover:shadow-md transition-all space-y-2.5 relative group cursor-grab active:cursor-grabbing ${
          isDragging ? 'opacity-40 scale-95 border-dashed border-orange-400' : ''
        }`}
      >
        {/* Work Order & Priority Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-block font-mono text-[10px] font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                {sub.workOrderNumber}
              </span>
              <WorkOrderBomBadge
                isBomLocked={sub.isBomLocked}
                bomStatus={sub.bomStatus}
                bomAttached={sub.bomAttached}
                attachedDrawingsCount={sub.attachedDrawingsCount}
              />
            </div>
            <div className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">
              {sub.customerName}
            </div>
          </div>

          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${priorityBadge}`}>
            {sub.priority}
          </span>
        </div>

        {/* Sub-Stage Code & Title */}
        <div>
          <div className="font-mono text-[10px] font-bold text-slate-400">{sub.subStageCode}</div>
          <h4 className="text-xs font-extrabold text-slate-900 leading-snug line-clamp-2">
            {sub.title}
          </h4>
          <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
            {sub.machineModel}
          </div>
        </div>

        {/* Assigned Buyer & Target Date */}
        <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1">
          <div className="flex items-center gap-1.5 text-slate-600">
            <User size={12} className="text-slate-400 shrink-0" />
            <span className="truncate font-semibold text-slate-800">
              {sub.assignedToUserName || 'Unassigned'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1 font-mono text-slate-500">
              <Calendar size={11} className={isOverdue ? 'text-red-500' : 'text-slate-400'} />
              <span className={isOverdue ? 'text-red-600 font-bold' : ''}>
                {sub.targetEndDate
                  ? new Date(sub.targetEndDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short'
                    })
                  : 'No Target'}
              </span>
            </div>

            {isOverdue && (
              <span className="text-[9px] font-extrabold text-red-700 bg-red-100 px-1.5 py-0.2 rounded border border-red-200">
                Overdue
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar (Pure Tailwind CSS Utility Width Classes) */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              sub.status === 'COMPLETED'
                ? 'bg-emerald-500'
                : sub.status === 'ON_HOLD'
                ? 'bg-amber-500'
                : 'bg-orange-500'
            } ${getProgressWidthClass(sub.completionPercent, sub.status)}`}
          />
        </div>

        {/* Card Footer: Remarks & Quick Status Move Selector */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Remarks Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveRemarkSubStage(sub);
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-orange-600 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <MessageSquare size={12} className="text-orange-500" />
            <span className="font-mono text-[10px] font-bold">{sub.remarks.length}</span>
          </button>

          {/* Quick Status Dropdown (Touch & Direct Switch) */}
          <div className="relative">
            <select
              value={currentColKey}
              disabled={isUpdatingSubStage}
              onChange={(e) => handleMoveSubStage(sub.id, e.target.value as KanbanColumnKey)}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer focus:outline-hidden"
            >
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>
    );
  }
}

