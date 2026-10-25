'use client';

import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { Lock, ArrowRightLeft, ShieldCheck, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useGetAllocationsQuery, useRequestTransferMutation, useApproveTransferMutation } from '../api/storeApi';
import { addToast } from '../../../store/uiSlice';

export default function HardAllocationsTab() {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data, isLoading } = useGetAllocationsQuery({});
  const [requestTransfer, { isLoading: isRequesting }] = useRequestTransferMutation();
  const [approveTransfer, { isLoading: isApproving }] = useApproveTransferMutation();

  const [targetProject, setTargetProject] = useState('PRJ-2026-002');
  const [justification, setJustification] = useState('');
  const [selectedAllocationId, setSelectedAllocationId] = useState(null);

  const allocations = data?.allocations || [];

  const handleTransferSubmit = async (id) => {
    if (!justification) {
      dispatch(addToast({
        type: 'warning',
        title: 'Justification Required',
        message: 'A managerial reason must be provided for cross-machine stock diversion.',
        fixHint: 'Enter why material is being transferred from its original machine.'
      }));
      return;
    }

    try {
      await requestTransfer({
        id,
        targetProjectId: targetProject,
        justification
      }).unwrap();

      setSelectedAllocationId(null);
      setJustification('');

      dispatch(addToast({
        type: 'success',
        title: 'Transfer Request Submitted',
        message: `Cross-project allocation transfer requested for target ${targetProject}. Awaiting manager approval.`
      }));
    } catch (err: any) {
      dispatch(addToast({
        type: 'error',
        title: 'Transfer Failed',
        message: err?.data?.message || 'Unable to submit transfer request.',
        fixHint: err?.data?.fixHint || 'Verify target project and permissions.'
      }));
    }
  };

  const handleApprove = async (id, approved) => {
    try {
      await approveTransfer({
        id,
        approved,
        notes: approved ? 'Managerial approval granted. Allocation updated.' : 'Transfer request rejected.'
      }).unwrap();

      dispatch(addToast({
        type: approved ? 'success' : 'info',
        title: approved ? 'Transfer Approved' : 'Transfer Rejected',
        message: approved ? 'Stock hard-lock updated to new machine.' : 'Material stays locked to original project.'
      }));
    } catch (err: any) {
      dispatch(addToast({
        type: 'error',
        title: 'Approval Action Failed',
        message: err?.data?.message || 'Failed to update transfer status.',
        fixHint: err?.data?.fixHint || 'Check your managerial permissions.'
      }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Chips (Zero narrative text block) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {allocations.length} Hard Allocations
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
            Hard Allocation Locking Active
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Item Code</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Locked Spine ID</th>
                <th className="py-3 px-4">Locked Qty</th>
                <th className="py-3 px-4">Lock Status</th>
                <th className="py-3 px-4">Transfer Request</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    Loading Stock Allocation Records...
                  </td>
                </tr>
              ) : allocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No active hard allocations found.
                  </td>
                </tr>
              ) : (
                allocations.map((alloc) => {
                  const hasPendingTransfer = alloc.transferRequest?.status === 'PENDING';

                  return (
                    <tr key={alloc._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {alloc.itemId?.itemCode || 'STOCK-ITEM'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {alloc.itemId?.itemName || 'Component Item'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">
                        {alloc.projectId}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {alloc.allocatedQty?.baseQty} {alloc.allocatedQty?.baseUom}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Lock size={10} />
                          <span>LOCKED</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {hasPendingTransfer ? (
                          <div className="flex flex-col">
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 w-fit">
                              TO: {alloc.transferRequest.targetProjectId}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5 truncate max-w-xs">
                              {alloc.transferRequest.justification}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {hasPendingTransfer ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(alloc._id, true)}
                              disabled={isApproving}
                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold border border-emerald-200"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApprove(alloc._id, false)}
                              disabled={isApproving}
                              className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold border border-red-200"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedAllocationId(alloc._id)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 text-xs font-semibold transition-colors"
                          >
                            Request Diversion
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transfer Request Dialog */}
      {selectedAllocationId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Request Hard-Lock Diversion
              </h3>
              <button
                onClick={() => setSelectedAllocationId(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Unique Project ID
                </label>
                <select
                  value={targetProject}
                  onChange={(e) => setTargetProject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="PRJ-2026-002">PRJ-2026-002 (Schneider 5-Axis)</option>
                  <option value="PRJ-2026-001">PRJ-2026-001 (BHEL Coil Winder)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Managerial Transfer Justification *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why materials are being diverted from the allocated machine..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAllocationId(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleTransferSubmit(selectedAllocationId)}
                  disabled={isRequesting}
                  className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {isRequesting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
