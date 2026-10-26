'use client';

import React, { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { CalendarCheck, CheckCircle2, Clock, AlertTriangle, ChevronDown } from 'lucide-react';
import { useGetMilestonesQuery, useGetProjectsQuery } from '../api/projectApi';
import { setActiveProjectId } from '../../../store/uiSlice';

export default function MilestonesTab() {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);

  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({});
  const projects = projectsData?.projects || [];

  const selectedProjectId = useMemo(() => {
    if (activeProjectId && projects.some((p) => p.projectId === activeProjectId)) {
      return activeProjectId;
    }
    return projects[0]?.projectId || '';
  }, [activeProjectId, projects]);

  const { data, isLoading } = useGetMilestonesQuery(selectedProjectId, {
    skip: !selectedProjectId
  });

  const milestones = data?.milestones || [];
  const completedCount = milestones.filter((m) => m.status === 'COMPLETED').length;

  return (
    <div className="space-y-5">
      {/* Top Bar with Project Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-64">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Project
            </label>
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => dispatch(setActiveProjectId(e.target.value))}
                disabled={isLoadingProjects || projects.length === 0}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none appearance-none pr-8 cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.projectId} — {p.customerName}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            {completedCount} / {milestones.length} Completed
          </span>
        </div>
      </div>

      {/* Milestones Flow */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            Loading Milestones...
          </div>
        ) : !selectedProjectId ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            No projects available.
          </div>
        ) : milestones.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            No milestones configured for this project.
          </div>
        ) : (
          milestones.map((m) => {
            const isCompleted = m.status === 'COMPLETED';
            const isBlocked = m.status === 'BLOCKED' || m.status === 'ON_HOLD';

            return (
              <div
                key={m._id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
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
                        {m.stage?.replace(/_/g, ' ') || 'STAGE'}
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
                        {m.status?.replace(/_/g, ' ')}
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
                      {m.baselineDate
                        ? new Date(m.baselineDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '—'}
                    </span>
                  </div>

                  {m.actualCompletionDate && (
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Completion Date
                      </span>
                      <span className="font-mono text-emerald-700 text-xs font-medium">
                        {new Date(m.actualCompletionDate).toLocaleDateString('en-IN', {
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
