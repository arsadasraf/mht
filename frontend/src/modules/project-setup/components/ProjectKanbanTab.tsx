'use client';

import React, { useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import {
  Kanban,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  MessageSquare,
  ArrowRight,
  MoveRight,
  Calendar,
  User,
  X,
  Send,
  Cpu,
  Layers,
  ChevronDown,
  Building2
} from 'lucide-react';
import {
  useGetProjectsQuery,
  useGetMilestonesQuery,
  useUpdateMilestoneStatusMutation,
  useAddMilestoneRemarkMutation,
  useCreateProjectMilestoneMutation
} from '../api/projectApi';
import { setActiveProjectId, addToast } from '../../../store/uiSlice';

export default function ProjectKanbanTab() {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({});
  const projects = projectsData?.projects || [];

  // Default project selection: activeProjectId or first available project
  const selectedProjectId = useMemo(() => {
    if (activeProjectId && projects.some((p) => p.projectId === activeProjectId)) {
      return activeProjectId;
    }
    return projects[0]?.projectId || '';
  }, [activeProjectId, projects]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.projectId === selectedProjectId);
  }, [projects, selectedProjectId]);

  const { data: milestonesData, isLoading: isLoadingMilestones } = useGetMilestonesQuery(
    selectedProjectId,
    { skip: !selectedProjectId }
  );

  const milestones = milestonesData?.milestones || [];

  // Mutations
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateMilestoneStatusMutation();
  const [addRemark, { isLoading: isAddingRemark }] = useAddMilestoneRemarkMutation();
  const [createMilestone, { isLoading: isCreatingStage }] = useCreateProjectMilestoneMutation();

  // Modals & Drawers state
  const [activeRemarkStage, setActiveRemarkStage] = useState<any | null>(null);
  const [newRemarkText, setNewRemarkText] = useState('');
  const [newRemarkAuthor, setNewRemarkAuthor] = useState('');
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);

  // Add Stage Form State
  const [newStageTitle, setNewStageTitle] = useState('');
  const [newStageCode, setNewStageCode] = useState('');
  const [newStageRole, setNewStageRole] = useState('Project Manager');
  const [newStageDate, setNewStageDate] = useState('');
  const [newStageWeight, setNewStageWeight] = useState('10');
  const [newStageInitialRemark, setNewStageInitialRemark] = useState('');

  // Handle Project Change
  const handleProjectChange = (newProjId: string) => {
    dispatch(setActiveProjectId(newProjId));
  };

  // Move stage to another Kanban status
  const handleMoveStage = async (stageId: string, newStatus: string) => {
    try {
      await updateStatus({
        id: stageId,
        status: newStatus
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          title: 'Stage Status Updated',
          message: `Stage transitioned to ${newStatus.replace(/_/g, ' ')}.`
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Failed to Move Stage',
          message: err?.data?.message || 'Unable to update stage status. Please try again.'
        })
      );
    }
  };

  // Submit Remark
  const handleAddRemarkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemarkText.trim() || !activeRemarkStage) return;

    try {
      const res = await addRemark({
        id: activeRemarkStage._id,
        text: newRemarkText.trim(),
        authorName: newRemarkAuthor.trim() || undefined
      }).unwrap();

      // Update activeRemarkStage with new remarks list
      if (res.milestone) {
        setActiveRemarkStage(res.milestone);
      }

      setNewRemarkText('');
      dispatch(
        addToast({
          type: 'success',
          title: 'Remark Logged',
          message: 'Comment with timestamp has been recorded on this stage.'
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Remark Failed',
          message: err?.data?.message || 'Could not post remark right now.'
        })
      );
    }
  };

  // Submit Add Stage
  const handleCreateStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageTitle || !selectedProjectId) return;

    try {
      await createMilestone({
        projectId: selectedProjectId,
        title: newStageTitle,
        stageCode: newStageCode || newStageTitle.toUpperCase().replace(/\s+/g, '_'),
        leadRole: newStageRole,
        baselineDate: newStageDate ? new Date(newStageDate) : new Date(),
        weightPercent: Number(newStageWeight) || 10,
        initialRemark: newStageInitialRemark
      }).unwrap();

      setIsAddStageOpen(false);
      setNewStageTitle('');
      setNewStageCode('');
      setNewStageDate('');
      setNewStageInitialRemark('');

      dispatch(
        addToast({
          type: 'success',
          title: 'Stage Added',
          message: `New stage '${newStageTitle}' added to project ${selectedProjectId}.`
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Could not add stage',
          message: err?.data?.message || 'Unable to add stage to this project.'
        })
      );
    }
  };

  // Group milestones into the 4 Kanban columns
  const columns = useMemo(() => {
    const notStarted = milestones.filter(
      (m) => m.status === 'NOT_STARTED' || m.status === 'PENDING'
    );
    const inProgress = milestones.filter((m) => m.status === 'IN_PROGRESS');
    const onHold = milestones.filter(
      (m) => m.status === 'ON_HOLD' || m.status === 'BLOCKED'
    );
    const completed = milestones.filter((m) => m.status === 'COMPLETED');

    return {
      NOT_STARTED: notStarted,
      IN_PROGRESS: inProgress,
      ON_HOLD: onHold,
      COMPLETED: completed
    };
  }, [milestones]);

  const totalStages = milestones.length;
  const completedStages = columns.COMPLETED.length;
  const progressPercent = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Project Selector Bar & Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full lg:w-auto">
          {/* Project Selector Dropdown */}
          <div className="w-full sm:w-72">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Project
            </label>
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                disabled={isLoadingProjects || projects.length === 0}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none appearance-none pr-8 cursor-pointer"
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

          {/* Project Metadata Snapshot */}
          {selectedProject && (
            <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                  {selectedProject.projectId}
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-500">
                  {selectedProject.workOrderNumber}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 truncate max-w-sm">
                {selectedProject.projectName}
              </div>
            </div>
          )}
        </div>

        {/* Progress & Add Stage Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
          {/* Progress Bar */}
          <div className="w-full sm:w-56">
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="text-slate-600">Project Progress</span>
              <span className="text-orange-600 font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
              <span>{completedStages} of {totalStages} Stages Complete</span>
            </div>
          </div>

          <button
            onClick={() => setIsAddStageOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all shrink-0"
          >
            <Plus size={15} />
            <span>Add Stage</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      {isLoadingMilestones ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
          Loading Kanban stages for {selectedProjectId}...
        </div>
      ) : milestones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Kanban size={36} className="mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Stages for this Project</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            This machine work order does not have any stages initialized yet.
          </p>
          <button
            onClick={() => setIsAddStageOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold"
          >
            <Plus size={15} /> Add First Stage
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {/* Column 1: NOT STARTED */}
          <div className="bg-slate-100/70 border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="bg-white px-4 py-3 border-b border-slate-200 border-t-4 border-t-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-slate-500" />
                <span className="text-xs font-extrabold text-slate-900 tracking-tight">
                  Not Started
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {columns.NOT_STARTED.length}
              </span>
            </div>

            <div className="p-3 space-y-3 min-h-[400px]">
              {columns.NOT_STARTED.map((m) => renderStageCard(m, 'NOT_STARTED'))}
              {columns.NOT_STARTED.length === 0 && renderEmptyColumn('No stages in backlog')}
            </div>
          </div>

          {/* Column 2: IN PROGRESS */}
          <div className="bg-orange-50/30 border border-orange-200/60 rounded-2xl overflow-hidden flex flex-col">
            <div className="bg-white px-4 py-3 border-b border-slate-200 border-t-4 border-t-orange-500 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-orange-600" />
                <span className="text-xs font-extrabold text-slate-900 tracking-tight">
                  In Progress
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                {columns.IN_PROGRESS.length}
              </span>
            </div>

            <div className="p-3 space-y-3 min-h-[400px]">
              {columns.IN_PROGRESS.map((m) => renderStageCard(m, 'IN_PROGRESS'))}
              {columns.IN_PROGRESS.length === 0 && renderEmptyColumn('No active stages')}
            </div>
          </div>

          {/* Column 3: ON HOLD */}
          <div className="bg-red-50/30 border border-red-200/60 rounded-2xl overflow-hidden flex flex-col">
            <div className="bg-white px-4 py-3 border-b border-slate-200 border-t-4 border-t-red-500 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PauseCircle size={15} className="text-red-600" />
                <span className="text-xs font-extrabold text-slate-900 tracking-tight">
                  On Hold
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                {columns.ON_HOLD.length}
              </span>
            </div>

            <div className="p-3 space-y-3 min-h-[400px]">
              {columns.ON_HOLD.map((m) => renderStageCard(m, 'ON_HOLD'))}
              {columns.ON_HOLD.length === 0 && renderEmptyColumn('No blocked stages')}
            </div>
          </div>

          {/* Column 4: COMPLETED */}
          <div className="bg-emerald-50/30 border border-emerald-200/60 rounded-2xl overflow-hidden flex flex-col">
            <div className="bg-white px-4 py-3 border-b border-slate-200 border-t-4 border-t-emerald-500 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span className="text-xs font-extrabold text-slate-900 tracking-tight">
                  Completed
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                {columns.COMPLETED.length}
              </span>
            </div>

            <div className="p-3 space-y-3 min-h-[400px]">
              {columns.COMPLETED.map((m) => renderStageCard(m, 'COMPLETED'))}
              {columns.COMPLETED.length === 0 && renderEmptyColumn('No completed stages')}
            </div>
          </div>
        </div>
      )}

      {/* Remarks History Drawer / Modal */}
      {activeRemarkStage && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Standard Crisp White Ribbon Header with Amber Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Stage Remarks & History
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeRemarkStage.projectId} • {activeRemarkStage.title}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveRemarkStage(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Remarks Scrollable Feed */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
              {(!activeRemarkStage.remarks || activeRemarkStage.remarks.length === 0) ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No comments logged yet. Use the field below to add the first remark.
                </div>
              ) : (
                activeRemarkStage.remarks.map((r: any, idx: number) => (
                  <div
                    key={r._id || idx}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {r.authorName || 'Team Member'}
                        </span>
                        {r.authorRole && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {r.authorRole}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })
                          : 'Just now'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {r.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Remark Form */}
            <form onSubmit={handleAddRemarkSubmit} className="p-4 bg-white border-t border-slate-200 space-y-3 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Author (optional)"
                  value={newRemarkAuthor}
                  onChange={(e) => setNewRemarkAuthor(e.target.value)}
                  className="w-1/2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <textarea
                  rows={2}
                  required
                  placeholder="Enter remark..."
                  value={newRemarkText}
                  onChange={(e) => setNewRemarkText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none resize-none"
                />

                <button
                  type="submit"
                  disabled={isAddingRemark || !newRemarkText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  <Send size={14} />
                  <span>{isAddingRemark ? 'Posting...' : 'Post'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stage to Project Modal */}
      {isAddStageOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Standard Crisp White Ribbon Header with Amber Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Add Stage
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setIsAddStageOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStageSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Stage Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Servo Motor Synchronous Calibration"
                  value={newStageTitle}
                  onChange={(e) => setNewStageTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stage Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SERVO_CALIB"
                    value={newStageCode}
                    onChange={(e) => setNewStageCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 uppercase font-mono focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lead Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Electrical Engineer"
                    value={newStageRole}
                    onChange={(e) => setNewStageRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={newStageDate}
                    onChange={(e) => setNewStageDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Weight Percent (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newStageWeight}
                    onChange={(e) => setNewStageWeight(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remark
                </label>
                <textarea
                  rows={2}
                  placeholder="Initial remark (optional)..."
                  value={newStageInitialRemark}
                  onChange={(e) => setNewStageInitialRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStageOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStage}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  {isCreatingStage ? 'Adding...' : 'Add Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to render a single stage card inside a Kanban column
  function renderStageCard(stage: any, currentColumnKey: string) {
    const remarksCount = stage.remarks?.length || 0;

    return (
      <div
        key={stage._id}
        className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs hover:shadow-md transition-all space-y-2.5"
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              #{stage.order || 1}
            </span>
            <span className="font-mono text-[10px] font-semibold text-orange-600">
              {stage.stageCode || stage.stage}
            </span>
          </div>

          <span className="text-[10px] font-bold text-slate-400">
            {stage.weightPercent || 10}% wt
          </span>
        </div>

        {/* Card Title */}
        <h4 className="text-xs font-bold text-slate-900 leading-snug">
          {stage.title}
        </h4>

        {/* Lead Role & Target Date */}
        <div className="text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center gap-1.5">
            <User size={12} className="text-slate-400" />
            <span className="truncate">{stage.leadRole || 'Project Lead'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-slate-400" />
            <span className="font-mono text-[10px]">
              {stage.baselineDate
                ? new Date(stage.baselineDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })
                : 'TBD'}
            </span>
          </div>
        </div>

        {/* Card Footer: Remarks Button + Move Status Dropdown */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Remarks Trigger */}
          <button
            onClick={() => setActiveRemarkStage(stage)}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-orange-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <MessageSquare size={13} className="text-orange-500" />
            <span>{remarksCount} remark{remarksCount === 1 ? '' : 's'}</span>
          </button>

          {/* Quick Move Selector */}
          <div className="relative">
            <select
              value={currentColumnKey}
              onChange={(e) => handleMoveStage(stage._id, e.target.value)}
              disabled={isUpdatingStatus}
              className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer focus:outline-none"
            >
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  function renderEmptyColumn(label: string) {
    return (
      <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-center p-4">
        <span className="text-[11px] font-medium text-slate-400">{label}</span>
      </div>
    );
  }
}
