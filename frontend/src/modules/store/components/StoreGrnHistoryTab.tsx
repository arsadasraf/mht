'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Search,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Eye,
  ExternalLink,
  Download,
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
  BarChart3
} from 'lucide-react';
import {
  useGetGrnRecordsQuery,
  useDeleteGrnMutation
} from '../api/storeApi';
import { ExcelColumnFilter } from '../../../components/ui/ExcelColumnFilter';
import GrnBuilderModal from './modals/GrnBuilderModal';

export default function StoreGrnHistoryTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showMetrics, setShowMetrics] = useState(false);

  // Modal States
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [editingGrn, setEditingGrn] = useState<any | null>(null);
  const [previewGrn, setPreviewGrn] = useState<any | null>(null);
  const [deleteTargetGrn, setDeleteTargetGrn] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const { data: grnData, isLoading: isLoadingGrns } = useGetGrnRecordsQuery({});
  const [deleteGrnTrigger, { isLoading: isDeleting }] = useDeleteGrnMutation();

  const grns = useMemo(() => grnData?.grns || [], [grnData]);
  const timePolicy = grnData?.timePolicy || {
    allowGrnEdit: true,
    allowGrnDelete: true,
    grnEditWindowHours: 48,
    grnDeleteWindowHours: 24,
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
    grns.forEach((g: any) => {
      const val = String(g[field] || '');
      if (val) map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map).map(([value, count]) => ({ value, count }));
  };

  const filteredGrns = useMemo(() => {
    return grns
      .filter((g: any) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const grnNum = (g.grnNumber || '').toLowerCase();
          const vend = (g.vendorName || '').toLowerCase();
          const inv = (g.invoiceNo || '').toLowerCase();
          const po = (g.poNumber || '').toLowerCase();
          const prj = (g.projectId || '').toLowerCase();
          const match =
            grnNum.includes(q) ||
            vend.includes(q) ||
            inv.includes(q) ||
            po.includes(q) ||
            prj.includes(q);
          if (!match) return false;
        }

        for (const [key, vals] of Object.entries(activeFilters)) {
          const itemVal = String(g[key] || '');
          if (!vals.includes(itemVal)) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        let valA = a[sortField] ?? '';
        let valB = b[sortField] ?? '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [grns, searchTerm, activeFilters, sortField, sortDir]);

  // Dynamic filter-driven KPI metrics (live re-computation based on active search & column filters)
  const dynamicTotalGrns = filteredGrns.length;
  const dynamicTotalValuation = useMemo(() => {
    return filteredGrns.reduce((sum: number, g: any) => sum + Number(g.grandTotal || 0), 0);
  }, [filteredGrns]);
  const dynamicDirectClearance = useMemo(() => {
    return filteredGrns.filter(
      (g: any) => g.qcStatus === 'QC_ACCEPTED' || g.qcStatus === 'DIRECT_ACCEPTED'
    ).length;
  }, [filteredGrns]);
  const dynamicInQc = useMemo(() => {
    return filteredGrns.filter(
      (g: any) => g.qcStatus === 'PENDING_IQC' || g.qcStatus === 'QUARANTINE_HOLD'
    ).length;
  }, [filteredGrns]);

  // Filter-Based Excel Export Handler
  const handleExportExcel = () => {
    if (filteredGrns.length === 0) {
      showToast('No GRN records to export in current filtered view.', 'error');
      return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
    const headers = [
      '#',
      'GRN Number',
      'Vendor Name',
      'Invoice / Challan No',
      'Invoice Date',
      'PO Number',
      'Project ID',
      'Items Count',
      'Taxable Subtotal (INR)',
      'GST Taxes (INR)',
      'Transportation (INR)',
      'Transportation GST (INR)',
      'Packing Charges (INR)',
      'Packing GST (INR)',
      'Grand Total (INR)',
      'QC Routing',
      'Inward Date',
      'Inwarded By',
      'Last Updated By',
      'Remarks'
    ];
    csv += headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';

    filteredGrns.forEach((g: any, idx: number) => {
      const row = [
        idx + 1,
        g.grnNumber || '',
        g.vendorName || '',
        g.invoiceNo || '',
        g.invoiceDate ? new Date(g.invoiceDate).toLocaleDateString('en-IN') : '',
        g.poNumber || '',
        g.projectId || '',
        Array.isArray(g.items) ? g.items.length : 0,
        Number(g.subtotal || 0).toFixed(2),
        Number(g.taxTotal || 0).toFixed(2),
        Number(g.transportCharges || 0).toFixed(2),
        Number(g.transportGstAmount || 0).toFixed(2),
        Number(g.packingCharges || 0).toFixed(2),
        Number(g.packingGstAmount || 0).toFixed(2),
        Number(g.grandTotal || 0).toFixed(2),
        g.qcStatus === 'PENDING_IQC' || g.qcStatus === 'QUARANTINE_HOLD' ? 'Incoming QC Inspection' : 'Direct Clearance',
        g.createdAt ? new Date(g.createdAt).toLocaleString('en-IN') : '',
        g.createdByName || '',
        g.updatedByName || '',
        g.remarks || ''
      ];
      csv += row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `MH_GRN_History_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`All set! Exported ${filteredGrns.length} GRN records to ${filename}.`);
  };

  // Check if a GRN is editable / deletable under Store Master Time Policy
  const checkActionPolicy = (grn: any) => {
    const ageHours = (Date.now() - new Date(grn.createdAt).getTime()) / (1000 * 60 * 60);

    const isEditLocked =
      !timePolicy.allowGrnEdit ||
      (timePolicy.grnEditWindowHours > 0 && ageHours > timePolicy.grnEditWindowHours);

    const isDeleteLocked =
      !timePolicy.allowGrnDelete ||
      timePolicy.grnDeleteWindowHours === -1 ||
      (timePolicy.grnDeleteWindowHours > 0 && ageHours > timePolicy.grnDeleteWindowHours);

    return {
      ageHours: Math.round(ageHours * 10) / 10,
      isEditLocked,
      isDeleteLocked,
      editTooltip: isEditLocked
        ? `Edit locked by Store Time Policy (Window expired after ${timePolicy.grnEditWindowHours} hours)`
        : 'Edit GRN and re-calculate stock',
      deleteTooltip: isDeleteLocked
        ? `Delete locked by Store Time Policy (Window expired after ${timePolicy.grnDeleteWindowHours} hours)`
        : 'Delete GRN and safely reverse inventory stock'
    };
  };

  // Delete Action Handler
  const handleConfirmDelete = async () => {
    if (!deleteTargetGrn) return;
    try {
      await deleteGrnTrigger(deleteTargetGrn.id || deleteTargetGrn._id).unwrap();
      showToast(`All set! GRN ${deleteTargetGrn.grnNumber} deleted and stock reversed.`);
      setDeleteTargetGrn(null);
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not delete GRN right now. Material may have already been consumed.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Modern Button-Type Sub-Tabs & Metrics Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <Link
            href="/store/inventory/rm-bo"
            className="flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs"
          >
            <Layers size={15} />
            <span>RM &amp; BO Items</span>
          </Link>

          <Link
            href="/store/inventory/drawings"
            className="flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs"
          >
            <FileText size={15} />
            <span>Design Drawings</span>
          </Link>

          <Link
            href="/store/inventory/grn-history"
            className="flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap bg-orange-500 text-white shadow-xs shadow-orange-500/20"
          >
            <FileSpreadsheet size={15} />
            <span>GRN History</span>
            {grns.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-white text-orange-600">
                {grns.length}
              </span>
            )}
          </Link>
        </div>

        {/* Dashboard Metrics Toggle (Hidden by Default) */}
        <button
          type="button"
          onClick={() => setShowMetrics((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer shrink-0 self-start sm:self-auto ${
            showMetrics
              ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          title={showMetrics ? 'Hide KPI Summary Cards' : 'Show Filter-Driven KPI Summary Cards'}
        >
          <BarChart3 size={14} className={showMetrics ? 'text-amber-600' : 'text-slate-500'} />
          <span>{showMetrics ? 'Hide Metrics' : 'Show Metrics'}</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Filtered dynamic calculations active" />
          )}
        </button>
      </div>

      {/* Dynamic KPI Summary Chips (Default Hidden, Recalculates from Filtered Rows) */}
      {showMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">
                Total GRNs Inwarded
                {hasActiveFilters && <span className="text-orange-500 font-normal lowercase ml-1">(filtered)</span>}
              </span>
              <FileSpreadsheet size={16} className="text-orange-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{dynamicTotalGrns}</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">
                Total Valuation
                {hasActiveFilters && <span className="text-orange-500 font-normal lowercase ml-1">(filtered)</span>}
              </span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div className="text-xl font-extrabold text-emerald-600 font-mono">
              ₹{dynamicTotalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">
                Direct Clearance
                {hasActiveFilters && <span className="text-orange-500 font-normal lowercase ml-1">(filtered)</span>}
              </span>
              <ShieldCheck size={16} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{dynamicDirectClearance}</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">
                In-QC Quarantine
                {hasActiveFilters && <span className="text-orange-500 font-normal lowercase ml-1">(filtered)</span>}
              </span>
              <Clock size={16} className="text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-amber-600">{dynamicInQc}</div>
          </div>
        </div>
      )}

      {/* Dedicated In-Line Table Toolbar (AGENTS.md universal table mandate) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left Side: Dedicated Search Bar */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search GRN #, vendor, invoice, PO..."
            className="w-full pl-10 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Side: Reset Filters, Excel Export & Inward GRN Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}

          {/* Filter-Driven Excel Export Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs transition-all cursor-pointer"
            title={`Export ${filteredGrns.length} active filtered GRN records to Excel / CSV`}
          >
            <Download size={14} className="text-slate-500" />
            <span>Export Excel</span>
            {hasActiveFilters && (
              <span className="px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-700 text-[10px] font-mono font-bold">
                {filteredGrns.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setEditingGrn(null);
              setIsGrnModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs shadow-orange-500/20 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Inward GRN
          </button>
        </div>
      </div>

      {/* Universal Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[380px]">
          {isLoadingGrns ? (
            <div className="py-16 text-center text-slate-400 text-xs font-medium">
              Loading GRN history records...
            </div>
          ) : filteredGrns.length === 0 ? (
            <div className="py-16 text-center">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No GRN records found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click "+ Inward GRN" above to create and record your first Goods Receipt Note.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="GRN Number"
                      columnKey="grnNumber"
                      distinctValues={getDistinctValues('grnNumber')}
                      selectedValues={activeFilters.grnNumber || null}
                      onFilterChange={(vals) => handleFilterChange('grnNumber', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'grnNumber' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="Vendor Name"
                      columnKey="vendorName"
                      distinctValues={getDistinctValues('vendorName')}
                      selectedValues={activeFilters.vendorName || null}
                      onFilterChange={(vals) => handleFilterChange('vendorName', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'vendorName' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="Invoice / Challan"
                      columnKey="invoiceNo"
                      distinctValues={getDistinctValues('invoiceNo')}
                      selectedValues={activeFilters.invoiceNo || null}
                      onFilterChange={(vals) => handleFilterChange('invoiceNo', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'invoiceNo' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="PO Number"
                      columnKey="poNumber"
                      distinctValues={getDistinctValues('poNumber')}
                      selectedValues={activeFilters.poNumber || null}
                      onFilterChange={(vals) => handleFilterChange('poNumber', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'poNumber' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                  <th className="py-3 px-4 text-center">
                    <ExcelColumnFilter
                      title="QC Routing"
                      columnKey="qcStatus"
                      distinctValues={getDistinctValues('qcStatus')}
                      selectedValues={activeFilters.qcStatus || null}
                      onFilterChange={(vals) => handleFilterChange('qcStatus', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'qcStatus' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-4">Inward Date</th>
                  <th className="py-3 px-4 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGrns.map((grn: any, idx: number) => {
                  const policyStatus = checkActionPolicy(grn);
                  const itemsCount = Array.isArray(grn.items) ? grn.items.length : 0;
                  const isAccepted =
                    grn.qcStatus === 'QC_ACCEPTED' || grn.qcStatus === 'DIRECT_ACCEPTED';

                  return (
                    <tr key={grn.id || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>

                      {/* Clickable GRN Number */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setPreviewGrn(grn)}
                          className="font-bold text-orange-600 hover:text-orange-700 hover:underline font-mono text-left cursor-pointer"
                        >
                          {grn.grnNumber}
                        </button>
                      </td>

                      {/* Vendor Name */}
                      <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                        {grn.vendorName || '—'}
                      </td>

                      {/* Invoice No */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {grn.invoiceNo ? (
                          <div className="flex flex-col">
                            <span>{grn.invoiceNo}</span>
                            {grn.invoiceDate && (
                              <span className="text-[10px] text-slate-400 font-sans">
                                {new Date(grn.invoiceDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* PO Number */}
                      <td className="py-3 px-4 font-mono text-xs">
                        {grn.poNumber ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            {grn.poNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Direct Inward</span>
                        )}
                      </td>

                      {/* Items Count */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {itemsCount} item{itemsCount > 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                        ₹{Number(grn.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* QC Routing Badge */}
                      <td className="py-3 px-4 text-center">
                        {isAccepted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} />
                            <span>Direct Clearance</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={11} />
                            <span>In-QC Hold</span>
                          </span>
                        )}
                      </td>

                      {/* Inward Date */}
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {grn.receivedDate
                          ? new Date(grn.receivedDate).toLocaleDateString()
                          : new Date(grn.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Dossier */}
                          <button
                            onClick={() => setPreviewGrn(grn)}
                            title="Preview Dossier"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => {
                              if (!policyStatus.isEditLocked) {
                                setEditingGrn(grn);
                                setIsGrnModalOpen(true);
                              }
                            }}
                            disabled={policyStatus.isEditLocked}
                            title={policyStatus.editTooltip}
                            className={`p-1.5 rounded-xl transition-colors ${
                              policyStatus.isEditLocked
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50 cursor-pointer'
                            }`}
                          >
                            {policyStatus.isEditLocked ? <Lock className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => {
                              if (!policyStatus.isDeleteLocked) {
                                setDeleteTargetGrn(grn);
                              }
                            }}
                            disabled={policyStatus.isDeleteLocked}
                            title={policyStatus.deleteTooltip}
                            className={`p-1.5 rounded-xl transition-colors ${
                              policyStatus.isDeleteLocked
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirmation Dialog: Delete GRN with Stock Reversal */}
      {deleteTargetGrn && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-700 border border-red-300/40 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Delete Goods Receipt Note?
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium font-mono">
                    {deleteTargetGrn.grnNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTargetGrn(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                Are you sure you want to delete GRN <strong>{deleteTargetGrn.grnNumber}</strong>?
              </p>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-700 shrink-0" />
                  <span>Automatic Stock Reversal:</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  • Received stock for <strong>{(deleteTargetGrn.items || []).length} line items</strong> will be safely deducted from store ledger.
                  <br />
                  {deleteTargetGrn.poNumber && (
                    <>• Outward PO <strong>{deleteTargetGrn.poNumber}</strong> balance quantities will be restored.</>
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteTargetGrn(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {isDeleting ? 'Reversing Stock...' : 'Yes, Delete & Reverse Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GRN Preview Dossier Modal */}
      {previewGrn && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    GRN Dossier — {previewGrn.grnNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Inward Goods Receipt Note Ledger Record
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const target = previewGrn;
                    setPreviewGrn(null);
                    setEditingGrn(target);
                    setIsGrnModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-50 rounded-xl transition-colors border border-orange-200 cursor-pointer"
                >
                  <Pencil size={13} />
                  <span>Edit GRN</span>
                </button>
                <button
                  onClick={() => setPreviewGrn(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Vendor
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">{previewGrn.vendorName}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Invoice / Challan
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {previewGrn.invoiceNo || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    PO Number
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-800">
                    {previewGrn.poNumber || 'Direct Inward'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    QC Routing
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    {previewGrn.qcStatus === 'QC_ACCEPTED' || previewGrn.qcStatus === 'DIRECT_ACCEPTED'
                      ? 'Direct Clearance'
                      : 'Incoming QC Hold'}
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2">
                  Line Items ({previewGrn.items?.length || 0})
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-10">#</th>
                        <th className="py-2.5 px-3">Item Code</th>
                        <th className="py-2.5 px-3">Item Name &amp; Revision</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3">UOM</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate</th>
                        <th className="py-2.5 px-3 text-center">Tax (%)</th>
                        <th className="py-2.5 px-3 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(previewGrn.items || []).map((it: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono">{i + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-orange-600">{it.itemCode}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {it.itemName} {it.revision && <span className="text-slate-400 text-[10px]">({it.revision})</span>}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold">{it.receivedQty ?? it.quantity ?? 1}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{it.baseUom || it.uom || 'Nos'}</td>
                          <td className="py-2 px-3 text-right font-mono">₹{it.unitRate || 0}</td>
                          <td className="py-2 px-3 text-center font-mono">{it.taxPercent || 0}%</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{Number(it.totalAmount || it.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Valuation Breakdown Card */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Taxable Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">₹{previewGrn.taxableSubtotal || 0}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Item Taxes (GST):</span>
                  <span className="font-mono font-bold text-slate-900">₹{previewGrn.totalItemTax || 0}</span>
                </div>
                {previewGrn.transportationCharges > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Transportation (+ {previewGrn.transportationGstPercent || 0}% GST):</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{previewGrn.transportationCharges + (previewGrn.transportationGstAmount || 0)}
                    </span>
                  </div>
                )}
                {previewGrn.packingCharges > 0 && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Packing &amp; Forwarding (+ {previewGrn.packingGstPercent || 0}% GST):</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{previewGrn.packingCharges + (previewGrn.packingGstAmount || 0)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-extrabold text-sm text-slate-900">
                  <span>Grand Total (INR):</span>
                  <span className="font-mono text-orange-600 text-base">
                    ₹{Number(previewGrn.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Complete Universal Action Tracking (Audit Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Created By
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    {previewGrn.createdByName || 'System Officer'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {previewGrn.createdAt ? new Date(previewGrn.createdAt).toLocaleString() : '—'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Last Updated By
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    {previewGrn.updatedByName || previewGrn.createdByName || 'System Officer'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {previewGrn.updatedAt ? new Date(previewGrn.updatedAt).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Master Expansive Goods Receipt Note (GRN) Builder Modal */}
      <GrnBuilderModal
        isOpen={isGrnModalOpen}
        onClose={() => {
          setIsGrnModalOpen(false);
          setEditingGrn(null);
        }}
        onSuccess={(msg) => showToast(msg)}
        editingGrn={editingGrn}
      />
    </div>
  );
}
