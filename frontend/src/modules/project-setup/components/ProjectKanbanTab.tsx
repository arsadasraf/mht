'use client';

import React, { useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import {
  Kanban,
  CalendarRange,
  Activity,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  MessageSquare,
  Calendar,
  User,
  X,
  Send,
  Layers,
  ChevronDown,
  Trash2,
  BarChart2,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import {
  useGetProjectsQuery,
  useGetMilestonesQuery,
  useUpdateMilestoneStatusMutation,
  useAddMilestoneRemarkMutation,
  useCreateProjectMilestoneMutation,
  useDeleteMilestoneMutation,
  useGetStageMastersQuery
} from '../api/projectApi';
import { setActiveProjectId, addToast } from '../../../store/uiSlice';

type KanbanViewMode = 'kanban' | 'gantt' | 'health';

export default function ProjectKanbanTab() {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);

  // Active View Switcher
  const [activeView, setActiveView] = useState<KanbanViewMode>('kanban');

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
  const milestones = useMemo(() => milestonesData?.milestones || [], [milestonesData]);

  // Stage Masters (for "+ Add Stage" picker)
  const { data: stageMastersData } = useGetStageMastersQuery({});
  const stageMasters = stageMastersData?.stages || [];

  // Mutations
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateMilestoneStatusMutation();
  const [addRemark, { isLoading: isAddingRemark }] = useAddMilestoneRemarkMutation();
  const [createMilestone, { isLoading: isCreatingStage }] = useCreateProjectMilestoneMutation();
  const [deleteMilestone, { isLoading: isDeletingStage }] = useDeleteMilestoneMutation();

  // Modals & Drawers state
  const [activeRemarkStage, setActiveRemarkStage] = useState<any | null>(null);
  const [newRemarkText, setNewRemarkText] = useState('');
  const [newRemarkAuthor, setNewRemarkAuthor] = useState('');
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<any | null>(null);

  // Add Stage Form State
  const [selectedMasterCode, setSelectedMasterCode] = useState('');
  const [newStageTitle, setNewStageTitle] = useState('');
  const [newStageCode, setNewStageCode] = useState('');
  const [newStageRole, setNewStageRole] = useState('Project Manager');
  const [newStageDate, setNewStageDate] = useState('');
  const [newStageWeight, setNewStageWeight] = useState('15');
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
        id: activeRemarkStage._id || activeRemarkStage.id,
        text: newRemarkText.trim(),
        authorName: newRemarkAuthor.trim() || undefined
      }).unwrap();

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
    if (!newStageTitle.trim() || !selectedProjectId) return;

    try {
      await createMilestone({
        projectId: selectedProjectId,
        title: newStageTitle.trim(),
        stageCode: newStageCode.trim() || newStageTitle.toUpperCase().replace(/\s+/g, '_'),
        leadRole: newStageRole.trim() || 'Project Manager',
        baselineDate: newStageDate ? new Date(newStageDate) : new Date(),
        weightPercent: Number(newStageWeight) || 10,
        initialRemark: newStageInitialRemark.trim()
      }).unwrap();

      setIsAddStageOpen(false);
      setSelectedMasterCode('');
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

  // Confirm Delete Stage
  const handleConfirmDeleteStage = async () => {
    if (!stageToDelete) return;
    try {
      await deleteMilestone(stageToDelete._id || stageToDelete.id).unwrap();
      dispatch(
        addToast({
          type: 'success',
          title: 'Stage Removed',
          message: `Stage '${stageToDelete.title}' has been removed.`
        })
      );
      setStageToDelete(null);
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Could not remove stage',
          message: err?.data?.message || 'Unable to delete stage right now.'
        })
      );
    }
  };

  // Handle Stage Master Dropdown Selection in Add Modal
  const handleMasterSelect = (masterCode: string) => {
    setSelectedMasterCode(masterCode);
    if (!masterCode) {
      setNewStageTitle('');
      setNewStageCode('');
      setNewStageRole('Project Manager');
      return;
    }
    const match = stageMasters.find((sm: any) => sm.stageCode === masterCode);
    if (match) {
      setNewStageTitle(match.title);
      setNewStageCode(match.stageCode);
      setNewStageRole(match.leadRole || 'Project Lead');
      if (match.defaultWeight) setNewStageWeight(String(match.defaultWeight));
    }
  };

  // Group milestones into the 4 Kanban columns
  const columns = useMemo(() => {
    const notStarted = milestones.filter(
      (m: any) => m.status === 'NOT_STARTED' || m.status === 'PENDING'
    );
    const inProgress = milestones.filter((m: any) => m.status === 'IN_PROGRESS');
    const onHold = milestones.filter(
      (m: any) => m.status === 'ON_HOLD' || m.status === 'BLOCKED'
    );
    const completed = milestones.filter((m: any) => m.status === 'COMPLETED');

    return {
      NOT_STARTED: notStarted,
      IN_PROGRESS: inProgress,
      ON_HOLD: onHold,
      COMPLETED: completed
    };
  }, [milestones]);

  const totalStages = milestones.length;
  const completedStages = columns.COMPLETED.length;
  const progressPercent =
    totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  // ==========================================
  // PROJECT HEALTH & SCHEDULE ANALYSIS ENGINE
  // ==========================================
  const projectHealth = useMemo(() => {
    const commitmentDateStr =
      selectedProject?.deliveryCommitmentDate || selectedProject?.targetDate;
    const commitmentDate = commitmentDateStr ? new Date(commitmentDateStr) : null;
    const now = new Date();

    const daysLeft = commitmentDate
      ? Math.ceil((commitmentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const overdueStages = milestones.filter((m: any) => {
      if (m.status === 'COMPLETED') return false;
      const target = m.projectedDate
        ? new Date(m.projectedDate)
        : m.baselineDate
        ? new Date(m.baselineDate)
        : null;
      return target && target.getTime() < now.getTime();
    });

    const onHoldStages = columns.ON_HOLD;
    const isCompleted = selectedProject?.status === 'COMPLETED' || (totalStages > 0 && completedStages === totalStages);

    let status: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' = 'ON_TRACK';
    let headline = 'Project is on track';
    let detail = 'All stages are progressing within target schedule windows.';

    if (isCompleted) {
      status = 'ON_TRACK';
      headline = 'Project 100% Completed';
      detail = 'All configured project milestones have been signed off successfully.';
    } else if (
      (daysLeft !== null && daysLeft < 0) ||
      overdueStages.length > 0 ||
      onHoldStages.length > 0
    ) {
      status = 'CRITICAL';
      if (daysLeft !== null && daysLeft < 0) {
        headline = `Delivery Deadline Overdue by ${Math.abs(daysLeft)} Days`;
        detail = 'PO delivery commitment date has elapsed. Expedite remaining stages immediately.';
      } else if (onHoldStages.length > 0) {
        headline = `${onHoldStages.length} Stage${onHoldStages.length > 1 ? 's' : ''} Currently On Hold`;
        detail = `Stage '${onHoldStages[0]?.title}' is blocked. Resolve bottlenecks to resume progress.`;
      } else {
        headline = `${overdueStages.length} Stage${overdueStages.length > 1 ? 's' : ''} Past Target Date`;
        detail = `Target date for '${overdueStages[0]?.title}' was missed. Adjust schedules or resource allocation.`;
      }
    } else if (daysLeft !== null && daysLeft <= 14 && progressPercent < 80) {
      status = 'AT_RISK';
      headline = `Tight Delivery Window: ${daysLeft} Days Remaining`;
      detail = `${100 - progressPercent}% remaining to finish. Monitor active stage velocity closely.`;
    } else if (columns.IN_PROGRESS.length === 0 && columns.NOT_STARTED.length > 0 && totalStages > 0) {
      status = 'AT_RISK';
      headline = 'No Active Stages In Progress';
      detail = 'Backlog stages are waiting to be initiated into progress.';
    }

    return {
      status,
      headline,
      detail,
      daysLeft,
      commitmentDate,
      overdueStages,
      onHoldStages,
      isCompleted
    };
  }, [selectedProject, milestones, columns, totalStages, completedStages, progressPercent]);

  // ==========================================
  // GANTT TIMELINE CALCULATIONS
  // ==========================================
  const ganttData = useMemo(() => {
    if (milestones.length === 0) {
      return {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalDays: 30,
        stages: [],
        todayLeftPercent: 0,
        deliveryLeftPercent: null as number | null,
        ticks: [] as { date: Date; leftPercent: number }[]
      };
    }

    // Determine timeline boundaries
    const startCandidates: number[] = [];
    const endCandidates: number[] = [];

    if (selectedProject?.startDate) {
      startCandidates.push(new Date(selectedProject.startDate).getTime());
    }
    if (selectedProject?.createdAt) {
      startCandidates.push(new Date(selectedProject.createdAt).getTime());
    }
    if (selectedProject?.deliveryCommitmentDate) {
      endCandidates.push(new Date(selectedProject.deliveryCommitmentDate).getTime());
    }
    if (selectedProject?.targetDate) {
      endCandidates.push(new Date(selectedProject.targetDate).getTime());
    }

    milestones.forEach((m: any) => {
      if (m.baselineDate) {
        const d = new Date(m.baselineDate).getTime();
        startCandidates.push(d - 5 * 24 * 60 * 60 * 1000);
        endCandidates.push(d);
      }
      if (m.projectedDate) {
        endCandidates.push(new Date(m.projectedDate).getTime());
      }
    });

    const minTs = startCandidates.length > 0 ? Math.min(...startCandidates) : Date.now();
    const maxTs = endCandidates.length > 0 ? Math.max(...endCandidates) : minTs + 30 * 24 * 60 * 60 * 1000;

    // Minimum timeline span: 21 days for good visual spread
    const safeMaxTs = maxTs <= minTs + 14 * 24 * 60 * 60 * 1000 ? minTs + 28 * 24 * 60 * 60 * 1000 : maxTs;
    const totalDuration = safeMaxTs - minTs;
    const totalDays = Math.max(14, Math.ceil(totalDuration / (1000 * 60 * 60 * 24)));

    // Process each stage into a timeline bar
    const stages = milestones.map((stage: any, index: number) => {
      const targetTs = stage.projectedDate
        ? new Date(stage.projectedDate).getTime()
        : stage.baselineDate
        ? new Date(stage.baselineDate).getTime()
        : minTs + (index + 1) * 7 * 24 * 60 * 60 * 1000;

      // Stage start estimation (from previous stage end or project start)
      let stageStartTs = minTs + index * 5 * 24 * 60 * 60 * 1000;
      if (index > 0 && milestones[index - 1]?.baselineDate) {
        stageStartTs = new Date(milestones[index - 1].baselineDate).getTime();
      }
      if (stageStartTs >= targetTs) {
        stageStartTs = Math.max(minTs, targetTs - 4 * 24 * 60 * 60 * 1000);
      }

      const leftPercent = Math.max(0, Math.min(95, ((stageStartTs - minTs) / totalDuration) * 100));
      const widthPercent = Math.max(4, Math.min(100 - leftPercent, ((targetTs - stageStartTs) / totalDuration) * 100));
      const durationDays = Math.max(1, Math.round((targetTs - stageStartTs) / (1000 * 60 * 60 * 24)));

      const isOverdue =
        stage.status !== 'COMPLETED' && targetTs < Date.now();

      return {
        ...stage,
        stageStartTs,
        targetTs,
        leftPercent,
        widthPercent,
        durationDays,
        isOverdue
      };
    });

    // Today indicator position
    const todayTs = Date.now();
    const todayLeftPercent =
      todayTs >= minTs && todayTs <= safeMaxTs
        ? ((todayTs - minTs) / totalDuration) * 100
        : todayTs < minTs
        ? 0
        : 100;

    // Delivery commitment marker position
    const deliveryCommitmentTs = selectedProject?.deliveryCommitmentDate
      ? new Date(selectedProject.deliveryCommitmentDate).getTime()
      : null;
    const deliveryLeftPercent =
      deliveryCommitmentTs && deliveryCommitmentTs >= minTs && deliveryCommitmentTs <= safeMaxTs
        ? ((deliveryCommitmentTs - minTs) / totalDuration) * 100
        : null;

    // Generate intervals for header (weekly ticks)
    const tickCount = 6;
    const ticks: { date: Date; leftPercent: number }[] = [];
    for (let i = 0; i <= tickCount; i++) {
      const ts = minTs + (totalDuration / tickCount) * i;
      ticks.push({
        date: new Date(ts),
        leftPercent: (i / tickCount) * 100
      });
    }

    return {
      startDate: new Date(minTs),
      endDate: new Date(safeMaxTs),
      totalDays,
      stages,
      todayLeftPercent,
      deliveryLeftPercent,
      ticks
    };
  }, [milestones, selectedProject]);

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. TOP BAR: PROJECT SELECTOR & METADATA CHIPS            */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full lg:w-auto">
          {/* Project Selector Dropdown */}
          <div className="w-full sm:w-80">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Select Project / Work Order
            </label>
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                disabled={isLoadingProjects || projects.length === 0}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none appearance-none pr-9 cursor-pointer transition-colors"
              >
                {projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.projectId} — {p.customerName} ({p.machineModel})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Project Metadata Snapshot */}
          {selectedProject && (
            <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200">
                  {selectedProject.projectId}
                </span>
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {selectedProject.workOrderNumber || 'WO-PENDING'}
                </span>
                {selectedProject.customerPoNumber && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    PO: {selectedProject.customerPoNumber}
                  </span>
                )}
              </div>
              <div className="text-xs font-extrabold text-slate-900 truncate max-w-md">
                {selectedProject.customerName} • {selectedProject.machineModel}
              </div>
            </div>
          )}
        </div>

        {/* Action Button: Add Stage to Current Project */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <button
            onClick={() => setIsAddStageOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all shrink-0"
          >
            <Plus size={16} />
            <span>Add Stage</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. BUTTON-TYPE VIEW SWITCHER (KANBAN / GANTT / HEALTH)     */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveView('kanban')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeView === 'kanban'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Kanban size={15} />
          <span>Kanban Board</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              activeView === 'kanban'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {totalStages}
          </span>
        </button>

        <button
          onClick={() => setActiveView('gantt')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeView === 'gantt'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <CalendarRange size={15} />
          <span>Gantt Chart</span>
        </button>

        <button
          onClick={() => setActiveView('health')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeView === 'health'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Activity size={15} />
          <span>Health & Schedule Details</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 4. MAIN WORKSPACE VIEW ROUTING                            */}
      {/* ======================================================== */}
      {isLoadingMilestones ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-xs text-slate-500">
          Loading project stages for {selectedProjectId}...
        </div>
      ) : milestones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Kanban size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-extrabold text-slate-800">
            No Department Stages Configured for this Project
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            This project currently has no department stages initialized. Click below to add your first stage, or configure stages when creating a project.
          </p>
          <button
            onClick={() => setIsAddStageOpen(true)}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all"
          >
            <Plus size={16} /> Add First Stage
          </button>
        </div>
      ) : activeView === 'kanban' ? (
        /* ====================================================== */
        /* VIEW 1: KANBAN BOARD                                   */
        /* ====================================================== */
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

            <div className="p-3 space-y-3 min-h-[420px]">
              {columns.NOT_STARTED.map((m: any) => renderStageCard(m, 'NOT_STARTED'))}
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

            <div className="p-3 space-y-3 min-h-[420px]">
              {columns.IN_PROGRESS.map((m: any) => renderStageCard(m, 'IN_PROGRESS'))}
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

            <div className="p-3 space-y-3 min-h-[420px]">
              {columns.ON_HOLD.map((m: any) => renderStageCard(m, 'ON_HOLD'))}
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

            <div className="p-3 space-y-3 min-h-[420px]">
              {columns.COMPLETED.map((m: any) => renderStageCard(m, 'COMPLETED'))}
              {columns.COMPLETED.length === 0 && renderEmptyColumn('No completed stages')}
            </div>
          </div>
        </div>
      ) : activeView === 'gantt' ? (
        /* ====================================================== */
        /* VIEW 2: GANTT CHART TIMELINE                           */
        /* ====================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Gantt Header Banner */}
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <CalendarRange size={16} className="text-orange-500" />
                <span>Project Schedule & Milestone Gantt Timeline</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Displaying only the {totalStages} stages configured for Work Order {selectedProject?.workOrderNumber || selectedProjectId}.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-slate-600">In Progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-600">On Hold / Overdue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="text-slate-600">Not Started</span>
              </div>
            </div>
          </div>

          {/* Interactive Gantt Timeline Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Timeline Time Scale Header */}
              <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 py-2.5 px-4">
                <div className="col-span-4 uppercase tracking-wider text-slate-500">
                  Department Stage
                </div>
                <div className="col-span-8 relative flex items-center justify-between text-slate-500 font-mono text-[10px]">
                  {ganttData.ticks.map((tick, i) => (
                    <span key={i} className="truncate">
                      {tick.date.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stage Rows */}
              <div className="divide-y divide-slate-100 relative">
                {/* Vertical "Today" Line Marker */}
                {ganttData.todayLeftPercent >= 0 && ganttData.todayLeftPercent <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 flex flex-col items-center"
                    style={{ left: `calc(33.333% + (66.666% * ${ganttData.todayLeftPercent / 100}))` }}
                  >
                    <div className="w-0.5 h-full bg-orange-500/70 border-r border-orange-400" />
                    <span className="absolute -top-3 text-[9px] font-extrabold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded border border-orange-300">
                      Today
                    </span>
                  </div>
                )}

                {/* Vertical "Delivery Commitment" Marker */}
                {ganttData.deliveryLeftPercent !== null &&
                  ganttData.deliveryLeftPercent >= 0 &&
                  ganttData.deliveryLeftPercent <= 100 && (
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-10 flex flex-col items-center"
                      style={{
                        left: `calc(33.333% + (66.666% * ${ganttData.deliveryLeftPercent / 100}))`
                      }}
                    >
                      <div className="w-0.5 h-full bg-emerald-600/80 border-r border-emerald-500 border-dashed" />
                      <span className="absolute -top-3 text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                        Commitment
                      </span>
                    </div>
                  )}

                {ganttData.stages.map((stage: any, index: number) => {
                  const isDone = stage.status === 'COMPLETED';
                  const isInProg = stage.status === 'IN_PROGRESS';
                  const isOnHold = stage.status === 'ON_HOLD' || stage.status === 'BLOCKED';

                  const barBg = isDone
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : isOnHold || stage.isOverdue
                    ? 'bg-red-500 hover:bg-red-600'
                    : isInProg
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-slate-300 hover:bg-slate-400';

                  return (
                    <div
                      key={stage._id || index}
                      className="grid grid-cols-12 items-center py-3.5 px-4 hover:bg-slate-50 transition-colors group"
                    >
                      {/* Left: Stage Information */}
                      <div className="col-span-4 pr-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                            #{stage.order || index + 1}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900 truncate">
                            {stage.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="truncate">{stage.leadRole}</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {stage.baselineDate
                              ? new Date(stage.baselineDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short'
                                })
                              : 'TBD'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Gantt Timeline Bar */}
                      <div className="col-span-8 relative py-2">
                        {/* Background guide track */}
                        <div className="w-full h-7 bg-slate-100/70 rounded-lg relative overflow-hidden">
                          {/* Active Stage Bar */}
                          <div
                            className={`absolute top-0 bottom-0 rounded-lg ${barBg} text-white text-[10px] font-bold flex items-center px-2.5 transition-all shadow-xs cursor-pointer truncate`}
                            style={{
                              left: `${stage.leftPercent}%`,
                              width: `${stage.widthPercent}%`
                            }}
                            title={`${stage.title} — ${stage.durationDays} days (${stage.status.replace(
                              /_/g,
                              ' '
                            )})`}
                          >
                            <span className="truncate">
                              {stage.durationDays}d • {stage.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ====================================================== */
        /* VIEW 3: HEALTH & SCHEDULE DETAILS                      */
        /* ====================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-6 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Activity size={16} className="text-orange-500" />
                <span>Project Health & Schedule Variance Analysis</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Complete audit of planned target dates, current stage execution, and delivery commitment milestones.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Overall Assessment:</span>
              <span
                className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${
                  projectHealth.status === 'CRITICAL'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : projectHealth.status === 'AT_RISK'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {projectHealth.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Action Recommendations Box */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              projectHealth.status === 'CRITICAL'
                ? 'bg-red-50/70 border-red-200 text-red-900'
                : projectHealth.status === 'AT_RISK'
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="p-1 rounded-lg shrink-0 mt-0.5">
              {projectHealth.status === 'CRITICAL' ? (
                <ShieldAlert size={18} className="text-red-600" />
              ) : projectHealth.status === 'AT_RISK' ? (
                <Clock size={18} className="text-amber-600" />
              ) : (
                <ShieldCheck size={18} className="text-emerald-600" />
              )}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold">{projectHealth.headline}</div>
              <p className="text-xs leading-relaxed opacity-90">{projectHealth.detail}</p>
            </div>
          </div>

          {/* Detailed Stages Audit Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Stage Name</th>
                  <th className="py-3 px-4">Lead Role</th>
                  <th className="py-3 px-4">Target Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Variance / Health</th>
                  <th className="py-3 px-4 text-right">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {milestones.map((stage: any, index: number) => {
                  const target = stage.projectedDate
                    ? new Date(stage.projectedDate)
                    : stage.baselineDate
                    ? new Date(stage.baselineDate)
                    : null;
                  const isDone = stage.status === 'COMPLETED';
                  const isOverdue = !isDone && target && target.getTime() < Date.now();
                  const isOnHold = stage.status === 'ON_HOLD' || stage.status === 'BLOCKED';

                  return (
                    <tr key={stage._id || index} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">
                        #{stage.order || index + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {stage.title}
                        {stage.notes && (
                          <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                            {stage.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{stage.leadRole}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {target
                          ? target.toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'TBD'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isOnHold
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : stage.status === 'IN_PROGRESS'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {stage.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {isDone ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} /> Completed
                          </span>
                        ) : isOnHold ? (
                          <span className="text-red-700 font-bold flex items-center gap-1">
                            <PauseCircle size={13} /> Blocked / On Hold
                          </span>
                        ) : isOverdue ? (
                          <span className="text-red-700 font-bold flex items-center gap-1">
                            <AlertTriangle size={13} /> Target Date Elapsed
                          </span>
                        ) : (
                          <span className="text-slate-600">Tracking to Target</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setActiveRemarkStage(stage)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:underline"
                        >
                          <MessageSquare size={13} />
                          <span>{stage.remarks?.length || 0}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. REMARKS DRAWER / MODAL                                 */}
      {/* ======================================================== */}
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
              {!activeRemarkStage.remarks || activeRemarkStage.remarks.length === 0 ? (
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
            <form
              onSubmit={handleAddRemarkSubmit}
              className="p-4 bg-white border-t border-slate-200 space-y-3 shrink-0"
            >
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
                  placeholder="Enter remark or status update..."
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

      {/* ======================================================== */}
      {/* 6. ADD STAGE TO PROJECT MODAL                            */}
      {/* ======================================================== */}
      {isAddStageOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Standard Crisp White Ribbon Header with Amber Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Add Stage to Project
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedProjectId} • {selectedProject?.customerName}
                  </p>
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
              {/* Predefined Master Stage Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Choose from Predefined Stage Master (Optional)
                </label>
                <select
                  value={selectedMasterCode}
                  onChange={(e) => handleMasterSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="">-- Custom Stage (Enter details manually) --</option>
                  {stageMasters.map((sm: any) => (
                    <option key={sm.stageCode} value={sm.stageCode}>
                      {sm.title} ({sm.stageCode}) — {sm.leadRole}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Stage Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mechanical Assembly & Pneumatics"
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
                    placeholder="e.g. MECH_ASSEMBLY"
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
                    placeholder="e.g. Assembly Supervisor"
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
                  Initial Remark or Note
                </label>
                <textarea
                  rows={2}
                  placeholder="Scope notes, special customer requirements..."
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

      {/* ======================================================== */}
      {/* 7. DELETE STAGE CONFIRMATION DIALOG                       */}
      {/* ======================================================== */}
      {stageToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Delete Stage?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove &apos;{stageToDelete.title}&apos; from this project?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
              Once removed, this stage and any logged remarks will be permanently deleted from Work Order {selectedProjectId}. Project progress will be recalculated automatically.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStageToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={isDeletingStage}
                onClick={handleConfirmDeleteStage}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs shadow-red-600/20 transition-all disabled:opacity-50"
              >
                {isDeletingStage ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to render a single stage card inside a Kanban column
  function renderStageCard(stage: any, currentColumnKey: string) {
    const remarksCount = stage.remarks?.length || 0;
    const target = stage.projectedDate
      ? new Date(stage.projectedDate)
      : stage.baselineDate
      ? new Date(stage.baselineDate)
      : null;
    const isDone = stage.status === 'COMPLETED';
    const isOverdue = !isDone && target && target.getTime() < Date.now();

    return (
      <div
        key={stage._id || stage.id}
        className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs hover:shadow-md transition-all space-y-2.5 relative group"
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

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400">
              {stage.weightPercent || 10}% wt
            </span>
            <button
              onClick={() => setStageToDelete(stage)}
              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1 rounded transition-opacity"
              title="Delete Stage"
            >
              <Trash2 size={12} />
            </button>
          </div>
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
            <Calendar
              size={12}
              className={isOverdue ? 'text-red-500' : 'text-slate-400'}
            />
            <span
              className={`font-mono text-[10px] ${
                isOverdue ? 'font-bold text-red-600' : 'text-slate-600'
              }`}
            >
              {target
                ? target.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })
                : 'TBD'}
            </span>
            {isOverdue && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-red-100 text-red-700">
                Overdue
              </span>
            )}
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
            <span>
              {remarksCount} remark{remarksCount === 1 ? '' : 's'}
            </span>
          </button>

          {/* Quick Move Selector */}
          <div className="relative">
            <select
              value={currentColumnKey}
              onChange={(e) => handleMoveStage(stage._id || stage.id, e.target.value)}
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
