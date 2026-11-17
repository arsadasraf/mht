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
  Headphones,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AfterSalesKanbanTab from './AfterSalesKanbanTab';
import AfterSalesGanttTab from './AfterSalesGanttTab';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import {
  useGetProjectsQuery,
  useAddSubStageToMilestoneMutation,
  useUpdateSubStageMutation,
  useDeleteSubStageMutation
} from '../../project-setup/api/projectApi';
import {
  useGetAfterSalesSubStagesQuery,
  useGetAfterSalesTeamQuery
} from '../api/afterSalesApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

export type AfterSalesProjectsSubTab = 'work-orders' | 'kanban' | 'gantt';

interface AfterSalesProjectsTabProps {
  initialSubTab?: AfterSalesProjectsSubTab;
}

export default function AfterSalesProjectsTab({ initialSubTab }: AfterSalesProjectsTabProps = {}) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  const currentSubTab: AfterSalesProjectsSubTab =
    initialSubTab ||
    (pathname?.includes('/after-sales/projects/kanban') || pathname?.includes('/after-sales/kanban')
      ? 'kanban'
      : pathname?.includes('/after-sales/projects/gantt') || pathname?.includes('/after-sales/gantt')
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
  const [assignedEngineerId, setAssignedEngineerId] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('16');
  const [formError, setFormError] = useState('');

  // Queries
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    refetch: refetchProjects
  } = useGetProjectsQuery({ departmentModule: 'after-sales' });

  const { data: subStagesData } = useGetAfterSalesSubStagesQuery();
  const { data: teamData } = useGetAfterSalesTeamQuery();

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

  // Enriched Projects with After-Sales Milestone & Sub-Stages
  const projectsList = useMemo(() => {
    return rawProjects.map((p: any) => {
      const milestones = p.milestones || [];
      const afterSalesMilestone =
        milestones.find(
          (m: any) =>
            m.departmentModule?.toLowerCase() === 'after-sales' ||
            m.stage?.toLowerCase().includes('service') ||
            m.stage?.toLowerCase().includes('after') ||
            m.title?.toLowerCase().includes('service')
        ) || milestones[0];

      const attachedSubStages = afterSalesMilestone?.subStages || [];
      const completedSubStages = attachedSubStages.filter((s: any) => s.status === 'COMPLETED').length;
      const progressPercent =
        attachedSubStages.length > 0
          ? Math.round((completedSubStages / attachedSubStages.length) * 100)
          : Number(p.progressPercent || 0);

      return {
        ...p,
        workOrderNumber: p.workOrderNumber || p.projectId,
        afterSalesMilestone,
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
    const milestoneId = selectedProject.afterSalesMilestone?.id;
    if (!milestoneId) {
      setFormError('No Service milestone found for this Work Order to attach sub-stages.');
      return;
    }

    const masterMatch = masterSubStages.find((m: any) => m.id === selectedMasterSubStageId);
    const titleToUse = customTitle.trim() || masterMatch?.subStageName || masterMatch?.name;

    if (!titleToUse) {
      setFormError('Please select a master sub-stage or enter a custom title.');
      return;
    }

    const assignedMember = teamMembers.find((m: any) => (m.id || m._id) === assignedEngineerId);

    try {
      await addSubStageTrigger({
        id: milestoneId,
        subStageCode: masterMatch?.subStageCode || 'AST-SS',
        title: titleToUse,
        assignedUserId: assignedMember ? assignedMember.id || assignedMember._id : undefined,
        assignedUserName: assignedMember ? assignedMember.fullName : undefined,
        technicianName: assignedMember ? assignedMember.fullName : undefined,
        standardDays: masterMatch?.standardDays || 5,
        weightPercent: masterMatch?.weightPercent || 10,
        estimatedHours: Number(estimatedHours) || 16,
        targetEndDate: targetEndDate || undefined,
        status: 'NOT_STARTED'
      }).unwrap();

      dispatch(
        addToast({
          message: `All set! ${titleToUse} attached to ${selectedProject.workOrderNumber}.`,
          type: 'success'
        })
      );

      setIsAddModalOpen(false);
      setSelectedMasterSubStageId('');
      setCustomTitle('');
      setAssignedEngineerId('');
      setTargetEndDate('');
      refetchProjects();
    } catch (err: any) {
      setFormError(err?.data?.message || 'Could not attach sub-stage. Please try again.');
    }
  };

  // Handle Status Update of an attached sub-stage
  const handleToggleSubStageStatus = async (subStage: any, currentStatus: string) => {
    if (!selectedProject || !selectedProject.afterSalesMilestone) return;
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
          message: `Stage updated to ${nextStatus}.`,
          type: 'success'
        })
      );
      refetchProjects();
    } catch (err: any) {
      dispatch(
        addToast({
          message: err?.data?.message || 'Could not update status.',
          type: 'error'
        })
      );
    }
  };

  // Handle Delete attached Sub-Stage
  const handleDeleteSubStage = async (subStageId: string) => {
    if (!selectedProject || !selectedProject.afterSalesMilestone) return;

    try {
      await deleteSubStageTrigger(subStageId).unwrap();

      dispatch(
        addToast({
          message: 'Service sub-stage removed from Work Order.',
          type: 'success'
        })
      );
      refetchProjects();
    } catch (err: any) {
      dispatch(
        addToast({
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
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">After Sales & Service Projects</h1>
          </div>
        </div>

        {/* Modern Button-Type Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          <Link
            href="/after-sales/projects"
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
            href="/after-sales/projects/kanban"
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
            href="/after-sales/projects/gantt"
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
                        title="Work Order #"
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
                        title="Customer Name"
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
                    <th className="px-4 py-3.5 text-center">Service Sub-Stages</th>
                    <th className="px-4 py-3.5 text-center">Progress</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-right w-36">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingProjects ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Loading field service work orders...
                      </td>
                    </tr>
                  ) : filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-600">No projects found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Work Orders created in Project Setup will appear here for service execution.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((project: any, idx: number) => (
                      <tr key={project.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-center text-slate-400 text-[11px] font-medium">{idx + 1}</td>
                        <td className="px-4 py-3.5 font-bold font-mono text-orange-600">
                          <button
                            onClick={() => setSelectedProject(project)}
                            className="hover:underline text-left"
                          >
                            {project.workOrderNumber}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900">{project.customerName}</td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">{project.machineModel}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {project.completedSubStages} / {project.attachedSubStages.length} Done
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full ${
                                  project.progressPercent >= 100 ? 'bg-emerald-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${project.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono font-bold text-slate-700 w-8 text-right">
                              {project.progressPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              project.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : project.status === 'ON_HOLD'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {project.status || 'IN_PROGRESS'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedProject(project)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
                          >
                            <Workflow className="w-3.5 h-3.5" />
                            <span>Manage Stages</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: KANBAN BOARD */}
      {currentSubTab === 'kanban' && <AfterSalesKanbanTab />}

      {/* SUB-TAB 3: GANTT CHART */}
      {currentSubTab === 'gantt' && <AfterSalesGanttTab />}

      {/* SLIDE-OVER DRAWER: MANAGE AFTER-SALES SUB-STAGES */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white shadow-2xl h-full flex flex-col border-l border-slate-200">
            {/* Crisp White Header Ribbon */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {selectedProject.workOrderNumber}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedProject.customerName} • {selectedProject.machineModel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Configured Service Stages ({selectedProject.attachedSubStages.length})
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Stage</span>
                </button>
              </div>

              {selectedProject.attachedSubStages.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                  <Workflow className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No service stages attached yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Click &quot;Attach Stage&quot; to add on-site commissioning checkpoints.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedProject.attachedSubStages.map((stage: any, sIdx: number) => (
                    <div
                      key={stage.id}
                      className="p-3.5 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 shadow-2xs transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-orange-600">{stage.subStageCode}</span>
                          <span className="text-xs font-bold text-slate-900">{stage.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleSubStageStatus(stage, stage.status)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                              stage.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {stage.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                          </button>
                          <button
                            onClick={() => handleDeleteSubStage(stage.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove stage"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>Assigned: {stage.assignedToUserName || 'Unassigned'}</span>
                        <span>Est: {stage.estimatedHours || 16} hrs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ATTACH SUB-STAGE TO WORK ORDER */}
      {isAddModalOpen && selectedProject && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-slate-900 text-base font-extrabold tracking-tight">Attach Service Sub-Stage</h2>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedProject.workOrderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubStage} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Master Service Stage</label>
                <select
                  value={selectedMasterSubStageId}
                  onChange={(e) => setSelectedMasterSubStageId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                >
                  <option value="">-- Choose from Master Service Stages --</option>
                  {masterSubStages.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.subStageCode} • {m.subStageName || m.name} ({m.standardDays} days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Or Custom Stage Title</label>
                <input
                  type="text"
                  placeholder="e.g. Tension Control Tuning & Customer Acceptance"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign Field Engineer</label>
                  <select
                    value={assignedEngineerId}
                    onChange={(e) => setAssignedEngineerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {teamMembers.map((eng: any) => (
                      <option key={eng.id || eng._id} value={eng.id || eng._id}>
                        {eng.fullName} ({eng.memberCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min={1}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={targetEndDate}
                  onChange={(e) => setTargetEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
                  {isAddingSubStage ? 'Attaching...' : 'Attach Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
