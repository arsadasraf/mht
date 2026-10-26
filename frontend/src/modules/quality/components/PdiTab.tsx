'use client';

import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import {
  Award,
  Search,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Send
} from 'lucide-react';
import { useGetPdiInspectionsQuery } from '../api/qualityApi';

interface PdiRecord {
  id: string;
  pdiNumber: string;
  projectId: string;
  machineModel: string;
  auditDate: string;
  totalCheckpoints: number;
  passedCheckpoints: number;
  snagsCount: number;
  verdict: 'CLEARED' | 'SNAGS_PENDING' | 'REJECTED';
  inspector: string;
}

export default function PdiTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data, isLoading } = useGetPdiInspectionsQuery({});

  const [pdiRecords, setPdiRecords] = useState<PdiRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    projectId: activeProjectId || '',
    machineModel: '',
    totalCheckpoints: 25,
    passedCheckpoints: 25,
    snagsCount: 0,
    verdict: 'CLEARED' as 'CLEARED' | 'SNAGS_PENDING' | 'REJECTED',
    inspector: ''
  });

  const handleCreatePdi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.machineModel) return;

    const newRecord: PdiRecord = {
      id: `pdi-${Date.now()}`,
      pdiNumber: `PDI-${new Date().getFullYear()}-${String(pdiRecords.length + 1).padStart(4, '0')}`,
      projectId: formData.projectId || activeProjectId || '',
      machineModel: formData.machineModel,
      auditDate: new Date().toISOString().split('T')[0],
      totalCheckpoints: Number(formData.totalCheckpoints) || 25,
      passedCheckpoints: Number(formData.passedCheckpoints) || 25,
      snagsCount: Number(formData.snagsCount) || 0,
      verdict: formData.snagsCount > 0 ? 'SNAGS_PENDING' : formData.verdict,
      inspector: formData.inspector || 'QC Lead'
    };

    setPdiRecords([newRecord, ...pdiRecords]);
    setFormData({
      projectId: activeProjectId || '',
      machineModel: '',
      totalCheckpoints: 25,
      passedCheckpoints: 25,
      snagsCount: 0,
      verdict: 'CLEARED',
      inspector: ''
    });
    setIsModalOpen(false);
  };

  const clearedCount = pdiRecords.filter((r) => r.verdict === 'CLEARED').length;
  const snagsPendingCount = pdiRecords.filter(
    (r) => r.verdict === 'SNAGS_PENDING'
  ).length;

  const filteredRecords = pdiRecords.filter(
    (r) =>
      r.pdiNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.projectId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.machineModel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Total Audits
            </div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {pdiRecords.length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Award size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Cleared for Dispatch
            </div>
            <div className="text-base font-extrabold text-emerald-600 mt-0.5">
              {clearedCount}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Snags Pending
            </div>
            <div className="text-base font-extrabold text-amber-600 mt-0.5">
              {snagsPendingCount}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Project
            </div>
            <div className="text-base font-mono font-extrabold text-orange-600 mt-0.5">
              {activeProjectId || '—'}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldCheck size={16} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
          />
        </div>

        <button
          onClick={() => {
            setFormData({
              projectId: activeProjectId || '',
              machineModel: '',
              totalCheckpoints: 25,
              passedCheckpoints: 25,
              snagsCount: 0,
              verdict: 'CLEARED',
              inspector: ''
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-xs shadow-orange-500/20 transition-all shrink-0"
        >
          <Plus size={15} /> Log PDI Audit
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">PDI Certificate #</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Machine / Model</th>
                <th className="py-3 px-4">Audit Date</th>
                <th className="py-3 px-4">Checkpoints</th>
                <th className="py-3 px-4">Zero-Snag Status</th>
                <th className="py-3 px-4 text-right">Inspector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No PDI records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-orange-600">
                      {record.pdiNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {record.projectId || '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {record.machineModel}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {record.auditDate}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="text-emerald-700 font-bold">
                        {record.passedCheckpoints}
                      </span>
                      <span className="text-slate-400"> / </span>
                      <span>{record.totalCheckpoints}</span>
                    </td>
                    <td className="py-3 px-4">
                      {record.verdict === 'CLEARED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} /> Zero-Snag Cleared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={11} /> {record.snagsCount} Snags Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {record.inspector}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log PDI Audit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Award size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                  Log PDI Audit
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreatePdi}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Project
                  </label>
                  <input
                    type="text"
                    placeholder="Project ID"
                    value={formData.projectId}
                    onChange={(e) =>
                      setFormData({ ...formData, projectId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Machine / Model
                  </label>
                  <input
                    type="text"
                    placeholder="Machine model"
                    value={formData.machineModel}
                    onChange={(e) =>
                      setFormData({ ...formData, machineModel: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Total Checkpoints
                  </label>
                  <input
                    type="number"
                    value={formData.totalCheckpoints}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        totalCheckpoints: Number(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Passed Checkpoints
                  </label>
                  <input
                    type="number"
                    value={formData.passedCheckpoints}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        passedCheckpoints: Number(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pending Snags Count
                  </label>
                  <input
                    type="number"
                    value={formData.snagsCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        snagsCount: Number(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lead Inspector
                  </label>
                  <input
                    type="text"
                    placeholder="Inspector name"
                    value={formData.inspector}
                    onChange={(e) =>
                      setFormData({ ...formData, inspector: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-xs"
                >
                  <Send size={14} /> Record PDI Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
