'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Plus,
  Search,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  User,
  X,
  RotateCcw,
  Sliders,
  Save,
  Eye,
  Lock,
  AlertTriangle,
  FolderGit2,
  ShieldCheck,
  Clock,
  UserCheck
} from 'lucide-react';
import {
  useGetStageMastersQuery,
  useCreateStageMasterMutation,
  useUpdateStageMasterMutation,
  useDeleteStageMasterMutation,
  useUpdateProjectSetupConfigMutation,
  useGetDepartmentUsersQuery
} from '../api/projectApi';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import ExcelColumnFilter from '../../../components/ui/ExcelColumnFilter';

const DEPARTMENT_MODULES = [
  { id: 'design', label: 'Design & Engineering' },
  { id: 'purchase', label: 'Purchase & Sourcing' },
  { id: 'store', label: 'Store & Inventory' },
  { id: 'production-trial', label: 'Production & Testing' },
  { id: 'quality', label: 'Quality & Inspection' },
  { id: 'dispatch', label: 'Trials/Inspection & Dispatch' },
  { id: 'after-sales', label: 'After Sales & Service' },
  { id: 'project-setup', label: 'Project Setup & Planning' }
];

export default function ProjectMastersTab({
  initialSubTab
}: {
  initialSubTab?: 'stages' | 'prefixPolicy' | 'approval';
} = {}) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const activeSubTab: 'stages' | 'prefixPolicy' | 'approval' =
    initialSubTab ||
    (pathname?.endsWith('/prefix-policy')
      ? 'prefixPolicy'
      : pathname?.endsWith('/approval')
      ? 'approval'
      : 'stages');

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[] | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[] | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string[] | null>(null);
  const [sortField, setSortField] = useState<string>('defaultOrder');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<any | null>(null);
  const [previewStage, setPreviewStage] = useState<any | null>(null);
  const [stageToDelete, setStageToDelete] = useState<any | null>(null);

  // Main Stage Form State
  const [stageCode, setStageCode] = useState('');
  const [stageName, setStageName] = useState('');
  const [departmentModule, setDepartmentModule] = useState('design');
  const [defaultOrder, setDefaultOrder] = useState('1');
  const [leadRole, setLeadRole] = useState('');
  const [weightPercent, setWeightPercent] = useState('15');
  const [description, setDescription] = useState('');
  const [stageIsActive, setStageIsActive] = useState(true);

  // Prefix & Lock Policy State
  const [policy, setPolicy] = useState<any>({
    workOrderPrefix: 'WO',
    workOrderStartSeq: 1001,
    projectStartSeq: 1001,
    stagePrefix: 'STG',
    stageStartSeq: 101,
    approverUserIds: [],
    approverUsers: [],
    editTimeLimitMode: 'UNLIMITED',
    editTimeLimitHours: 0,
    deleteTimeLimitMode: 'UNLIMITED',
    deleteTimeLimitHours: 0,
    requireRemarkOnStageMove: true,
    lockBaselineDatesAfterKickoff: false
  });
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState('');

  // Queries & Mutations
  const { data, isLoading } = useGetStageMastersQuery({ includeInactive: true });
  const { data: usersData } = useGetDepartmentUsersQuery(undefined, {
    skip: activeSubTab !== 'approval'
  });
  const allUsers = useMemo(() => usersData?.users || [], [usersData]);
  const [createStage, { isLoading: isCreating }] = useCreateStageMasterMutation();
  const [updateStage, { isLoading: isUpdating }] = useUpdateStageMasterMutation();
  const [deleteStage, { isLoading: isDeleting }] = useDeleteStageMasterMutation();
  const [updateConfig, { isLoading: isSavingPolicy }] = useUpdateProjectSetupConfigMutation();

  const stages = useMemo(() => data?.stages || [], [data]);

  useEffect(() => {
    if (data?.prefixLockPolicy) {
      setPolicy((prev: any) => ({ ...prev, ...data.prefixLockPolicy }));
    }
  }, [data]);

  // Distinct values for ExcelColumnFilter
  const distinctModules = useMemo(() => {
    const map = new Map<string, number>();
    stages.forEach((s: any) => {
      const val = s.departmentModule || 'project-setup';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [stages]);

  const distinctRoles = useMemo(() => {
    const map = new Map<string, number>();
    stages.forEach((s: any) => {
      const val = s.leadRole || 'Unassigned';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [stages]);

  const distinctStatuses = useMemo(() => {
    const map = new Map<string, number>();
    stages.forEach((s: any) => {
      const val = s.isActive ? 'Active' : 'Inactive';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [stages]);

  // Filter & Sort Stages
  const filteredStages = useMemo(() => {
    const result = stages.filter((s: any) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matches =
          s.stageCode?.toLowerCase().includes(term) ||
          s.stageName?.toLowerCase().includes(term) ||
          s.title?.toLowerCase().includes(term) ||
          s.leadRole?.toLowerCase().includes(term) ||
          s.departmentModule?.toLowerCase().includes(term) ||
          s.description?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      if (selectedModules !== null) {
        const mod = s.departmentModule || 'project-setup';
        if (!selectedModules.includes(mod)) return false;
      }

      if (selectedRoles !== null) {
        const role = s.leadRole || 'Unassigned';
        if (!selectedRoles.includes(role)) return false;
      }

      if (selectedStatus !== null) {
        const st = s.isActive ? 'Active' : 'Inactive';
        if (!selectedStatus.includes(st)) return false;
      }

      return true;
    });

    result.sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'stageName') {
        aVal = (a.stageName || a.title || '').toLowerCase();
        bVal = (b.stageName || b.title || '').toLowerCase();
      } else if (sortField === 'defaultOrder' || sortField === 'weightPercent') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [stages, searchTerm, selectedModules, selectedRoles, selectedStatus, sortField, sortDirection]);

  const isFiltered =
    Boolean(searchTerm) ||
    selectedModules !== null ||
    selectedRoles !== null ||
    selectedStatus !== null;

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedModules(null);
    setSelectedRoles(null);
    setSelectedStatus(null);
    setSortField('defaultOrder');
    setSortDirection('asc');
  };

  const generateSuggestedStageCode = () => {
    const prefix = String(policy.stagePrefix || 'STG').trim().toUpperCase().replace(/-+$/, '');
    const startSeq = Number(policy.stageStartSeq) || 101;

    const usedCodes = new Set<string>();
    let maxSeq = startSeq - 1;
    stages.forEach((s: any) => {
      const code = String(s.stageCode || '').trim().toUpperCase();
      if (code) usedCodes.add(code);
      const match = code.match(/[-_]?(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    });

    let candidateSeq = Math.max(startSeq, maxSeq + 1);
    let candidate = `${prefix}-${String(candidateSeq).padStart(3, '0')}`;
    while (usedCodes.has(candidate.toUpperCase())) {
      candidateSeq += 1;
      candidate = `${prefix}-${String(candidateSeq).padStart(3, '0')}`;
    }
    return candidate;
  };

  // Real-time live duplicate detection for Stage Code
  const duplicateStage = useMemo(() => {
    const cleanCode = stageCode.trim().toUpperCase().replace(/\s+/g, '_');
    if (!cleanCode) return null;
    return (
      stages.find((s: any) => {
        if (editingStage) {
          const editId = editingStage._id || editingStage.id;
          if (s._id === editId || s.id === editId) return false;
        }
        return String(s.stageCode || '').trim().toUpperCase() === cleanCode;
      }) || null
    );
  }, [stageCode, stages, editingStage]);

  const handleOpenAddModal = () => {
    setEditingStage(null);
    setStageCode(generateSuggestedStageCode());
    setStageName('');
    setDepartmentModule('design');
    setDefaultOrder(String(stages.length + 1));
    setLeadRole('');
    setWeightPercent('0');
    setDescription('');
    setStageIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (stage: any) => {
    setEditingStage(stage);
    setStageCode(stage.stageCode || '');
    setStageName(stage.stageName || stage.title || '');
    setDepartmentModule(stage.departmentModule || 'design');
    setDefaultOrder(String(stage.defaultOrder || 1));
    setLeadRole(stage.leadRole || '');
    setWeightPercent(String(stage.weightPercent || 15));
    setDescription(stage.description || '');
    setStageIsActive(stage.isActive !== false);
    setIsAddModalOpen(true);
  };

  const handleToggleStageActive = async (stage: any) => {
    try {
      const nextActive = !stage.isActive;
      await updateStage({
        id: stage._id || stage.id,
        isActive: nextActive
      }).unwrap();
      dispatch(
        addToast({
          type: 'success',
          title: nextActive ? 'Stage Activated' : 'Stage Deactivated',
          message: nextActive
            ? `Stage '${stage.stageName}' is now active and available for project assignment.`
            : `Stage '${stage.stageName}' has been deactivated and hidden from future project assignments.`
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: err?.data?.message || 'Could not update stage status.'
        })
      );
    }
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageCode.trim() || !stageName.trim()) {
      dispatch(addToast({ type: 'error', message: 'Stage Code and Stage Name are required.' }));
      return;
    }

    try {
      const payload = {
        stageCode: stageCode.trim().toUpperCase().replace(/\s+/g, '_'),
        stageName: stageName.trim(),
        title: stageName.trim(),
        departmentModule,
        defaultOrder: Number(defaultOrder) || 1,
        leadRole: leadRole.trim(),
        standardDaysOffset: 14,
        weightPercent: Number(weightPercent) || 0,
        description: description.trim(),
        isActive: stageIsActive
      };

      if (editingStage) {
        const res: any = await updateStage({ id: editingStage._id || editingStage.id, ...payload }).unwrap();
        dispatch(
          addToast({
            type: 'success',
            title: 'Stage Updated',
            message: res?.message || `Stage '${payload.stageName}' updated successfully.`
          })
        );
      } else {
        const res: any = await createStage(payload).unwrap();
        dispatch(
          addToast({
            type: 'success',
            title: 'Stage Created',
            message: res?.message || `New department stage '${payload.stageName}' added.`
          })
        );
      }

      setIsAddModalOpen(false);
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Error',
          message: err?.data?.message || 'Could not save stage.'
        })
      );
    }
  };

  const handleSavePolicy = async (overridePolicy?: any) => {
    try {
      const isCustomPolicy = Boolean(
        overridePolicy &&
          typeof overridePolicy === 'object' &&
          !overridePolicy.nativeEvent &&
          !overridePolicy.target
      );
      let policyToSave = isCustomPolicy ? overridePolicy : { ...policy };

      // If a user is currently selected in the "Assign User to Approve Work Orders" dropdown, auto-include them on save!
      if (selectedUserIdToAdd && !isCustomPolicy) {
        const foundUser = allUsers.find((u: any) => (u.id || u._id) === selectedUserIdToAdd);
        const currentIds = Array.isArray(policyToSave.approverUserIds) ? policyToSave.approverUserIds : [];
        const currentUsers = Array.isArray(policyToSave.approverUsers) ? policyToSave.approverUsers : [];
        if (!currentIds.includes(selectedUserIdToAdd)) {
          policyToSave = {
            ...policyToSave,
            approverUserIds: [...currentIds, selectedUserIdToAdd],
            approverUsers: foundUser
              ? [
                  ...currentUsers.filter((cu: any) => cu.id !== selectedUserIdToAdd),
                  {
                    id: foundUser.id || foundUser._id,
                    name: foundUser.name,
                    email: foundUser.email,
                    roleName: foundUser.roleName || '',
                    department: foundUser.department || ''
                  }
                ]
              : currentUsers
          };
          setPolicy(policyToSave);
        }
        setSelectedUserIdToAdd('');
      }

      const res: any = await updateConfig({ prefixLockPolicy: policyToSave }).unwrap();
      if (res?.prefixLockPolicy) {
        setPolicy((prev: any) => ({ ...prev, ...res.prefixLockPolicy }));
      }
      dispatch(
        addToast({
          type: 'success',
          title: 'Policy Saved & Applied',
          message: res?.message || 'All set! Approval assignment and time policies saved and applied to Work Orders.'
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Error',
          message: err?.data?.message || 'Could not save policy.'
        })
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!stageToDelete) return;
    try {
      const res: any = await deleteStage(stageToDelete._id || stageToDelete.id).unwrap();
      if (res?.isDeactivated) {
        dispatch(
          addToast({
            type: 'warning',
            title: 'Stage Deactivated (Assigned to Project)',
            message:
              res.message ||
              `Stage '${stageToDelete.stageName}' is assigned to a project so it cannot be deleted. It has been deactivated for future projects.`
          })
        );
      } else {
        dispatch(
          addToast({
            type: 'success',
            title: 'Stage Deleted',
            message:
              res?.message ||
              `Stage '${stageToDelete.stageName || stageToDelete.title}' has been permanently deleted.`
          })
        );
      }
      setStageToDelete(null);
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Failed to Remove',
          message: err?.data?.message || 'Unable to delete stage.'
        })
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Link
            href="/project-setup/masters/stages"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeSubTab === 'stages'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers size={14} />
            <span>Department Stages ({stages.length})</span>
          </Link>

          <Link
            href="/project-setup/masters/prefix-policy"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeSubTab === 'prefixPolicy'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sliders size={14} />
            <span>Prefix &amp; Numbering Policy</span>
          </Link>

          <Link
            href="/project-setup/masters/approval"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeSubTab === 'approval'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldCheck size={14} />
            <span>
              Approval &amp; Time Policy{' '}
              {Array.isArray(policy.approverUserIds) && policy.approverUserIds.length > 0
                ? `(${policy.approverUserIds.length})`
                : ''}
            </span>
          </Link>
        </div>
      </div>

      {activeSubTab === 'stages' && (
        <div className="space-y-4">
          {/* Universal Dedicated Table Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search stage code, name, department module, role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {isFiltered && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  title="Reset all active filters"
                >
                  <RotateCcw size={14} className="text-orange-500" />
                  <span>Reset Filters</span>
                </button>
              )}

              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>Add Department Stage</span>
              </button>
            </div>
          </div>

          {/* Department Stages Master Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    <th className="py-3 px-4 w-16">Seq</th>
                    <th className="py-3 px-4">Stage Name &amp; Code</th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Department Module"
                        columnKey="departmentModule"
                        distinctValues={distinctModules}
                        selectedValues={selectedModules}
                        onFilterChange={setSelectedModules}
                      />
                    </th>
                    <th className="py-3 px-4">Assigned Projects</th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Status"
                        columnKey="status"
                        distinctValues={distinctStatuses}
                        selectedValues={selectedStatus}
                        onFilterChange={setSelectedStatus}
                      />
                    </th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        Loading department stage masters...
                      </td>
                    </tr>
                  ) : filteredStages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Layers size={32} className="text-slate-300" />
                          <p className="text-xs font-bold text-slate-700">
                            {isFiltered
                              ? 'No department stages match your search criteria.'
                              : 'No department stages created yet.'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {isFiltered
                              ? 'Try clearing your active search or column filters.'
                              : 'Click "Add Department Stage" to manually create your first project stage.'}
                          </p>
                          {!isFiltered && (
                            <button
                              type="button"
                              onClick={handleOpenAddModal}
                              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                            >
                              <Plus size={14} />
                              <span>Add Department Stage</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStages.map((stage: any, index: number) => {
                      const modLabel =
                        DEPARTMENT_MODULES.find((m) => m.id === stage.departmentModule)?.label ||
                        stage.departmentModule ||
                        'Project Setup';
                      const assignedCount = Number(stage.assignedProjectsCount || 0);

                      return (
                        <tr
                          key={stage._id || stage.id || index}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            !stage.isActive ? 'opacity-65 bg-slate-50/40' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                            #{stage.defaultOrder || index + 1}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <button
                              onClick={() => setPreviewStage(stage)}
                              className="text-left font-bold text-slate-900 hover:text-orange-600 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span>{stage.stageName || stage.title}</span>
                                <span className="font-mono text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                                  {stage.stageCode}
                                </span>
                              </div>
                              {stage.description && (
                                <div className="text-[11px] text-slate-400 font-normal truncate max-w-sm mt-0.5">
                                  {stage.description}
                                </div>
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px]">
                              {modLabel}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {assignedCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => setPreviewStage(stage)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-bold text-[11px] hover:bg-sky-100 transition-colors cursor-pointer"
                                title="Click to view assigned projects"
                              >
                                <FolderGit2 size={12} />
                                <span>
                                  {assignedCount} Project{assignedCount === 1 ? '' : 's'}
                                </span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">
                                Unassigned
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                stage.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {stage.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setPreviewStage(stage)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Preview Stage Dossier"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(stage)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Edit Stage"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleToggleStageActive(stage)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  stage.isActive
                                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={
                                  stage.isActive
                                    ? 'Deactivate Stage (Prevent assignment to new projects)'
                                    : 'Activate Stage (Allow assignment to projects)'
                                }
                              >
                                {stage.isActive ? <Lock size={15} /> : <CheckCircle2 size={15} />}
                              </button>
                              <button
                                onClick={() => setStageToDelete(stage)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title={
                                  assignedCount > 0
                                    ? 'Assigned to project(s) — Click to Deactivate'
                                    : 'Delete Stage Permanently'
                                }
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
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

      {/* POLICY SUB-TAB */}
      {activeSubTab === 'prefixPolicy' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 max-w-4xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <Sliders size={18} className="text-orange-500" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Work Order &amp; Stage Prefix Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Governs auto-generated Work Order numbers, Department Stage codes, and incremental starting sequences.
                </p>
              </div>
            </div>

            <button
              onClick={handleSavePolicy}
              disabled={isSavingPolicy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSavingPolicy ? 'Saving...' : 'Save Policy'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Work Order Prefix
              </label>
              <input
                type="text"
                value={policy.workOrderPrefix || 'WO'}
                onChange={(e) =>
                  setPolicy({ ...policy, workOrderPrefix: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:border-orange-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500">
                Format: <strong className="font-mono">{policy.workOrderPrefix || 'WO'}-YYYY-{String(policy.workOrderStartSeq || policy.projectStartSeq || 1001).padStart(4, '0')}</strong>
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Work Order Starting Sequence
              </label>
              <input
                type="number"
                min={1}
                value={policy.workOrderStartSeq || policy.projectStartSeq || 1001}
                onChange={(e) => {
                  const seq = Number(e.target.value) || 1001;
                  setPolicy({
                    ...policy,
                    workOrderStartSeq: seq,
                    projectStartSeq: seq
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:border-orange-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500">
                Incremental sequence starting from <strong className="font-mono">{String(policy.workOrderStartSeq || policy.projectStartSeq || 1001).padStart(4, '0')}</strong>
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Department Stage Prefix
              </label>
              <input
                type="text"
                value={policy.stagePrefix || 'STG'}
                onChange={(e) =>
                  setPolicy({ ...policy, stagePrefix: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:border-orange-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500">
                Format: <strong className="font-mono">{policy.stagePrefix || 'STG'}-{String(policy.stageStartSeq || 101).padStart(3, '0')}</strong>
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Stage Starting Sequence
              </label>
              <input
                type="number"
                min={1}
                value={policy.stageStartSeq || 101}
                onChange={(e) => {
                  const seq = Number(e.target.value) || 101;
                  setPolicy({
                    ...policy,
                    stageStartSeq: seq
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:border-orange-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500">
                Incremental sequence starting from <strong className="font-mono">{String(policy.stageStartSeq || 101).padStart(3, '0')}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* APPROVAL & TIME POLICY SUB-TAB                           */}
      {/* ======================================================== */}
      {activeSubTab === 'approval' && (
        <div className="space-y-6 max-w-5xl">
          {/* Card 1: Work Order Approval User Assignment */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Work Order Creation Approval Assignment
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {Array.isArray(policy.approverUserIds) && policy.approverUserIds.length > 0
                      ? 'Approval Required: Newly created Work Orders remain in "Created" status and are hidden from downstream modules until approved by an assigned user below.'
                      : 'Auto-Approved Mode: No approver user is assigned, so newly created Work Orders are automatically approved upon creation.'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSavePolicy}
                disabled={isSavingPolicy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Save size={15} />
                <span>{isSavingPolicy ? 'Saving...' : 'Save Approval & Policy'}</span>
              </button>
            </div>

            {/* Add Approver User Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Assign User to Approve Work Orders
                </label>
                <select
                  value={selectedUserIdToAdd}
                  onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-orange-500 focus:outline-none"
                >
                  <option value="">-- Select User from Directory --</option>
                  {allUsers
                    .filter(
                      (u: any) =>
                        !(Array.isArray(policy.approverUserIds) ? policy.approverUserIds : []).includes(
                          u.id || u._id
                        )
                    )
                    .map((u: any) => (
                      <option key={u.id || u._id} value={u.id || u._id}>
                        {u.name} ({u.email}) — {u.roleName || u.department || 'Staff'}
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="button"
                disabled={!selectedUserIdToAdd || isSavingPolicy}
                onClick={() => {
                  if (!selectedUserIdToAdd) return;
                  const foundUser = allUsers.find(
                    (u: any) => (u.id || u._id) === selectedUserIdToAdd
                  );
                  const currentIds = Array.isArray(policy.approverUserIds)
                    ? policy.approverUserIds
                    : [];
                  const currentUsers = Array.isArray(policy.approverUsers)
                    ? policy.approverUsers
                    : [];
                  if (!currentIds.includes(selectedUserIdToAdd)) {
                    const updatedPolicy = {
                      ...policy,
                      approverUserIds: [...currentIds, selectedUserIdToAdd],
                      approverUsers: foundUser
                        ? [
                            ...currentUsers.filter((cu: any) => cu.id !== selectedUserIdToAdd),
                            {
                              id: foundUser.id || foundUser._id,
                              name: foundUser.name,
                              email: foundUser.email,
                              roleName: foundUser.roleName || '',
                              department: foundUser.department || ''
                            }
                          ]
                        : currentUsers
                    };
                    setPolicy(updatedPolicy);
                    setSelectedUserIdToAdd('');
                    handleSavePolicy(updatedPolicy);
                  } else {
                    setSelectedUserIdToAdd('');
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus size={15} />
                <span>Assign Approver</span>
              </button>
            </div>

            {/* Assigned Approver Users List */}
            {(!Array.isArray(policy.approverUserIds) || policy.approverUserIds.length === 0) ? (
              <div className="p-6 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">
                      No Approver Assigned — Work Orders Auto-Approved on Creation
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Assign one or more users above if you want Work Orders to require approval before appearing in Design, Purchase, Quality, Store, Production, and Dispatch.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Assigned Approvers ({policy.approverUserIds.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updatedPolicy = {
                        ...policy,
                        approverUserIds: [],
                        approverUsers: []
                      };
                      setPolicy(updatedPolicy);
                      handleSavePolicy(updatedPolicy);
                    }}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    Clear All (Switch to Auto-Approve)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {policy.approverUserIds.map((uid: string) => {
                    const cached =
                      (Array.isArray(policy.approverUsers)
                        ? policy.approverUsers.find((cu: any) => cu.id === uid)
                        : null) ||
                      allUsers.find((u: any) => (u.id || u._id) === uid);

                    return (
                      <div
                        key={uid}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {(cached?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {cached?.name || uid}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {cached?.email || ''}{' '}
                              {cached?.roleName ? `• ${cached.roleName}` : ''}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const updatedPolicy = {
                              ...policy,
                              approverUserIds: policy.approverUserIds.filter(
                                (id: string) => id !== uid
                              ),
                              approverUsers: Array.isArray(policy.approverUsers)
                                ? policy.approverUsers.filter((cu: any) => cu.id !== uid)
                                : []
                            };
                            setPolicy(updatedPolicy);
                            handleSavePolicy(updatedPolicy);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove Approver"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Work Order Edit & Delete Time Policy (0 to Unlimited) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Work Order Edit &amp; Delete Time Window Policy (0 to Unlimited)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Controls how long after creation a Work Order remains editable or deletable (0 hours = locked immediately, or Unlimited time).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSavePolicy()}
                disabled={isSavingPolicy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Save size={15} />
                <span>{isSavingPolicy ? 'Saving...' : 'Save Time Policy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Edit Time Policy */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-900">
                    Work Order Edit Time Policy
                  </label>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    {(policy.editTimeLimitMode || 'UNLIMITED') === 'UNLIMITED'
                      ? 'Unlimited Time'
                      : `${Number(policy.editTimeLimitHours || 0)} Hours`}
                  </span>
                </div>

                {/* Pill Toggle: Unlimited vs Custom Hours */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-xl">
                  <button
                    type="button"
                    onClick={() =>
                      setPolicy({ ...policy, editTimeLimitMode: 'UNLIMITED' })
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      (policy.editTimeLimitMode || 'UNLIMITED') === 'UNLIMITED'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Unlimited Time
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPolicy({
                        ...policy,
                        editTimeLimitMode: 'LIMITED',
                        editTimeLimitHours: Number(policy.editTimeLimitHours ?? 24)
                      })
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      policy.editTimeLimitMode === 'LIMITED'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Time Limit (0 – ∞ Hrs)
                  </button>
                </div>

                {policy.editTimeLimitMode === 'LIMITED' && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Allowed Edit Window After Creation (Hours)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={policy.editTimeLimitHours ?? 0}
                      onChange={(e) =>
                        setPolicy({
                          ...policy,
                          editTimeLimitHours: Math.max(0, Number(e.target.value) || 0)
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[0, 1, 12, 24, 48, 72, 168].map((hrs) => (
                        <button
                          key={hrs}
                          type="button"
                          onClick={() =>
                            setPolicy({ ...policy, editTimeLimitHours: hrs })
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            Number(policy.editTimeLimitHours) === hrs
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {hrs === 0 ? '0h (Locked)' : hrs === 168 ? '168h (7d)' : `${hrs}h`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Delete Time Policy */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-900">
                    Work Order Delete Time Policy
                  </label>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    {(policy.deleteTimeLimitMode || 'UNLIMITED') === 'UNLIMITED'
                      ? 'Unlimited Time'
                      : `${Number(policy.deleteTimeLimitHours || 0)} Hours`}
                  </span>
                </div>

                {/* Pill Toggle: Unlimited vs Custom Hours */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-xl">
                  <button
                    type="button"
                    onClick={() =>
                      setPolicy({ ...policy, deleteTimeLimitMode: 'UNLIMITED' })
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      (policy.deleteTimeLimitMode || 'UNLIMITED') === 'UNLIMITED'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Unlimited Time
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPolicy({
                        ...policy,
                        deleteTimeLimitMode: 'LIMITED',
                        deleteTimeLimitHours: Number(policy.deleteTimeLimitHours ?? 24)
                      })
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      policy.deleteTimeLimitMode === 'LIMITED'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Time Limit (0 – ∞ Hrs)
                  </button>
                </div>

                {policy.deleteTimeLimitMode === 'LIMITED' && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Allowed Delete Window After Creation (Hours)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={policy.deleteTimeLimitHours ?? 0}
                      onChange={(e) =>
                        setPolicy({
                          ...policy,
                          deleteTimeLimitHours: Math.max(0, Number(e.target.value) || 0)
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[0, 1, 12, 24, 48, 72, 168].map((hrs) => (
                        <button
                          key={hrs}
                          type="button"
                          onClick={() =>
                            setPolicy({ ...policy, deleteTimeLimitHours: hrs })
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            Number(policy.deleteTimeLimitHours) === hrs
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {hrs === 0 ? '0h (Locked)' : hrs === 168 ? '168h (7d)' : `${hrs}h`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD / EDIT STAGE MODAL                                   */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Ribbon Header with Amber Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {editingStage ? 'Edit Department Stage' : 'Add Department Stage'}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStage} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Stage Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter stage name"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stage Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STG-101"
                    value={stageCode}
                    onChange={(e) => setStageCode(e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold uppercase font-mono focus:outline-none transition-all ${
                      duplicateStage
                        ? 'bg-red-50/60 border border-red-400 text-red-700 focus:border-red-500'
                        : 'bg-slate-50 border border-slate-200 text-orange-600 focus:bg-white focus:border-orange-500'
                    }`}
                  />
                  {duplicateStage && (
                    <p className="mt-1 text-[11px] font-semibold text-red-600">
                      Stage Code <strong className="font-mono">{stageCode.trim().toUpperCase()}</strong> is already used by{' '}
                      <strong>{duplicateStage.stageName || duplicateStage.title}</strong>.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department Module *
                  </label>
                  <select
                    value={departmentModule}
                    onChange={(e) => setDepartmentModule(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  >
                    {DEPARTMENT_MODULES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sequence Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={defaultOrder}
                    onChange={(e) => setDefaultOrder(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {editingStage && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stage Availability Status
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setStageIsActive(true)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        stageIsActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Active (Available for Projects)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStageIsActive(false)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !stageIsActive
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Inactive (Hidden for New Projects)
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Scope Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Scope description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating || Boolean(duplicateStage)}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isCreating || isUpdating ? 'Saving...' : editingStage ? 'Save Changes' : 'Create Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CLICKABLE ROW PREVIEW DOSSIER                             */}
      {/* ======================================================== */}
      {previewStage && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Ribbon Header with Amber Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {previewStage.stageName || previewStage.title}
                  </h3>
                  <p className="text-[11px] font-mono text-orange-600 font-bold">
                    {previewStage.stageCode}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const stg = previewStage;
                    setPreviewStage(null);
                    handleOpenEditModal(stg);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setPreviewStage(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Properties Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Department Module
                  </span>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    {DEPARTMENT_MODULES.find((m) => m.id === previewStage.departmentModule)?.label ||
                      previewStage.departmentModule ||
                      'Project Setup'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Sequence Order
                  </span>
                  <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                    #{previewStage.defaultOrder || 1}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Status
                  </span>
                  <div className="text-xs font-bold mt-0.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        previewStage.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {previewStage.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {previewStage.description && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Scope Description
                  </h4>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                    {previewStage.description}
                  </p>
                </div>
              )}

              {/* Assigned Projects (Where-Used) Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Assigned Projects ({previewStage.assignedProjectsCount || 0})
                  </h4>
                  {previewStage.assignedProjectsCount > 0 && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                      Cannot be permanently deleted (Deactivation only)
                    </span>
                  )}
                </div>

                {Array.isArray(previewStage.assignedProjects) && previewStage.assignedProjects.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {previewStage.assignedProjects.map((proj: any) => (
                      <div
                        key={proj.projectId}
                        className="p-3 bg-white flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-orange-600">
                              {proj.workOrderNumber || proj.projectId}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800 mt-0.5">
                            {proj.projectName}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {proj.milestoneStatus || 'ASSIGNED'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                    Not assigned to any project yet. Can be freely edited or permanently deleted.
                  </div>
                )}
              </div>

              {/* Universal Action Tracking / Audit Cards */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Audit Trail
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Created By
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      {previewStage.createdByName || 'System Administrator'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {previewStage.createdAt
                        ? new Date(previewStage.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Initial Setup'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Last Updated By
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      {previewStage.updatedByName ||
                        previewStage.createdByName ||
                        'System Administrator'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {previewStage.updatedAt
                        ? new Date(previewStage.updatedAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'No updates yet'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE / DEACTIVATE STAGE CONFIRMATION MODAL             */}
      {/* ======================================================== */}
      {stageToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    Number(stageToDelete.assignedProjectsCount || 0) > 0
                      ? 'bg-amber-500/15 text-amber-700 border border-amber-300/40'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  {Number(stageToDelete.assignedProjectsCount || 0) > 0 ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {Number(stageToDelete.assignedProjectsCount || 0) > 0
                      ? 'Deactivate Assigned Stage?'
                      : 'Delete Department Stage?'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setStageToDelete(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {Number(stageToDelete.assignedProjectsCount || 0) > 0 ? (
                <div className="text-xs text-amber-900 bg-amber-50 p-3.5 rounded-xl border border-amber-200 leading-relaxed space-y-1.5">
                  <p className="font-bold">
                    &apos;{stageToDelete.stageName || stageToDelete.title}&apos; ({stageToDelete.stageCode}) is currently assigned to{' '}
                    {stageToDelete.assignedProjectsCount} project(s).
                  </p>
                  <p>
                    Because it is linked to active project records, it cannot be permanently deleted. Deactivating it will keep existing projects intact while preventing it from being assigned to any future projects.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                  Delete <strong className="text-slate-900">&apos;{stageToDelete.stageName || stageToDelete.title}&apos; ({stageToDelete.stageCode})</strong>? This stage is not assigned to any project and will be permanently removed.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStageToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer ${
                    Number(stageToDelete.assignedProjectsCount || 0) > 0
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isDeleting
                    ? 'Processing...'
                    : Number(stageToDelete.assignedProjectsCount || 0) > 0
                    ? 'Yes, Deactivate Stage'
                    : 'Yes, delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
