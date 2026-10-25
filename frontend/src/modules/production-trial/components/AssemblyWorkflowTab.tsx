'use client';

import React from 'react';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { Kanban, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { useGetAssemblyStagesQuery, useUpdateAssemblyStageMutation } from '../api/productionTrialApi';
import { addToast } from '../../../store/uiSlice';

export default function AssemblyWorkflowTab() {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data, isLoading } = useGetAssemblyStagesQuery({ projectId: activeProjectId || 'PRJ-2026-001' });
  const [updateAssemblyStage, { isLoading: isUpdating }] = useUpdateAssemblyStageMutation();

  const stages = data?.stages || [];

  const handleSignOff = async (stageId, stageName) => {
    try {
      await updateAssemblyStage({
        id: stageId,
        signOff: true
      }).unwrap();

      dispatch(addToast({
        type: 'success',
        title: 'Assembly Stage Signed Off',
        message: `${stageName || 'Stage'} passed stage-gate inspection.`
      }));
    } catch (err: any) {
      dispatch(addToast({
        type: 'error',
        title: 'Sign-Off Blocked',
        message: err?.data?.message || 'Failed to sign off stage.',
        fixHint: err?.data?.fixHint || 'Mandatory stage check sign-off requires authorized role.'
      }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {stages.length} Assembly Stations
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {stages.filter((s) => s.status === 'GATE_PASSED').length} Gates Cleared
          </span>
        </div>
      </div>

      {/* Assembly Stages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {isLoading ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            Loading Assembly Stages...
          </div>
        ) : stages.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            No assembly stages assigned for project {activeProjectId}.
          </div>
        ) : (
          stages.map((stage) => {
            const isPassed = stage.status === 'GATE_PASSED';

            return (
              <div
                key={stage._id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                      Station #{stage.sequenceOrder}
                    </span>
                    {isPassed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={11} />
                        <span>GATE PASSED</span>
                      </span>
                    ) : (
                      <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        IN PROGRESS
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 mb-2">
                    {stage.subAssemblyGroup}
                  </h3>

                  {/* Progress Bar */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Station Completion</span>
                      <span className="font-bold text-slate-800">{stage.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${stage.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Spine: <strong className="font-mono text-slate-700">{stage.projectId}</strong>
                  </span>

                  {!isPassed && (
                    <button
                      onClick={() => handleSignOff(stage._id, stage.subAssemblyGroup)}
                      disabled={isUpdating}
                      className="px-2.5 py-1 rounded bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-all disabled:opacity-50"
                    >
                      {isUpdating ? 'Signing...' : 'Sign Off Gate'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
