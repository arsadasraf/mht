'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderGit2,
  Workflow,
  Search,
  Plus,
  RotateCcw,
  CheckCircle2,
  Clock,
  Wrench,
  Zap,
  Cpu,
  AlertCircle,
  X,
  UserCheck,
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
export type ProductionLineKey = 'MECHANICAL' | 'ELECTRICAL' | 'AUTOMATION';

interface ProductionProjectsTabProps {
  initialSubTab?: ProductionProjectsSubTab;
}

export const PRODUCTION_LINES: Array<{
  key: ProductionLineKey;
  label: string;
  shortLabel: string;
  badgeClass: string;
  headerBgClass: string;
  barClass: string;
  btnClass: string;
}> = [
  {
    key: 'MECHANICAL',
    label: 'Mechanical Line',
    shortLabel: 'Mechanical',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    headerBgClass: 'bg-sky-50/70 border-sky-200',
    barClass: 'bg-sky-500',
    btnClass: 'bg-sky-600 hover:bg-sky-700 text-white'
  },
  {
    key: 'ELECTRICAL',
    label: 'Electrical Line',
    shortLabel: 'Electrical',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    headerBgClass: 'bg-amber-50/70 border-amber-200',
    barClass: 'bg-amber-500',
    btnClass: 'bg-amber-500 hover:bg-amber-600 text-white'
  },
  {
    key: 'AUTOMATION',
    label: 'Automation Line',
    shortLabel: 'Automation',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    headerBgClass: 'bg-indigo-50/70 border-indigo-200',
    barClass: 'bg-indigo-500',
    btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white'
  }
];

