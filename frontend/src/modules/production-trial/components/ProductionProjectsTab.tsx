'use client';

import React, { useState, useMemo } from 'react';
import {
  FolderGit2,
  Workflow,
  Search,
  Plus,
  RotateCcw,
  Eye,
  CheckCircle2,
  Clock,
  Layers,
  Wrench,
  AlertCircle,
  X,
  UserCheck,
  ChevronRight,
  Sparkles,
  Calendar,
  Trash2,
  Kanban,
  CalendarCheck
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProductionKanbanTab from './ProductionKanbanTab';
import ProductionGanttTab from './ProductionGanttTab';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import {
  useGetProjectsQuery,
  useAddSubStageToMilestoneMutation,
  useUpdateSubStageMutation,
  useDeleteSubStageMutation
} from '../../project-setup/api/projectApi';
import {
  useGetProductionSubStagesQuery,
  useGetProductionTeamQuery
} from '../api/productionTrialApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

export type ProductionProjectsSubTab = 'work-orders' | 'kanban' | 'gantt';

interface ProductionProjectsTabProps {
  initialSubTab?: ProductionProjectsSubTab;
}

export default function ProductionProjectsTab({ initialSubTab }: ProductionProjectsTabProps = {}) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  const currentSubTab: ProductionProjectsSubTab =
    initialSubTab ||
    (pathname?.includes('/production-trial/projects/kanban') || pathname?.includes('/production-trial/kanban')
      ? 'kanban'
      : pathname?.includes('/production-trial/projects/gantt') || pathname?.includes('/production-trial/gantt')
      ? 'gantt'
      : 'work-orders');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [sortField, setSortField] = useState('workOrderNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Drawer / SubStages Management state
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  // Add SubStage Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMasterSubStageId, setSelectedMasterSubStageId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('16');
  const [formError, setFormError] = useState('');

  // Queries
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    refetch: refetchProjects
  } = useGetProjectsQuery({ departmentModule: 'production' });

  const { data: subStagesData } = useGetProductionSubStagesQuery();
  const { data: teamData } = useGetProductionTeamQuery();

  // Mutations
  const [addSubStageTrigger, { isLoading: isAddingSubStage }] = useAddSubStageToMilestoneMutation();
  const [updateSubStageTrigger, { isLoading: isUpdatingSubStage }] = useUpdateSubStageMutation();
  const [deleteSubStageTrigger, { isLoading: isDeletingSubStage }] = useDeleteSubStageMutation();

  const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const masterSubStages = useMemo(() => subStagesData?.subStages || [], [subStagesData]);
  const teamMembers = useMemo(() => teamData?.members || [], [teamData]);

  // Distinct values helper
  const getDistinctValues = (dataset: any[], field: string): DistinctValueItem[] => {
    const map: Record<string, number> = {};
    dataset.forEach((it: any) => {
      const val = String(it[field] || '');
      if (val) map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map).map(([value, count]) => ({ value, count }));
  };

  // Enriched Projects with Production Milestone & Sub-Stages
  const projectsList = useMemo(() => {
    return rawProjects.map((p: any) => {
      const milestones = p.milestones || [];
      const prodMilestone =
        milestones.find(
          (m: any) =>
            m.departmentModule?.toLowerCase() === 'production' ||
            m.stage?.toLowerCase().includes('production') ||
            m.title?.toLowerCase().includes('production')
        ) || milestones[0];

      const attachedSubStages = prodMilestone?.subStages || [];
      const completedSubStages = attachedSubStages.filter((s: any) => s.status === 'COMPLETED').length;
      const progressPercent =
        attachedSubStages.length > 0
          ? Math.round((completedSubStages / attachedSubStages.length) * 100)
          : Number(p.progressPercent || 0);

      return {
        ...p,
        workOrderNumber: p.workOrderNumber || p.projectId,
        prodMilestone,
        attachedSubStages,
        completedSubStages,
        progressPercent
      };
    });
  }, [rawProjects]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projectsList
      .filter((p: any) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const wo = (p.workOrderNumber || '').toLowerCase();
          const prj = (p.projectName || '').toLowerCase();
          const cust = (p.customerName || '').toLowerCase();
          const model = (p.machineModel || '').toLowerCase();
          if (!wo.includes(q) && !prj.includes(q) && !cust.includes(q) && !model.includes(q)) {
            return false;
          }
        }
        for (const [key, vals] of Object.entries(activeFilters)) {
          const itemVal = String(p[key] || '');
          if (!vals.includes(itemVal)) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === 'string') {
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDir === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      });
  }, [projectsList, searchTerm, activeFilters, sortField, sortDir]);

  // Handle Adding Sub-Stage to Project
  const handleAddSubStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedProject) return;
    const milestoneId = selectedProject.prodMilestone?.id;
    if (!milestoneId) {
      setFormError('No Production milestone found for this Work Order to attach sub-stages.');
      return;
    }

    const masterMatch = masterSubStages.find((m: any) => m.id === selectedMasterSubStageId);
    const title = customTitle.trim() || masterMatch?.subStageName || masterMatch?.name;

    if (!title) {
      setFormError('Please select a Master Sub-Stage or enter a custom title.');
      return;
    }

    const techMatch = teamMembers.find((t: any) => t.id === assignedTechnicianId);

    try {
      await addSubStageTrigger({
        id: milestoneId,
        title,
        subStageCode: masterMatch?.subStageCode || 'PRD-SS',
        standardDays: masterMatch?.standardDays || 5,
        estimatedHours: Number(estimatedHours) || 16,
        targetEndDate: targetEndDate || undefined,
        assignedUserId: techMatch?.id || undefined,
        assignedUserName: techMatch?.fullName || undefined
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: `All set! Sub-Stage "${title}" attached to ${selectedProject.workOrderNumber}.`
        })
      );

      setIsAddModalOpen(false);
      setSelectedMasterSubStageId('');
      setCustomTitle('');
      refetchProjects();
    } catch (err: any) {
      setFormError(err?.data?.message || 'Could not attach sub-stage right now.');
    }
  };

  // Toggle Sub-Stage Status (Pending -> In Progress -> Completed)
  const handleToggleSubStageStatus = async (subStageId: string, currentStatus: string) => {
    let nextStatus = 'IN_PROGRESS';
    if (currentStatus === 'IN_PROGRESS') nextStatus = 'COMPLETED';
    else if (currentStatus === 'COMPLETED') nextStatus = 'PENDING';

    try {
      await updateSubStageTrigger({
        subStageId,
        status: nextStatus
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: `Sub-stage updated to ${nextStatus}.`
        })
      );
      refetchProjects();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: 'Could not update status right now.'
        })
      );
    }
  };

  // Delete Sub-Stage from Work Order
  const handleDeleteSubStage = async (subStageId: string) => {
    try {
      await deleteSubStageTrigger(subStageId).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: 'Sub-stage removed from Work Order.'
        })
      );
      refetchProjects();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: 'Could not delete sub-stage.'
        })
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Sub-Tab Navigation Bar (Pure Button-Type Tabs) */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <Link
            href="/production-trial/projects/work-orders"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentSubTab === 'work-orders'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FolderGit2 size={14} />
            <span>Work Orders ({projectsList.length})</span>
          </Link>

          <Link
            href="/production-trial/projects/kanban"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentSubTab === 'kanban'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Kanban size={14} />
            <span>Kanban Board</span>
          </Link>

          <Link
            href="/production-trial/projects/gantt"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentSubTab === 'gantt'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CalendarCheck size={14} />
            <span>Gantt Chart</span>
          </Link>
        </div>
      </div>

      {/* View 2: Kanban Board */}
      {currentSubTab === 'kanban' && <ProductionKanbanTab />}

      {/* View 3: Gantt Chart */}
      {currentSubTab === 'gantt' && <ProductionGanttTab />}

      {/* View 1: Work Orders Table */}
      {currentSubTab === 'work-orders' && (
        <div className="space-y-4">
          {/* Top Dedicated In-Line Table Toolbar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Side: Dedicated Search Bar */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Work Order, Project, Customer, Machine..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Side: Total Summary & Reset Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {(searchTerm || Object.keys(activeFilters).length > 0) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setActiveFilters({});
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}

          <div className="px-3.5 py-1.5 bg-orange-50/80 border border-orange-200 rounded-xl text-xs font-bold text-orange-800 flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-orange-600" />
            <span>{filteredProjects.length} Production Work Orders</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 uppercase text-[10px] font-bold tracking-wider select-none">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3 min-w-[180px]">
                  <ExcelColumnFilter
                    title="Work Order No."
                    columnKey="workOrderNumber"
                    selectedValues={activeFilters['workOrderNumber'] || null}
                    distinctValues={getDistinctValues(projectsList, 'workOrderNumber')}
                    onFilterChange={(vals) =>
                      setActiveFilters((prev) => {
                        const next = { ...prev };
                        if (!vals || vals.length === 0) delete next['workOrderNumber'];
                        else next['workOrderNumber'] = vals;
                        return next;
                      })
                    }
                  />
                </th>
                <th className="py-3 px-3 min-w-[180px]">
                  <ExcelColumnFilter
                    title="Customer"
                    columnKey="customerName"
                    selectedValues={activeFilters['customerName'] || null}
                    distinctValues={getDistinctValues(projectsList, 'customerName')}
                    onFilterChange={(vals) =>
                      setActiveFilters((prev) => {
                        const next = { ...prev };
                        if (!vals || vals.length === 0) delete next['customerName'];
                        else next['customerName'] = vals;
                        return next;
                      })
                    }
                  />
                </th>
                <th className="py-3 px-3 min-w-[180px]">
                  <ExcelColumnFilter
                    title="Machine Model"
                    columnKey="machineModel"
                    selectedValues={activeFilters['machineModel'] || null}
                    distinctValues={getDistinctValues(projectsList, 'machineModel')}
                    onFilterChange={(vals) =>
                      setActiveFilters((prev) => {
                        const next = { ...prev };
                        if (!vals || vals.length === 0) delete next['machineModel'];
                        else next['machineModel'] = vals;
                        return next;
                      })
                    }
                  />
                </th>
                <th className="py-3 px-3 min-w-[150px] text-center">Attached Sub-Stages</th>
                <th className="py-3 px-3 min-w-[150px]">Assembly Progress</th>
                <th className="py-3 px-3 min-w-[120px] text-center">Status</th>
                <th className="py-3 px-3 w-36 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoadingProjects ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                    Loading Work Orders...
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <FolderGit2 className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No production work orders found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Approved work orders from Project Setup will appear here for sub-stage assignment.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p: any, idx: number) => {
                  return (
                    <tr
                      key={p.id}
                      onDoubleClick={() => setSelectedProject(p)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      title="Double-click to view and manage attached sub-stages"
                    >
                      <td className="py-3.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3.5 px-3">
                        <div className="font-mono font-extrabold text-slate-900">{p.workOrderNumber}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{p.projectName}</div>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-800">{p.customerName}</td>
                      <td className="py-3.5 px-3 font-bold text-slate-700">{p.machineModel || 'N/A'}</td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs">
                          {p.completedSubStages} / {p.attachedSubStages.length} Done
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                p.progressPercent >= 100 ? 'bg-emerald-500' : 'bg-orange-500'
                              }`}
                              style={{ width: `${p.progressPercent}%` }}
                            />
                          </div>
                          <span className="font-extrabold text-slate-800 text-xs w-9 text-right font-mono">
                            {p.progressPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            p.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}
                        >
                          {p.status || 'IN_PROGRESS'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedProject(p)}
                          className="px-3 py-1 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 hover:border-orange-300 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Workflow size={13} />
                          <span>Sub-Stages</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DRAWER / MODAL: ATTACHED SUB-STAGES FOR SELECTED PROJECT */}
      {/* ======================================================== */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Production Sub-Stages: {selectedProject.workOrderNumber}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {selectedProject.customerName} • {selectedProject.machineModel}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Attached Assembly Sub-Stages ({selectedProject.attachedSubStages.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Click status badges to toggle progress or attach new stages from Master.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(true);
                    setFormError('');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Attach Master Sub-Stage</span>
                </button>
              </div>

              {/* Sub-Stages List */}
              <div className="space-y-2.5">
                {selectedProject.attachedSubStages.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                    <Workflow className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No sub-stages attached yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Click "Attach Master Sub-Stage" to assign assembly stations to this machine.
                    </p>
                  </div>
                ) : (
                  selectedProject.attachedSubStages.map((s: any, idx: number) => {
                    const isDone = s.status === 'COMPLETED';
                    const isRunning = s.status === 'IN_PROGRESS';
                    return (
                      <div
                        key={s.id || idx}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isDone
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : isRunning
                            ? 'bg-sky-50/40 border-sky-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                              <span>{s.title || s.subStageCode}</span>
                              {s.subStageCode && (
                                <span className="font-mono text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">
                                  {s.subStageCode}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Assigned to: <strong className="text-slate-700">{s.assignedUserName || 'Unassigned'}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleSubStageStatus(s.id, s.status)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                              isDone
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : isRunning
                                ? 'bg-sky-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {s.status || 'PENDING'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSubStage(s.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="Remove sub-stage"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                {selectedProject.completedSubStages} of {selectedProject.attachedSubStages.length} sub-stages completed
              </span>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ATTACH MASTER SUB-STAGE TO WORK ORDER             */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between">
              <h3 className="text-slate-900 text-sm font-extrabold tracking-tight">Attach Production Sub-Stage</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSubStage} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-medium">
                  <AlertCircle size={15} className="shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Select from Master Sub-Stages
                </label>
                <select
                  value={selectedMasterSubStageId}
                  onChange={(e) => {
                    setSelectedMasterSubStageId(e.target.value);
                    const match = masterSubStages.find((m: any) => m.id === e.target.value);
                    if (match) setCustomTitle(match.subStageName || match.name);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose Master Sub-Stage ({masterSubStages.length} Available) --</option>
                  {masterSubStages.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.subStageCode} • {m.subStageName || m.name} ({m.standardDays || 5} days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Sub-Stage Title / Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Spindle Head Mounting & Laser Alignment"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Assembly Technician / Engineer
                </label>
                <select
                  value={assignedTechnicianId}
                  onChange={(e) => setAssignedTechnicianId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Unassigned (Assign Later) --</option>
                  {teamMembers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Target End Date
                  </label>
                  <input
                    type="date"
                    value={targetEndDate}
                    onChange={(e) => setTargetEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Est. Hours
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 -mx-6 -mb-6 mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingSubStage}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isAddingSubStage ? 'Attaching...' : 'Attach Sub-Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}

