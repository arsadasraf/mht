'use client';

import React, { useState, useMemo } from 'react';
import { useAppSelector } from '../../../store/hooks';
import {
  IndianRupee,
  Search,
  Plus,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  RotateCcw,
  BarChart3,
  Eye,
  Calendar,
  Building2,
  Receipt,
  ShieldCheck,
  Check
} from 'lucide-react';
import {
  useGetBillsQuery,
  useCreateBillMutation,
  useGetVendorsQuery,
  useGetPurchaseOrdersQuery
} from '../api/purchaseApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

interface PurchaseBill {
  id: string;
  billNumber: string;
  vendorName: string;
  poNumber: string;
  gateEntryNo: string;
  billDate: string;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  dueDate: string;
  status: 'MATCHED' | 'PENDING_GRN' | 'DISCREPANCY' | 'APPROVED' | 'PAID' | string;
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt?: string;
}

const MONTHS = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' },
  { value: '05', label: 'May' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Aug' },
  { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' }
];

export default function PurchaseBillsTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data: billData, isLoading } = useGetBillsQuery({});
  const { data: vendorData } = useGetVendorsQuery({});
  const { data: poData } = useGetPurchaseOrdersQuery({});
  const [createBillMutation, { isLoading: isCreating }] = useCreateBillMutation();

  const bills: PurchaseBill[] = billData?.bills || [];
  const vendors = vendorData?.vendors || [];
  const purchaseOrders = poData?.purchaseOrders || [];

  // Filter & Toolbar States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [showMetrics, setShowMetrics] = useState(false);

  // Column Filters State
  const [columnFilters, setColumnFilters] = useState<{
    billNumber: string[] | null;
    vendorName: string[] | null;
    poNumber: string[] | null;
    gateEntryNo: string[] | null;
    dueDate: string[] | null;
    status: string[] | null;
  }>({
    billNumber: null,
    vendorName: null,
    poNumber: null,
    gateEntryNo: null,
    dueDate: null,
    status: null
  });

  // Sorting State
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBillDetails, setSelectedBillDetails] = useState<PurchaseBill | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    billNumber: '',
    vendorName: '',
    poNumber: '',
    gateEntryNo: '',
    billDate: new Date().toISOString().split('T')[0],
    taxableAmount: '',
    taxAmount: '',
    dueDate: ''
  });

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    bills.forEach((b) => {
      const dateStr = b.billDate || b.createdAt;
      if (dateStr) {
        years.add(new Date(dateStr).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [bills]);

  // Distinct Values for Header Excel Column Filters
  const distinctBillNumbers = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    bills.forEach((b) => {
      const code = String(b.billNumber || '(Blanks)').trim();
      counts.set(code, (counts.get(code) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [bills]);

  const distinctVendors = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    bills.forEach((b) => {
      const v = String(b.vendorName || '(Blanks)').trim();
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [bills]);

  const distinctPoRefs = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    bills.forEach((b) => {
      const p = String(b.poNumber || '(Blanks)').trim();
      counts.set(p, (counts.get(p) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [bills]);

  const distinctGateRefs = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    bills.forEach((b) => {
      const g = String(b.gateEntryNo || '(Blanks)').trim();
      counts.set(g, (counts.get(g) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [bills]);

  const distinctDueDates = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    bills.forEach((b) => {
      const d = String(b.dueDate || '(Blanks)').trim();
      counts.set(d, (counts.get(d) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [bills]);

  const distinctStatuses = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    bills.forEach((b) => {
      const s = String(b.status || '(Blanks)').trim();
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [bills]);

  // Handle Sort Change
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  // Filtered & Sorted Bills
  const filteredBills = useMemo(() => {
    return bills
      .filter((b) => {
        // Search Term Filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchBill = b.billNumber?.toLowerCase().includes(term);
          const matchVendor = b.vendorName?.toLowerCase().includes(term);
          const matchPo = b.poNumber?.toLowerCase().includes(term);
          const matchGate = b.gateEntryNo?.toLowerCase().includes(term);
          if (!matchBill && !matchVendor && !matchPo && !matchGate) return false;
        }

        // Year & Month Filter
        const dateStr = b.billDate || b.createdAt;
        if (dateStr) {
          const d = new Date(dateStr);
          if (selectedYear !== 'ALL' && d.getFullYear().toString() !== selectedYear) return false;
          if (selectedMonth !== 'ALL') {
            const m = String(d.getMonth() + 1).padStart(2, '0');
            if (m !== selectedMonth) return false;
          }
        }

        // Excel Column Filters
        if (columnFilters.billNumber) {
          const val = String(b.billNumber || '(Blanks)').trim();
          if (!columnFilters.billNumber.includes(val)) return false;
        }
        if (columnFilters.vendorName) {
          const val = String(b.vendorName || '(Blanks)').trim();
          if (!columnFilters.vendorName.includes(val)) return false;
        }
        if (columnFilters.poNumber) {
          const val = String(b.poNumber || '(Blanks)').trim();
          if (!columnFilters.poNumber.includes(val)) return false;
        }
        if (columnFilters.gateEntryNo) {
          const val = String(b.gateEntryNo || '(Blanks)').trim();
          if (!columnFilters.gateEntryNo.includes(val)) return false;
        }
        if (columnFilters.dueDate) {
          const val = String(b.dueDate || '(Blanks)').trim();
          if (!columnFilters.dueDate.includes(val)) return false;
        }
        if (columnFilters.status) {
          const val = String(b.status || '(Blanks)').trim();
          if (!columnFilters.status.includes(val)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const valA: any = a[sortField as keyof PurchaseBill] ?? '';
        const valB: any = b[sortField as keyof PurchaseBill] ?? '';

        if (typeof valA === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
      });
  }, [bills, searchTerm, selectedYear, selectedMonth, columnFilters, sortField, sortDirection]);

  // Live Dynamic Metrics
  const metrics = useMemo(() => {
    const totalBills = filteredBills.length;
    const matchedCount = filteredBills.filter((b) => b.status === 'MATCHED' || b.status === 'APPROVED').length;
    const pendingGrnCount = filteredBills.filter((b) => b.status === 'PENDING_GRN').length;
    const totalBillValue = filteredBills.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    return {
      totalBills,
      matchedCount,
      pendingGrnCount,
      totalBillValue
    };
  }, [filteredBills]);

  // Is any filter active?
  const isFilterActive =
    searchTerm.trim() !== '' ||
    selectedYear !== 'ALL' ||
    selectedMonth !== 'ALL' ||
    Object.values(columnFilters).some((v) => v !== null);

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedYear('ALL');
    setSelectedMonth('ALL');
    setColumnFilters({
      billNumber: null,
      vendorName: null,
      poNumber: null,
      gateEntryNo: null,
      dueDate: null,
      status: null
    });
    setSortField('createdAt');
    setSortDirection('desc');
  };

  const handleRecordBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.billNumber.trim() || !formData.vendorName.trim()) return;

    const taxable = parseFloat(formData.taxableAmount) || 0;
    const tax = parseFloat(formData.taxAmount) || taxable * 0.18;

    try {
      await createBillMutation({
        billNumber: formData.billNumber.trim(),
        vendorName: formData.vendorName.trim(),
        poNumber: formData.poNumber.trim(),
        gateEntryNo: formData.gateEntryNo.trim(),
        taxableAmount: taxable,
        taxAmount: tax,
        dueDate: formData.dueDate
      }).unwrap();

      setFormData({
        billNumber: '',
        vendorName: '',
        poNumber: '',
        gateEntryNo: '',
        billDate: new Date().toISOString().split('T')[0],
        taxableAmount: '',
        taxAmount: '',
        dueDate: ''
      });
      setIsModalOpen(false);
    } catch {
      // Handled by RTK Query
    }
  };

  const getStatusBadge = (status: PurchaseBill['status']) => {
    switch (status) {
      case 'MATCHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> Matched
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <CheckCircle2 size={11} /> Approved
          </span>
        );
      case 'PENDING_GRN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} /> Pending Inward
          </span>
        );
      case 'DISCREPANCY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle size={11} /> Mismatch
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Collapsible Dashboard */}
      {showMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 transition-all duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Purchase Bills</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">{metrics.totalBills}</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <IndianRupee size={16} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Invoiced</div>
              <div className="text-base font-extrabold text-emerald-700 mt-0.5">
                {formatCurrency(metrics.totalBillValue)}
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileCheck size={16} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">3-Way Matched</div>
              <div className="text-base font-extrabold text-sky-600 mt-0.5">{metrics.matchedCount}</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Pending Inward</div>
              <div className="text-base font-extrabold text-amber-600 mt-0.5">{metrics.pendingGrnCount}</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
        </div>
      )}

      {/* Top Dedicated In-Line Table Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice #, vendor, PO ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Center: Month & Year Selector */}
        <div className="flex items-center gap-2">
          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-orange-500"
          >
            <option value="ALL">All Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-orange-500"
          >
            <option value="ALL">Whole Month</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Metrics Toggle Button */}
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            title={showMetrics ? 'Hide Metrics' : 'Show Metrics'}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
              showMetrics
                ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart3 size={15} />
            <span className="hidden sm:inline">Metrics</span>
          </button>

          {/* Reset Filters Button */}
          {isFilterActive && (
            <button
              onClick={resetAllFilters}
              title="Reset all filters"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-orange-600 transition-all shadow-xs"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {/* Primary Action Button */}
          <button
            onClick={() => {
              setFormData({
                billNumber: '',
                vendorName: '',
                poNumber: '',
                gateEntryNo: '',
                billDate: new Date().toISOString().split('T')[0],
                taxableAmount: '',
                taxAmount: '',
                dueDate: ''
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-xs shadow-orange-500/20 transition-all shrink-0"
          >
            <Plus size={15} />
            <span>Record Inward Bill</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center text-slate-400">#</th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Invoice Number"
                    columnKey="billNumber"
                    distinctValues={distinctBillNumbers}
                    selectedValues={columnFilters.billNumber}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, billNumber: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => handleSortChange(field, dir)}
                  />
                </th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Vendor"
                    columnKey="vendorName"
                    distinctValues={distinctVendors}
                    selectedValues={columnFilters.vendorName}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, vendorName: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => handleSortChange(field, dir)}
                  />
                </th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="PO Ref"
                    columnKey="poNumber"
                    distinctValues={distinctPoRefs}
                    selectedValues={columnFilters.poNumber}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, poNumber: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => handleSortChange(field, dir)}
                  />
                </th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Gate Ref"
                    columnKey="gateEntryNo"
                    distinctValues={distinctGateRefs}
                    selectedValues={columnFilters.gateEntryNo}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, gateEntryNo: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => handleSortChange(field, dir)}
                  />
                </th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Total Amount"
                    columnKey="totalAmount"
                    distinctValues={[]}
                    selectedValues={null}
                    onFilterChange={() => {}}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => handleSortChange(field, dir)}
                  />
                </th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Due Date"
                    columnKey="dueDate"
                    distinctValues={distinctDueDates}
                    selectedValues={columnFilters.dueDate}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, dueDate: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => handleSortChange(field, dir)}
                  />
                </th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Status"
                    columnKey="status"
                    distinctValues={distinctStatuses}
                    selectedValues={columnFilters.status}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, status: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => handleSortChange(field, dir)}
                  />
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading purchase bills...
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No purchase bills found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b, idx) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedBillDetails(b)}
                        className="font-mono font-bold text-orange-600 hover:text-orange-700 hover:underline text-left"
                      >
                        {b.billNumber}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{b.vendorName}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-orange-600">{b.poNumber || '—'}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{b.gateEntryNo || '—'}</td>
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-900">
                      {formatCurrency(b.totalAmount)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 font-medium">{b.dueDate || '—'}</td>
                    <td className="py-3 px-4">{getStatusBadge(b.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedBillDetails(b)}
                          title="View Bill Dossier"
                          className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Details Preview Dossier Modal */}
      {selectedBillDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            {/* Header Ribbon (Title and Icon Only) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <IndianRupee size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {selectedBillDetails.billNumber}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">Inward Purchase Bill Dossier</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedBillDetails(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto text-xs">
              {/* 3-Way Match Verification Banner */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-emerald-950">3-Way Match Audit Verification</div>
                    <div className="text-[11px] text-emerald-700 font-medium">
                      Matched against PO: <span className="font-mono font-bold">{selectedBillDetails.poNumber || '—'}</span> & Gate Ref: <span className="font-mono font-bold">{selectedBillDetails.gateEntryNo || '—'}</span>
                    </div>
                  </div>
                </div>
                <div>{getStatusBadge(selectedBillDetails.status)}</div>
              </div>

              {/* Primary Specs Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Vendor Name</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedBillDetails.vendorName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">PO Reference</span>
                  <span className="font-mono font-bold text-orange-600 text-sm">
                    {selectedBillDetails.poNumber || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Gate Entry Reference</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedBillDetails.gateEntryNo || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Payment Due Date</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedBillDetails.dueDate || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Taxable Base Amount</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(selectedBillDetails.taxableAmount)}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">GST Tax Amount</span>
                  <span className="font-mono font-bold text-slate-700">
                    {formatCurrency(selectedBillDetails.taxAmount)}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-sm">Total Invoiced Amount</span>
                  <span className="font-mono font-extrabold text-emerald-700 text-base">
                    {formatCurrency(selectedBillDetails.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Complete Audit Section */}
              <div className="pt-3 border-t border-slate-200">
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
                  Audit Tracking
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created By</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {selectedBillDetails.createdByName || 'System User'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {selectedBillDetails.createdAt
                        ? new Date(selectedBillDetails.createdAt).toLocaleString('en-IN')
                        : '—'}
                    </div>
                  </div>

                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Updated By</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {selectedBillDetails.updatedByName ||
                        selectedBillDetails.createdByName ||
                        'System User'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {selectedBillDetails.updatedAt
                        ? new Date(selectedBillDetails.updatedAt).toLocaleString('en-IN')
                        : selectedBillDetails.createdAt
                        ? new Date(selectedBillDetails.createdAt).toLocaleString('en-IN')
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedBillDetails(null)}
                  className="px-5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Inward Bill Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            {/* Header Ribbon (Title and Icon Only) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <IndianRupee size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Record Inward Purchase Bill
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">3-Way matching verification with PO and GRN</div>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRecordBill} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Invoice Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-0891"
                    value={formData.billNumber}
                    onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="billVendorList"
                    placeholder="Vendor name"
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                    required
                  />
                  <datalist id="billVendorList">
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.vendorName || v.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PO Reference
                  </label>
                  <input
                    type="text"
                    list="billPoList"
                    placeholder="Link to Outward PO"
                    value={formData.poNumber}
                    onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                  <datalist id="billPoList">
                    {purchaseOrders.map((po: any) => (
                      <option key={po.id} value={po.poNumber} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Gate Entry / GRN Ref
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GE-2026-0042"
                    value={formData.gateEntryNo}
                    onChange={(e) => setFormData({ ...formData, gateEntryNo: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Taxable Base Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Taxable amount"
                    value={formData.taxableAmount}
                    onChange={(e) => {
                      const taxable = parseFloat(e.target.value) || 0;
                      const calculatedTax = (taxable * 0.18).toFixed(2);
                      setFormData({
                        ...formData,
                        taxableAmount: e.target.value,
                        taxAmount: calculatedTax
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GST Tax Amount (₹) (Auto 18%)
                  </label>
                  <input
                    type="number"
                    placeholder="Tax amount"
                    value={formData.taxAmount}
                    onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={formData.billDate}
                    onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              {/* Total Calculation Preview */}
              {formData.taxableAmount && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">Calculated Total Payable:</span>
                  <span className="font-mono font-extrabold text-emerald-700 text-sm">
                    {formatCurrency(
                      (parseFloat(formData.taxableAmount) || 0) + (parseFloat(formData.taxAmount) || 0)
                    )}
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-xs disabled:opacity-50"
                >
                  {isCreating ? 'Saving...' : 'Record Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