export const resolveSubStageLine = (subStage: any): ProductionLineKey => {
  const raw = String(
    subStage?.productionLine || subStage?.parentStageCode || ''
  )
    .toUpperCase()
    .trim();
  if (raw === 'ELECTRICAL' || raw.includes('ELEC')) return 'ELECTRICAL';
  if (raw === 'AUTOMATION' || raw.includes('AUTO') || raw.includes('PLC')) return 'AUTOMATION';
  return 'MECHANICAL';
};

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

  // Parallel Flow Configurator Modal State
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [activeLineFilter, setActiveLineFilter] = useState<'ALL' | ProductionLineKey>('ALL');

  // Attach Sub-Stage Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLineForAdd, setSelectedLineForAdd] = useState<ProductionLineKey>('MECHANICAL');
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
  const [updateSubStageTrigger] = useUpdateSubStageMutation();
  const [deleteSubStageTrigger] = useDeleteSubStageMutation();

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

  // Enriched Projects with 3 Parallel Production Lines (Mechanical, Electrical, Automation)
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

      const rawSubStages = Array.isArray(prodMilestone?.subStages) ? prodMilestone.subStages : [];
      const attachedSubStages = rawSubStages.map((s: any) => ({
        ...s,
        productionLine: resolveSubStageLine(s)
      }));

      const calcLineStats = (lineKey: ProductionLineKey) => {
        const items = attachedSubStages.filter((s: any) => s.productionLine === lineKey);
        const done = items.filter((s: any) => s.status === 'COMPLETED').length;
        const percent = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
        return { items, total: items.length, done, percent };
      };

      const mechanicalLine = calcLineStats('MECHANICAL');
      const electricalLine = calcLineStats('ELECTRICAL');
      const automationLine = calcLineStats('AUTOMATION');

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
        progressPercent,
        lines: {
          MECHANICAL: mechanicalLine,
          ELECTRICAL: electricalLine,
          AUTOMATION: automationLine
        }
      };
    });
  }, [rawProjects]);

  // Keep selectedProject synchronized when projectsList updates
  useEffect(() => {
    if (selectedProject && projectsList.length > 0) {
      const updated = projectsList.find(
        (p: any) =>
          p.id === selectedProject.id || p.workOrderNumber === selectedProject.workOrderNumber
      );
      if (updated && updated !== selectedProject) {
        setSelectedProject(updated);
      }
    }
  }, [projectsList, selectedProject]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projectsList.filter((p: any) => {
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
    });
  }, [projectsList, searchTerm, activeFilters]);

  // Open Attach Sub-Stage Modal for a specific Production Line
  const handleOpenAttachForLine = (lineKey: ProductionLineKey) => {
    setSelectedLineForAdd(lineKey);
    setSelectedMasterSubStageId('');
    setCustomTitle('');
    setAssignedTechnicianId('');
    setTargetEndDate('');
    setEstimatedHours('16');
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Handle Adding Sub-Stage to Selected Production Line
  const handleAddSubStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedProject) return;
    const milestoneId =
      selectedProject.prodMilestone?.id || `auto-production-${selectedProject.workOrderNumber}`;

    const masterMatch = masterSubStages.find((m: any) => m.id === selectedMasterSubStageId);
    const title = customTitle.trim() || masterMatch?.subStageName || masterMatch?.name;

    if (!title) {
      setFormError('Please select a Master Sub-Stage or enter a custom sub-stage title.');
      return;
    }

    const techMatch = teamMembers.find((t: any) => t.id === assignedTechnicianId);

    try {
      await addSubStageTrigger({
        id: milestoneId,
        projectId: selectedProject.workOrderNumber,
        departmentModule: 'production',
        productionLine: selectedLineForAdd,
        title,
        subStageCode: masterMatch?.subStageCode || `PRD-${selectedLineForAdd.slice(0, 4)}`,
        standardDays: masterMatch?.standardDays || 5,
        estimatedHours: Number(estimatedHours) || 16,
        targetEndDate: targetEndDate || undefined,
        assignedToUserId: techMatch?.id || undefined,
        assignedToUserName: techMatch?.fullName || undefined
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: `All set! "${title}" attached to ${selectedLineForAdd} line on ${selectedProject.workOrderNumber}.`
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

  // Cycle Sub-Stage Status (NOT_STARTED -> IN_PROGRESS -> ON_HOLD -> COMPLETED)
  const handleCycleSubStageStatus = async (subStageId: string, currentStatus: string) => {
    const norm = String(currentStatus || 'NOT_STARTED').toUpperCase();
    let nextStatus = 'IN_PROGRESS';
    if (norm === 'IN_PROGRESS') nextStatus = 'COMPLETED';
    else if (norm === 'COMPLETED') nextStatus = 'NOT_STARTED';
    else if (norm === 'ON_HOLD') nextStatus = 'IN_PROGRESS';

    try {
      await updateSubStageTrigger({
        subStageId,
        status: nextStatus
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: `Sub-stage updated to ${nextStatus.replace(/_/g, ' ')}.`
        })
      );
      refetchProjects();
    } catch {
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
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: 'Could not delete sub-stage.'
        })
      );
    }
  };

  const getLineIcon = (lineKey: ProductionLineKey, size = 14) => {
    if (lineKey === 'ELECTRICAL') return <Zap size={size} className="shrink-0" />;
    if (lineKey === 'AUTOMATION') return <Cpu size={size} className="shrink-0" />;
    return <Wrench size={size} className="shrink-0" />;
  };

  return (
    <div className="space-y-4">
      {/* Top Sub-Tab Navigation Bar (Pure Button-Type Tabs) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
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

        {/* 3 Parallel Lines Legend Pills */}
        <div className="flex items-center gap-2">
          {PRODUCTION_LINES.map((ln) => (
            <span
              key={ln.key}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${ln.badgeClass}`}
            >
              {getLineIcon(ln.key, 12)}
              <span>{ln.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* View 2: Kanban Board */}
      {currentSubTab === 'kanban' && <ProductionKanbanTab />}

      {/* View 3: Gantt Chart */}
      {currentSubTab === 'gantt' && <ProductionGanttTab />}

      {/* View 1: Work Orders Table with 3 Parallel Production Lines */}
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
                placeholder="Search by Work Order, Customer, Machine..."
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
                  <span>Reset Filters</span>
                </button>
              )}

              <div className="px-3.5 py-1.5 bg-orange-50/80 border border-orange-200 rounded-xl text-xs font-bold text-orange-800 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-orange-600" />
                <span>{filteredProjects.length} Work Orders</span>
              </div>
            </div>
          </div>

          {/* Main Table with 3 Parallel Production Lines */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 uppercase text-[10px] font-bold tracking-wider select-none">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 min-w-[150px]">
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
                    <th className="py-3 px-3 min-w-[160px]">
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
                    <th className="py-3 px-3 min-w-[160px]">
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
                    <th className="py-3 px-3 min-w-[155px]">Mechanical Line</th>
                    <th className="py-3 px-3 min-w-[155px]">Electrical Line</th>
                    <th className="py-3 px-3 min-w-[155px]">Automation Line</th>
                    <th className="py-3 px-3 min-w-[130px]">Overall Progress</th>
                    <th className="py-3 px-3 w-36 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoadingProjects ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-slate-500">
                        Loading Work Orders...
                      </td>
                    </tr>
                  ) : filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-14 text-center">
                        <FolderGit2 className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-700">No production work orders found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((p: any, idx: number) => {
                      const renderLineCell = (lineKey: ProductionLineKey, barColor: string, badgeStyle: string) => {
                        const stats = p.lines[lineKey];
                        return (
                          <div
                            onClick={() => {
                              setSelectedProject(p);
                              setActiveLineFilter('ALL');
                            }}
                            className="space-y-1.5 cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${badgeStyle}`}
                              >
                                {stats.done}/{stats.total} Stages
                              </span>
                              <span className="font-mono text-[11px] font-extrabold text-slate-700">
                                {stats.percent}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  stats.percent >= 100 ? 'bg-emerald-500' : barColor
                                }`}
                                style={{ width: `${stats.percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      };

                      return (
                        <tr
                          key={p.id}
                          onClick={() => {
                            setSelectedProject(p);
                            setActiveLineFilter('ALL');
                          }}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 font-mono font-extrabold text-xs">
                              {p.workOrderNumber}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-bold text-slate-900">{p.customerName}</td>
                          <td className="py-3.5 px-3 font-semibold text-slate-700">{p.machineModel || 'N/A'}</td>

                          {/* Parallel Line 1: Mechanical */}
                          <td className="py-3.5 px-3">
                            {renderLineCell('MECHANICAL', 'bg-sky-500', 'bg-sky-50 text-sky-700 border-sky-200')}
                          </td>

                          {/* Parallel Line 2: Electrical */}
                          <td className="py-3.5 px-3">
                            {renderLineCell('ELECTRICAL', 'bg-amber-500', 'bg-amber-50 text-amber-700 border-amber-200')}
                          </td>

                          {/* Parallel Line 3: Automation */}
                          <td className="py-3.5 px-3">
                            {renderLineCell('AUTOMATION', 'bg-indigo-500', 'bg-indigo-50 text-indigo-700 border-indigo-200')}
                          </td>

                          {/* Overall Combined Progress */}
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

                          <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProject(p);
                                setActiveLineFilter('ALL');
                              }}
                              className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Workflow size={13} />
                              <span>3 Parallel Lines</span>
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

      {/* ========================================================================= */}
      {/* EXPANSIVE 3-COLUMN PARALLEL PRODUCTION FLOW MODAL FOR SELECTED WORK ORDER */}
      {/* ========================================================================= */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl xl:max-w-7xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Parallel Production Flow — {selectedProject.workOrderNumber}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {selectedProject.customerName} • {selectedProject.machineModel}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Segmented Line Filter Pills */}
                <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveLineFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeLineFilter === 'ALL'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All 3 Parallel Lines ({selectedProject.attachedSubStages.length})
                  </button>
                  {PRODUCTION_LINES.map((ln) => (
                    <button
                      key={ln.key}
                      type="button"
                      onClick={() => setActiveLineFilter(ln.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeLineFilter === ln.key
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {getLineIcon(ln.key, 12)}
                      <span>
                        {ln.shortLabel} ({selectedProject.lines[ln.key]?.total || 0})
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: 3 Parallel Production Lines Columns */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div
                className={`grid gap-4 ${
                  activeLineFilter === 'ALL' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'
                }`}
              >
                {PRODUCTION_LINES.filter(
                  (ln) => activeLineFilter === 'ALL' || activeLineFilter === ln.key
                ).map((ln) => {
                  const lineStats = selectedProject.lines[ln.key] || {
                    items: [],
                    total: 0,
                    done: 0,
                    percent: 0
                  };

                  return (
                    <div
                      key={ln.key}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden"
                    >
                      {/* Parallel Line Header */}
                      <div className={`p-4 border-b ${ln.headerBgClass} space-y-2.5`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center ${ln.badgeClass}`}
                            >
                              {getLineIcon(ln.key, 14)}
                            </span>
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                                {ln.label}
                              </h4>
                              <span className="text-[11px] font-semibold text-slate-500">
                                {lineStats.done} of {lineStats.total} Sub-Stages Completed
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenAttachForLine(ln.key)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${ln.btnClass}`}
                          >
                            <Plus size={14} />
                            <span>Attach Stage</span>
                          </button>
                        </div>

                        {/* Line Progress Bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white/80 border border-slate-200/70 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                lineStats.percent >= 100 ? 'bg-emerald-500' : ln.barClass
                              }`}
                              style={{ width: `${lineStats.percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-extrabold text-slate-800 w-9 text-right">
                            {lineStats.percent}%
                          </span>
                        </div>
                      </div>

                      {/* Sub-Stages List for this Parallel Line */}
                      <div className="p-3.5 space-y-2.5 flex-1">
                        {lineStats.items.length === 0 ? (
                          <div className="py-10 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                              {getLineIcon(ln.key, 16)}
                            </div>
                            <p className="text-xs font-bold text-slate-600">
                              No {ln.shortLabel} Sub-Stages Attached
                            </p>
                            <button
                              type="button"
                              onClick={() => handleOpenAttachForLine(ln.key)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
                            >
                              <Plus size={12} />
                              <span>Add {ln.shortLabel} Sub-Stage</span>
                            </button>
                          </div>
                        ) : (
                          lineStats.items.map((ss: any, idx: number) => {
                            const st = String(ss.status || 'NOT_STARTED').toUpperCase();
                            const isDone = st === 'COMPLETED';
                            const isInProg = st === 'IN_PROGRESS';
                            const isHold = st === 'ON_HOLD';

                            return (
                              <div
                                key={ss.id || idx}
                                className={`p-3 rounded-xl border transition-all space-y-2 ${
                                  isDone
                                    ? 'bg-emerald-50/30 border-emerald-200'
                                    : isInProg
                                    ? 'bg-orange-50/30 border-orange-200 shadow-2xs'
                                    : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2 min-w-0">
                                    <span className="w-5 h-5 rounded-md bg-slate-200/80 text-slate-700 font-mono font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                      {idx + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 text-xs leading-snug">
                                        {ss.title}
                                      </div>
                                      <span className="font-mono text-[10px] font-bold text-slate-400">
                                        {ss.subStageCode}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCycleSubStageStatus(ss.id, ss.status)}
                                      title="Click to cycle status (Not Started → In Progress → Completed)"
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                                        isDone
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : isInProg
                                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                                          : isHold
                                          ? 'bg-red-50 text-red-700 border-red-200'
                                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {isDone ? (
                                        <CheckCircle2 size={11} />
                                      ) : (
                                        <Clock size={11} />
                                      )}
                                      <span>{st.replace(/_/g, ' ')}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSubStage(ss.id)}
                                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                      title="Remove Sub-Stage"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                                  <span className="flex items-center gap-1 font-medium">
                                    <UserCheck size={11} className="text-slate-400" />
                                    {ss.assignedToUserName || ss.assignedUserName || 'Unassigned'}
                                  </span>
                                  {ss.targetEndDate && (
                                    <span className="flex items-center gap-1 font-mono">
                                      <Calendar size={11} className="text-slate-400" />
                                      {new Date(ss.targetEndDate).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short'
                                      })}
                                    </span>
                                  )}
                                  {ss.estimatedHours > 0 && (
                                    <span className="font-mono">{ss.estimatedHours}h</span>
                                  )}
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
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ATTACH SUB-STAGE TO SELECTED PARALLEL LINE        */}
      {/* ======================================================== */}
      {isAddModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Attach Sub-Stage to Production Line
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Work Order: {selectedProject.workOrderNumber}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubStage} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Parallel Production Line Selector (Button-Type Pills) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Parallel Production Line *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRODUCTION_LINES.map((ln) => (
                    <button
                      key={ln.key}
                      type="button"
                      onClick={() => {
                        setSelectedLineForAdd(ln.key);
                        setSelectedMasterSubStageId('');
                      }}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedLineForAdd === ln.key
                          ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {getLineIcon(ln.key, 13)}
                      <span>{ln.shortLabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select from Master Sub-Stages ({selectedLineForAdd})
                </label>
                <select
                  value={selectedMasterSubStageId}
                  onChange={(e) => setSelectedMasterSubStageId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="">-- Choose Master Sub-Stage (or type custom below) --</option>
                  {masterSubStages
                    .filter(
                      (m: any) =>
                        !m.productionLine ||
                        m.productionLine === selectedLineForAdd ||
                        m.parentStageCode === 'PRODUCTION_ASSEMBLY'
                    )
                    .map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.subStageCode} — {m.subStageName || m.name} ({m.standardDays}d)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Or Custom Sub-Stage Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={
                    selectedLineForAdd === 'MECHANICAL'
                      ? 'e.g., Main Frame & Spindle Assembly'
                      : selectedLineForAdd === 'ELECTRICAL'
                      ? 'e.g., Main Control Panel & Harness Wiring'
                      : 'e.g., PLC Servo Tuning & Synchronization'
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Assign Production Technician / Engineer
                </label>
                <select
                  value={assignedTechnicianId}
                  onChange={(e) => setAssignedTechnicianId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="">-- Select Team Member --</option>
                  {teamMembers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} — {t.designation} ({t.skillSpecialty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={targetEndDate}
                    onChange={(e) => setTargetEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingSubStage}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  {isAddingSubStage ? 'Attaching...' : `Attach to ${selectedLineForAdd}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
