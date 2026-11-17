'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Eye,
  Trash2,
  Pencil,
  FileText,
  Boxes,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Building2,
  X,
  Lock,
  BarChart3,
  Send,
  Wrench
} from 'lucide-react';
import {
  useGetMaterialRequestsQuery,
  useDeleteMaterialRequestMutation
} from '../api/storeApi';
import { ExcelColumnFilter } from '../../../components/ui/ExcelColumnFilter';
import MaterialRequestModal from './modals/MaterialRequestModal';

export default function StoreMaterialIssuedHistoryTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showMetrics, setShowMetrics] = useState(false);

  // Modal States
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [previewRequest, setPreviewRequest] = useState<any | null>(null);
  const [deleteTargetRequest, setDeleteTargetRequest] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const { data: mrData, isLoading: isLoadingMrs } = useGetMaterialRequestsQuery({ status: 'ISSUED' });
  const [deleteMrTrigger, { isLoading: isDeleting }] = useDeleteMaterialRequestMutation();

  const materialIssues = useMemo(() => mrData?.materialRequests || [], [mrData]);
  const timePolicy = mrData?.timePolicy || {
    allowIssueEdit: true,
    allowIssueDelete: true,
    issueEditWindowHours: 48,
    issueDeleteWindowHours: 24,
    allowAdminOverride: true,
    preventNegativeStockOnReversal: true
  };

  // Filter & Sort Logic
  const handleFilterChange = (colKey: string, values: string[] | null) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (!values || values.length === 0) {
        delete next[colKey];
      } else {
        next[colKey] = values;
      }
      return next;
    });
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setActiveFilters({});
    setSortField('createdAt');
    setSortDir('desc');
  };

  const hasActiveFilters = searchTerm.trim().length > 0 || Object.keys(activeFilters).length > 0;

  const getDistinctValues = (field: string) => {
    const map: Record<string, number> = {};
    materialIssues.forEach((m: any) => {
      const val = String(m[field] || '');
      if (val) map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map).map(([value, count]) => ({ value, count }));
  };

  const filteredIssues = useMemo(() => {
    return materialIssues
      .filter((m: any) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const mrNum = (m.mrNumber || '').toLowerCase();
          const prj = (m.projectId || '').toLowerCase();
          const dept = (m.department || '').toLowerCase();
          const reqBy = (m.requestedBy || '').toLowerCase();
          const match = mrNum.includes(q) || prj.includes(q) || dept.includes(q) || reqBy.includes(q);
          if (!match) return false;
        }

        for (const [key, vals] of Object.entries(activeFilters)) {
          const itemVal = String(m[key] || '');
          if (!vals.includes(itemVal)) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'string') {
          const comp = valA.localeCompare(String(valB));
          return sortDir === 'asc' ? comp : -comp;
        }

        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return sortDir === 'asc' ? numA - numB : numB - numA;
      });
  }, [materialIssues, searchTerm, activeFilters, sortField, sortDir]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalIssuedRecords = filteredIssues.length;
    let totalItemsIssued = 0;
    const workOrderSet = new Set<string>();

    filteredIssues.forEach((m: any) => {
      if (m.projectId) workOrderSet.add(m.projectId);
      if (Array.isArray(m.items)) {
        m.items.forEach((it: any) => {
          totalItemsIssued += Number(it.quantity ?? it.requestedQty ?? 1);
        });
      }
    });

    return {
      totalIssuedRecords,
      totalItemsIssued,
      activeWorkOrders: workOrderSet.size
    };
  }, [filteredIssues]);

  // Time Policy Check Helper
  const checkTimePolicy = (issue: any, mode: 'edit' | 'delete') => {
    const ageHours = (Date.now() - new Date(issue.updatedAt || issue.createdAt).getTime()) / (1000 * 60 * 60);

    if (mode === 'edit') {
      if (!timePolicy.allowIssueEdit) {
        return { allowed: false, reason: 'Material Issue editing is restricted by Store Master Time Policy.' };
      }
      if (timePolicy.issueEditWindowHours > 0 && ageHours > timePolicy.issueEditWindowHours) {
        return {
          allowed: false,
          reason: `Edit window expired: Issues can only be edited within ${timePolicy.issueEditWindowHours} hours of creation.`
        };
      }
      return { allowed: true };
    }

    if (mode === 'delete') {
      if (!timePolicy.allowIssueDelete || timePolicy.issueDeleteWindowHours === -1) {
        return { allowed: false, reason: 'Material Issue deletion is permanently locked by Store Master Time Policy.' };
      }
      if (timePolicy.issueDeleteWindowHours > 0 && ageHours > timePolicy.issueDeleteWindowHours) {
        return {
          allowed: false,
          reason: `Deletion window expired: Issues can only be removed within ${timePolicy.issueDeleteWindowHours} hours.`
        };
      }
      return { allowed: true };
    }

    return { allowed: true };
  };

  // Delete Action Handler
  const handleConfirmDelete = async () => {
    if (!deleteTargetRequest) return;
    try {
      await deleteMrTrigger(deleteTargetRequest.id || deleteTargetRequest._id).unwrap();
      showToast(
        `All set! Material Issue ${deleteTargetRequest.mrNumber} deleted and stock rolled back to available inventory.`
      );
      setDeleteTargetRequest(null);
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not delete this material issue. Please try again.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-5 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-red-600 text-white shadow-red-500/20'
              : 'bg-emerald-600 text-white shadow-emerald-500/20'
          }`}
        >
          {toastMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Dynamic Summary Cards (Hidden by default, toggleable or filter-based) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowMetrics(!showMetrics)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all cursor-pointer"
        >
          <BarChart3 size={14} className={showMetrics ? 'text-orange-500' : 'text-slate-400'} />
          <span>{showMetrics ? 'Hide Issue Metrics' : 'Show Issue Metrics'}</span>
        </button>

        {timePolicy.issueEditWindowHours > 0 && (
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            <Clock size={13} className="text-orange-500" />
            <span>
              Master Time Policy: Edits allowed within {timePolicy.issueEditWindowHours}h • Deletion/Rollback within{' '}
              {timePolicy.issueDeleteWindowHours === -1 ? 'Locked' : `${timePolicy.issueDeleteWindowHours}h`}
            </span>
          </div>
        )}
      </div>

      {showMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Material Issues
            </div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">
              {metrics.totalIssuedRecords} Issues Finalized
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Parts Issued to Floor (Bucket 4)
            </div>
            <div className="text-lg font-extrabold text-orange-600 mt-0.5">
              {metrics.totalItemsIssued} Total Units Issued
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Active Work Orders in WIP
            </div>
            <div className="text-lg font-extrabold text-emerald-600 mt-0.5">
              {metrics.activeWorkOrders} Active Projects
            </div>
          </div>
        </div>
      )}

      {/* Top Dedicated In-Line Table Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Left: Dedicated In-Line Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search MR number, work order, workstation, issuer..."
            className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-hidden transition-all text-slate-900 placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Reset Filters + Primary Add Requisition Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Reset Filters</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingRequest(null);
              setIsRequestModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Raise Material Request</span>
          </button>
        </div>
      </div>

      {/* Material Issued History Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-10 text-center">#</th>

                <th className="py-3 px-3 min-w-[140px]">
                  <ExcelColumnFilter
                    title="MR Number"
                    columnKey="mrNumber"
                    selectedValues={activeFilters['mrNumber'] || null}
                    distinctValues={getDistinctValues('mrNumber')}
                    onFilterChange={(vals) => handleFilterChange('mrNumber', vals)}
                    currentSortField={sortField}
                    currentSortDirection={sortDir}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDir(dir);
                    }}
                  />
                </th>

                <th className="py-3 px-3 min-w-[150px]">
                  <ExcelColumnFilter
                    title="Work Order / Project"
                    columnKey="projectId"
                    selectedValues={activeFilters['projectId'] || null}
                    distinctValues={getDistinctValues('projectId')}
                    onFilterChange={(vals) => handleFilterChange('projectId', vals)}
                    currentSortField={sortField}
                    currentSortDirection={sortDir}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDir(dir);
                    }}
                  />
                </th>

                <th className="py-3 px-3 min-w-[160px]">
                  <ExcelColumnFilter
                    title="Workstation / Bay"
                    columnKey="department"
                    selectedValues={activeFilters['department'] || null}
                    distinctValues={getDistinctValues('department')}
                    onFilterChange={(vals) => handleFilterChange('department', vals)}
                    currentSortField={sortField}
                    currentSortDirection={sortDir}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDir(dir);
                    }}
                  />
                </th>

                <th className="py-3 px-3 min-w-[130px] text-center">Total Line Items</th>

                <th className="py-3 px-3 min-w-[140px]">
                  <ExcelColumnFilter
                    title="Issued By"
                    columnKey="requestedBy"
                    selectedValues={activeFilters['requestedBy'] || null}
                    distinctValues={getDistinctValues('requestedBy')}
                    onFilterChange={(vals) => handleFilterChange('requestedBy', vals)}
                    currentSortField={sortField}
                    currentSortDirection={sortDir}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDir(dir);
                    }}
                  />
                </th>

                <th className="py-3 px-3 min-w-[140px]">
                  <ExcelColumnFilter
                    title="Issue Timestamp"
                    columnKey="createdAt"
                    selectedValues={activeFilters['createdAt'] || null}
                    distinctValues={getDistinctValues('createdAt')}
                    onFilterChange={(vals) => handleFilterChange('createdAt', vals)}
                    currentSortField={sortField}
                    currentSortDirection={sortDir}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDir(dir);
                    }}
                  />
                </th>

                <th className="py-3 px-3 w-28 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoadingMrs ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                    Loading material issued history...
                  </td>
                </tr>
              ) : filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No material issues found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {hasActiveFilters
                        ? 'Try clearing active search or filters to see all historical issues.'
                        : 'Material requests issued to Production will appear here with safe stock rollback.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue: any, idx: number) => {
                  const editCheck = checkTimePolicy(issue, 'edit');
                  const deleteCheck = checkTimePolicy(issue, 'delete');
                  const itemsList = Array.isArray(issue.items) ? issue.items : [];

                  return (
                    <tr
                      key={issue.id || issue._id}
                      onDoubleClick={() => setPreviewRequest(issue)}
                      className="hover:bg-orange-50/30 transition-colors group cursor-pointer"
                      title="Double-click to open issue dossier"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>

                      {/* MR Number */}
                      <td className="py-3 px-3 font-mono font-extrabold text-orange-600">
                        {issue.mrNumber}
                      </td>

                      {/* Work Order */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {issue.projectId}
                      </td>

                      {/* Department / Workstation */}
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {issue.department || 'Production Assembly'}
                      </td>

                      {/* Total Line Items */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                          <Boxes size={12} />
                          <span>{itemsList.length} Items</span>
                        </span>
                      </td>

                      {/* Issued By */}
                      <td className="py-3 px-3 text-slate-700 font-semibold">
                        {issue.updatedByName || issue.requestedBy || issue.createdByName || 'Store Team'}
                      </td>

                      {/* Issue Timestamp */}
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(issue.updatedAt || issue.createdAt).toLocaleDateString()}{' '}
                        {new Date(issue.updatedAt || issue.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div
                          className="flex items-center justify-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Preview Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewRequest(issue)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="View Issue Details"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            disabled={!editCheck.allowed}
                            onClick={() => {
                              if (!editCheck.allowed) {
                                showToast(editCheck.reason || 'Edit locked by Store Policy', 'error');
                                return;
                              }
                              setEditingRequest(issue);
                              setIsRequestModalOpen(true);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              editCheck.allowed
                                ? 'text-slate-500 hover:text-orange-600 hover:bg-orange-50 cursor-pointer'
                                : 'text-slate-300 cursor-not-allowed'
                            }`}
                            title={editCheck.allowed ? 'Edit Issue Quantities' : editCheck.reason}
                          >
                            <Pencil size={15} />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            disabled={!deleteCheck.allowed}
                            onClick={() => {
                              if (!deleteCheck.allowed) {
                                showToast(deleteCheck.reason || 'Deletion locked by Store Policy', 'error');
                                return;
                              }
                              setDeleteTargetRequest(issue);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              deleteCheck.allowed
                                ? 'text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                                : 'text-slate-300 cursor-not-allowed'
                            }`}
                            title={
                              deleteCheck.allowed
                                ? 'Delete Issue & Rollback Stock to Store'
                                : deleteCheck.reason
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Requisition Builder / Editor Modal */}
      {isRequestModalOpen && (
        <MaterialRequestModal
          isOpen={isRequestModalOpen}
          onClose={() => {
            setIsRequestModalOpen(false);
            setEditingRequest(null);
          }}
          onSuccess={(msg) => showToast(msg, 'success')}
          editingRequest={editingRequest}
        />
      )}

      {/* MODAL 2: Clickable Row Preview Dossier (Double-Click Standard) */}
      {previewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard: Crisp White with Amber Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Material Issue Dossier ({previewRequest.mrNumber})
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Work Order: <span className="font-mono font-bold text-slate-800">{previewRequest.projectId}</span> • Status: <span className="text-emerald-700 font-bold">ISSUED TO FLOOR</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {checkTimePolicy(previewRequest, 'edit').allowed && (
                  <button
                    type="button"
                    onClick={() => {
                      const tgt = previewRequest;
                      setPreviewRequest(null);
                      setEditingRequest(tgt);
                      setIsRequestModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors cursor-pointer"
                  >
                    <Pencil size={13} />
                    <span>Edit Issue</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPreviewRequest(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Work Order</div>
                  <div className="text-sm font-mono font-extrabold text-slate-900 mt-0.5">
                    {previewRequest.projectId}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Workstation</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                    {previewRequest.department || 'Production'}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Issue Date</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {new Date(previewRequest.updatedAt || previewRequest.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Issued By</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                    {previewRequest.updatedByName || previewRequest.requestedBy || 'Store Team'}
                  </div>
                </div>
              </div>

              {/* Issued Line Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <Boxes size={14} className="text-orange-500" />
                  <span>Issued Shopfloor Components ({Array.isArray(previewRequest.items) ? previewRequest.items.length : 0})</span>
                </h4>

                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Item Code &amp; Description</th>
                        <th className="py-2.5 px-3 text-center w-28">Quantity</th>
                        <th className="py-2.5 px-3 w-20">UOM</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Usage Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!Array.isArray(previewRequest.items) || previewRequest.items.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                            No component details recorded
                          </td>
                        </tr>
                      ) : (
                        previewRequest.items.map((it: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">{i + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-bold text-slate-900">{it.itemCode}</div>
                              <div className="text-[11px] text-slate-500 truncate max-w-md">{it.itemName}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-extrabold text-orange-600">
                              {it.quantity ?? it.requestedQty ?? 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                              {it.uom || it.baseUom || 'Nos'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                              {it.remarks || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes if present */}
              {previewRequest.notes && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Requisition Notes</div>
                  <p className="text-xs text-slate-700">{previewRequest.notes}</p>
                </div>
              )}

              {/* Mandatory Universal Action Tracking / Audit Trail Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Created By</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    {previewRequest.createdByName || previewRequest.requestedBy || 'Store Team'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {new Date(previewRequest.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Last Updated / Issued By</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    {previewRequest.updatedByName || previewRequest.createdByName || 'Store Team'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {new Date(previewRequest.updatedAt || previewRequest.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Dossier Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setPreviewRequest(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Friendly MH Confirmation Dialog for Delete & Rollback */}
      {deleteTargetRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
              <RotateCcw size={22} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                Delete Material Issue ({deleteTargetRequest.mrNumber})?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Once removed, all issued components from Work Order{' '}
                <span className="font-mono font-bold text-slate-900">{deleteTargetRequest.projectId}</span> will be
                automatically rolled back from Shopfloor WIP into Available Store Inventory (Bucket 4 → Bucket 3).
              </p>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-0.5">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-700" />
                <span>Automatic Stock Reversal</span>
              </div>
              <p>Store available quantities will be credited with the exact quantities issued in this record.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetRequest(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                Keep it
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors shadow-xs shadow-red-600/20 cursor-pointer"
              >
                {isDeleting ? 'Rolling back...' : 'Yes, delete & rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
