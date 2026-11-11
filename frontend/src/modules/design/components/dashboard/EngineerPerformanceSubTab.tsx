'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  RotateCcw,
  Eye,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import DesignDashboardHeader from './DesignDashboardHeader';
import { useGetEngineerPerformanceQuery } from '../../api/designDashboardApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../../components/ui/ExcelColumnFilter';

export default function EngineerPerformanceSubTab() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeReportView, setActiveReportView] = useState<
    'ranking' | 'allocation' | 'hours' | 'pending' | 'completed' | 'monthly'
  >('ranking');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewTask, setPreviewTask] = useState<any | null>(null);

  // Column filters state
  const [columnFilters, setColumnFilters] = useState<Record<string, string[] | null>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const { data, isLoading } = useGetEngineerPerformanceQuery(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  const engineers = useMemo(() => data?.engineers || [], [data]);
  const rankings = useMemo(() => data?.rankings || [], [data]);
  const allocations = useMemo(() => data?.allocations || [], [data]);
  const pendingTasks = useMemo(() => data?.pendingTasks || [], [data]);
  const completedTasks = useMemo(() => data?.completedTasks || [], [data]);
  const monthlyReports = useMemo(() => data?.monthlyReports || [], [data]);

  // Aggregate KPI metrics
  const totalEngineers = engineers.length;
  const totalTasks = allocations.length;
  const totalCompleted = completedTasks.length;
  const totalPending = pendingTasks.length;
  const totalAllotted = allocations.reduce((sum: number, a: any) => sum + (a.estimatedHours || 0), 0);
  const totalActual = allocations.reduce((sum: number, a: any) => sum + (a.actualHours || 0), 0);

  // Active dataset depending on active report view
  const currentDataset = useMemo(() => {
    switch (activeReportView) {
      case 'ranking':
        return rankings;
      case 'allocation':
        return allocations;
      case 'hours':
        return allocations;
      case 'pending':
        return pendingTasks;
      case 'completed':
        return completedTasks;
      case 'monthly':
        return monthlyReports;
      default:
        return rankings;
    }
  }, [activeReportView, rankings, allocations, pendingTasks, completedTasks, monthlyReports]);

  // Handle column filtering & search
  const filteredData = useMemo(() => {
    let result = [...currentDataset];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((item: any) =>
        Object.values(item).some((val) =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        )
      );
    }

    Object.entries(columnFilters).forEach(([colKey, selectedVals]) => {
      if (selectedVals && selectedVals.length > 0) {
        result = result.filter((item: any) => {
          const val = String(item[colKey] || '(Blanks)');
          return selectedVals.includes(val);
        });
      }
    });

    if (sortConfig) {
      result.sort((a: any, b: any) => {
        const valA = a[sortConfig.key] ?? '';
        const valB = b[sortConfig.key] ?? '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [currentDataset, searchTerm, columnFilters, sortConfig]);

  const hasActiveFilters = searchTerm.trim().length > 0 || Object.keys(columnFilters).length > 0 || sortConfig !== null;

  const resetAllFilters = () => {
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig(null);
  };

  const handleFilterChange = (columnKey: string, selected: string[] | null) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!selected || selected.length === 0) {
        delete next[columnKey];
      } else {
        next[columnKey] = selected;
      }
      return next;
    });
  };

  const getDistinctValues = (columnKey: string): DistinctValueItem[] => {
    const map: Record<string, number> = {};
    currentDataset.forEach((item: any) => {
      const val = String(item[columnKey] || '(Blanks)');
      map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Module Sub-Tabs & Project Filter */}
      <DesignDashboardHeader
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
      />

      {/* KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">Design Engineers</span>
            <Users size={16} className="text-orange-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">{totalEngineers}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">Total Tasks</span>
            <Layers size={16} className="text-sky-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">{totalTasks}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">Completed</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold text-emerald-600">{totalCompleted}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">Pending Tasks</span>
            <AlertCircle size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-amber-600">{totalPending}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">Allotted Hours</span>
            <Clock size={16} className="text-indigo-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">{totalAllotted}h</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">Actual Logged</span>
            <TrendingUp size={16} className="text-orange-500" />
          </div>
          <div className="text-xl font-extrabold text-orange-600">{totalActual}h</div>
        </div>
      </div>

      {/* Report Switcher (Button-Type Tabs) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center gap-2">
        {[
          { key: 'ranking', label: 'Performance Ranking', icon: Award, count: rankings.length },
          { key: 'allocation', label: 'Work Allocation', icon: Users, count: allocations.length },
          { key: 'hours', label: 'Allotted vs Actual Hours', icon: Clock, count: allocations.length },
          { key: 'pending', label: 'Pending Tasks', icon: AlertCircle, count: pendingTasks.length },
          { key: 'completed', label: 'Completed Tasks', icon: CheckCircle2, count: completedTasks.length },
          { key: 'monthly', label: 'Monthly Work Report', icon: FileSpreadsheet, count: monthlyReports.length }
        ].map((btn) => {
          const Icon = btn.icon;
          const isActive = activeReportView === btn.key;
          return (
            <button
              key={btn.key}
              onClick={() => {
                setActiveReportView(btn.key as any);
                setColumnFilters({});
                setSortConfig(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Icon size={14} />
              <span>{btn.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {btn.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Table Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search report..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
          />
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all self-end sm:self-auto"
          >
            <RotateCcw size={13} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-500 font-medium">
            Loading engineer performance data...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-16 text-center">
            <Users size={36} className="mx-auto text-slate-300 mb-2" />
            <div className="text-xs font-bold text-slate-800">No records found</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {hasActiveFilters ? 'Try adjusting your search or filters.' : 'No design tasks have been logged yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeReportView === 'ranking' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 w-16">Rank</th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Engineer"
                        columnKey="engineerName"
                        distinctValues={getDistinctValues('engineerName')}
                        selectedValues={columnFilters['engineerName'] || null}
                        onFilterChange={(selected) => handleFilterChange('engineerName', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Role"
                        columnKey="role"
                        distinctValues={getDistinctValues('role')}
                        selectedValues={columnFilters['role'] || null}
                        onFilterChange={(selected) => handleFilterChange('role', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4 text-center">Assigned</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                    <th className="py-3 px-4 text-center">Pending</th>
                    <th className="py-3 px-4 text-center">On-Time %</th>
                    <th className="py-3 px-4 text-center">Allotted / Actual</th>
                    <th className="py-3 px-4 text-center">Efficiency %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((eng: any) => (
                    <tr key={eng.engineerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-mono text-xs font-extrabold ${
                            eng.rank === 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : eng.rank === 2
                              ? 'bg-slate-200 text-slate-800'
                              : eng.rank === 3
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          #{eng.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{eng.engineerName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{eng.engineerEmail}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{eng.role}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{eng.tasksAssigned}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600">{eng.tasksCompleted}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-600">{eng.tasksPending}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {eng.onTimeRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {eng.allottedHours}h / {eng.actualHours}h
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                          {eng.efficiencyPercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {(activeReportView === 'allocation' ||
              activeReportView === 'hours' ||
              activeReportView === 'pending' ||
              activeReportView === 'completed') && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Project"
                        columnKey="projectId"
                        distinctValues={getDistinctValues('projectId')}
                        selectedValues={columnFilters['projectId'] || null}
                        onFilterChange={(selected) => handleFilterChange('projectId', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Task / Sub-Stage"
                        columnKey="title"
                        distinctValues={getDistinctValues('title')}
                        selectedValues={columnFilters['title'] || null}
                        onFilterChange={(selected) => handleFilterChange('title', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Engineer"
                        columnKey="assignedToUserName"
                        distinctValues={getDistinctValues('assignedToUserName')}
                        selectedValues={columnFilters['assignedToUserName'] || null}
                        onFilterChange={(selected) => handleFilterChange('assignedToUserName', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Priority"
                        columnKey="priority"
                        distinctValues={getDistinctValues('priority')}
                        selectedValues={columnFilters['priority'] || null}
                        onFilterChange={(selected) => handleFilterChange('priority', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4 text-center">Allotted</th>
                    <th className="py-3 px-4 text-center">Actual</th>
                    <th className="py-3 px-4 text-center">Variance</th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Status"
                        columnKey="status"
                        distinctValues={getDistinctValues('status')}
                        selectedValues={columnFilters['status'] || null}
                        onFilterChange={(selected) => handleFilterChange('status', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((task: any, idx: number) => {
                    const variance = (task.estimatedHours || 0) - (task.actualHours || 0);
                    return (
                      <tr key={task.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-orange-600">{task.projectId}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>{task.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{task.subStageCode}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {task.assignedToUserName || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              task.priority === 'CRITICAL'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : task.priority === 'HIGH'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {task.priority || 'MEDIUM'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                          {task.estimatedHours || 0}h
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                          {task.actualHours || 0}h
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-extrabold">
                          {variance >= 0 ? (
                            <span className="text-emerald-700">+{variance}h</span>
                          ) : (
                            <span className="text-red-700">{variance}h</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              task.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : task.status === 'IN_PROGRESS'
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {task.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setPreviewTask(task)}
                            className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeReportView === 'monthly' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4 text-center">Tasks Allocated</th>
                    <th className="py-3 px-4 text-center">Tasks Completed</th>
                    <th className="py-3 px-4 text-center">Completion Rate %</th>
                    <th className="py-3 px-4 text-center">Allotted Hours</th>
                    <th className="py-3 px-4 text-center">Actual Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((m: any) => {
                    const rate =
                      m.tasksAllocated > 0
                        ? Math.round((m.tasksCompleted / m.tasksAllocated) * 100)
                        : 0;
                    return (
                      <tr key={m.monthKey} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{m.monthLabel}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                          {m.tasksAllocated}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600">
                          {m.tasksCompleted}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                            {rate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-700">
                          {m.totalAllottedHours}h
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-700">
                          {m.totalActualHours}h
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Task Preview Dossier Modal */}
      {previewTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-sm font-extrabold">Task Dossier</h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {previewTask.projectId} • {previewTask.subStageCode}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewTask(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Task Title
                </label>
                <div className="text-sm font-extrabold text-slate-900">{previewTask.title}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500">Assigned Engineer</div>
                  <div className="text-xs font-bold text-slate-900">
                    {previewTask.assignedToUserName || 'Unassigned'}
                  </div>
                  <div className="text-[10px] text-slate-400">{previewTask.assignedToUserEmail}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500">Execution Status</div>
                  <div className="text-xs font-bold text-slate-900">{previewTask.status}</div>
                  <div className="text-[10px] text-slate-500">Priority: {previewTask.priority}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-500">Allotted Hours</div>
                  <div className="text-sm font-extrabold text-slate-900">{previewTask.estimatedHours || 0}h</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-500">Actual Hours</div>
                  <div className="text-sm font-extrabold text-slate-900">{previewTask.actualHours || 0}h</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-500">Progress</div>
                  <div className="text-sm font-extrabold text-orange-600">{previewTask.completionPercent || 0}%</div>
                </div>
              </div>

              {/* Universal Action Tracking Audit Card */}
              <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Created By</div>
                  <div className="font-bold text-slate-900">{previewTask.createdByName || 'System'}</div>
                  <div className="text-[10px] text-slate-400">
                    {previewTask.createdAt ? new Date(previewTask.createdAt).toLocaleString('en-IN') : '-'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Last Updated</div>
                  <div className="font-bold text-slate-900">{previewTask.updatedByName || previewTask.createdByName || 'System'}</div>
                  <div className="text-[10px] text-slate-400">
                    {previewTask.updatedAt ? new Date(previewTask.updatedAt).toLocaleString('en-IN') : '-'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
              <button
                onClick={() => setPreviewTask(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
