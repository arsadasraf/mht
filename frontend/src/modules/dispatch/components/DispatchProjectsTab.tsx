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
  CalendarCheck,
  Truck,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DispatchKanbanTab from './DispatchKanbanTab';
import DispatchGanttTab from './DispatchGanttTab';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import {
  useGetProjectsQuery,
  useAddSubStageToMilestoneMutation,
  useUpdateSubStageMutation,
  useDeleteSubStageMutation
} from '../../project-setup/api/projectApi';
import {
  useGetDispatchSubStagesQuery,
  useGetDispatchTeamQuery
} from '../api/dispatchApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

export type DispatchProjectsSubTab = 'work-orders' | 'kanban' | 'gantt';

interface DispatchProjectsTabProps {
  initialSubTab?: DispatchProjectsSubTab;
}

export default function DispatchProjectsTab({ initialSubTab }: DispatchProjectsTabProps = {}) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  const currentSubTab: DispatchProjectsSubTab =
    initialSubTab ||
    (pathname?.includes('/dispatch/projects/kanban') || pathname?.includes('/dispatch/kanban')
      ? 'kanban'
      : pathname?.includes('/dispatch/projects/gantt') || pathname?.includes('/dispatch/gantt')
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
  const [assignedInspectorId, setAssignedInspectorId] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('12');
  const [formError, setFormError] = useState('');

  // Queries
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    refetch: refetchProjects
  } = useGetProjectsQuery({ departmentModule: 'dispatch' });

  const { data: subStagesData } = useGetDispatchSubStagesQuery();
  const { data: teamData } = useGetDispatchTeamQuery();

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

  // Enriched Projects with Dispatch Milestone & Sub-Stages
  const projectsList = useMemo(() => {
    return rawProjects.map((p: any) => {
      const milestones = p.milestones || [];
      const dispatchMilestone =
        milestones.find(
          (m: any) =>
            m.departmentModule?.toLowerCase() === 'dispatch' ||
            m.stage?.toLowerCase().includes('dispatch') ||
            m.stage?.toLowerCase().includes('trial') ||
            m.title?.toLowerCase().includes('dispatch')
        ) || milestones[0];

      const attachedSubStages = dispatchMilestone?.subStages || [];
      const completedSubStages = attachedSubStages.filter((s: any) => s.status === 'COMPLETED').length;
      const progressPercent =
        attachedSubStages.length > 0
          ? Math.round((completedSubStages / attachedSubStages.length) * 100)
          : Number(p.progressPercent || 0);

      return {
        ...p,
        workOrderNumber: p.workOrderNumber || p.projectId,
        dispatchMilestone,
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
    const milestoneId = selectedProject.dispatchMilestone?.id;
    if (!milestoneId) {
      setFormError('No Trial/Dispatch milestone found for this Work Order to attach sub-stages.');
      return;
    }

    const masterMatch = masterSubStages.find((m: any) => m.id === selectedMasterSubStageId);
    const titleToUse = customTitle.trim() || masterMatch?.subStageName || masterMatch?.name;

    if (!titleToUse) {
      setFormError('Please select a master sub-stage or enter a custom title.');
      return;
    }

    const assignedMember = teamMembers.find((m: any) => (m.id || m._id) === assignedInspectorId);

    try {
      await addSubStageTrigger({
        id: milestoneId,
        subStageCode: masterMatch?.subStageCode || 'DSP-SS',
        title: titleToUse,
        assignedUserId: assignedMember ? assignedMember.id || assignedMember._id : undefined,
        assignedUserName: assignedMember ? assignedMember.fullName : undefined,
        technicianName: assignedMember ? assignedMember.fullName : undefined,
        standardDays: masterMatch?.standardDays || 3,
        weightPercent: masterMatch?.weightPercent || 10,
        estimatedHours: Number(estimatedHours) || 12,
        targetEndDate: targetEndDate || undefined,
        status: 'NOT_STARTED'
      }).unwrap();

      dispatch(
        addToast({
          title: 'Sub-Stage Attached',
          message: `All set! ${titleToUse} attached to ${selectedProject.workOrderNumber}.`,
          type: 'success'
        })
      );

      setIsAddModalOpen(false);
      setSelectedMasterSubStageId('');
      setCustomTitle('');
      setAssignedInspectorId('');
      setTargetEndDate('');
      refetchProjects();
    } catch (err: any) {
      setFormError(err?.data?.message || 'Could not attach sub-stage. Please try again.');
    }
  };

  // Handle Status Update of an attached sub-stage
  const handleToggleSubStageStatus = async (subStage: any, currentStatus: string) => {
    if (!selectedProject || !selectedProject.dispatchMilestone) return;
    const nextStatus = currentStatus === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';

    try {
      await updateSubStageTrigger({
        subStageId: subStage.id,
        status: nextStatus,
        completionPercent: nextStatus === 'COMPLETED' ? 100 : 50,
        actualCompletionDate: nextStatus === 'COMPLETED' ? new Date().toISOString() : null
      }).unwrap();

      dispatch(
        addToast({
          title: 'Status Updated',
          message: `Stage updated to ${nextStatus}.`,
          type: 'success'
        })
      );
      refetchProjects();
    } catch (err: any) {
      dispatch(
        addToast({
          title: 'Update Failed',
          message: err?.data?.message || 'Could not update status.',
          type: 'error'
        })
      );
    }
  };

  // Handle Delete attached Sub-Stage
  const handleDeleteSubStage = async (subStageId: string) => {
    if (!selectedProject || !selectedProject.dispatchMilestone) return;

    try {
      await deleteSubStageTrigger(subStageId).unwrap();

      dispatch(
        addToast({
          title: 'Stage Removed',
          message: 'Inspection sub-stage removed from Work Order.',
          type: 'success'
        })
      );
      refetchProjects();
    } catch (err: any) {
      dispatch(
        addToast({
          title: 'Delete Failed',
          message: err?.data?.message || 'Could not delete sub-stage.',
          type: 'error'
        })
      );
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setActiveFilters({});
  };

  const hasActiveFilters = Boolean(searchTerm.trim() || Object.keys(activeFilters).length > 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Sub-Tab Pill Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Trials & Dispatch Projects</h1>
          </div>
        </div>

        {/* Modern Button-Type Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          <Link
            href="/dispatch/projects/work-orders"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
              currentSubTab === 'work-orders'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Work Orders ({projectsList.length})</span>
          </Link>
          <Link
            href="/dispatch/projects/kanban"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
              currentSubTab === 'kanban'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Kanban Board</span>
          </Link>
          <Link
            href="/dispatch/projects/gantt"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
              currentSubTab === 'gantt'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Gantt Chart</span>
          </Link>
        </div>
      </div>

      {/* SUB-TAB 1: WORK ORDERS & SUB-STAGES LIST */}
      {currentSubTab === 'work-orders' && (
        <div className="space-y-4">
          {/* Table Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Work Order, Project, Customer or Machine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
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

            <div className="flex items-center gap-2">
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
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">#</th>
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Work Order No."
                        columnKey="workOrderNumber"
                        distinctValues={getDistinctValues(projectsList, 'workOrderNumber')}
                        selectedValues={activeFilters['workOrderNumber']}
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
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Project Name"
                        columnKey="projectName"
                        distinctValues={getDistinctValues(projectsList, 'projectName')}
                        selectedValues={activeFilters['projectName']}
                        onFilterChange={(vals) =>
                          setActiveFilters((prev) => {
                            const next = { ...prev };
                            if (!vals || vals.length === 0) delete next['projectName'];
                            else next['projectName'] = vals;
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Customer"
                        columnKey="customerName"
                        distinctValues={getDistinctValues(projectsList, 'customerName')}
                        selectedValues={activeFilters['customerName']}
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
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Machine Model"
                        columnKey="machineModel"
                        distinctValues={getDistinctValues(projectsList, 'machineModel')}
                        selectedValues={activeFilters['machineModel']}
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
                    <th className="px-4 py-3.5">Attached Stages</th>
                    <th className="px-4 py-3.5 w-36">Progress</th>
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Status"
                        columnKey="status"
                        distinctValues={getDistinctValues(projectsList, 'status')}
                        selectedValues={activeFilters['status']}
                        onFilterChange={(vals) =>
                          setActiveFilters((prev) => {
                            const next = { ...prev };
                            if (!vals || vals.length === 0) delete next['status'];
                            else next['status'] = vals;
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="px-4 py-3.5 text-right w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingProjects ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        Loading inspection projects...
                      </td>
                    </tr>
                  ) : filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Truck className="w-8 h-8 text-slate-300" />
                          <p className="text-xs font-bold text-slate-700">No projects found</p>
                          <p className="text-[11px] text-slate-400">
                            Approved Work Orders entering trials or dispatch will appear here automatically.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((p: any, idx: number) => {
                      const stagesCount = p.attachedSubStages.length;
                      const doneCount = p.completedSubStages;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => setSelectedProject(p)}
                              className="font-mono font-bold text-orange-600 hover:underline bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md text-[11px]"
                            >
                              {p.workOrderNumber}
                            </button>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-900 block">{p.projectName}</span>
                            {p.customerPoNumber && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                PO: {p.customerPoNumber}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-700">{p.customerName}</td>
                          <td className="px-4 py-3.5 font-medium text-slate-600">{p.machineModel}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <Workflow className="w-3 h-3 text-orange-500" />
                              {doneCount} / {stagesCount} Stages
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    p.progressPercent >= 100
                                      ? 'bg-emerald-500'
                                      : p.progressPercent > 0
                                      ? 'bg-orange-500'
                                      : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${p.progressPercent}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 w-8 text-right">
                                {p.progressPercent}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => setSelectedProject(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-500 border border-orange-200 rounded-xl transition-all shadow-2xs"
                            >
                              <Workflow className="w-3.5 h-3.5" />
                              <span>Manage Stages</span>
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
        </div>
      )}

      {/* SUB-TAB 2: KANBAN BOARD */}
      {currentSubTab === 'kanban' && <DispatchKanbanTab />}

      {/* SUB-TAB 3: GANTT CHART */}
      {currentSubTab === 'gantt' && <DispatchGanttTab />}

      {/* DRAWER / MODAL: MANAGE WORK ORDER SUB-STAGES */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Inspection Sub-Stages — {selectedProject.workOrderNumber}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsAddModalOpen(true);
                    setFormError('');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Attach Sub-Stage</span>
                </button>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Project Metadata Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Work Order</p>
                  <p className="font-mono font-bold text-orange-600 mt-0.5">{selectedProject.workOrderNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Customer</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedProject.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Machine Model</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedProject.machineModel}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Target Dispatch</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedProject.targetDispatchDate
                      ? new Date(selectedProject.targetDispatchDate).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Sub-Stages Checklist Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Attached Inspection Sub-Stages ({selectedProject.attachedSubStages.length})
                  </h3>
                  <span className="text-xs font-bold text-orange-600">
                    {selectedProject.completedSubStages} of {selectedProject.attachedSubStages.length} Completed
                  </span>
                </div>

                {selectedProject.attachedSubStages.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                    <Workflow className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">No sub-stages attached to this Work Order</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Click "Attach Sub-Stage" to select inspection checkpoints (e.g. Dry Run, Electrical Safety, PDI, Gate Pass).
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setIsAddModalOpen(true);
                        setFormError('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Attach Sub-Stage</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5 w-10 text-center">#</th>
                          <th className="px-3.5 py-2.5">Code</th>
                          <th className="px-3.5 py-2.5">Sub-Stage Name</th>
                          <th className="px-3.5 py-2.5">Inspector Assigned</th>
                          <th className="px-3.5 py-2.5">Days</th>
                          <th className="px-3.5 py-2.5">Status</th>
                          <th className="px-3.5 py-2.5 text-right w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedProject.attachedSubStages.map((s: any, sIdx: number) => {
                          const isDone = s.status === 'COMPLETED';

                          return (
                            <tr key={s.id || sIdx} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-3.5 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                                {sIdx + 1}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className="font-mono font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md text-[10px]">
                                  {s.subStageCode || 'DSP-SS'}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className={`font-bold block ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                  {s.title || s.subStageName}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 font-medium text-slate-700">
                                {s.assignedToUserName || s.technicianName || '—'}
                              </td>
                              <td className="px-3.5 py-2.5 font-semibold text-slate-600">
                                {s.standardDays || 3} days
                              </td>
                              <td className="px-3.5 py-2.5">
                                <button
                                  onClick={() => handleToggleSubStageStatus(s, s.status)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                                    isDone
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  <CheckCircle2 className={`w-3 h-3 ${isDone ? 'text-emerald-600' : 'text-slate-400'}`} />
                                  <span>{isDone ? 'Completed' : 'Mark Done'}</span>
                                </button>
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                <button
                                  onClick={() => handleDeleteSubStage(s.id)}
                                  title="Remove Sub-Stage"
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ATTACH SUB-STAGE TO WORK ORDER */}
      {isAddModalOpen && selectedProject && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            {/* Header Ribbon */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Attach Inspection Sub-Stage</h2>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddSubStage} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Master Sub-Stage
                </label>
                <select
                  value={selectedMasterSubStageId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedMasterSubStageId(id);
                    const match = masterSubStages.find((m: any) => m.id === id);
                    if (match) {
                      setCustomTitle(match.subStageName || match.name);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">-- Choose from Master Sub-Stages --</option>
                  {masterSubStages.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.subStageCode} — {m.subStageName || m.name} ({m.standardDays} days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sub-Stage Title / Checkpoint <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical Safety & Insulation Test"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Inspector / Lead
                </label>
                <select
                  value={assignedInspectorId}
                  onChange={(e) => setAssignedInspectorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">-- Unassigned --</option>
                  {teamMembers.map((m: any) => (
                    <option key={m.id || m._id} value={m.id || m._id}>
                      {m.fullName} ({m.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target End Date
                  </label>
                  <input
                    type="date"
                    value={targetEndDate}
                    onChange={(e) => setTargetEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingSubStage}
                  className="px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isAddingSubStage ? 'Attaching...' : 'Attach Sub-Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
