'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { Truck, Lock, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, FileText } from 'lucide-react';
import { useGetDispatchOrdersQuery, useVerifyZeroSnagsQuery, useIssueGatePassMutation } from '../api/dispatchApi';
import { addToast } from '../../../store/uiSlice';

export default function ZeroSnagVerificationTab() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);

  const { data: zeroSnagData, isLoading: isVerifying } = useVerifyZeroSnagsQuery(activeProjectId || 'PRJ-2026-001');
  const { data: dispatchData, isLoading: isOrdersLoading } = useGetDispatchOrdersQuery({});
  const [issueGatePass, { isLoading: isIssuing }] = useIssueGatePassMutation();

  const zeroSnagCleared = zeroSnagData?.zeroSnagCleared || false;
  const unresolvedSnags = zeroSnagData?.unresolvedSnags || [];
  const dispatchOrders = dispatchData?.dispatchOrders || [];
  const currentDispatch = dispatchOrders.find((d) => d.projectId === activeProjectId) || dispatchOrders[0];

  const handleIssueGatePass = async () => {
    if (!currentDispatch) return;
    try {
      const res = await issueGatePass({
        id: currentDispatch._id,
        commercialClearanceGiven: true
      }).unwrap();

      dispatch(addToast({
        type: 'success',
        title: 'Vehicle Gate Pass Issued',
        message: `Gate Pass ${res.gatePassNumber || 'GP-XXXX'} generated. Vehicle dispatch cleared.`
      }));
    } catch (err: any) {
      dispatch(addToast({
        type: 'error',
        title: 'Gate Pass Blocked',
        message: err?.data?.message || 'Failed to issue gate pass.',
        fixHint: err?.data?.fixHint || 'Zero-snag verification and full shipping dossier required.'
      }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Zero Snag Status Card (Zero narrative text block) */}
      <div
        className={`rounded-xl border p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          zeroSnagCleared
            ? 'bg-emerald-50/60 border-emerald-200'
            : 'bg-red-50/50 border-red-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              zeroSnagCleared
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-red-500 text-white shadow-sm'
            }`}
          >
            {zeroSnagCleared ? <ShieldCheck size={22} /> : <Lock size={20} />}
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Zero-Snag Gate Verification
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              {zeroSnagCleared
                ? 'All Trial Snags Certified & Cleared — Gate Pass Ready'
                : 'Absolute Zero-Snag Block Active — Gate Pass Locked'}
            </h2>
          </div>
        </div>

        <span
          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
            zeroSnagCleared
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
        >
          {zeroSnagCleared ? '100% QC Cleared' : `${unresolvedSnags.length} Unresolved Snag(s)`}
        </span>
      </div>

      {/* Unresolved Snag Warning Box if Block is Active */}
      {!zeroSnagCleared && unresolvedSnags.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-red-700">
            <AlertTriangle size={16} />
            <span>Blocking Snags for Project {activeProjectId}:</span>
          </div>

          <div className="space-y-2">
            {unresolvedSnags.map((snag) => (
              <div
                key={snag.snagNumber}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-orange-600">
                    {snag.snagNumber}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                    {snag.severity}
                  </span>
                  <span className="text-slate-800 font-medium">{snag.title}</span>
                </div>

                <button
                  onClick={() => router.push('/production-trial/trials')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700"
                >
                  <span>Go to Trials</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispatch Order & Shipping Dossier Station */}
      {currentDispatch && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-orange-600">
                  {currentDispatch.dispatchNumber}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {currentDispatch.customerName} • {currentDispatch.workOrderNumber}
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-900">
                Pre-Dispatch Shipping Dossier & Gate Pass Clearance
              </h3>
            </div>

            <div>
              {currentDispatch.gatePassNumber ? (
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  GATE PASS: {currentDispatch.gatePassNumber}
                </span>
              ) : (
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  GATE PASS UNRELEASED
                </span>
              )}
            </div>
          </div>

          {/* Dossier Checklist */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-2">
              Mandatory Shipping Dossier Verification
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {currentDispatch.dossierDocuments?.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={15} className={doc.verified ? 'text-emerald-600' : 'text-slate-400'} />
                    <span className="font-medium text-slate-800">{doc.docType.replace(/_/g, ' ')}</span>
                  </div>
                  {doc.verified ? (
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      PENDING
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action CTA */}
          <div className="pt-2 flex items-center justify-end">
            <button
              disabled={!zeroSnagCleared || isIssuing || !!currentDispatch.gatePassNumber}
              onClick={handleIssueGatePass}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Truck size={15} />
              <span>
                {currentDispatch.gatePassNumber
                  ? 'Gate Pass Already Issued'
                  : isIssuing
                  ? 'Issuing Clearance...'
                  : 'Issue Pre-Dispatch Gate Pass'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
