'use client';

import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import {
  CheckSquare,
  Search,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Send
} from 'lucide-react';
import { useGetProcessInspectionsQuery } from '../api/qualityApi';

interface ProcessInspection {
  id: string;
  checkNumber: string;
  projectId: string;
  assemblyStage: string;
  parameterName: string;
  specification: string;
  observedValue: string;
  verdict: 'PASS' | 'FAIL' | 'REWORK';
  remarks?: string;
  createdAt: string;
}

export default function ProcessInspectionTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data, isLoading } = useGetProcessInspectionsQuery({});

  const [inspections, setInspections] = useState<ProcessInspection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    projectId: activeProjectId || '',
    assemblyStage: 'MECHANICAL_ASSEMBLY',
    parameterName: '',
    specification: '',
    observedValue: '',
    verdict: 'PASS' as 'PASS' | 'FAIL' | 'REWORK',
    remarks: ''
  });

  const handleCreateCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parameterName) return;

    const newCheck: ProcessInspection = {
      id: `proc-${Date.now()}`,
      checkNumber: `PRC-${new Date().getFullYear()}-${String(inspections.length + 1).padStart(4, '0')}`,
      projectId: formData.projectId || activeProjectId || '',
      assemblyStage: formData.assemblyStage,
      parameterName: formData.parameterName,
      specification: formData.specification,
      observedValue: formData.observedValue,
      verdict: formData.verdict,
      remarks: formData.remarks,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setInspections([newCheck, ...inspections]);
    setFormData({
      projectId: activeProjectId || '',
      assemblyStage: 'MECHANICAL_ASSEMBLY',
      parameterName: '',
      specification: '',
      observedValue: '',
      verdict: 'PASS',
      remarks: ''
    });
    setIsModalOpen(false);
  };

  const passCount = inspections.filter((i) => i.verdict === 'PASS').length;
  const failCount = inspections.filter((i) => i.verdict === 'FAIL').length;
  const reworkCount = inspections.filter((i) => i.verdict === 'REWORK').length;

  const filteredInspections = inspections.filter(
    (i) =>
      i.checkNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.projectId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.parameterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.assemblyStage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Total Checks
            </div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {inspections.length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <CheckSquare size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Passed
            </div>
            <div className="text-base font-extrabold text-emerald-600 mt-0.5">
              {passCount}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Failed
            </div>
            <div className="text-base font-extrabold text-red-600 mt-0.5">
              {failCount}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Rework
            </div>
            <div className="text-base font-extrabold text-amber-600 mt-0.5">
              {reworkCount}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={16} />
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
              assemblyStage: 'MECHANICAL_ASSEMBLY',
              parameterName: '',
              specification: '',
              observedValue: '',
              verdict: 'PASS',
              remarks: ''
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-xs shadow-orange-500/20 transition-all shrink-0"
        >
          <Plus size={15} /> Log Process Check
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Check #</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Assembly Stage</th>
                <th className="py-3 px-4">Parameter</th>
                <th className="py-3 px-4">Specification</th>
                <th className="py-3 px-4">Observed</th>
                <th className="py-3 px-4">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredInspections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No process inspections found.
                  </td>
                </tr>
              ) : (
                filteredInspections.map((check) => (
                  <tr
                    key={check.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-orange-600">
                      {check.checkNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {check.projectId || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700">
                        {check.assemblyStage.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {check.parameterName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {check.specification || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {check.observedValue || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {check.verdict === 'PASS' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} /> Pass
                        </span>
                      ) : check.verdict === 'REWORK' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={11} /> Rework
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                          <AlertTriangle size={11} /> Fail
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Process Check Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <CheckSquare size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                  Log Process Check
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
              onSubmit={handleCreateCheck}
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
                    Assembly Stage
                  </label>
                  <select
                    value={formData.assemblyStage}
                    onChange={(e) =>
                      setFormData({ ...formData, assemblyStage: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  >
                    <option value="MECHANICAL_ASSEMBLY">Mechanical Assembly</option>
                    <option value="ELECTRICAL_WIRING">Electrical Wiring & Cabinet</option>
                    <option value="PNEUMATIC_PLUMBING">Pneumatic Plumbing</option>
                    <option value="PLC_SENSORS">PLC & Sensor Alignment</option>
                    <option value="SUB_ASSEMBLY_TRIAL">Sub-Assembly Testing</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Parameter Inspected
                  </label>
                  <input
                    type="text"
                    placeholder="Parameter name"
                    value={formData.parameterName}
                    onChange={(e) =>
                      setFormData({ ...formData, parameterName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Specification
                  </label>
                  <input
                    type="text"
                    placeholder="Tolerance / specification"
                    value={formData.specification}
                    onChange={(e) =>
                      setFormData({ ...formData, specification: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Observed Value
                  </label>
                  <input
                    type="text"
                    placeholder="Observed value"
                    value={formData.observedValue}
                    onChange={(e) =>
                      setFormData({ ...formData, observedValue: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Verdict
                  </label>
                  <select
                    value={formData.verdict}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        verdict: e.target.value as 'PASS' | 'FAIL' | 'REWORK'
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  >
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                    <option value="REWORK">REWORK</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Remarks"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                />
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
                  <Send size={14} /> Record Check
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
