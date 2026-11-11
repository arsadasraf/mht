'use client';

import React, { useState, useMemo } from 'react';
import {
  FileCode2,
  RotateCcw,
  Search,
  Eye,
  Plus,
  ExternalLink,
  Download,
  Calendar,
  Layers,
  History,
  FileText,
  CheckCircle2,
  Check,
  X
} from 'lucide-react';
import DesignDashboardHeader from './DesignDashboardHeader';
import { useGetDocumentControlQuery, useCreateDrawingRevisionMutation } from '../../api/designDashboardApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../../components/ui/ExcelColumnFilter';

export default function DocumentControlSubTab() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeView, setActiveView] = useState<'register' | 'history'>('register');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewDrawing, setPreviewDrawing] = useState<any | null>(null);

  // New revision modal state
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [selectedDrawingForRev, setSelectedDrawingForRev] = useState<any | null>(null);
  const [revisionForm, setRevisionForm] = useState({
    revision: 'v2',
    changeSummary: '',
    ecoNumber: '',
    reviewerName: ''
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Column filters state
  const [columnFilters, setColumnFilters] = useState<Record<string, string[] | null>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const { data, isLoading } = useGetDocumentControlQuery(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );
  const [createRevisionTrigger, { isLoading: isCreatingRev }] = useCreateDrawingRevisionMutation();

  const drawings = useMemo(() => data?.drawings || [], [data]);
  const revisions = useMemo(() => data?.revisions || [], [data]);

  const currentDataset = useMemo(() => {
    return activeView === 'register' ? drawings : revisions;
  }, [activeView, drawings, revisions]);

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

  const handleOpenRevisionModal = (drawing: any) => {
    setSelectedDrawingForRev(drawing);
    const currNum = parseInt(drawing.revision?.replace(/[^0-9]/g, '') || '1', 10);
    setRevisionForm({
      revision: `v${currNum + 1}`,
      changeSummary: '',
      ecoNumber: '',
      reviewerName: 'Lead Design Engineer'
    });
    setIsRevisionModalOpen(true);
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrawingForRev) return;

    try {
      const res = await createRevisionTrigger({
        drawingId: selectedDrawingForRev.id,
        drawingNumber: selectedDrawingForRev.drawingNumber,
        title: selectedDrawingForRev.title,
        revision: revisionForm.revision,
        changeSummary: revisionForm.changeSummary,
        ecoNumber: revisionForm.ecoNumber,
        reviewerName: revisionForm.reviewerName,
        fileUrl: selectedDrawingForRev.fileUrl,
        fileName: selectedDrawingForRev.fileName
      }).unwrap();

      setToastMessage(res.message || 'All set! Drawing revision logged successfully.');
      setIsRevisionModalOpen(false);
      setSelectedDrawingForRev(null);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage('We could not save this revision right now. Please check the fields and try again.');
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">Total Drawings</span>
            <FileCode2 size={16} className="text-orange-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{drawings.length}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">Released Drawings</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {drawings.filter((d: any) => d.isReleased || d.status === 'RELEASED').length}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">Revision Logs</span>
            <History size={16} className="text-sky-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{revisions.length}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">Latest Active Revs</span>
            <Layers size={16} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-600">
            {drawings.filter((d: any) => d.revision !== 'v1').length}
          </div>
        </div>
      </div>

      {/* View Switcher (Button-Type Pills) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center gap-2">
        <button
          onClick={() => {
            setActiveView('register');
            setColumnFilters({});
            setSortConfig(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeView === 'register'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <FileCode2 size={15} />
          <span>Master Drawing Register</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeView === 'register' ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {drawings.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveView('history');
            setColumnFilters({});
            setSortConfig(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeView === 'history'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <History size={15} />
          <span>Drawing Revision History</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeView === 'history' ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {revisions.length}
          </span>
        </button>
      </div>

      {/* Main Table Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeView === 'register' ? 'Search drawings...' : 'Search revision history...'}
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

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-500 font-medium">
            Loading document control records...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-16 text-center">
            <FileCode2 size={36} className="mx-auto text-slate-300 mb-2" />
            <div className="text-xs font-bold text-slate-800">No records found</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {hasActiveFilters ? 'Try adjusting your search or filters.' : 'No drawing records registered yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeView === 'register' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Drawing Number"
                        columnKey="drawingNumber"
                        distinctValues={getDistinctValues('drawingNumber')}
                        selectedValues={columnFilters['drawingNumber'] || null}
                        onFilterChange={(selected) => handleFilterChange('drawingNumber', selected)}
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
                        title="Category"
                        columnKey="category"
                        distinctValues={getDistinctValues('category')}
                        selectedValues={columnFilters['category'] || null}
                        onFilterChange={(selected) => handleFilterChange('category', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4 text-center">Rev</th>
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
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((d: any, idx: number) => (
                    <tr key={d.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <button
                          onClick={() => setPreviewDrawing(d)}
                          className="hover:text-orange-600 hover:underline text-left font-mono"
                        >
                          {d.drawingNumber}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{d.title}</td>
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">{d.projectId}</td>
                      <td className="py-3 px-4 text-slate-600">{d.category}</td>
                      <td className="py-3 px-4 text-center font-mono font-extrabold text-orange-600">
                        {d.revision || 'v1'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            d.isReleased || d.status === 'RELEASED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : d.status === 'APPROVED'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {d.status || (d.isReleased ? 'RELEASED' : 'DRAFT')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRevisionModal(d)}
                            title="Log New Revision"
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors"
                          >
                            + Rev
                          </button>
                          <button
                            onClick={() => setPreviewDrawing(d)}
                            title="Preview Dossier"
                            className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeView === 'history' && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Drawing Number</th>
                    <th className="py-3 px-4">Rev</th>
                    <th className="py-3 px-4">Change Summary</th>
                    <th className="py-3 px-4">ECO Reference</th>
                    <th className="py-3 px-4">Revised By</th>
                    <th className="py-3 px-4">Reviewer</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((rev: any, idx: number) => (
                    <tr key={rev.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{rev.drawingNumber}</td>
                      <td className="py-3 px-4 font-mono font-extrabold text-orange-600">{rev.revision}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{rev.changeSummary}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{rev.ecoNumber || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{rev.revisedByName || 'Design Lead'}</td>
                      <td className="py-3 px-4 text-slate-600">{rev.reviewerName || 'Lead Engineer'}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {new Date(rev.createdAt).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Log Revision Modal */}
      {isRevisionModalOpen && selectedDrawingForRev && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-sm font-extrabold">Log Drawing Revision</h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {selectedDrawingForRev.drawingNumber} • {selectedDrawingForRev.title}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsRevisionModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRevision} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    New Revision Code
                  </label>
                  <input
                    type="text"
                    required
                    value={revisionForm.revision}
                    onChange={(e) => setRevisionForm({ ...revisionForm, revision: e.target.value })}
                    placeholder="v2"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    ECO / DCR Reference
                  </label>
                  <input
                    type="text"
                    value={revisionForm.ecoNumber}
                    onChange={(e) => setRevisionForm({ ...revisionForm, ecoNumber: e.target.value })}
                    placeholder="ECO-2026-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Change Summary / Modification Details
                </label>
                <textarea
                  required
                  rows={3}
                  value={revisionForm.changeSummary}
                  onChange={(e) => setRevisionForm({ ...revisionForm, changeSummary: e.target.value })}
                  placeholder="Detail the mechanical dimensions, tolerances, or design improvements made..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Lead Reviewer / Approver
                </label>
                <input
                  type="text"
                  value={revisionForm.reviewerName}
                  onChange={(e) => setRevisionForm({ ...revisionForm, reviewerName: e.target.value })}
                  placeholder="Chief Design Engineer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRev}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all"
                >
                  {isCreatingRev ? 'Saving...' : 'Save Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawing Preview Dossier Modal */}
      {previewDrawing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileCode2 size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-sm font-extrabold">{previewDrawing.drawingNumber}</h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Project {previewDrawing.projectId} • Rev {previewDrawing.revision}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewDrawing(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Drawing Title</label>
                <div className="text-sm font-extrabold text-slate-900">{previewDrawing.title}</div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500">Category</div>
                  <div className="font-bold text-slate-900">{previewDrawing.category}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500">Current Revision</div>
                  <div className="font-mono font-bold text-orange-600">{previewDrawing.revision || 'v1'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500">Release Status</div>
                  <div className="font-bold text-slate-900">
                    {previewDrawing.isReleased ? 'RELEASED' : previewDrawing.status || 'DRAFT'}
                  </div>
                </div>
              </div>

              {/* PDF Document Card with Explicit "See PDF" and "Download PDF" (AGENTS.md mandate) */}
              {previewDrawing.fileUrl ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {previewDrawing.fileName || `${previewDrawing.drawingNumber}.pdf`}
                    </div>
                    <div className="text-[10px] text-slate-400">Technical CAD / PDF Document</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={previewDrawing.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>See PDF</span>
                    </a>
                    <a
                      href={previewDrawing.fileUrl}
                      download={previewDrawing.fileName || `${previewDrawing.drawingNumber}.pdf`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors"
                    >
                      <Download size={13} />
                      <span>Download PDF</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  No electronic file attached to this drawing record.
                </div>
              )}

              {/* Universal Action Tracking Audit Display */}
              <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Created By</div>
                  <div className="font-bold text-slate-900">{previewDrawing.createdByName || 'System'}</div>
                  <div className="text-[10px] text-slate-400">
                    {previewDrawing.createdAt ? new Date(previewDrawing.createdAt).toLocaleString('en-IN') : '-'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Last Updated</div>
                  <div className="font-bold text-slate-900">
                    {previewDrawing.updatedByName || previewDrawing.createdByName || 'System'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {previewDrawing.updatedAt ? new Date(previewDrawing.updatedAt).toLocaleString('en-IN') : '-'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
              <button
                onClick={() => setPreviewDrawing(null)}
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
