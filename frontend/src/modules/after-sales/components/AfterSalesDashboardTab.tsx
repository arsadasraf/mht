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
  Headphones,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { useGetProjectsQuery } from '../../project-setup/api/projectApi';
import { useGetAfterSalesSubStagesQuery, useGetAfterSalesTeamQuery, useGetServiceTicketsQuery } from '../api/afterSalesApi';

export default function AfterSalesDashboardTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEngineer, setSelectedEngineer] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({
    departmentModule: 'after-sales'
  });
  const { data: subStagesData } = useGetAfterSalesSubStagesQuery();
  const { data: teamData } = useGetAfterSalesTeamQuery();
  const { data: ticketsData } = useGetServiceTicketsQuery(undefined);

  const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const masterSubStages = useMemo(() => subStagesData?.subStages || [], [subStagesData]);
  const teamMembers = useMemo(() => teamData?.members || [], [teamData]);
  const ticketsList = useMemo(() => ticketsData?.tickets || [], [ticketsData]);

  // Map Projects with real or synthesized After-Sales Milestone sub-stages for visual checklist
  const projectsList = useMemo(() => {
    return rawProjects.map((p: any, idx: number) => {
      // Find after-sales milestone or fallback to first
      const milestones = p.milestones || [];
      const afterSalesMilestone =
        milestones.find(
          (m: any) =>
            m.departmentModule?.toLowerCase() === 'after-sales' ||
            m.stage?.toLowerCase().includes('service') ||
            m.stage?.toLowerCase().includes('after') ||
            m.title?.toLowerCase().includes('service')
        ) || milestones[0];

      const attachedSubStages = afterSalesMilestone?.subStages || [];

      // Determine task checkpoints list (from attached subStages, or mapped from Master SubStages)
      let taskList: any[] = [];
      if (attachedSubStages.length > 0) {
        taskList = attachedSubStages.map((s: any) => ({
          id: s.id,
          title: s.title || s.subStageCode || 'Service Stage',
          status: s.status || 'PENDING'
        }));
      } else if (masterSubStages.length > 0) {
        taskList = masterSubStages.map((m: any, mIdx: number) => {
          let s = 'PENDING';
          if (p.status === 'COMPLETED' || p.status === 'COMMISSIONED' || p.status === 'HANDED_OVER') {
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
          { id: '1', title: 'Unloading & Leveling', status: p.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS' },
          { id: '2', title: 'Power-Up & Parameter Tuning', status: p.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING' },
          { id: '3', title: 'Trial Winding Run', status: p.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING' },
          { id: '4', title: 'Operator Training', status: p.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING' },
          { id: '5', title: 'Customer Handover Sign-off', status: p.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING' }
        ];
      }

      // Calculate progress percentage
      const completedCount = taskList.filter((t) => t.status === 'COMPLETED').length;
      const progress =
        taskList.length > 0
          ? Math.round((completedCount / taskList.length) * 100)
          : Number(p.progressPercent || 0);

      // Engineer / Lead assignment
      const engineerName =
        p.leadServiceEngineerName ||
        p.leadFieldEngineerName ||
        (teamMembers.length > 0 ? teamMembers[idx % teamMembers.length].fullName : 'Unassigned');

      // Status calculation: Commissioning, On Hold, Under Warranty, AMC Active
      let finalStatus: 'Commissioning' | 'On Hold' | 'Under Warranty' | 'Delayed' = 'Commissioning';
      if (
        p.status === 'COMPLETED' ||
        p.status === 'COMMISSIONED' ||
        p.status === 'HANDED_OVER' ||
        progress >= 100
      ) {
        finalStatus = 'Under Warranty';
      } else if (p.status === 'ON_HOLD' || p.status === 'SITE_HOLD') {
        finalStatus = 'On Hold';
      } else if (
        p.status === 'DELAYED' ||
        (p.targetHandoverDate && new Date(p.targetHandoverDate).getTime() < Date.now())
      ) {
        finalStatus = 'Delayed';
      } else {
        finalStatus = 'Commissioning';
      }

      return {
        id: p.id,
        workOrderNumber: p.workOrderNumber || p.projectId,
        projectName: p.projectName,
        customerName: p.customerName || 'Customer',
        machineModel: p.machineModel || 'Standard Winder',
        engineer: engineerName,
        taskList,
        progress,
        status: finalStatus,
        remarks:
          p.notes ||
          (finalStatus === 'Under Warranty'
            ? 'Handover signed off • Warranty active'
            : finalStatus === 'On Hold'
            ? 'Awaiting customer civil/power clearance'
            : 'On-site installation & tuning in progress')
      };
    });
  }, [rawProjects, masterSubStages, teamMembers]);

  // Metric KPI Counts
  const totalProjects = projectsList.length;
  const commissioningCount = projectsList.filter((p) => p.status === 'Commissioning').length;
  const onHoldCount = projectsList.filter((p) => p.status === 'On Hold').length;
  const warrantyCount = projectsList.filter((p) => p.status === 'Under Warranty').length;
  const delayedCount = projectsList.filter((p) => p.status === 'Delayed').length;
  const openTicketsCount = ticketsList.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  // Filtered List for Table
  const filteredProjects = useMemo(() => {
    return projectsList.filter((p) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const wo = p.workOrderNumber.toLowerCase();
        const name = p.projectName.toLowerCase();
        const cust = p.customerName.toLowerCase();
        const eng = p.engineer.toLowerCase();
        if (!wo.includes(q) && !name.includes(q) && !cust.includes(q) && !eng.includes(q)) {
          return false;
        }
      }
      if (selectedEngineer !== 'ALL' && p.engineer !== selectedEngineer) return false;
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      return true;
    });
  }, [projectsList, searchTerm, selectedEngineer, statusFilter]);

  // Engineer Workload Bar Chart Data
  const engineerWorkload = useMemo(() => {
    const map: Record<string, number> = {};
    projectsList.forEach((p) => {
      if (p.engineer && p.engineer !== 'Unassigned') {
        map[p.engineer] = (map[p.engineer] || 0) + 1;
      }
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [projectsList]);

  // Task Status Breakdown
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

    const defaultCheckpoints = [
      'Unloading & Leveling',
      'Power-Up & Tuning',
      'Trial Winding Run',
      'Operator Training',
      'Customer Sign-off'
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
      {/* Top Banner Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">After Sales & Service Dashboard</h1>
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
            <option value="Commissioning">Commissioning</option>
            <option value="On Hold">On Hold</option>
            <option value="Under Warranty">Under Warranty</option>
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
            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Field Projects</p>
          </div>
        </div>

        {/* Active Commissioning */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/20 shrink-0">
            <Play className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 leading-none">{commissioningCount}</p>
            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Commissioning</p>
          </div>
        </div>

        {/* Under Warranty */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 leading-none">{warrantyCount}</p>
            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Under Warranty</p>
          </div>
        </div>

        {/* Open Claims & Tickets */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-xs shadow-red-500/20 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 leading-none">{openTicketsCount}</p>
            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Open Tickets</p>
          </div>
        </div>

        {/* Field Engineers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-xs shadow-sky-500/20 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 leading-none">{teamMembers.length}</p>
            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Field Engineers</p>
          </div>
        </div>
      </div>

      {/* Analytics Split: Status Breakdown & Field Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Checkpoint Progress Across Projects */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            Service Milestones Completion
          </h2>
          <div className="space-y-3">
            {taskStatusBreakdown.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="truncate">{item.title}</span>
                  <span className="font-mono text-slate-500">{item.done}/{item.total} ({item.percent}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${item.color} transition-all duration-300`} style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Field Engineer Allocation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-sky-500" />
            Field Engineer Assignments
          </h2>
          {engineerWorkload.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No field engineers currently assigned.
            </div>
          ) : (
            <div className="space-y-3">
              {engineerWorkload.map((eng, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-800">{eng.name}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    {eng.count} Projects
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Projects Checklist & Service Tracker Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900">Field Service Work Orders</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
              {filteredProjects.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search work order, customer, model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500 w-64"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <Link
              href="/after-sales/projects"
              className="px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors shadow-xs"
            >
              Manage Projects
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-4 py-3">Work Order #</th>
                <th className="px-4 py-3">Customer & Model</th>
                <th className="px-4 py-3">Field Engineer</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingProjects ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading after sales work orders...
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Headphones className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No field work orders found</p>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold font-mono text-orange-600">{p.workOrderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{p.customerName}</div>
                      <div className="text-[11px] text-slate-500">{p.machineModel}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.engineer}</td>
                    <td className="px-4 py-3">
                      <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden mb-1">
                        <div
                          className={`h-full ${p.progress >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-600">{p.progress}%</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          p.status === 'Under Warranty'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.status === 'On Hold'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] max-w-xs truncate">{p.remarks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
