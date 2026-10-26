'use client';

import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import {
  ShieldAlert,
  ShieldCheck,
  CheckSquare,
  Search,
  Plus,
  X,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send
} from 'lucide-react';
import {
  useGetGateEntriesQuery,
  useCreateGateEntryMutation,
  useGetInspectionsQuery,
  useCreateInspectionMutation
} from '../api/qualityApi';

export default function IncomingInspectionTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const [activeSection, setActiveSection] = useState<'inspections' | 'gate-entries'>('inspections');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: gateData, isLoading: loadingGate } = useGetGateEntriesQuery({});
  const { data: inspectionData, isLoading: loadingInspections } = useGetInspectionsQuery({});

  const [createGateEntryMutation] = useCreateGateEntryMutation();
  const [createInspectionMutation] = useCreateInspectionMutation();

  const gateEntries = gateData?.gateEntries || [];
  const inspections = inspectionData?.inspections || [];

  const [isGateModalOpen, setIsGateModalOpen] = useState(false);
  const [isQcModalOpen, setIsQcModalOpen] = useState(false);

  // Gate Entry Form State
  const [gateForm, setGateForm] = useState({
    poNumber: '',
    projectId: activeProjectId || '',
    vendorName: '',
    challanOrInvoiceNumber: '',
    vehicleNumber: '',
    itemsCount: 1,
    notes: ''
  });

  // Inspection Form State
  const [qcForm, setQcForm] = useState({
    gateEntryId: '',
    projectId: activeProjectId || '',
    poNumber: '',
    itemCode: '',
    itemName: '',
    receivedQty: 1,
    acceptedQty: 1,
    rejectedQty: 0,
    overallVerdict: 'ACCEPTED',
    inspectorRemarks: ''
  });

  const handleCreateGateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gateForm.poNumber || !gateForm.vendorName) return;

    try {
      await createGateEntryMutation({
        ...gateForm,
        projectId: gateForm.projectId || activeProjectId
      }).unwrap();

      setGateForm({
        poNumber: '',
        projectId: activeProjectId || '',
        vendorName: '',
        challanOrInvoiceNumber: '',
        vehicleNumber: '',
        itemsCount: 1,
        notes: ''
      });
      setIsGateModalOpen(false);
    } catch {
      setIsGateModalOpen(false);
    }
  };

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcForm.itemCode || !qcForm.poNumber) return;

    try {
      await createInspectionMutation({
        ...qcForm,
        projectId: qcForm.projectId || activeProjectId,
        receivedQty: { baseQty: Number(qcForm.receivedQty), baseUom: 'NOS' },
        acceptedQty: { baseQty: Number(qcForm.acceptedQty), baseUom: 'NOS' },
        rejectedQty: { baseQty: Number(qcForm.rejectedQty), baseUom: 'NOS' }
      }).unwrap();

      setQcForm({
        gateEntryId: '',
        projectId: activeProjectId || '',
        poNumber: '',
        itemCode: '',
        itemName: '',
        receivedQty: 1,
        acceptedQty: 1,
        rejectedQty: 0,
        overallVerdict: 'ACCEPTED',
        inspectorRemarks: ''
      });
      setIsQcModalOpen(false);
    } catch {
      setIsQcModalOpen(false);
    }
  };

  const quarantineHoldCount = gateEntries.filter(
    (g: any) => g.status === 'QUARANTINE_HOLD'
  ).length;
  const acceptedQcCount = inspections.filter(
    (i: any) => i.overallVerdict === 'ACCEPTED'
  ).length;
  const rejectedQcCount = inspections.filter(
    (i: any) => i.overallVerdict === 'REJECTED'
  ).length;

  const filteredGateEntries = gateEntries.filter(
    (g: any) =>
      g.gateEntryNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.vendorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInspections = inspections.filter(
    (i: any) =>
      i.inspectionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.itemName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Total Inward
            </div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {gateEntries.length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Truck size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Quarantine Hold
            </div>
            <div className="text-base font-extrabold text-amber-600 mt-0.5">
              {quarantineHoldCount}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              QC Accepted
            </div>
            <div className="text-base font-extrabold text-emerald-600 mt-0.5">
              {acceptedQcCount}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              QC Rejected
            </div>
            <div className="text-base font-extrabold text-red-600 mt-0.5">
              {rejectedQcCount}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle size={16} />
          </div>
        </div>
      </div>

      {/* Sub-View Switcher & Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit border border-slate-200">
          <button
            onClick={() => setActiveSection('inspections')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeSection === 'inspections'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare size={13} />
            <span>Inspection Reports</span>
          </button>
          <button
            onClick={() => setActiveSection('gate-entries')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeSection === 'gate-entries'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert size={13} />
            <span>Quarantine Gate Entry</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          <div className="relative flex-1">
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

          {activeSection === 'inspections' ? (
            <button
              onClick={() => {
                setQcForm({
                  gateEntryId: '',
                  projectId: activeProjectId || '',
                  poNumber: '',
                  itemCode: '',
                  itemName: '',
                  receivedQty: 1,
                  acceptedQty: 1,
                  rejectedQty: 0,
                  overallVerdict: 'ACCEPTED',
                  inspectorRemarks: ''
                });
                setIsQcModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-xs shadow-orange-500/20 transition-all shrink-0"
            >
              <Plus size={15} /> Log Inspection
            </button>
          ) : (
            <button
              onClick={() => {
                setGateForm({
                  poNumber: '',
                  projectId: activeProjectId || '',
                  vendorName: '',
                  challanOrInvoiceNumber: '',
                  vehicleNumber: '',
                  itemsCount: 1,
                  notes: ''
                });
                setIsGateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-xs shadow-orange-500/20 transition-all shrink-0"
            >
              <Plus size={15} /> Gate Entry
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: INSPECTION REPORTS TABLE */}
      {activeSection === 'inspections' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">QC Report #</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">PO Ref</th>
                  <th className="py-3 px-4">Item Code</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Accepted / Total</th>
                  <th className="py-3 px-4">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loadingInspections ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No inspection reports found.
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((qc: any) => (
                    <tr
                      key={qc._id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">
                        {qc.inspectionNumber}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {qc.projectId || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {qc.poNumber}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {qc.itemCode}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                        {qc.itemName}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="text-emerald-700 font-bold">
                          {qc.acceptedQty?.baseQty ?? 0}
                        </span>
                        <span className="text-slate-400"> / </span>
                        <span>{qc.receivedQty?.baseQty ?? 0}</span>
                      </td>
                      <td className="py-3 px-4">
                        {qc.overallVerdict === 'ACCEPTED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} /> Accepted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle size={11} /> {qc.overallVerdict}
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
      )}

      {/* SECTION 2: QUARANTINE GATE ENTRY TABLE */}
      {activeSection === 'gate-entries' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Gate Entry #</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">PO Ref</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Invoice / Challan</th>
                  <th className="py-3 px-4">Vehicle #</th>
                  <th className="py-3 px-4">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loadingGate ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : filteredGateEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No gate entries recorded.
                    </td>
                  </tr>
                ) : (
                  filteredGateEntries.map((entry: any) => (
                    <tr
                      key={entry._id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">
                        {entry.gateEntryNumber}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {entry.projectId || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {entry.poNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {entry.vendorName}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {entry.challanOrInvoiceNumber || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 uppercase">
                        {entry.vehicleNumber || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={11} /> {entry.status}
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

      {/* Log QC Inspection Modal */}
      {isQcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                  Log QC Inspection
                </h3>
              </div>
              <button
                onClick={() => setIsQcModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreateInspection}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PO Number
                  </label>
                  <input
                    type="text"
                    placeholder="PO number"
                    value={qcForm.poNumber}
                    onChange={(e) =>
                      setQcForm({ ...qcForm, poNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Project
                  </label>
                  <input
                    type="text"
                    placeholder="Project ID"
                    value={qcForm.projectId}
                    onChange={(e) =>
                      setQcForm({ ...qcForm, projectId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Item Code
                  </label>
                  <input
                    type="text"
                    placeholder="Item code"
                    value={qcForm.itemCode}
                    onChange={(e) =>
                      setQcForm({ ...qcForm, itemCode: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    placeholder="Item name"
                    value={qcForm.itemName}
                    onChange={(e) =>
                      setQcForm({ ...qcForm, itemName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Received Quantity
                  </label>
                  <input
                    type="number"
                    value={qcForm.receivedQty}
                    onChange={(e) =>
                      setQcForm({ ...qcForm, receivedQty: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Accepted Quantity
                  </label>
                  <input
                    type="number"
                    value={qcForm.acceptedQty}
                    onChange={(e) =>
                      setQcForm({ ...qcForm, acceptedQty: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rejected Quantity
                  </label>
                  <input
                    type="number"
                    value={qcForm.rejectedQty}
                    onChange={(e) =>
                      setQcForm({ ...qcForm, rejectedQty: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Overall Verdict
                  </label>
                  <select
                    value={qcForm.overallVerdict}
                    onChange={(e) =>
                      setQcForm({ ...qcForm, overallVerdict: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  >
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="REWORK">REWORK</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Inspector Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Remarks"
                  value={qcForm.inspectorRemarks}
                  onChange={(e) =>
                    setQcForm({ ...qcForm, inspectorRemarks: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQcModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-xs"
                >
                  <Send size={14} /> Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Gate Entry Modal */}
      {isGateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                  Quarantine Gate Entry
                </h3>
              </div>
              <button
                onClick={() => setIsGateModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreateGateEntry}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PO Number
                  </label>
                  <input
                    type="text"
                    placeholder="PO number"
                    value={gateForm.poNumber}
                    onChange={(e) =>
                      setGateForm({ ...gateForm, poNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Project
                  </label>
                  <input
                    type="text"
                    placeholder="Project ID"
                    value={gateForm.projectId}
                    onChange={(e) =>
                      setGateForm({ ...gateForm, projectId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    placeholder="Vendor name"
                    value={gateForm.vendorName}
                    onChange={(e) =>
                      setGateForm({ ...gateForm, vendorName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Invoice / Challan #
                  </label>
                  <input
                    type="text"
                    placeholder="Invoice or challan"
                    value={gateForm.challanOrInvoiceNumber}
                    onChange={(e) =>
                      setGateForm({
                        ...gateForm,
                        challanOrInvoiceNumber: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    placeholder="Vehicle number"
                    value={gateForm.vehicleNumber}
                    onChange={(e) =>
                      setGateForm({ ...gateForm, vehicleNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Items Count
                  </label>
                  <input
                    type="number"
                    value={gateForm.itemsCount}
                    onChange={(e) =>
                      setGateForm({
                        ...gateForm,
                        itemsCount: Number(e.target.value) || 1
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes"
                  value={gateForm.notes}
                  onChange={(e) =>
                    setGateForm({ ...gateForm, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-xs"
                >
                  <Send size={14} /> Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
