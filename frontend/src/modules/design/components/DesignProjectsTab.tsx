'use client';

import React, { useState, useMemo } from 'react';
import {
  FolderGit2,
  Search,
  RotateCcw,
  Eye,
  Plus,
  Calendar,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  ChevronRight,
  Trash2,
  ExternalLink,
  Check,
  X
} from 'lucide-react';
import {
  useGetProjectsQuery,
  useGetMilestonesQuery,
  useGetSubStageMastersQuery,
  useGetDepartmentUsersQuery,
  useAddSubStageToMilestoneMutation,
  useUpdateSubStageMutation,
  useDeleteSubStageMutation
} from '../../project-setup/api/projectApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';
import ConfirmModal from '../../../components/ui/ConfirmModal';

export default function DesignProjectsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string[] | null>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Modals state
  const [selectedProjectForSubStages, setSelectedProjectForSubStages] = useState<any | null>(null);
  const [previewProject, setPreviewProject] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Sub-Stage form state
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedMasterSubStageId, setSelectedMasterSubStageId] = useState('');
  const [customSubStageTitle, setCustomSubStageTitle] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('16');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');

  // Sub-stage deletion confirmation state
  const [deletingSubStageId, setDeletingSubStageId] = useState<string | null>(null);

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({
    departmentModule: 'design'
  });
  const { data: subStageMastersData } = useGetSubStageMastersQuery({
    departmentModule: 'design'
  });
  const { data: deptUsersData } = useGetDepartmentUsersQuery();

  // Mutations
  const [addSubStage, { isLoading: isAddingSubStage }] = useAddSubStageToMilestoneMutation();
  const [updateSubStage, { isLoading: isUpdatingSubStage }] = useUpdateSubStageMutation();
  const [deleteSubStage, { isLoading: isDeletingSubStage }] = useDeleteSubStageMutation();

  const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const subStageMasters = useMemo(() => subStageMastersData?.subStages || [], [subStageMastersData]);
  const departmentUsers = useMemo(() => deptUsersData?.users || [], [deptUsersData]);

  // Filter design users
  const designEngineers = useMemo(() => {
    return departmentUsers.filter(
      (u: any) =>
        u.role?.name?.toLowerCase().includes('design') ||
        u.role?.name?.toLowerCase().includes('engineer') ||
        u.role?.name?.toLowerCase().includes('lead')
    );
  }, [departmentUsers]);

  // Extract design stage details per project and calculate urgency
  const designProjects = useMemo(() => {
    return rawProjects
      .map((proj: any) => {
        // Find milestone corresponding to Design
        const milestones = proj.milestones || [];
        const designMilestone =
          milestones.find(
            (m: any) =>
              (m.departmentModule && m.departmentModule.toLowerCase() === 'design') ||
              (m.stageCode && m.stageCode.toLowerCase().includes('design')) ||
              (m.title && m.title.toLowerCase().includes('design'))
          ) || milestones[0];

        const targetDateObj = designMilestone?.baselineDate || designMilestone?.projectedDate
          ? new Date(designMilestone.baselineDate || designMilestone.projectedDate)
          : null;
        const targetTs = targetDateObj ? targetDateObj.getTime() : 9999999999999;
        const nowTs = Date.now();
        const daysLeft = targetDateObj
          ? Math.round((targetTs - nowTs) / (1000 * 60 * 60 * 24))
          : null;
        const isOverdue = daysLeft !== null && daysLeft < 0 && designMilestone?.status !== 'COMPLETED';

        const subStages = designMilestone?.subStages || [];
        const completedCount = subStages.filter((s: any) => s.status === 'COMPLETED').length;
        const totalSubStages = subStages.length;
        const progressPercent =
          totalSubStages > 0 ? Math.round((completedCount / totalSubStages) * 100) : 0;

        return {
          id: proj.id,
          _id: proj.id,
          projectId: proj.projectId,
          workOrderNumber: proj.workOrderNumber || 'WO-PENDING',
          customerName: proj.customerName || 'Customer',
          machineModel: proj.machineModel || 'Precision Winding Machine',
          designMilestoneId: designMilestone?.id || '',
          designStageTitle: designMilestone?.title || 'Design & CAD',
          designStageCode: designMilestone?.stageCode || 'STG-DESIGN',
          designStatus: designMilestone?.status || 'NOT_STARTED',
          targetDateObj,
          targetTs,
          daysLeft,
          isOverdue,
          subStages,
          completedCount,
          totalSubStages,
          progressPercent,
          rawProject: proj,
          rawMilestone: designMilestone
        };
      })
      // Default Sorting: Earliest Design Target Date first (urgent first) as approved
      .sort((a, b) => a.targetTs - b.targetTs);
  }, [rawProjects]);

  // Live selected project with refreshed milestone sub-stages
  const activeSelectedProject = useMemo(() => {
    if (!selectedProjectForSubStages) return null;
    return (
      designProjects.find((p) => p.projectId === selectedProjectForSubStages.projectId) ||
      selectedProjectForSubStages
    );
  }, [selectedProjectForSubStages, designProjects]);

  // Filtering & Sorting
  const filteredProjects = useMemo(() => {
    let result = [...designProjects];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.projectId.toLowerCase().includes(q) ||
          p.workOrderNumber.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          p.machineModel.toLowerCase().includes(q) ||
          p.designStageTitle.toLowerCase().includes(q)
      );
    }

    Object.entries(columnFilters).forEach(([colKey, selectedVals]) => {
      if (selectedVals && selectedVals.length > 0) {
        result = result.filter((p: any) => {
          const val = String(p[colKey] || '(Blanks)');
          return selectedVals.includes(val);
        });
      }
    });

    if (sortConfig) {
      result.sort((a: any, b: any) => {
        const valA = a[sortConfig.key] ?? '';
        const valB = b[sortConfig.key] ?? '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [designProjects, searchTerm, columnFilters, sortConfig]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 || Object.keys(columnFilters).length > 0 || sortConfig !== null;

  const resetAllFilters = () => {
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig(null);
  };

  const handleFilterChange = (columnKey: string, selected: string[] | null) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!selected || selected.length === 0) {
        delete next[columnKey];
      } else {
        next[columnKey] = selected;
      }
      return next;
    });
  };

  const getDistinctValues = (columnKey: string): DistinctValueItem[] => {
    const map: Record<string, number> = {};
    designProjects.forEach((item: any) => {
      const val = String(item[columnKey] || '(Blanks)');
      map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Open Sub-Stage Manager modal
  const handleOpenSubStages = (project: any) => {
    setSelectedProjectForSubStages(project);
    setIsAddFormOpen(false);
    setSelectedMasterSubStageId('');
    setCustomSubStageTitle('');
    setAssignedUserId('');
    setTargetEndDate(
      project.targetDateObj ? project.targetDateObj.toISOString().split('T')[0] : ''
    );
    setEstimatedHours('16');
    setPriority('MEDIUM');
  };

  // Select Master Sub-Stage
  const handleSelectMasterSubStage = (masterId: string) => {
    setSelectedMasterSubStageId(masterId);
    if (!masterId) return;
    const master = subStageMasters.find((m: any) => m.id === masterId);
    if (master) {
      setCustomSubStageTitle(master.subStageName);
      if (master.defaultLeadRole) {
        const matchUser = designEngineers.find(
          (u: any) =>
            u.role?.name?.toLowerCase() === master.defaultLeadRole.toLowerCase() ||
            u.role?.name?.toLowerCase().includes('design')
        );
        if (matchUser) setAssignedUserId(matchUser.id);
      }
    }
  };

  // Add sub-stage submit
  const handleAddSubStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedProject || !activeSelectedProject.designMilestoneId) return;

    const titleToUse =
      customSubStageTitle.trim() ||
      (selectedMasterSubStageId
        ? subStageMasters.find((m: any) => m.id === selectedMasterSubStageId)?.subStageName
        : 'Design Sub-Stage');

    const selectedMaster = subStageMasters.find((m: any) => m.id === selectedMasterSubStageId);
    const subStageCode =
      selectedMaster?.subStageCode ||
      `DES-SUB-${String(activeSelectedProject.subStages.length + 1).padStart(2, '0')}`;

    const assignedUser = departmentUsers.find((u: any) => u.id === assignedUserId);
    const assignedUserName = assignedUser
      ? `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() || assignedUser.email
      : '';
    const assignedUserEmail = assignedUser?.email || '';

    try {
      await addSubStage({
        id: activeSelectedProject.designMilestoneId,
        projectId: activeSelectedProject.projectId,
        departmentModule: 'design',
        subStageCode,
        title: titleToUse,
        assignedToUserId: assignedUserId || null,
        assignedToUserName: assignedUserName,
        assignedToUserEmail: assignedUserEmail,
        baselineStartDate: new Date().toISOString(),
        targetEndDate: targetEndDate ? new Date(targetEndDate).toISOString() : new Date().toISOString(),
        estimatedHours: parseFloat(estimatedHours) || 0,
        actualHours: 0,
        priority
      }).unwrap();

      setToastMessage('All set! Sub-stage added to project.');
      setIsAddFormOpen(false);
      setSelectedMasterSubStageId('');
      setCustomSubStageTitle('');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage('We could not add this sub-stage right now. Please try again.');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Toggle sub-stage completion
  const handleToggleSubStageStatus = async (subStage: any) => {
    const isCompleted = subStage.status === 'COMPLETED';
    const nextStatus = isCompleted ? 'IN_PROGRESS' : 'COMPLETED';
    const nextPercent = isCompleted ? 50 : 100;

    try {
      await updateSubStage({
        subStageId: subStage.id,
        status: nextStatus,
        completionPercent: nextPercent,
        actualCompletionDate: !isCompleted ? new Date().toISOString() : null
      }).unwrap();

      setToastMessage(
        !isCompleted ? 'Sub-stage marked as completed!' : 'Sub-stage reopened to in-progress.'
      );
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage('We could not update the sub-stage status. Please try again.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Delete sub-stage
  const handleConfirmDeleteSubStage = async () => {
    if (!deletingSubStageId) return;
    try {
      await deleteSubStage(deletingSubStageId).unwrap();
      setToastMessage('All set! Sub-stage removed.');
      setDeletingSubStageId(null);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage('We could not remove this sub-stage right now. Please try again.');
      setDeletingSubStageId(null);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner with Industrial Identity */}
      <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-amber-400 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0 shadow-xs">
            <FolderGit2 size={22} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              Design Stage Projects & Workload Spine
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-medium text-slate-500">
                Machine House — Winding Technologies
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-semibold text-orange-600">
                Sorted by Earliest Design Delivery Target
              </span>
            </div>
          </div>
        </div>

        {/* Quick KPI Count Chips */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Projects with Design</div>
            <div className="text-sm font-extrabold text-slate-900">{designProjects.length}</div>
          </div>
          <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Active Sub-Stages</div>
            <div className="text-sm font-extrabold text-orange-600">
              {designProjects.reduce((sum, p) => sum + p.totalSubStages, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects, work orders, customers, machines..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
          />
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all self-end sm:self-auto"
          >
            <RotateCcw size={13} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Projects Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoadingProjects ? (
          <div className="p-16 text-center text-xs text-slate-500 font-medium">
            Loading design stage projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-16 text-center">
            <FolderGit2 size={36} className="mx-auto text-slate-300 mb-2" />
            <div className="text-xs font-bold text-slate-800">No projects found</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'No projects currently include a Design department stage.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="Project ID"
                      columnKey="projectId"
                      distinctValues={getDistinctValues('projectId')}
                      selectedValues={columnFilters['projectId'] || null}
                      onFilterChange={(selected) => handleFilterChange('projectId', selected)}
                      currentSortField={sortConfig?.key}
                      currentSortDirection={sortConfig?.direction}
                      onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                    />
                  </th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="Work Order"
                      columnKey="workOrderNumber"
                      distinctValues={getDistinctValues('workOrderNumber')}
                      selectedValues={columnFilters['workOrderNumber'] || null}
                      onFilterChange={(selected) => handleFilterChange('workOrderNumber', selected)}
                      currentSortField={sortConfig?.key}
                      currentSortDirection={sortConfig?.direction}
                      onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                    />
                  </th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="Customer"
                      columnKey="customerName"
                      distinctValues={getDistinctValues('customerName')}
                      selectedValues={columnFilters['customerName'] || null}
                      onFilterChange={(selected) => handleFilterChange('customerName', selected)}
                      currentSortField={sortConfig?.key}
                      currentSortDirection={sortConfig?.direction}
                      onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                    />
                  </th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="Machine Model"
                      columnKey="machineModel"
                      distinctValues={getDistinctValues('machineModel')}
                      selectedValues={columnFilters['machineModel'] || null}
                      onFilterChange={(selected) => handleFilterChange('machineModel', selected)}
                      currentSortField={sortConfig?.key}
                      currentSortDirection={sortConfig?.direction}
                      onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                    />
                  </th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="Design Stage"
                      columnKey="designStageTitle"
                      distinctValues={getDistinctValues('designStageTitle')}
                      selectedValues={columnFilters['designStageTitle'] || null}
                      onFilterChange={(selected) => handleFilterChange('designStageTitle', selected)}
                      currentSortField={sortConfig?.key}
                      currentSortDirection={sortConfig?.direction}
                      onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                    />
                  </th>
                  <th className="py-3 px-4">Target Date</th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="Status"
                      columnKey="designStatus"
                      distinctValues={getDistinctValues('designStatus')}
                      selectedValues={columnFilters['designStatus'] || null}
                      onFilterChange={(selected) => handleFilterChange('designStatus', selected)}
                      currentSortField={sortConfig?.key}
                      currentSortDirection={sortConfig?.direction}
                      onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                    />
                  </th>
                  <th className="py-3 px-4 text-center">Sub-Stages Progress</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-orange-600">
                      <button
                        onClick={() => setPreviewProject(p.rawProject)}
                        className="hover:underline text-left font-mono"
                      >
                        {p.projectId}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {p.workOrderNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{p.customerName}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{p.machineModel}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{p.designStageTitle}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">
                        {p.designStageCode}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {p.targetDateObj ? (
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-slate-900">
                            {p.targetDateObj.toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          {p.isOverdue ? (
                            <span className="inline-block text-[10px] font-extrabold text-red-700 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                              Overdue by {Math.abs(p.daysLeft || 0)}d
                            </span>
                          ) : p.daysLeft !== null && p.daysLeft <= 14 ? (
                            <span className="inline-block text-[10px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              {p.daysLeft}d left
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] font-semibold text-slate-500">
                              {p.daysLeft}d left
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono">TBD</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          p.designStatus === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.designStatus === 'IN_PROGRESS'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : p.designStatus === 'ON_HOLD'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {p.designStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="w-32 mx-auto space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-600">
                            {p.completedCount}/{p.totalSubStages} Done
                          </span>
                          <span className="text-orange-600">{p.progressPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all duration-300"
                            style={{ width: `${p.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenSubStages(p)}
                          className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs shadow-orange-500/20 transition-all flex items-center gap-1.5 shrink-0"
                        >
                          <Layers size={13} />
                          <span>Manage Sub-Stages</span>
                        </button>
                        <button
                          onClick={() => setPreviewProject(p.rawProject)}
                          title="Preview Project"
                          className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sub-Stages Manager Modal */}
      {activeSelectedProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe (AGENTS.md mandate) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-sm font-extrabold flex items-center gap-2">
                    <span>Design Sub-Stages</span>
                    <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                      {activeSelectedProject.projectId}
                    </span>
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {activeSelectedProject.customerName} • {activeSelectedProject.machineModel}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedProjectForSubStages(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Project Target & Overall Progress Summary */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-800">
                    Milestone: {activeSelectedProject.designStageTitle} ({activeSelectedProject.designStageCode})
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar size={14} className="text-orange-500" />
                    <span>
                      Design Target:{' '}
                      {activeSelectedProject.targetDateObj
                        ? activeSelectedProject.targetDateObj.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : 'Not Scheduled'}
                    </span>
                    {activeSelectedProject.isOverdue && (
                      <span className="text-red-700 font-extrabold bg-red-100 px-2 py-0.5 rounded-md">
                        Overdue
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-slate-500">Sub-Stage Progress</div>
                    <div className="text-xs font-extrabold text-orange-600">
                      {activeSelectedProject.completedCount} of {activeSelectedProject.totalSubStages} Completed ({activeSelectedProject.progressPercent}%)
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAddFormOpen(!isAddFormOpen)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all shrink-0"
                  >
                    <Plus size={15} />
                    <span>{isAddFormOpen ? 'Cancel' : 'Add Sub-Stage'}</span>
                  </button>
                </div>
              </div>

              {/* Add Sub-Stage Drawer / Inline Form */}
              {isAddFormOpen && (
                <form
                  onSubmit={handleAddSubStageSubmit}
                  className="bg-white rounded-2xl border-2 border-orange-300 p-4 space-y-4 shadow-sm animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Plus size={15} className="text-orange-500" />
                      <span>Add Sub-Stage from Design Master</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Master source: Design Masters &gt; Sub-Stages
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Master Dropdown */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Select from Design Master
                      </label>
                      <select
                        value={selectedMasterSubStageId}
                        onChange={(e) => handleSelectMasterSubStage(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                      >
                        <option value="">-- Choose from Master Sub-Stages --</option>
                        {subStageMasters.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.subStageName} ({m.subStageCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Custom Title Override */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Sub-Stage Title / Scope
                      </label>
                      <input
                        type="text"
                        required
                        value={customSubStageTitle}
                        onChange={(e) => setCustomSubStageTitle(e.target.value)}
                        placeholder="e.g. 3D GA Layout & Enclosure CAD"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    {/* Assigned Engineer */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Assigned Design Engineer
                      </label>
                      <select
                        value={assignedUserId}
                        onChange={(e) => setAssignedUserId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                      >
                        <option value="">-- Assign to Design Engineer --</option>
                        {designEngineers.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.firstName || ''} {u.lastName || ''} ({u.role?.name || 'Engineer'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target Date */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Target Completion Date
                      </label>
                      <input
                        type="date"
                        required
                        value={targetEndDate}
                        onChange={(e) => setTargetEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    {/* Estimated Hours */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={estimatedHours}
                        onChange={(e) => setEstimatedHours(e.target.value)}
                        placeholder="16"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Priority Level
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddFormOpen(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingSubStage}
                      className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all"
                    >
                      {isAddingSubStage ? 'Adding...' : 'Attach Sub-Stage'}
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-Stages Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                {activeSelectedProject.subStages.length === 0 ? (
                  <div className="p-12 text-center">
                    <Layers size={32} className="mx-auto text-slate-300 mb-2" />
                    <div className="text-xs font-bold text-slate-800">No Sub-Stages configured yet</div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Click "+ Add Sub-Stage" above to select and attach design tasks from your Master.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Sub-Stage</th>
                        <th className="py-2.5 px-3">Assigned Engineer</th>
                        <th className="py-2.5 px-3 text-center">Hours</th>
                        <th className="py-2.5 px-3">Target Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeSelectedProject.subStages.map((sub: any, idx: number) => {
                        const isDone = sub.status === 'COMPLETED';
                        const subTarget = sub.targetEndDate ? new Date(sub.targetEndDate) : null;
                        const isSubOverdue =
                          !isDone && subTarget && subTarget.getTime() < Date.now();

                        return (
                          <tr key={sub.id || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-400">
                              #{idx + 1}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900">{sub.title}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {sub.subStageCode}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-800">
                                {sub.assignedToUserName || 'Unassigned'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {sub.assignedToUserEmail}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                              {sub.estimatedHours || 0}h
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-mono text-slate-800">
                                {subTarget
                                  ? subTarget.toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })
                                  : '-'}
                              </div>
                              {isSubOverdue && (
                                <span className="text-[9px] font-extrabold text-red-700 bg-red-50 px-1 rounded">
                                  Overdue
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  isDone
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : sub.status === 'IN_PROGRESS'
                                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {sub.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleToggleSubStageStatus(sub)}
                                  title={isDone ? 'Mark as In-Progress' : 'Mark as Completed'}
                                  className={`p-1.5 rounded-lg border transition-colors ${
                                    isDone
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                                  }`}
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  onClick={() => setDeletingSubStageId(sub.id)}
                                  title="Delete Sub-Stage"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                Sub-stages automatically synchronize with the Project Kanban Gantt view.
              </span>
              <button
                onClick={() => setSelectedProjectForSubStages(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Sub-Stage Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingSubStageId)}
        title="Remove this Sub-Stage?"
        message="This will delete the sub-stage from this project's design milestone and update overall stage progress."
        confirmText="Yes, remove"
        cancelText="Cancel"
        isLoading={isDeletingSubStage}
        onConfirm={handleConfirmDeleteSubStage}
        onClose={() => setDeletingSubStageId(null)}
      />

      {/* Project Dossier Preview Modal */}
      {previewProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FolderGit2 size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-sm font-extrabold">{previewProject.projectId}</h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {previewProject.workOrderNumber} • {previewProject.customerName}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewProject(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Customer & Machine</label>
                <div className="text-sm font-extrabold text-slate-900">
                  {previewProject.customerName} — {previewProject.machineModel}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Current Stage</div>
                  <div className="font-bold text-slate-900">{previewProject.currentStage || 'Design & CAD'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Overall Progress</div>
                  <div className="font-bold text-orange-600">{previewProject.progressPercent || 0}%</div>
                </div>
              </div>

              {/* Universal Action Tracking Audit Card */}
              <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Created By</div>
                  <div className="font-bold text-slate-900">{previewProject.createdByName || 'System'}</div>
                  <div className="text-[10px] text-slate-400">
                    {previewProject.createdAt ? new Date(previewProject.createdAt).toLocaleString('en-IN') : '-'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Last Updated</div>
                  <div className="font-bold text-slate-900">
                    {previewProject.updatedByName || previewProject.createdByName || 'System'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {previewProject.updatedAt ? new Date(previewProject.updatedAt).toLocaleString('en-IN') : '-'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
              <button
                onClick={() => setPreviewProject(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
