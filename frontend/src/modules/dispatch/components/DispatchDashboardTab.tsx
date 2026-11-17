'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  RotateCcw,
  UserCheck,
  ChevronRight,
  TrendingUp,
  X,
  ExternalLink,
  Wrench,
  Check,
  Calendar,
  Layers,
  Sparkles,
  Truck,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { useGetProjectsQuery } from '../../project-setup/api/projectApi';
import { useGetDispatchSubStagesQuery, useGetDispatchTeamQuery } from '../api/dispatchApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

export default function DispatchDashboardTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInspector, setSelectedInspector] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({
    departmentModule: 'dispatch'
  });
  const { data: subStagesData } = useGetDispatchSubStagesQuery();
  const { data: teamData } = useGetDispatchTeamQuery();

  const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const masterSubStages = useMemo(() => subStagesData?.subStages || [], [subStagesData]);
  const teamMembers = useMemo(() => teamData?.members || [], [teamData]);

  // Map Projects with real or synthesized Dispatch / Trial Milestone sub-stages for visual checklist
  const projectsList = useMemo(() => {
    return rawProjects.map((p: any, idx: number) => {
      // Find dispatch milestone or fallback to first
      const milestones = p.milestones || [];
      const dispatchMilestone =
        milestones.find(
          (m: any) =>
            m.departmentModule?.toLowerCase() === 'dispatch' ||
            m.stage?.toLowerCase().includes('dispatch') ||
            m.stage?.toLowerCase().includes('trial') ||
            m.title?.toLowerCase().includes('dispatch')
        ) || milestones[0];

      const attachedSubStages = dispatchMilestone?.subStages || [];

      // Determine task checkpoints list (from attached subStages, or mapped from Master SubStages)
      let taskList: any[] = [];
      if (attachedSubStages.length > 0) {
        taskList = attachedSubStages.map((s: any) => ({
          id: s.id,
          title: s.title || s.subStageCode || 'Inspection Stage',
          status: s.status || 'PENDING'
        }));
      } else if (masterSubStages.length > 0) {
        taskList = masterSubStages.map((m: any, mIdx: number) => {
          let s = 'PENDING';
          if (p.status === 'COMPLETED' || p.status === 'GATE_PASS_UNLOCKED' || p.status === 'DISPATCHED') {
            s = 'COMPLETED';
          } else if (p.status === 'DELAYED' && mIdx === 0) {
            s = 'DELAYED';
          } else if (mIdx === 0) {
            s = 'COMPLETED';
          } else if (mIdx === 1) {
            s = 'IN_PROGRESS';
          }
          return {
            id: m.id || `m-${mIdx}`,
            title: m.subStageName || m.name || m.subStageCode,
            status: s
          };
        });
      } else {
        // Fallback default checkpoints
        taskList = [
          { id: '1', title: 'Dry Run Trial', status: p.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS' },
          { id: '2', title: 'Electrical Safety', status: p.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING' },
          { id: '3', title: 'PDI Final Inspection', status: p.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING' },
          { id: '4', title: 'Zero-Snag Clearance', status: p.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING' },
          { id: '5', title: 'Gate Pass & Loading', status: p.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING' }
        ];
      }

      // Calculate progress percentage
      const completedCount = taskList.filter((t) => t.status === 'COMPLETED').length;
      const progress =
        taskList.length > 0
          ? Math.round((completedCount / taskList.length) * 100)
          : Number(p.progressPercent || 0);

      // Inspector / Lead assignment
      const inspectorName =
        p.leadDispatchEngineerName ||
        p.leadInspectorName ||
        (teamMembers.length > 0 ? teamMembers[idx % teamMembers.length].fullName : 'Unassigned');

      // Status calculation: In Inspection, On Hold, Cleared, Delayed
      let finalStatus: 'In Inspection' | 'On Hold' | 'Cleared' | 'Delayed' = 'In Inspection';
      if (
        p.status === 'COMPLETED' ||
        p.status === 'GATE_PASS_UNLOCKED' ||
        p.status === 'DISPATCHED' ||
        progress >= 100
      ) {
        finalStatus = 'Cleared';
      } else if (p.status === 'ON_HOLD' || p.status === 'SNAG_BLOCKED' || p.status === 'PRE_DISPATCH_HOLD') {
        finalStatus = 'On Hold';
      } else if (
        p.status === 'DELAYED' ||
        (p.targetDispatchDate && new Date(p.targetDispatchDate).getTime() < Date.now())
      ) {
        finalStatus = 'Delayed';
      } else {
        finalStatus = 'In Inspection';
      }

      return {
        id: p.id,
        workOrderNumber: p.workOrderNumber || p.projectId,
        projectName: p.projectName,
        customerName: p.customerName || 'Customer',
        machineModel: p.machineModel || 'Standard Winder',
        inspector: inspectorName,
        taskList,
        progress,
        status: finalStatus,
        remarks:
          p.notes ||
          (finalStatus === 'Cleared'
            ? 'Zero-snag sign-off cleared for dispatch'
            : finalStatus === 'On Hold'
            ? 'Awaiting snag clearance'
            : 'Pre-dispatch inspection in progress')
      };
    });
  }, [rawProjects, masterSubStages, teamMembers]);

  // Metric KPI Counts
  const totalProjects = projectsList.length;
  const inInspectionCount = projectsList.filter((p) => p.status === 'In Inspection').length;
  const onHoldCount = projectsList.filter((p) => p.status === 'On Hold').length;
  const clearedCount = projectsList.filter((p) => p.status === 'Cleared').length;
  const delayedCount = projectsList.filter((p) => p.status === 'Delayed').length;

  // Filtered List for Table
  const filteredProjects = useMemo(() => {
    return projectsList.filter((p) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const wo = p.workOrderNumber.toLowerCase();
        const name = p.projectName.toLowerCase();
        const cust = p.customerName.toLowerCase();
        const insp = p.inspector.toLowerCase();
        if (!wo.includes(q) && !name.includes(q) && !cust.includes(q) && !insp.includes(q)) {
          return false;
        }
      }
      if (selectedInspector !== 'ALL' && p.inspector !== selectedInspector) return false;
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      return true;
    });
  }, [projectsList, searchTerm, selectedInspector, statusFilter]);

  // Donut chart metrics
  const statusPercents = useMemo(() => {
    if (totalProjects === 0) return { inInspection: 0, onHold: 0, cleared: 0, delayed: 0 };
    return {
      inInspection: Math.round((inInspectionCount / totalProjects) * 100),
      onHold: Math.round((onHoldCount / totalProjects) * 100),
      cleared: Math.round((clearedCount / totalProjects) * 100),
      delayed: Math.round((delayedCount / totalProjects) * 100)
    };
  }, [totalProjects, inInspectionCount, onHoldCount, clearedCount, delayedCount]);

  // Inspector Workload Bar Chart Data
  const inspectorWorkload = useMemo(() => {
    const map: Record<string, number> = {};
    projectsList.forEach((p) => {
      if (p.inspector && p.inspector !== 'Unassigned') {
        map[p.inspector] = (map[p.inspector] || 0) + 1;
      }
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [projectsList]);

  // Task Status (All Projects) Breakdown
  const taskStatusBreakdown = useMemo(() => {
    if (masterSubStages.length > 0) {
      return masterSubStages.map((m: any, idx: number) => {
        const title = m.subStageName || m.name || m.subStageCode;
        const total = totalProjects || 1;
        const done = projectsList.filter((p) => {
          const match = p.taskList.find((t: any) => t.title.toLowerCase() === title.toLowerCase());
          return match ? match.status === 'COMPLETED' : false;
        }).length;
        const colors = [
          'bg-emerald-500',
          'bg-sky-500',
          'bg-amber-500',
          'bg-purple-500',
          'bg-teal-500',
          'bg-slate-500'
        ];
        return {
          title,
          done,
          total,
          percent: Math.round((done / total) * 100),
          color: colors[idx % colors.length]
        };
      });
    }

    // Default inspection checkpoints
    const defaultCheckpoints = [
      'Dry Run Trial',
      'Electrical Safety',
      'PDI Final Inspection',
      'Zero-Snag Clearance',
      'Gate Pass & Loading'
    ];
    return defaultCheckpoints.map((cp, idx) => {
      const total = totalProjects || 1;
      const done = projectsList.filter((p) => {
        const match = p.taskList.find((t: any) => t.title.toLowerCase().includes(cp.toLowerCase()));
        return match ? match.status === 'COMPLETED' : false;
      }).length;
      const colors = ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-purple-500', 'bg-teal-500'];
      return {
        title: cp,
        done,
        total,
        percent: Math.round((done / total) * 100),
        color: colors[idx % colors.length]
      };
    });
  }, [masterSubStages, projectsList, totalProjects]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Section: Department Title + Date/Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Trials & Dispatch Dashboard</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:border-orange-500"
          >
            <option value="ALL">All Projects</option>
            <option value="In Inspection">In Inspection</option>
            <option value="On Hold">On Hold</option>
            <option value="Cleared">Cleared</option>
            <option value="Delayed">Delayed</option>
          </select>
        </div>
      </div>

      {/* 5 Plant Standard KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Projects */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-xs shadow-orange-500/20 shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 leading-none">{totalProjects}</p>
            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Total Projects</p>
          </div>
        </div>

        {/* In Inspection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20 shrink-0">
            <Play className="w-5 h-5 fill-current" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 leading-none">{inInspectionCount}</p>
            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">In Inspection</p>
          </div>
        </div>

        {/* On Hold / Snags */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/20 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 leading-none">{onHoldCount}</p>
            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">On Hold</p>
          </div>
        </div>

        {/* Dispatch Cleared */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-xs shadow-sky-500/20 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 leading-none">{clearedCount}</p>
            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Cleared</p>
          </div>
        </div>

        {/* Delayed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-xs shadow-red-500/20 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 leading-none">{delayedCount}</p>
            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Delayed</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: 70% Left Checklist Table + 30% Right Analytics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 of 12 = ~67-70%): Project List & Progress Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Header Bar (Safety Orange Header Stripe matching Plant Standard) */}
            <div className="bg-orange-500 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-orange-100" />
                <h2 className="text-sm font-extrabold tracking-tight">Inspection List & Progress</h2>
              </div>

              {/* In-header Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search project, WO or inspector..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 sm:w-60 pl-8 pr-7 py-1 text-xs font-semibold text-slate-900 bg-white rounded-lg focus:outline-hidden shadow-xs placeholder:text-slate-400"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    title="Reset search"
                    className="p-1.5 bg-orange-600 hover:bg-orange-700 rounded-lg text-white transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* High-Density Checklist Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 w-10 text-center">#</th>
                    <th className="px-3.5 py-3">Project Name / Customer</th>
                    <th className="px-3.5 py-3">Work Order No.</th>
                    <th className="px-3.5 py-3">Inspector</th>
                    <th className="px-3.5 py-3 min-w-[200px]">Inspection Work Progress (Task List)</th>
                    <th className="px-3.5 py-3 w-28">Progress</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="px-3.5 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingProjects ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                        Loading inspection projects...
                      </td>
                    </tr>
                  ) : filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Truck className="w-8 h-8 text-slate-300" />
                          <p className="text-xs font-bold text-slate-700">No inspection projects found</p>
                          <p className="text-[11px] text-slate-400">
                            Approved Work Orders entering trials or dispatch will appear here automatically.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((proj, idx) => {
                      // Status Badge Colors
                      let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                      if (proj.status === 'Cleared') {
                        badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
                      } else if (proj.status === 'In Inspection') {
                        badgeClass = 'bg-sky-50 text-sky-700 border-sky-200 font-bold';
                      } else if (proj.status === 'On Hold') {
                        badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
                      } else if (proj.status === 'Delayed') {
                        badgeClass = 'bg-red-50 text-red-700 border-red-200 font-bold';
                      }

                      // Progress Bar Color
                      let barColor = 'bg-sky-500';
                      if (proj.status === 'Cleared') barColor = 'bg-emerald-500';
                      else if (proj.status === 'On Hold') barColor = 'bg-amber-500';
                      else if (proj.status === 'Delayed') barColor = 'bg-red-500';

                      return (
                        <tr key={proj.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3.5 py-3.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>

                          {/* Project Name & Customer */}
                          <td className="px-3.5 py-3.5">
                            <span className="font-bold text-slate-900 block text-xs">{proj.projectName}</span>
                            <span className="text-[11px] text-slate-500 font-medium block">
                              {proj.customerName}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{proj.machineModel}</span>
                          </td>

                          {/* Work Order No. */}
                          <td className="px-3.5 py-3.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-700 text-xs">
                              {proj.workOrderNumber}
                            </span>
                          </td>

                          {/* Inspector */}
                          <td className="px-3.5 py-3.5 whitespace-nowrap font-medium text-slate-800">
                            {proj.inspector}
                          </td>

                          {/* Machine Work Progress (Task List with Checkpoint Dots) */}
                          <td className="px-3.5 py-3.5">
                            <div className="space-y-1">
                              {proj.taskList.map((task: any, tIdx: number) => {
                                let dot = (
                                  <span className="w-3 h-3 rounded-full border border-slate-300 bg-white inline-block shrink-0 mt-0.5" />
                                );
                                if (task.status === 'COMPLETED') {
                                  dot = (
                                    <span className="w-3 h-3 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-[8px] font-black">
                                      ✓
                                    </span>
                                  );
                                } else if (task.status === 'IN_PROGRESS') {
                                  dot = (
                                    <span className="w-3 h-3 rounded-full bg-sky-500 border border-sky-600 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                                      <span className="w-1 h-1 rounded-full bg-white"></span>
                                    </span>
                                  );
                                } else if (task.status === 'DELAYED') {
                                  dot = (
                                    <span className="w-3 h-3 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-[8px] font-black">
                                      !
                                    </span>
                                  );
                                }

                                return (
                                  <div key={task.id || tIdx} className="flex items-start gap-1.5 text-[11px]">
                                    {dot}
                                    <span
                                      className={`leading-tight ${
                                        task.status === 'COMPLETED'
                                          ? 'text-slate-800 font-medium'
                                          : task.status === 'IN_PROGRESS'
                                          ? 'text-sky-700 font-bold'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {task.title}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          {/* Progress Meter */}
                          <td className="px-3.5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                  style={{ width: `${proj.progress}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 w-8 text-right">
                                {proj.progress}%
                              </span>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="px-3.5 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${badgeClass}`}
                            >
                              {proj.status}
                            </span>
                          </td>

                          {/* Remarks */}
                          <td className="px-3.5 py-3.5">
                            <span className="text-[11px] text-slate-600 block max-w-xs">{proj.remarks}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 of 12 = ~30%): Project Status Overview Donut + Inspector Workload + Task Status Breakdown */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Project Status Overview (Donut Chart) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-orange-500 px-4 py-3 flex items-center gap-2 text-white">
              <Boxes className="w-4 h-4 text-orange-100" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider">Project Status Overview</h3>
            </div>

            <div className="p-5 flex flex-col sm:flex-row items-center justify-around gap-4">
              {/* SVG Donut */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Background Track */}
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#F1F5F9" strokeWidth="4" />
                  {/* In Inspection (Emerald / Sky) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="4"
                    strokeDasharray={`${statusPercents.inInspection} 100`}
                    strokeDashoffset="0"
                  />
                  {/* On Hold (Amber) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#F59E0B"
                    strokeWidth="4"
                    strokeDasharray={`${statusPercents.onHold} 100`}
                    strokeDashoffset={`-${statusPercents.inInspection}`}
                  />
                  {/* Cleared (Sky Blue) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#0EA5E9"
                    strokeWidth="4"
                    strokeDasharray={`${statusPercents.cleared} 100`}
                    strokeDashoffset={`-${statusPercents.inInspection + statusPercents.onHold}`}
                  />
                  {/* Delayed (Crimson) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#EF4444"
                    strokeWidth="4"
                    strokeDasharray={`${statusPercents.delayed} 100`}
                    strokeDashoffset={`-${
                      statusPercents.inInspection + statusPercents.onHold + statusPercents.cleared
                    }`}
                  />
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 leading-none">{totalProjects}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Projects</span>
                </div>
              </div>

              {/* Donut Legend */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="text-slate-600 font-medium">In Inspection</span>
                  <span className="font-bold text-slate-900 ml-auto">
                    {inInspectionCount} ({statusPercents.inInspection}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="text-slate-600 font-medium">On Hold</span>
                  <span className="font-bold text-slate-900 ml-auto">
                    {onHoldCount} ({statusPercents.onHold}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0"></span>
                  <span className="text-slate-600 font-medium">Cleared</span>
                  <span className="font-bold text-slate-900 ml-auto">
                    {clearedCount} ({statusPercents.cleared}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
                  <span className="text-slate-600 font-medium">Delayed</span>
                  <span className="font-bold text-slate-900 ml-auto">
                    {delayedCount} ({statusPercents.delayed}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Inspector Workload (Bar Chart) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-orange-500 px-4 py-3 flex items-center gap-2 text-white">
              <UserCheck className="w-4 h-4 text-orange-100" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider">Inspector Workload</h3>
            </div>

            <div className="p-5">
              {inspectorWorkload.length === 0 ? (
                <p className="text-xs text-center text-slate-400 py-4">No inspectors assigned yet.</p>
              ) : (
                <div className="flex items-end justify-around gap-2 h-40 pt-4 border-b border-slate-200">
                  {inspectorWorkload.map((eng) => {
                    const maxCount = Math.max(...inspectorWorkload.map((e) => e.count), 1);
                    const heightPercent = Math.round((eng.count / maxCount) * 100);

                    return (
                      <div key={eng.name} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <span className="text-[11px] font-bold text-slate-700">{eng.count}</span>
                        <div
                          className="w-full max-w-[40px] bg-orange-500 hover:bg-orange-600 rounded-t-lg transition-all duration-200"
                          style={{ height: `${Math.max(12, heightPercent)}%` }}
                        />
                        <span className="text-[10px] font-bold text-slate-500 truncate max-w-[65px] text-center mt-1">
                          {eng.name.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Task Status (All Projects) Meters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-orange-500 px-4 py-3 flex items-center gap-2 text-white">
              <Layers className="w-4 h-4 text-orange-100" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider">Checkpoint Status (All Projects)</h3>
            </div>

            <div className="p-5 space-y-3">
              {taskStatusBreakdown.map((item) => (
                <div key={item.title} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 truncate max-w-[170px]">{item.title}</span>
                    <span className="font-bold text-slate-800 text-[11px]">
                      {item.done} / {item.total}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${item.color}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

