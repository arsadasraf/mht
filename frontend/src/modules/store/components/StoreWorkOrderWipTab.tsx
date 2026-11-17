'use client';

import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Search,
  RotateCcw,
  Boxes,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Eye,
  AlertTriangle,
  X,
  FileText
} from 'lucide-react';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';
import {
  useGetWorkOrderWipSummaryQuery,
  useCompleteWorkOrderWipMutation,
  useConsumeMaterialRequestMutation
} from '../api/storeApi';

export default function StoreWorkOrderWipTab() {
  const dispatch = useAppDispatch();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [sortField, setSortField] = useState<string>('activeIssuedQty');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Drawer / Details Modal
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any | null>(null);

  // Consume Confirmation Modal
  const [workOrderToConsume, setWorkOrderToConsume] = useState<any | null>(null);
  const [consumeNotes, setConsumeNotes] = useState('');

  // API Query & Mutations
  const { data: woData, isLoading, refetch } = useGetWorkOrderWipSummaryQuery();
  const [completeWoTrigger, { isLoading: isCompleting }] = useCompleteWorkOrderWipMutation();
  const [consumeMrTrigger, { isLoading: isConsumingMr }] = useConsumeMaterialRequestMutation();

  const workOrdersList = useMemo(() => woData?.workOrders || [], [woData]);

  // Distinct values helper
  const getDistinctValues = (dataset: any[], field: string): DistinctValueItem[] => {
    const map: Record<string, number> = {};
    dataset.forEach((it: any) => {
      const val = String(it[field] || '');
      if (val) map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map).map(([value, count]) => ({ value, count }));
  };

  const handleFilterChange = (colKey: string, values: string[] | null) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (!values || values.length === 0) delete next[colKey];
      else next[colKey] = values;
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setActiveFilters({});
    setSortField('activeIssuedQty');
    setSortDir('desc');
  };

  const hasActiveFilters = searchTerm.trim().length > 0 || Object.keys(activeFilters).length > 0;

  // Filtered & Sorted Work Orders
  const filteredWorkOrders = useMemo(() => {
    return workOrdersList
      .filter((wo: any) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const num = (wo.workOrderNumber || '').toLowerCase();
          const prj = (wo.projectName || '').toLowerCase();
          const cust = (wo.customerName || '').toLowerCase();
          const mach = (wo.machineModel || '').toLowerCase();
          if (!num.includes(q) && !prj.includes(q) && !cust.includes(q) && !mach.includes(q)) {
            return false;
          }
        }
        for (const [key, vals] of Object.entries(activeFilters)) {
          const itemVal = String(wo[key] || '');
          if (!vals.includes(itemVal)) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string') {
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDir === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      });
  }, [workOrdersList, searchTerm, activeFilters, sortField, sortDir]);

  // Handle Full Work Order Consumption
  const handleConfirmConsume = async () => {
    if (!workOrderToConsume) return;
    try {
      const res = await completeWoTrigger({
        projectId: workOrderToConsume.projectId || workOrderToConsume.workOrderNumber,
        notes: consumeNotes
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: res.message || `All set! Materials for ${workOrderToConsume.workOrderNumber} consumed from WIP.`
        })
      );
      setWorkOrderToConsume(null);
      setConsumeNotes('');
      if (selectedWorkOrder && selectedWorkOrder.workOrderNumber === workOrderToConsume.workOrderNumber) {
        setSelectedWorkOrder(null);
      }
      refetch();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || 'We could not consume WIP materials right now. Please try again.'
        })
      );
    }
  };

  // Handle Individual Material Request Consumption
  const handleConsumeSingleMr = async (mrId: string, mrNum: string) => {
    try {
      const res = await consumeMrTrigger({
        id: mrId,
        notes: 'Consumed from Work Order WIP inspection drawer'
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: res.message || `All set! Materials for ${mrNum} consumed and cleared from WIP.`
        })
      );
      refetch();
      // Update selected Work Order drawer state
      if (selectedWorkOrder) {
        setSelectedWorkOrder((prev: any) => {
          if (!prev) return null;
          const updatedMrs = prev.materialRequests.map((m: any) =>
            m.id === mrId ? { ...m, status: 'CONSUMED' } : m
          );
          const hasIssued = updatedMrs.some((m: any) => m.status === 'ISSUED');
          return {
            ...prev,
            status: hasIssued ? 'IN_ASSEMBLY' : 'CONSUMED',
            materialRequests: updatedMrs
          };
        });
      }
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || 'We could not consume this requisition right now. Please try again.'
        })
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Dedicated In-Line Table Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Side: Dedicated In-Line Search Bar */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Work Order, Customer, Machine..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Side: Total Summary & Reset Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}

          <div className="px-3.5 py-1.5 bg-orange-50/80 border border-orange-200 rounded-xl text-xs font-bold text-orange-800 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-orange-600" />
            <span>{filteredWorkOrders.length} Work Orders</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 uppercase text-[10px] font-bold tracking-wider select-none">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3 min-w-[180px]">
                  <ExcelColumnFilter
                    title="Work Order / Project"
                    columnKey="workOrderNumber"
                    selectedValues={activeFilters['workOrderNumber'] || null}
                    distinctValues={getDistinctValues(workOrdersList, 'workOrderNumber')}
                    onFilterChange={(vals) => handleFilterChange('workOrderNumber', vals)}
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
                    title="Customer"
                    columnKey="customerName"
                    selectedValues={activeFilters['customerName'] || null}
                    distinctValues={getDistinctValues(workOrdersList, 'customerName')}
                    onFilterChange={(vals) => handleFilterChange('customerName', vals)}
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
                    title="Machine Model"
                    columnKey="machineModel"
                    selectedValues={activeFilters['machineModel'] || null}
                    distinctValues={getDistinctValues(workOrdersList, 'machineModel')}
                    onFilterChange={(vals) => handleFilterChange('machineModel', vals)}
                    currentSortField={sortField}
                    currentSortDirection={sortDir}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDir(dir);
                    }}
                  />
                </th>
                <th className="py-3 px-3 min-w-[130px] text-center">Active Parts on Floor</th>
                <th className="py-3 px-3 min-w-[130px] text-center">Total Qty on Floor</th>
                <th className="py-3 px-3 min-w-[130px] text-right">Floor Valuation (₹)</th>
                <th className="py-3 px-3 min-w-[120px] text-center">
                  <ExcelColumnFilter
                    title="Assembly Status"
                    columnKey="status"
                    selectedValues={activeFilters['status'] || null}
                    distinctValues={getDistinctValues(workOrdersList, 'status')}
                    onFilterChange={(vals) => handleFilterChange('status', vals)}
                    currentSortField={sortField}
                    currentSortDirection={sortDir}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDir(dir);
                    }}
                  />
                </th>
                <th className="py-3 px-3 w-40 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-500">
                    Loading Work Order WIP inventory...
                  </td>
                </tr>
              ) : filteredWorkOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <Boxes className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No active Work Order issues found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Materials issued from Requisitions will appear here grouped by Work Order.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredWorkOrders.map((wo: any, idx: number) => {
                  const isInAssembly = wo.status === 'IN_ASSEMBLY';
                  return (
                    <tr
                      key={wo.workOrderNumber}
                      onDoubleClick={() => setSelectedWorkOrder(wo)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      title="Double-click to view itemized issued materials"
                    >
                      <td className="py-3.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3.5 px-3">
                        <div className="font-mono font-extrabold text-slate-900 flex items-center gap-1.5">
                          <span>{wo.workOrderNumber}</span>
                          {wo.projectId && wo.projectId !== wo.workOrderNumber && (
                            <span className="text-[10px] text-slate-400 font-normal">({wo.projectId})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{wo.projectName}</div>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-800">{wo.customerName}</td>
                      <td className="py-3.5 px-3 text-slate-600 font-medium">{wo.machineModel}</td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg text-xs">
                          {wo.totalDistinctParts} {wo.totalDistinctParts === 1 ? 'part' : 'parts'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`font-extrabold px-2.5 py-0.5 rounded-lg text-xs ${
                            isInAssembly
                              ? 'text-orange-700 bg-orange-50 border border-orange-200'
                              : 'text-slate-500 bg-slate-100'
                          }`}
                        >
                          {wo.activeIssuedQty} Nos
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(wo.wipValuation || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {isInAssembly ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            In Assembly
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Consumed
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedWorkOrder(wo)}
                            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                            title="View issued line items"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isInAssembly ? (
                            <button
                              type="button"
                              onClick={() => {
                                setWorkOrderToConsume(wo);
                                setConsumeNotes('');
                              }}
                              className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-xs"
                            >
                              Complete WIP
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400">Completed</span>
                          )}
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

      {/* Drawer / Modal: Itemized Issued Materials for Selected Work Order */}
      {selectedWorkOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header Ribbon: Crisp White with Amber Top Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0 font-bold">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Issued Materials: {selectedWorkOrder.workOrderNumber}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {selectedWorkOrder.customerName} • {selectedWorkOrder.machineModel}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorkOrder(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Active WIP Parts</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {selectedWorkOrder.totalDistinctParts} items
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Total Quantity on Floor</div>
                  <div className="text-base font-extrabold text-orange-600 mt-0.5">
                    {selectedWorkOrder.activeIssuedQty} Nos
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">WIP Valuation</div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    ₹{Number(selectedWorkOrder.wipValuation || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Status</div>
                  <div className="text-xs font-bold mt-1">
                    {selectedWorkOrder.status === 'IN_ASSEMBLY' ? (
                      <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        In Assembly
                      </span>
                    ) : (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Consumed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 1: Itemized Materials List */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-orange-500" />
                  Itemized Materials Issued to Machine
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Item Code & Name</th>
                        <th className="py-2.5 px-3 text-center">Issued Qty</th>
                        <th className="py-2.5 px-3 text-right">Est. Rate</th>
                        <th className="py-2.5 px-3 text-right">Value (₹)</th>
                        <th className="py-2.5 px-3 text-center">Linked MRs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedWorkOrder.issuedItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                            No active items on shopfloor (all parts consumed).
                          </td>
                        </tr>
                      ) : (
                        selectedWorkOrder.issuedItems.map((it: any, idx: number) => (
                          <tr key={it.itemCode} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-bold text-slate-900">{it.itemCode}</div>
                              <div className="text-[11px] text-slate-500 truncate max-w-sm">{it.itemName}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-orange-600">
                              {it.issuedQty} {it.uom}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              ₹{Number(it.rate || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              ₹{Number(it.totalValue || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex flex-wrap gap-1 justify-center">
                                {it.mrNumbers.map((m: string) => (
                                  <span
                                    key={m}
                                    className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-700"
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Attached Material Requests (MR Slips) */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-orange-500" />
                  Material Requisition Slips (MR Slips)
                </h4>
                <div className="space-y-2">
                  {selectedWorkOrder.materialRequests.map((mr: any) => {
                    const isMrIssued = mr.status === 'ISSUED';
                    const mrItems = Array.isArray(mr.items) ? mr.items : [];
                    return (
                      <div
                        key={mr.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-xs">{mr.mrNumber}</span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                isMrIssued
                                  ? 'text-amber-800 bg-amber-100'
                                  : 'text-emerald-800 bg-emerald-100'
                              }`}
                            >
                              {mr.status}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Issued by: <strong className="text-slate-700">{mr.requestedBy || mr.createdByName}</strong>
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {mrItems.length} items: {mrItems.map((i: any) => `${i.itemCode} (${i.quantity ?? i.requestedQty ?? 1} Nos)`).join(', ')}
                          </div>
                        </div>

                        {/* Direct MR Consume Button */}
                        {isMrIssued && (
                          <button
                            type="button"
                            disabled={isConsumingMr}
                            onClick={() => handleConsumeSingleMr(mr.id, mr.mrNumber)}
                            className="px-3 py-1.5 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 hover:border-orange-300 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            Consume This MR
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedWorkOrder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Close Preview
              </button>

              {selectedWorkOrder.status === 'IN_ASSEMBLY' && (
                <button
                  type="button"
                  onClick={() => {
                    setWorkOrderToConsume(selectedWorkOrder);
                    setConsumeNotes('');
                  }}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Complete Entire Work Order & Consume WIP
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Complete Assembly & Consume WIP Confirmation Dialog */}
      {workOrderToConsume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-slate-900 text-sm font-extrabold tracking-tight">Complete Work Order Assembly?</h3>
              </div>
              <button
                type="button"
                onClick={() => setWorkOrderToConsume(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                You are marking machine assembly complete for{' '}
                <strong className="text-slate-900 font-mono">{workOrderToConsume.workOrderNumber}</strong> (
                {workOrderToConsume.customerName}).
              </p>
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 leading-normal">
                <strong>Heads-up:</strong> All <strong>{workOrderToConsume.activeIssuedQty} Nos</strong> of issued materials
                across {workOrderToConsume.totalDistinctParts} parts will be permanently{' '}
                <strong>consumed into the machine build</strong> and cleared from WIP floor inventory. They will{' '}
                <strong>not</strong> return to Store stock.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assembly Notes (Optional)
                </label>
                <input
                  type="text"
                  value={consumeNotes}
                  onChange={(e) => setConsumeNotes(e.target.value)}
                  placeholder="e.g. Mechanical and electrical assembly completed on floor."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setWorkOrderToConsume(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Keep in Assembly
              </button>
              <button
                type="button"
                disabled={isCompleting}
                onClick={handleConfirmConsume}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isCompleting ? 'Consuming...' : 'Yes, Complete & Consume'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

