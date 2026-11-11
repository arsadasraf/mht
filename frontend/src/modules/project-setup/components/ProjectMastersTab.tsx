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
  ShieldCheck,
  Save,
  Eye,
  Calendar,
  Building2,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  useGetStageMastersQuery,
  useCreateStageMasterMutation,
  useUpdateStageMasterMutation,
  useDeleteStageMasterMutation,
  useUpdateProjectSetupConfigMutation
} from '../api/projectApi';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import ExcelColumnFilter from '../../../components/ui/ExcelColumnFilter';

const DEPARTMENT_MODULES = [
  { id: 'design', label: 'Design & Engineering' },
  { id: 'purchase', label: 'Purchase & Sourcing' },
  { id: 'store', label: 'Store & Inventory' },
  { id: 'production-trial', label: 'Production & Trial' },
  { id: 'quality', label: 'Quality & Inspection' },
  { id: 'dispatch', label: 'Dispatch & Logistics' },
  { id: 'after-sales', label: 'After Sales & Service' },
  { id: 'project-setup', label: 'Project Setup & Planning' }
];

export default function ProjectMastersTab({
  initialSubTab
}: {
  initialSubTab?: 'stages' | 'prefixPolicy';
} = {}) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const activeSubTab: 'stages' | 'prefixPolicy' =
    initialSubTab ||
    (pathname?.endsWith('/prefix-policy') ? 'prefixPolicy' : 'stages');

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
  const [leadRole, setLeadRole] = useState('Lead Design Engineer');
  const [weightPercent, setWeightPercent] = useState('15');
  const [description, setDescription] = useState('');

  // Prefix & Lock Policy State
  const [policy, setPolicy] = useState<any>({
    projectPrefix: 'PRJ',
    workOrderPrefix: 'WO',
    projectStartSeq: 1001,
    requireRemarkOnStageMove: true,
    lockBaselineDatesAfterKickoff: false
  });

  // Queries & Mutations
  const { data, isLoading } = useGetStageMastersQuery({ includeInactive: true });
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
    let result = stages.filter((s: any) => {
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

  const handleOpenAddModal = () => {
    setEditingStage(null);
    setStageCode('');
    setStageName('');
    setDepartmentModule('design');
    setDefaultOrder(String(stages.length + 1));
    setLeadRole('Lead Design Engineer');
    setWeightPercent('15');
    setDescription('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (stage: any) => {
    setEditingStage(stage);
    setStageCode(stage.stageCode || '');
    setStageName(stage.stageName || stage.title || '');
    setDepartmentModule(stage.departmentModule || 'design');
    setDefaultOrder(String(stage.defaultOrder || 1));
    setLeadRole(stage.leadRole || 'Lead Design Engineer');
    setWeightPercent(String(stage.weightPercent || 15));
    setDescription(stage.description || '');
    setIsAddModalOpen(true);
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageCode.trim() || !stageName.trim()) {
      dispatch(addToast({ type: 'error', message: 'Stage Code and Stage Name are required.' }));
      return;
    }

    try {
      const payload = {
        stageCode: stageCode.trim().toUpperCase(),
        stageName: stageName.trim(),
        title: stageName.trim(),
        departmentModule,
        defaultOrder: Number(defaultOrder) || 1,
        leadRole: leadRole.trim(),
        standardDaysOffset: 14,
        weightPercent: Number(weightPercent) || 10,
        description: description.trim()
      };

      if (editingStage) {
        await updateStage({ id: editingStage._id || editingStage.id, ...payload }).unwrap();
        dispatch(
          addToast({
            type: 'success',
            title: 'Stage Updated',
            message: `Stage '${payload.stageName}' updated successfully.`
          })
        );
      } else {
        await createStage(payload).unwrap();
        dispatch(
          addToast({
            type: 'success',
            title: 'Stage Created',
            message: `New department stage '${payload.stageName}' added.`
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

  const handleSavePolicy = async () => {
    try {
      await updateConfig({ prefixLockPolicy: policy }).unwrap();
      dispatch(
        addToast({
          type: 'success',
          title: 'Policy Saved',
          message: 'Project Setup prefixes and lock policies updated.'
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
      await deleteStage(stageToDelete._id || stageToDelete.id).unwrap();
      dispatch(
        addToast({
          type: 'success',
          title: 'Stage Removed',
          message: `Stage '${stageToDelete.stageName || stageToDelete.title}' has been removed.`
        })
      );
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
      {/* Top Header & Sub-Tab Navigation (Button-Type Tabs, Zero Sub-Stages) */}
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
        </div>

        {activeSubTab === 'stages' && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all shrink-0 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Department Stage</span>
          </button>
        )}
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
                <span>Add Stage</span>
              </button>
            </div>
          </div>

          {/* Simple Stages Master Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    <th className="py-3 px-4 w-16">Seq</th>
                    <th className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span>Stage Name & Code</span>
                      </div>
                    </th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Department Module"
                        columnKey="departmentModule"
                        distinctValues={distinctModules}
                        selectedValues={selectedModules}
                        onFilterChange={setSelectedModules}
                      />
                    </th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Lead Role"
                        columnKey="leadRole"
                        distinctValues={distinctRoles}
                        selectedValues={selectedRoles}
                        onFilterChange={setSelectedRoles}
                      />
                    </th>
                    <th className="py-3 px-4">Weight %</th>
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
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        Loading department stage masters...
                      </td>
                    </tr>
                  ) : filteredStages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        No department stages match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStages.map((stage: any, index: number) => {
                      const modLabel =
                        DEPARTMENT_MODULES.find((m) => m.id === stage.departmentModule)?.label ||
                        stage.departmentModule ||
                        'Project Setup';

                      return (
                        <tr
                          key={stage._id || stage.id || index}
                          className="hover:bg-slate-50/70 transition-colors"
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
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <User size={13} className="text-slate-400 shrink-0" />
                              <span className="font-semibold">{stage.leadRole}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {stage.weightPercent || 10}%
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                stage.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
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
                                onClick={() => setStageToDelete(stage)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete Stage"
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
                  Project Setup Prefixes &amp; Lifecycle Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Governs auto-generated Project IDs, Work Order numbers, and stage governance rules.
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
                Project Code Prefix
              </label>
              <input
                type="text"
                value={policy.projectPrefix || 'PRJ'}
                onChange={(e) =>
                  setPolicy({ ...policy, projectPrefix: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:border-orange-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500">
                Format: <strong className="font-mono">{policy.projectPrefix || 'PRJ'}-YYYY-XXXX</strong>
              </span>
            </div>

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
                Format: <strong className="font-mono">{policy.workOrderPrefix || 'WO'}-YYYY-XXXX</strong>
              </span>
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
                  placeholder="e.g. Design & CAD Modeling"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stage Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DESIGN"
                    value={stageCode}
                    onChange={(e) => setStageCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 uppercase font-mono focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
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
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lead Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Design Engineer"
                    value={leadRole}
                    onChange={(e) => setLeadRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Weight %
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={weightPercent}
                    onChange={(e) => setWeightPercent(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Scope Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of department scope..."
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
                  disabled={isCreating || isUpdating}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
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
                    Lead Role
                  </span>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    {previewStage.leadRole || 'Unassigned'}
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
                    Weight Percentage
                  </span>
                  <div className="text-xs font-mono font-bold text-orange-600 mt-0.5">
                    {previewStage.weightPercent || 10}%
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
                          : 'bg-slate-100 text-slate-500 border-slate-200'
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
      {/* DELETE STAGE CONFIRMATION MODAL                          */}
      {/* ======================================================== */}
      {stageToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Delete Department Stage?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove &apos;{stageToDelete.stageName || stageToDelete.title}&apos;?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              Once removed, this stage will no longer appear in new project templates. Existing project milestones will remain intact.
            </p>

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
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs shadow-red-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
