'use client';

import React, { useState } from 'react';
import {
  Settings,
  Plus,
  Search,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  X,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import {
  useGetStageMastersQuery,
  useCreateStageMasterMutation,
  useUpdateStageMasterMutation,
  useDeleteStageMasterMutation
} from '../api/projectApi';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';

export default function ProjectMastersTab() {
  const dispatch = useAppDispatch();
  const [activeSubTab, setActiveSubTab] = useState<'stages'>('stages');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<any | null>(null);

  // Form State
  const [stageCode, setStageCode] = useState('');
  const [stageName, setStageName] = useState('');
  const [defaultOrder, setDefaultOrder] = useState('1');
  const [leadRole, setLeadRole] = useState('Project Manager');
  const [standardDaysOffset, setStandardDaysOffset] = useState('14');
  const [weightPercent, setWeightPercent] = useState('10');
  const [description, setDescription] = useState('');

  // Queries & Mutations
  const { data, isLoading } = useGetStageMastersQuery({ includeInactive: true });
  const [createStage, { isLoading: isCreating }] = useCreateStageMasterMutation();
  const [updateStage, { isLoading: isUpdating }] = useUpdateStageMasterMutation();
  const [deleteStage, { isLoading: isDeleting }] = useDeleteStageMasterMutation();

  const stages = data?.stages || [];

  const filteredStages = stages.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.stageCode?.toLowerCase().includes(term) ||
      s.stageName?.toLowerCase().includes(term) ||
      s.leadRole?.toLowerCase().includes(term) ||
      s.description?.toLowerCase().includes(term)
    );
  });

  const totalLeadDays = stages.reduce((acc, curr) => Math.max(acc, curr.standardDaysOffset || 0), 0);
  const totalWeight = stages.reduce((acc, curr) => acc + (curr.weightPercent || 0), 0);

  const resetForm = () => {
    setStageCode('');
    setStageName('');
    setDefaultOrder(String(stages.length + 1));
    setLeadRole('Project Manager');
    setStandardDaysOffset('14');
    setWeightPercent('10');
    setDescription('');
    setEditingStage(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setDefaultOrder(String(stages.length + 1));
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (stage: any) => {
    setEditingStage(stage);
    setStageCode(stage.stageCode);
    setStageName(stage.stageName);
    setDefaultOrder(String(stage.defaultOrder || 1));
    setLeadRole(stage.leadRole || 'Project Manager');
    setStandardDaysOffset(String(stage.standardDaysOffset || 14));
    setWeightPercent(String(stage.weightPercent || 10));
    setDescription(stage.description || '');
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim()) return;

    try {
      if (editingStage) {
        await updateStage({
          id: editingStage._id,
          stageName,
          defaultOrder: Number(defaultOrder),
          leadRole,
          standardDaysOffset: Number(standardDaysOffset),
          weightPercent: Number(weightPercent),
          description
        }).unwrap();

        dispatch(
          addToast({
            type: 'success',
            title: 'Stage Master Updated',
            message: `Stage template '${stageName}' updated successfully.`
          })
        );
      } else {
        await createStage({
          stageCode: stageCode || stageName.toUpperCase().replace(/\s+/g, '_'),
          stageName,
          defaultOrder: Number(defaultOrder),
          leadRole,
          standardDaysOffset: Number(standardDaysOffset),
          weightPercent: Number(weightPercent),
          description
        }).unwrap();

        dispatch(
          addToast({
            type: 'success',
            title: 'Stage Master Created',
            message: `New standard stage '${stageName}' added to master library.`
          })
        );
      }

      setIsAddModalOpen(false);
      resetForm();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Operation Failed',
          message: err?.data?.message || 'Unable to save stage master.'
        })
      );
    }
  };

  const handleToggleDeactivate = async (stage: any) => {
    try {
      if (stage.isActive) {
        await deleteStage(stage._id).unwrap();
        dispatch(
          addToast({
            type: 'info',
            title: 'Stage Deactivated',
            message: `Stage '${stage.stageName}' has been marked inactive.`
          })
        );
      } else {
        await updateStage({ id: stage._id, isActive: true }).unwrap();
        dispatch(
          addToast({
            type: 'success',
            title: 'Stage Activated',
            message: `Stage '${stage.stageName}' is now active.`
          })
        );
      }
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Error',
          message: err?.data?.message || 'Failed to update stage status.'
        })
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Project Masters
          </h1>
        </div>

        {/* Button-type Segmented Tabs */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setActiveSubTab('stages')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'stages'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={14} />
              <span>Stages Master</span>
            </button>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all shrink-0"
          >
            <Plus size={16} />
            <span>Add Stage Template</span>
          </button>
        </div>
      </div>

      {/* KPI Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">Standard Stages</div>
          <div className="text-2xl font-extrabold text-slate-900">{stages.length}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">Standard Lead Time</div>
          <div className="text-2xl font-extrabold text-orange-600">{totalLeadDays} Days</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">Total Weight</div>
          <div className="text-2xl font-extrabold text-sky-600">{totalWeight}%</div>
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search stage code, name, lead role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
          />
        </div>

        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw size={13} />
            <span>Reset Search</span>
          </button>
        )}
      </div>

      {/* Stages Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-16">Seq</th>
                <th className="py-3 px-4">Stage Code</th>
                <th className="py-3 px-4">Stage Name</th>
                <th className="py-3 px-4">Lead Department / Role</th>
                <th className="py-3 px-4">Std Offset</th>
                <th className="py-3 px-4">Weight %</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading stage master templates...
                  </td>
                </tr>
              ) : filteredStages.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No stage templates match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredStages.map((stage) => (
                  <tr key={stage._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500">
                      #{stage.defaultOrder}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        {stage.stageCode}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900">
                      {stage.stageName}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <User size={13} className="text-slate-400 shrink-0" />
                        <span>{stage.leadRole}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-800">
                      +{stage.standardDaysOffset} days
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {stage.weightPercent}%
                    </td>

                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {stage.description || '—'}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          stage.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {stage.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(stage)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Edit Stage Template"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          onClick={() => handleToggleDeactivate(stage)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            stage.isActive
                              ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={stage.isActive ? 'Deactivate Stage' : 'Activate Stage'}
                        >
                          {stage.isActive ? <Trash2 size={14} /> : <CheckCircle2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Stage Master Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Standard Crisp White Ribbon Header with Amber Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {editingStage ? 'Edit Stage Template' : 'Add Stage Template'}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Stage Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mechanical & Electrical Assembly Sign-off"
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
                    disabled={Boolean(editingStage)}
                    placeholder="e.g. PRODUCTION_ASSEMBLY"
                    value={stageCode}
                    onChange={(e) => setStageCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 uppercase font-mono disabled:opacity-60 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sequence Order # *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={defaultOrder}
                    onChange={(e) => setDefaultOrder(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lead Role
                  </label>
                  <input
                    type="text"
                    value={leadRole}
                    onChange={(e) => setLeadRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Std Offset (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={standardDaysOffset}
                    onChange={(e) => setStandardDaysOffset(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Weight (%)
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
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  {isCreating || isUpdating
                    ? 'Saving Template...'
                    : editingStage
                    ? 'Update Template'
                    : 'Create Stage Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
