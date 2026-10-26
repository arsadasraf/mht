'use client';

import React, { useState } from 'react';
import {
  Settings,
  ClipboardList,
  AlertTriangle,
  Scale,
  Wrench,
  Search,
  Plus,
  X,
  CheckCircle2,
  Clock,
  Send
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  code: string;
  name: string;
  stage: 'INCOMING' | 'IN_PROCESS' | 'PDI';
  totalItems: number;
}

interface DefectCode {
  id: string;
  code: string;
  title: string;
  category: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
}

interface QualityStandard {
  id: string;
  code: string;
  title: string;
  parameterCategory: string;
  toleranceSpec: string;
}

interface InstrumentItem {
  id: string;
  instrumentCode: string;
  name: string;
  rangeOrCapacity: string;
  calibrationDueDate: string;
  status: 'CALIBRATED' | 'DUE_SOON' | 'EXPIRED';
}

export default function QualityMasterTab() {
  const [activeSubTab, setActiveSubTab] = useState<
    'checklists' | 'defects' | 'standards' | 'instruments'
  >('checklists');

  const [searchTerm, setSearchTerm] = useState('');

  // Local state arrays (initialized clean)
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [defects, setDefects] = useState<DefectCode[]>([]);
  const [standards, setStandards] = useState<QualityStandard[]>([]);
  const [instruments, setInstruments] = useState<InstrumentItem[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form States
  const [checklistForm, setChecklistForm] = useState({
    code: '',
    name: '',
    stage: 'INCOMING' as 'INCOMING' | 'IN_PROCESS' | 'PDI',
    totalItems: 5
  });

  const [defectForm, setDefectForm] = useState({
    code: '',
    title: '',
    category: 'DIMENSIONAL',
    severity: 'MAJOR' as 'CRITICAL' | 'MAJOR' | 'MINOR'
  });

  const [standardForm, setStandardForm] = useState({
    code: '',
    title: '',
    parameterCategory: 'MECHANICAL',
    toleranceSpec: ''
  });

  const [instrumentForm, setInstrumentForm] = useState({
    instrumentCode: '',
    name: '',
    rangeOrCapacity: '',
    calibrationDueDate: ''
  });

  const handleCreateMaster = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeSubTab === 'checklists') {
      if (!checklistForm.name) return;
      const item: ChecklistItem = {
        id: `chk-${Date.now()}`,
        code: checklistForm.code.toUpperCase() || `CHK-${String(checklists.length + 1).padStart(3, '0')}`,
        name: checklistForm.name,
        stage: checklistForm.stage,
        totalItems: Number(checklistForm.totalItems) || 1
      };
      setChecklists([item, ...checklists]);
      setChecklistForm({ code: '', name: '', stage: 'INCOMING', totalItems: 5 });
    } else if (activeSubTab === 'defects') {
      if (!defectForm.title) return;
      const item: DefectCode = {
        id: `def-${Date.now()}`,
        code: defectForm.code.toUpperCase() || `DEF-${String(defects.length + 1).padStart(3, '0')}`,
        title: defectForm.title,
        category: defectForm.category,
        severity: defectForm.severity
      };
      setDefects([item, ...defects]);
      setDefectForm({ code: '', title: '', category: 'DIMENSIONAL', severity: 'MAJOR' });
    } else if (activeSubTab === 'standards') {
      if (!standardForm.title) return;
      const item: QualityStandard = {
        id: `std-${Date.now()}`,
        code: standardForm.code.toUpperCase() || `STD-${String(standards.length + 1).padStart(3, '0')}`,
        title: standardForm.title,
        parameterCategory: standardForm.parameterCategory,
        toleranceSpec: standardForm.toleranceSpec
      };
      setStandards([item, ...standards]);
      setStandardForm({ code: '', title: '', parameterCategory: 'MECHANICAL', toleranceSpec: '' });
    } else if (activeSubTab === 'instruments') {
      if (!instrumentForm.name) return;
      const item: InstrumentItem = {
        id: `inst-${Date.now()}`,
        instrumentCode:
          instrumentForm.instrumentCode.toUpperCase() ||
          `INST-${String(instruments.length + 1).padStart(3, '0')}`,
        name: instrumentForm.name,
        rangeOrCapacity: instrumentForm.rangeOrCapacity,
        calibrationDueDate: instrumentForm.calibrationDueDate,
        status: 'CALIBRATED'
      };
      setInstruments([item, ...instruments]);
      setInstrumentForm({
        instrumentCode: '',
        name: '',
        rangeOrCapacity: '',
        calibrationDueDate: ''
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Checklists
            </div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {checklists.length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <ClipboardList size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Defect Codes
            </div>
            <div className="text-base font-extrabold text-red-600 mt-0.5">
              {defects.length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Standards
            </div>
            <div className="text-base font-extrabold text-sky-600 mt-0.5">
              {standards.length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Scale size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Instruments
            </div>
            <div className="text-base font-extrabold text-purple-600 mt-0.5">
              {instruments.length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Wrench size={16} />
          </div>
        </div>
      </div>

      {/* Button-Type Segmented Pill Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setActiveSubTab('checklists')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'checklists'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ClipboardList size={13} />
          <span>Checklists</span>
        </button>

        <button
          onClick={() => setActiveSubTab('defects')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'defects'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <AlertTriangle size={13} />
          <span>Defect Codes</span>
        </button>

        <button
          onClick={() => setActiveSubTab('standards')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'standards'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Scale size={13} />
          <span>Acceptance Standards</span>
        </button>

        <button
          onClick={() => setActiveSubTab('instruments')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'instruments'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Wrench size={13} />
          <span>Instruments</span>
        </button>
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
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-xs shadow-orange-500/20 transition-all shrink-0"
        >
          <Plus size={15} /> Add Record
        </button>
      </div>

      {/* SUB-TAB 1: CHECKLISTS */}
      {activeSubTab === 'checklists' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Checklist Name</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {checklists.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No checklists found.
                    </td>
                  </tr>
                ) : (
                  checklists.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">
                        {c.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {c.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700">
                          {c.stage}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {c.totalItems}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DEFECT CODES */}
      {activeSubTab === 'defects' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Defect Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {defects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No defect codes found.
                    </td>
                  </tr>
                ) : (
                  defects.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">
                        {d.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {d.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{d.category}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.severity === 'CRITICAL'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : d.severity === 'MAJOR'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {d.severity}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: STANDARDS */}
      {activeSubTab === 'standards' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Standard Code</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Tolerance / Spec</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {standards.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No standards found.
                    </td>
                  </tr>
                ) : (
                  standards.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">
                        {s.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {s.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{s.parameterCategory}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {s.toleranceSpec || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: INSTRUMENTS */}
      {activeSubTab === 'instruments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Instrument ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Range / Spec</th>
                  <th className="py-3 px-4">Calibration Due</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {instruments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No instruments found.
                    </td>
                  </tr>
                ) : (
                  instruments.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">
                        {inst.instrumentCode}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {inst.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {inst.rangeOrCapacity || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {inst.calibrationDueDate || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} /> {inst.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Master Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Settings size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                  Add{' '}
                  {activeSubTab === 'checklists'
                    ? 'Checklist'
                    : activeSubTab === 'defects'
                    ? 'Defect Code'
                    : activeSubTab === 'standards'
                    ? 'Standard'
                    : 'Instrument'}
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
              onSubmit={handleCreateMaster}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
            >
              {activeSubTab === 'checklists' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Checklist Code
                    </label>
                    <input
                      type="text"
                      placeholder="Checklist code"
                      value={checklistForm.code}
                      onChange={(e) =>
                        setChecklistForm({ ...checklistForm, code: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Checklist Name
                    </label>
                    <input
                      type="text"
                      placeholder="Name"
                      value={checklistForm.name}
                      onChange={(e) =>
                        setChecklistForm({ ...checklistForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Stage
                      </label>
                      <select
                        value={checklistForm.stage}
                        onChange={(e) =>
                          setChecklistForm({
                            ...checklistForm,
                            stage: e.target.value as any
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                      >
                        <option value="INCOMING">Incoming</option>
                        <option value="IN_PROCESS">In-Process</option>
                        <option value="PDI">PDI</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Checkpoints
                      </label>
                      <input
                        type="number"
                        value={checklistForm.totalItems}
                        onChange={(e) =>
                          setChecklistForm({
                            ...checklistForm,
                            totalItems: Number(e.target.value) || 1
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeSubTab === 'defects' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Defect Code
                    </label>
                    <input
                      type="text"
                      placeholder="Defect code"
                      value={defectForm.code}
                      onChange={(e) =>
                        setDefectForm({ ...defectForm, code: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Defect Title
                    </label>
                    <input
                      type="text"
                      placeholder="Title"
                      value={defectForm.title}
                      onChange={(e) =>
                        setDefectForm({ ...defectForm, title: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        placeholder="Category"
                        value={defectForm.category}
                        onChange={(e) =>
                          setDefectForm({ ...defectForm, category: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Severity
                      </label>
                      <select
                        value={defectForm.severity}
                        onChange={(e) =>
                          setDefectForm({
                            ...defectForm,
                            severity: e.target.value as any
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                      >
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="MAJOR">MAJOR</option>
                        <option value="MINOR">MINOR</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {activeSubTab === 'standards' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Standard Code
                    </label>
                    <input
                      type="text"
                      placeholder="Standard code"
                      value={standardForm.code}
                      onChange={(e) =>
                        setStandardForm({ ...standardForm, code: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Standard Title
                    </label>
                    <input
                      type="text"
                      placeholder="Title"
                      value={standardForm.title}
                      onChange={(e) =>
                        setStandardForm({ ...standardForm, title: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tolerance / Specification
                    </label>
                    <input
                      type="text"
                      placeholder="Tolerance spec"
                      value={standardForm.toleranceSpec}
                      onChange={(e) =>
                        setStandardForm({
                          ...standardForm,
                          toleranceSpec: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                    />
                  </div>
                </>
              )}

              {activeSubTab === 'instruments' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Instrument ID
                    </label>
                    <input
                      type="text"
                      placeholder="Instrument code"
                      value={instrumentForm.instrumentCode}
                      onChange={(e) =>
                        setInstrumentForm({
                          ...instrumentForm,
                          instrumentCode: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Instrument Name
                    </label>
                    <input
                      type="text"
                      placeholder="Name"
                      value={instrumentForm.name}
                      onChange={(e) =>
                        setInstrumentForm({ ...instrumentForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Range / Capacity
                      </label>
                      <input
                        type="text"
                        placeholder="Range"
                        value={instrumentForm.rangeOrCapacity}
                        onChange={(e) =>
                          setInstrumentForm({
                            ...instrumentForm,
                            rangeOrCapacity: e.target.value
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Calibration Due Date
                      </label>
                      <input
                        type="date"
                        value={instrumentForm.calibrationDueDate}
                        onChange={(e) =>
                          setInstrumentForm({
                            ...instrumentForm,
                            calibrationDueDate: e.target.value
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>
                </>
              )}

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
                  <Send size={14} /> Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
