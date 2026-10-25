'use client';

import React from 'react';
import { useAppSelector } from '../../../store/hooks';
import { CalendarCheck, CheckCircle2, Clock, AlertTriangle, Cpu } from 'lucide-react';
import { useGetMilestonesQuery } from '../api/projectApi';

export default function MilestonesTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data, isLoading } = useGetMilestonesQuery(activeProjectId || 'PRJ-2026-001');

  const milestones = data?.milestones || [];
  const completedCount = milestones.filter((m) => m.status === 'COMPLETED').length;

  return (
    <div className="space-y-5">
      {/* Spine Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Cpu size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-orange-600 uppercase tracking-wide">
              Master Reference Spine
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {activeProjectId} — Lifecycle Milestones Baseline
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {completedCount} / {milestones.length} Stages Signed Off
          </span>
        </div>
      </div>

      {/* Milestones Flow */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            Loading Project Baseline Milestones...
          </div>
        ) : milestones.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            No milestones configured for this project spine.
          </div>
        ) : (
          milestones.map((m) => {
            const isCompleted = m.status === 'COMPLETED';
            const isBlocked = m.status === 'BLOCKED';
            const isInProgress = m.status === 'IN_PROGRESS';

            return (
              <div
                key={m._id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-600'
                        : isBlocked
                        ? 'bg-red-50 text-red-600'
                        : 'bg-orange-50 text-orange-600'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={18} />
                    ) : isBlocked ? (
                      <AlertTriangle size={18} />
                    ) : (
                      <Clock size={18} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase tracking-wide">
                        {m.stage.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isBlocked
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 leading-snug">
                      {m.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex-shrink-0">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                      Baseline Date
                    </span>
                    <span className="font-mono text-slate-700 text-xs font-medium">
                      {new Date(m.baselineDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  {m.actualDate && (
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Sign-Off Date
                      </span>
                      <span className="font-mono text-emerald-700 text-xs font-medium">
                        {new Date(m.actualDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}

                  {m.signOffBy && (
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Verified By
                      </span>
                      <span className="text-slate-800 text-xs font-medium">
                        {m.signOffBy.firstName} {m.signOffBy.lastName}
                      </span>
                    </div>
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
