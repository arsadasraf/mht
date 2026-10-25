'use client';

import React from 'react';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { Activity, AlertTriangle, CheckCircle2, ShieldAlert, Wrench, Check } from 'lucide-react';
import { useGetMachineTrialsQuery, useUpdateSnagStatusMutation } from '../api/productionTrialApi';
import { addToast } from '../../../store/uiSlice';

export default function MachineTrialsTab() {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data, isLoading } = useGetMachineTrialsQuery({ projectId: activeProjectId || 'PRJ-2026-001' });
  const [updateSnagStatus, { isLoading: isUpdating }] = useUpdateSnagStatusMutation();

  const trials = data?.trials || [];

  const allSnags = trials.flatMap((t) => t.snags || []);
  const pendingSnags = allSnags.filter((s) => s.status !== 'VERIFIED_QC').length;

  const handleVerifySnag = async (trialId, snagId, snagCode) => {
    try {
      await updateSnagStatus({
        trialId,
        snagId,
        status: 'VERIFIED_QC',
        rectificationDetails: 'Verified by Quality Assurance inspector on shopfloor test run.'
      }).unwrap();

      dispatch(addToast({
        type: 'success',
        title: 'Snag Cleared & Verified',
        message: `${snagCode || 'Snag'} verified by QC. Dispatch unlock progress updated.`
      }));
    } catch (err: any) {
      dispatch(addToast({
        type: 'error',
        title: 'QC Verification Failed',
        message: err?.data?.message || 'Failed to update snag.',
        fixHint: err?.data?.fixHint || 'Only authorized Quality Inspectors can sign off snags.'
      }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Chips (Zero narrative text block) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {trials.length} Trial Runs
          </span>
          {pendingSnags > 0 ? (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
              {pendingSnags} Snags Unresolved (Dispatch Locked)
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              100% Snags Verified (Dispatch Ready)
            </span>
          )}
        </div>
      </div>

      {/* Trials List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            Loading Machine Trial Records...
          </div>
        ) : trials.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            No machine trials recorded for project {activeProjectId}.
          </div>
        ) : (
          trials.map((trial) => (
            <div
              key={trial._id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Activity size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {trial.trialRunNumber}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                        {trial.trialType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Spine: <strong className="font-mono text-orange-600">{trial.projectId}</strong> • {new Date(trial.trialDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    trial.overallResult === 'PASS'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {trial.overallResult}
                </span>
              </div>

              {/* Snags Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2 px-3">Snag ID</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">Severity</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {trial.snags?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-emerald-600 font-medium">
                          Zero snags logged on this test run.
                        </td>
                      </tr>
                    ) : (
                      trial.snags.map((snag) => {
                        const isVerified = snag.status === 'VERIFIED_QC';

                        return (
                          <tr key={snag._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">
                              {snag.snagNumber || 'SNG-01'}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{snag.category}</td>
                            <td className="py-2 px-3 max-w-xs">{snag.description}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  snag.severity === 'CRITICAL'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {snag.severity}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                  <CheckCircle2 size={11} />
                                  <span>VERIFIED QC</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-red-600">
                                  {snag.status}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {!isVerified && (
                                <button
                                  onClick={() => handleVerifySnag(trial._id, snag._id, snag.snagNumber)}
                                  disabled={isUpdating}
                                  className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold border border-emerald-200 transition-colors"
                                >
                                  Verify QC
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
          ))
        )}
      </div>
    </div>
  );
}
