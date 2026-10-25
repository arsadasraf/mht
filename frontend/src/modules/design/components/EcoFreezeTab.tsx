'use client';

import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { AlertTriangle, ShieldAlert, CheckCircle2, Snowflake, ArrowRight } from 'lucide-react';
import { useGetEcosQuery, useApproveEcoMutation } from '../api/designApi';
import { addToast } from '../../../store/uiSlice';

export default function EcoFreezeTab() {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data, isLoading } = useGetEcosQuery({});
  const [approveEco, { isLoading: isApproving }] = useApproveEcoMutation();

  const [activeNotes, setActiveNotes] = useState('');

  const ecos = data?.ecos || [];

  const handleApprove = async (ecoId, ecoNumber) => {
    try {
      const res = await approveEco({
        id: ecoId,
        approvalNotes: activeNotes || 'Approved by Lead Design Engineer. Automated freeze triggered.'
      }).unwrap();

      dispatch(addToast({
        type: 'success',
        title: 'ECO Approved & Freeze Enforced',
        message: `${ecoNumber || 'ECO'} approved. Connected PO lines and store stock have been locked.`
      }));
    } catch (err: any) {
      dispatch(addToast({
        type: 'error',
        title: 'Approval Rejected',
        message: err?.data?.message || 'Unable to approve Engineering Change Order.',
        fixHint: err?.data?.fixHint || 'Check your role authorization permissions.'
      }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Status Chips (Zero narrative text block) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {ecos.length} Total ECOs
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
            {ecos.filter((e) => e.status === 'APPROVED' || e.freezeActive).length} Active Freezes
          </span>
        </div>
      </div>

      {/* ECO Orders Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            Loading Engineering Change Orders...
          </div>
        ) : ecos.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            No pending or active ECOs in system.
          </div>
        ) : (
          ecos.map((eco) => {
            const isApproved = eco.status === 'APPROVED';

            return (
              <div
                key={eco._id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isApproved ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      <Snowflake size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {eco.ecoNumber}
                        </span>
                        <span className="font-mono text-[11px] text-orange-600 font-semibold">
                          {eco.projectRef?.uniqueProjectId || activeProjectId}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900">{eco.title}</h3>
                    </div>
                  </div>

                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isApproved
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {eco.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {eco.reasonForChange}
                </p>

                {/* Affected Entities */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200/80">
                    <span className="font-semibold text-slate-700 block mb-0.5">Affected Part Codes:</span>
                    <span className="font-mono text-slate-600">
                      {eco.affectedPartCodes?.join(', ') || 'MAIN-SPINDLE-ASSY-01'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200/80">
                    <span className="font-semibold text-slate-700 block mb-0.5">Automated Freeze Impact:</span>
                    <span className="text-red-600 font-medium">
                      {eco.freezeActive ? 'Active POs and stock issues locked' : 'Pending Lead Design sign-off'}
                    </span>
                  </div>
                </div>

                {!isApproved && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleApprove(eco._id, eco.ecoNumber)}
                      disabled={isApproving}
                      className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
                    >
                      {isApproving ? 'Applying Freeze...' : 'Approve ECO & Trigger Freeze'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
