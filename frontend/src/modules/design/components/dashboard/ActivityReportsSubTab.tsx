'use client';

import React, { useState, useMemo } from 'react';
import {
  Compass,
  Layers,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Eye,
  Send,
  GitPullRequest,
  FileCheck,
  Clock,
  ExternalLink,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import DesignDashboardHeader from './DesignDashboardHeader';
import { useGetActivityReportsQuery, useReleaseDrawingMutation } from '../../api/designDashboardApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../../components/ui/ExcelColumnFilter';
import ConfirmModal from '../../../../components/ui/ConfirmModal';

export default function ActivityReportsSubTab() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeReportKey, setActiveReportKey] = useState<
    'modelling' | 'drafting' | 'modifications' | 'approvals' | 'released' | 'pending' | 'dcr' | 'ecn'
  >('modelling');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  // Release confirmation state
  const [releasingDrawingId, setReleasingDrawingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Column filters state
  const [columnFilters, setColumnFilters] = useState<Record<string, string[] | null>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const { data, isLoading } = useGetActivityReportsQuery(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );
  const [releaseDrawingTrigger, { isLoading: isReleasing }] = useReleaseDrawingMutation();

  const modellingStatus = useMemo(() => data?.modellingStatus || [], [data]);
  const draftingStatus = useMemo(() => data?.draftingStatus || [], [data]);
  const modifications = useMemo(() => data?.modifications || [], [data]);
  const approvalPipeline = useMemo(() => data?.approvalPipeline || [], [data]);
  const releasedDrawings = useMemo(() => data?.releasedDrawings || [], [data]);
  const pendingDrawings = useMemo(() => data?.pendingDrawings || [], [data]);
  const dcrs = useMemo(() => data?.dcrs || [], [data]);
  const ecns = useMemo(() => data?.ecns || [], [data]);

  // Active dataset
  const currentDataset = useMemo(() => {
    switch (activeReportKey) {
      case 'modelling':
        return modellingStatus;
      case 'drafting':
        return draftingStatus;
      case 'modifications':
        return modifications;
      case 'approvals':
        return approvalPipeline;
      case 'released':
        return releasedDrawings;
      case 'pending':
        return pendingDrawings;
      case 'dcr':
        return dcrs;
      case 'ecn':
        return ecns;
      default:
        return modellingStatus;
    }
  }, [
    activeReportKey,
    modellingStatus,
    draftingStatus,
    modifications,
    approvalPipeline,
    releasedDrawings,
    pendingDrawings,
    dcrs,
    ecns
  ]);

  // Filtering & Sorting
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

  const handleExecuteRelease = async () => {
    if (!releasingDrawingId) return;
    try {
      const res = await releaseDrawingTrigger(releasingDrawingId).unwrap();
      setToastMessage(res.message || 'All set! Drawing released to shopfloor.');
      setReleasingDrawingId(null);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage('We could not release this drawing right now. Please try again.');
      setReleasingDrawingId(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <DesignDashboardHeader
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
      />

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">3D Models</div>
          <div className="text-lg font-extrabold text-slate-900 mt-0.5">{modellingStatus.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">2D Drawings</div>
          <div className="text-lg font-extrabold text-slate-900 mt-0.5">{draftingStatus.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Modifications</div>
          <div className="text-lg font-extrabold text-indigo-600 mt-0.5">{modifications.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Approvals</div>
          <div className="text-lg font-extrabold text-slate-900 mt-0.5">{approvalPipeline.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Released</div>
          <div className="text-lg font-extrabold text-emerald-600 mt-0.5">{releasedDrawings.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Awaiting Release</div>
          <div className="text-lg font-extrabold text-amber-600 mt-0.5">{pendingDrawings.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">DCR Changes</div>
          <div className="text-lg font-extrabold text-orange-600 mt-0.5">{dcrs.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">ECN Notices</div>
          <div className="text-lg font-extrabold text-purple-600 mt-0.5">{ecns.length}</div>
        </div>
      </div>

      {/* 8 Activity Report Switcher Tabs (Button-Type Pills) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center gap-2">
        {[
          { key: 'modelling', label: '3D Modelling Status', icon: Layers, count: modellingStatus.length },
          { key: 'drafting', label: '2D Drawing Status', icon: FileCode2, count: draftingStatus.length },
          { key: 'modifications', label: 'Design Modifications', icon: RotateCcw, count: modifications.length },
          { key: 'approvals', label: 'Design Approvals', icon: ShieldCheck, count: approvalPipeline.length },
          { key: 'released', label: 'Drawing Release Register', icon: FileCheck, count: releasedDrawings.length },
          { key: 'pending', label: 'Drawings Awaiting Release', icon: Clock, count: pendingDrawings.length },
          { key: 'dcr', label: 'Design Change Requests (DCR)', icon: GitPullRequest, count: dcrs.length },
          { key: 'ecn', label: 'Engineering Change Notices (ECN)', icon: AlertTriangle, count: ecns.length }
        ].map((btn) => {
          const Icon = btn.icon;
          const isActive = activeReportKey === btn.key;
          return (
            <button
              key={btn.key}
              onClick={() => {
                setActiveReportKey(btn.key as any);
                setColumnFilters({});
                setSortConfig(null);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
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

      {/* Dedicated Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search activity records..."
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

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-500 font-medium">
            Loading design activity records...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-16 text-center">
            <Compass size={36} className="mx-auto text-slate-300 mb-2" />
            <div className="text-xs font-bold text-slate-800">No records found</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {hasActiveFilters ? 'Try adjusting your search or filters.' : 'No engineering activity records logged yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 3D Modelling & 2D Drafting Views */}
            {(activeReportKey === 'modelling' || activeReportKey === 'drafting') && (
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
                        title="Drawing / Item Code"
                        columnKey={activeReportKey === 'modelling' ? 'code' : 'drawingNumber'}
                        distinctValues={getDistinctValues(activeReportKey === 'modelling' ? 'code' : 'drawingNumber')}
                        selectedValues={columnFilters[activeReportKey === 'modelling' ? 'code' : 'drawingNumber'] || null}
                        onFilterChange={(selected) => handleFilterChange(activeReportKey === 'modelling' ? 'code' : 'drawingNumber', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Title"
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
                        title="Engineer / Draftsman"
                        columnKey={activeReportKey === 'modelling' ? 'assignedTo' : 'draftsman'}
                        distinctValues={getDistinctValues(activeReportKey === 'modelling' ? 'assignedTo' : 'draftsman')}
                        selectedValues={columnFilters[activeReportKey === 'modelling' ? 'assignedTo' : 'draftsman'] || null}
                        onFilterChange={(selected) => handleFilterChange(activeReportKey === 'modelling' ? 'assignedTo' : 'draftsman', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4 text-center">Progress %</th>
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
                  {filteredData.map((item: any, idx: number) => {
                    const code = item.code || item.drawingNumber;
                    const progress = item.progress || item.draftingProgress || 0;
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-orange-600">{item.projectId}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{item.title}</td>
                        <td className="py-3 px-4 text-slate-600">{item.assignedTo || item.draftsman || 'Design Lead'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                            {progress}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              item.status === 'RELEASED' || item.status === 'COMPLETED' || item.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.status === 'IN_PROGRESS' || item.status === 'UNDER_REVIEW'
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {String(item.status).replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setPreviewItem(item)}
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

            {/* Design Modifications View */}
            {activeReportKey === 'modifications' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Drawing Number</th>
                    <th className="py-3 px-4">Revision</th>
                    <th className="py-3 px-4">Change Summary</th>
                    <th className="py-3 px-4">ECO Reference</th>
                    <th className="py-3 px-4">Modified By</th>
                    <th className="py-3 px-4">Reviewer</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((mod: any, idx: number) => (
                    <tr key={mod.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{mod.drawingNumber}</td>
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">{mod.revision}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{mod.changeSummary}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{mod.ecoNumber}</td>
                      <td className="py-3 px-4 text-slate-600">{mod.modifiedBy}</td>
                      <td className="py-3 px-4 text-slate-600">{mod.reviewerName}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {new Date(mod.createdAt).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Design Approvals View */}
            {activeReportKey === 'approvals' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Drawing No</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Submitted By</th>
                    <th className="py-3 px-4">Lead Approver</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Approval Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((app: any, idx: number) => (
                    <tr key={app.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{app.drawingNumber}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{app.title}</td>
                      <td className="py-3 px-4 font-mono text-orange-600 font-bold">{app.projectId}</td>
                      <td className="py-3 px-4 text-slate-600">{app.submittedBy}</td>
                      <td className="py-3 px-4 text-slate-600">{app.approverName}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            app.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : app.status === 'REJECTED'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{app.approvalNotes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Released Drawings View */}
            {activeReportKey === 'released' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Drawing No</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Rev</th>
                    <th className="py-3 px-4">Released By</th>
                    <th className="py-3 px-4">Release Date</th>
                    <th className="py-3 px-4">Distribution</th>
                    <th className="py-3 px-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((rel: any, idx: number) => (
                    <tr key={rel.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{rel.drawingNumber}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{rel.title}</td>
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">{rel.projectId}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{rel.revision}</td>
                      <td className="py-3 px-4 text-slate-600">{rel.releasedByName}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {new Date(rel.releasedAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-semibold">{rel.distribution}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setPreviewItem(rel)}
                          className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Awaiting Release View */}
            {activeReportKey === 'pending' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Drawing No</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Responsible Engineer</th>
                    <th className="py-3 px-4 text-center">Days Pending</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((pen: any, idx: number) => (
                    <tr key={pen.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{pen.drawingNumber}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{pen.title}</td>
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">{pen.projectId}</td>
                      <td className="py-3 px-4 text-slate-600">{pen.responsibleEngineer}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {pen.isOverdue ? (
                          <span className="text-red-600 font-extrabold">{pen.daysOpen}d (Overdue)</span>
                        ) : (
                          <span className="text-slate-700">{pen.daysOpen}d</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                          {pen.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setReleasingDrawingId(pen.id)}
                          className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] transition-all shadow-xs"
                        >
                          Release Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* DCR & ECN Views */}
            {(activeReportKey === 'dcr' || activeReportKey === 'ecn') && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">{activeReportKey === 'dcr' ? 'DCR Number' : 'ECN Number'}</th>
                    <th className="py-3 px-4">ECO Ref</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Title / Scope</th>
                    <th className="py-3 px-4">Originator / Authorized By</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item: any, idx: number) => {
                    const numberCode = item.dcrNumber || item.ecnNumber;
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-extrabold text-slate-900">{numberCode}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{item.ecoNumber}</td>
                        <td className="py-3 px-4 font-mono font-bold text-orange-600">{item.projectId}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{item.title}</td>
                        <td className="py-3 px-4 text-slate-600">{item.originator || item.authorizedBy}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              item.status === 'APPROVED_FREEZE' || item.status === 'ISSUED_TO_SHOPFLOOR'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {String(item.status).replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setPreviewItem(item)}
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
          </div>
        )}
      </div>

      {/* Confirmation Modal for Releasing Drawing */}
      <ConfirmModal
        isOpen={Boolean(releasingDrawingId)}
        title="Release Drawing to Manufacturing?"
        message="Releasing this drawing broadcasts it to Store, Purchase, and Shopfloor production workflows."
        confirmText="Yes, Release Drawing"
        cancelText="Cancel"
        isLoading={isReleasing}
        onConfirm={handleExecuteRelease}
        onClose={() => setReleasingDrawingId(null)}
      />

      {/* Activity Item Preview Dossier Modal */}
      {previewItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Compass size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-sm font-extrabold">Activity Record Dossier</h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {previewItem.projectId || 'General Engineering'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Title / Specification</label>
                <div className="text-sm font-extrabold text-slate-900">{previewItem.title}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500">Record Identifier</div>
                  <div className="font-mono font-bold text-slate-900">
                    {previewItem.drawingNumber || previewItem.code || previewItem.dcrNumber || previewItem.ecnNumber || '-'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500">Current Status</div>
                  <div className="font-bold text-slate-900">{previewItem.status || 'Active'}</div>
                </div>
              </div>

              {previewItem.fileUrl && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{previewItem.fileName || 'Technical Drawing File'}</div>
                    <div className="text-[10px] text-slate-400">PDF / CAD Attachment</div>
                  </div>
                  <a
                    href={previewItem.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <span>View File</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
              <button
                onClick={() => setPreviewItem(null)}
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
