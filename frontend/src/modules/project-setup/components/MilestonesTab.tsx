'use client';

import React, { useMemo, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  GitBranch,
  Plus,
  UserCheck,
  X
} from 'lucide-react';
import {
  useGetMilestonesQuery,
  useGetProjectsQuery,
  useGetDepartmentUsersQuery,
  useAddSubStageToMilestoneMutation,
  useUpdateSubStageMutation
} from '../api/projectApi';
import { setActiveProjectId, addToast } from '../../../store/uiSlice';

export default function MilestonesTab() {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);

  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({});
  const { data: usersData } = useGetDepartmentUsersQuery();
  const projects = projectsData?.projects || [];
  const departmentUsers = usersData?.users || [];

  const [addSubStageModal, setAddSubStageModal] = useState<any | null>(null);
  const [subTitle, setSubTitle] = useState('');
  const [subAssignedUserId, setSubAssignedUserId] = useState('');
  const [subTargetDate, setSubTargetDate] = useState('');

  const [addSubStage, { isLoading: isAddingSub }] = useAddSubStageToMilestoneMutation();
  const [updateSubStage] = useUpdateSubStageMutation();

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

  const handleAddSubStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSubStageModal || !subTitle.trim()) return;
    const assignedUser = departmentUsers.find((u) => u.id === subAssignedUserId);
    try {
      await addSubStage({
        id: addSubStageModal._id,
        title: subTitle.trim(),
        departmentModule: addSubStageModal.departmentModule || 'design',
        assignedToUserId: assignedUser?.id || undefined,
        assignedToUserName: assignedUser?.name || '',
        assignedToUserEmail: assignedUser?.email || '',
        targetEndDate: subTargetDate || undefined
      }).unwrap();
      setAddSubStageModal(null);
      setSubTitle('');
      setSubAssignedUserId('');
      setSubTargetDate('');
      dispatch(
        addToast({
          type: 'success',
          title: 'Sub-Stage Added',
          message: 'All set! Sub-stage added and assigned.'
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Error',
          message: err?.data?.message || 'Could not add sub-stage.'
        })
      );
    }
  };

  const handleSubStageStatusChange = async (sub: any, nextStatus: string) => {
    try {
      await updateSubStage({
        subStageId: sub._id,
        status: nextStatus
      }).unwrap();
      dispatch(
        addToast({
          type: 'success',
          title: 'Sub-Stage Updated',
          message: `Sub-stage '${sub.title}' marked ${nextStatus.replace(/_/g, ' ')}.`
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Error',
          message: err?.data?.message || 'Could not update sub-stage.'
        })
      );
    }
  };

  const handleAssignSubStageUser = async (sub: any, userId: string) => {
    const u = departmentUsers.find((usr) => usr.id === userId);
    try {
      await updateSubStage({
        subStageId: sub._id,
        assignedToUserId: u?.id || null,
        assignedToUserName: u?.name || '',
        assignedToUserEmail: u?.email || ''
      }).unwrap();
      dispatch(
        addToast({
          type: 'info',
          title: 'Assignee Updated',
          message: u ? `Assigned to ${u.name}.` : 'Unassigned.'
        })
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Bar with Project Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-72">
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
                    {p.projectId} — {p.customerName} ({p.machineModel})
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
            {completedCount} / {milestones.length} Main Stages Completed
          </span>
        </div>
      </div>

      {/* Milestones & Nested Department Sub-Stages Flow */}
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
            const subStages = m.subStages || [];

            return (
              <div
                key={m._id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase tracking-wide font-mono">
                          {m.stageCode || m.stage}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 uppercase font-mono">
                          Dept: {m.departmentModule || 'project-setup'}
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
                          {m.status?.replace(/_/g, ' ')} ({m.completionPercent ?? 0}%)
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {m.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex-shrink-0">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Baseline Target
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

                    <button
                      type="button"
                      onClick={() => setAddSubStageModal(m)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 text-slate-700 hover:text-orange-600 text-[11px] font-bold transition-all cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add Sub-Stage</span>
                    </button>
                  </div>
                </div>

                {/* Department Sub-Stages List */}
                {subStages.length > 0 && (
                  <div className="pl-0 sm:pl-11 pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <GitBranch size={12} className="text-orange-500" />
                      <span>Department Sub-Stages ({subStages.length})</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      {subStages.map((sub: any) => (
                        <div
                          key={sub._id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 truncate">{sub.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Due:{' '}
                              {sub.targetEndDate
                                ? new Date(sub.targetEndDate).toLocaleDateString('en-IN')
                                : '—'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Assign User Dropdown */}
                            <div className="flex items-center gap-1">
                              <UserCheck size={12} className="text-slate-400" />
                              <select
                                value={sub.assignedToUserId || ''}
                                onChange={(e) => handleAssignSubStageUser(sub, e.target.value)}
                                className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-700"
                              >
                                <option value="">Unassigned</option>
                                {departmentUsers.map((u: any) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.department || u.roleName})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Status Selector */}
                            <select
                              value={sub.status || 'NOT_STARTED'}
                              onChange={(e) => handleSubStageStatusChange(sub, e.target.value)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                                sub.status === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : sub.status === 'IN_PROGRESS'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              <option value="NOT_STARTED">Not Started</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Sub-Stage to Project Stage Modal */}
      {addSubStageModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <GitBranch size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                  Add Sub-Stage — {addSubStageModal.stageCode}
                </h3>
              </div>
              <button
                onClick={() => setAddSubStageModal(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubStageSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sub-Stage Title *</label>
                <input
                  type="text"
                  required
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  placeholder="e.g. Spindle Housing 2D Drawing Release"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign to Department User</label>
                <select
                  value={subAssignedUserId}
                  onChange={(e) => setSubAssignedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">Select User...</option>
                  {departmentUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.department || u.roleName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={subTargetDate}
                  onChange={(e) => setSubTargetDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddSubStageModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingSub}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
                >
                  {isAddingSub ? 'Adding...' : 'Add Sub-Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
