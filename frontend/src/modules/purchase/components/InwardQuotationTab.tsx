'use client';

import React, { useState, useMemo } from 'react';
import { useAppSelector } from '../../../store/hooks';
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Receipt,
  X,
  TrendingDown,
  Award,
  RotateCcw,
  BarChart3,
  Eye,
  Calendar,
  Layers,
  FileText,
  IndianRupee,
  Check
} from 'lucide-react';
import {
  useGetQuotationsQuery,
  useCreateQuotationMutation,
  useGetVendorsQuery,
  useGetRfqsQuery
} from '../api/purchaseApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

interface VendorQuote {
  id: string;
  quoteNumber: string;
  rfqNumber: string;
  vendorName: string;
  projectId?: string;
  receivedDate: string;
  quotedAmount?: number;
  totalAmountINR?: number;
  leadTimeDays: number;
  paymentTerms: string;
  status: 'RECEIVED' | 'UNDER_REVIEW' | 'ACCEPTED_L1' | 'REJECTED' | string;
  items?: any;
  notes?: string;
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

export default function InwardQuotationTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data: quoteData, isLoading } = useGetQuotationsQuery({});
  const { data: vendorData } = useGetVendorsQuery({});
  const { data: rfqData } = useGetRfqsQuery({});
  const [createQuotationMutation, { isLoading: isCreating }] = useCreateQuotationMutation();

  const quotes: VendorQuote[] = quoteData?.quotations || [];
  const vendors = vendorData?.vendors || [];
  const rfqs = rfqData?.rfqs || [];

  // Filter & Toolbar States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [showMetrics, setShowMetrics] = useState(false);

  // Column Filters State
  const [columnFilters, setColumnFilters] = useState<{
    quoteNumber: string[] | null;
    rfqNumber: string[] | null;
    vendorName: string[] | null;
    leadTimeDays: string[] | null;
    paymentTerms: string[] | null;
    status: string[] | null;
  }>({
    quoteNumber: null,
    rfqNumber: null,
    vendorName: null,
    leadTimeDays: null,
    paymentTerms: null,
    status: null
  });

  // Sorting State
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuoteForPreview, setSelectedQuoteForPreview] = useState<VendorQuote | null>(null);

  // Record Quotation Form State
  const [formData, setFormData] = useState({
    quoteNumber: '',
    rfqNumber: '',
    vendorName: '',
    projectId: activeProjectId || '',
    quotedAmount: '',
    leadTimeDays: '14',
    paymentTerms: '30 Days Net',
    receivedDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [] as Array<{ itemCode: string; description: string; qty: number; unitRate: number; total: number }>
  });

  // Line item adder state
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemRate, setNewItemRate] = useState('');

  // Format INR Currency
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
    quotes.forEach((q) => {
      const dateStr = q.receivedDate || q.createdAt;
      if (dateStr) {
        years.add(new Date(dateStr).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [quotes]);

  // Distinct Values for Header Excel Column Filters
  const distinctQuoteNumbers = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    quotes.forEach((q) => {
      const code = String(q.quoteNumber || '(Blanks)').trim();
      counts.set(code, (counts.get(code) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [quotes]);

  const distinctRfqRefs = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    quotes.forEach((q) => {
      const r = String(q.rfqNumber || '(Blanks)').trim();
      counts.set(r, (counts.get(r) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [quotes]);

  const distinctVendors = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    quotes.forEach((q) => {
      const v = String(q.vendorName || '(Blanks)').trim();
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [quotes]);

  const distinctLeadTimes = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    quotes.forEach((q) => {
      const lt = q.leadTimeDays ? `${q.leadTimeDays} Days` : '(Blanks)';
      counts.set(lt, (counts.get(lt) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [quotes]);

  const distinctPaymentTerms = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    quotes.forEach((q) => {
      const pt = String(q.paymentTerms || '(Blanks)').trim();
      counts.set(pt, (counts.get(pt) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [quotes]);

  const distinctStatuses = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    quotes.forEach((q) => {
      const s = String(q.status || '(Blanks)').trim();
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [quotes]);

  // Handle Sort Change
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  // Filtered & Sorted Quotes
  const filteredQuotes = useMemo(() => {
    return quotes
      .filter((q) => {
        // Search Term Filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchQuote = q.quoteNumber?.toLowerCase().includes(term);
          const matchVendor = q.vendorName?.toLowerCase().includes(term);
          const matchRfq = q.rfqNumber?.toLowerCase().includes(term);
          const matchTerms = q.paymentTerms?.toLowerCase().includes(term);
          if (!matchQuote && !matchVendor && !matchRfq && !matchTerms) return false;
        }

        // Year & Month Filter
        const dateStr = q.receivedDate || q.createdAt;
        if (dateStr) {
          const d = new Date(dateStr);
          if (selectedYear !== 'ALL' && d.getFullYear().toString() !== selectedYear) return false;
          if (selectedMonth !== 'ALL') {
            const m = String(d.getMonth() + 1).padStart(2, '0');
            if (m !== selectedMonth) return false;
          }
        }

        // Excel Column Filters
        if (columnFilters.quoteNumber) {
          const val = String(q.quoteNumber || '(Blanks)').trim();
          if (!columnFilters.quoteNumber.includes(val)) return false;
        }
        if (columnFilters.rfqNumber) {
          const val = String(q.rfqNumber || '(Blanks)').trim();
          if (!columnFilters.rfqNumber.includes(val)) return false;
        }
        if (columnFilters.vendorName) {
          const val = String(q.vendorName || '(Blanks)').trim();
          if (!columnFilters.vendorName.includes(val)) return false;
        }
        if (columnFilters.leadTimeDays) {
          const val = q.leadTimeDays ? `${q.leadTimeDays} Days` : '(Blanks)';
          if (!columnFilters.leadTimeDays.includes(val)) return false;
        }
        if (columnFilters.paymentTerms) {
          const val = String(q.paymentTerms || '(Blanks)').trim();
          if (!columnFilters.paymentTerms.includes(val)) return false;
        }
        if (columnFilters.status) {
          const val = String(q.status || '(Blanks)').trim();
          if (!columnFilters.status.includes(val)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField as keyof VendorQuote] ?? '';
        let valB: any = b[sortField as keyof VendorQuote] ?? '';

        if (sortField === 'quotedAmount') {
          valA = a.quotedAmount ?? a.totalAmountINR ?? 0;
          valB = b.quotedAmount ?? b.totalAmountINR ?? 0;
        }

        if (typeof valA === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
      });
  }, [quotes, searchTerm, selectedYear, selectedMonth, columnFilters, sortField, sortDirection]);

  // Live Metrics (recalculated dynamically from filteredQuotes)
  const metrics = useMemo(() => {
    const totalQuotes = filteredQuotes.length;
    const l1Count = filteredQuotes.filter((q) => q.status === 'ACCEPTED_L1').length;
    const csCount = new Set(filteredQuotes.map((q) => q.rfqNumber).filter(Boolean)).size;
    const totalQuotedValue = filteredQuotes.reduce(
      (sum, q) => sum + (Number(q.quotedAmount ?? q.totalAmountINR) || 0),
      0
    );
    return {
      totalQuotes,
      l1Count,
      csCount,
      totalQuotedValue
    };
  }, [filteredQuotes]);

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
      quoteNumber: null,
      rfqNumber: null,
      vendorName: null,
      leadTimeDays: null,
      paymentTerms: null,
      status: null
    });
    setSortField('createdAt');
    setSortDirection('desc');
  };

  // Add Item to Quotation Form
  const handleAddItemToForm = () => {
    if (!newItemCode.trim() || !newItemDesc.trim()) return;
    const qty = parseFloat(newItemQty) || 1;
    const rate = parseFloat(newItemRate) || 0;
    const total = qty * rate;

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemCode: newItemCode.trim().toUpperCase(),
          description: newItemDesc.trim(),
          qty,
          unitRate: rate,
          total
        }
      ],
      quotedAmount: String((parseFloat(prev.quotedAmount) || 0) + total)
    }));

    setNewItemCode('');
    setNewItemDesc('');
    setNewItemQty('1');
    setNewItemRate('');
  };

  const handleRemoveItemFromForm = (idx: number) => {
    setFormData((prev) => {
      const removed = prev.items[idx];
      const updated = prev.items.filter((_, i) => i !== idx);
      const newTotal = (parseFloat(prev.quotedAmount) || 0) - (removed ? removed.total : 0);
      return {
        ...prev,
        items: updated,
        quotedAmount: String(Math.max(0, newTotal))
      };
    });
  };

  // Submit Record Quotation
  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendorName.trim()) return;

    try {
      await createQuotationMutation({
        quoteNumber: formData.quoteNumber.trim() || undefined,
        rfqNumber: formData.rfqNumber.trim() || undefined,
        projectId: formData.projectId || undefined,
        vendorName: formData.vendorName.trim(),
        quotedAmount: parseFloat(formData.quotedAmount) || 0,
        leadTimeDays: parseInt(formData.leadTimeDays, 10) || 14,
        paymentTerms: formData.paymentTerms.trim() || '30 Days Net',
        receivedDate: formData.receivedDate,
        notes: formData.notes.trim(),
        items: formData.items
      }).unwrap();

      setIsModalOpen(false);
      setFormData({
        quoteNumber: '',
        rfqNumber: '',
        vendorName: '',
        projectId: activeProjectId || '',
        quotedAmount: '',
        leadTimeDays: '14',
        paymentTerms: '30 Days Net',
        receivedDate: new Date().toISOString().split('T')[0],
        notes: '',
        items: []
      });
    } catch {
      // Handled by RTK Query
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED_L1':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Award size={11} /> L1 Selected
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock size={11} /> Under Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <X size={11} /> Rejected
          </span>
        );
      case 'RECEIVED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 size={11} /> Received
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
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Inward Quotes</div>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">{metrics.totalQuotes}</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <FileSpreadsheet size={16} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">L1 Lowest Bids</div>
              <div className="text-base font-extrabold text-emerald-600 mt-0.5">{metrics.l1Count}</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award size={16} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Comparative Stmts</div>
              <div className="text-base font-extrabold text-sky-600 mt-0.5">{metrics.csCount}</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Quoted Value</div>
              <div className="text-base font-extrabold text-purple-700 mt-0.5">
                {formatCurrency(metrics.totalQuotedValue)}
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <IndianRupee size={16} />
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
            placeholder="Search quotations, vendors, RFQs..."
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
                quoteNumber: '',
                rfqNumber: '',
                vendorName: '',
                projectId: activeProjectId || '',
                quotedAmount: '',
                leadTimeDays: '14',
                paymentTerms: '30 Days Net',
                receivedDate: new Date().toISOString().split('T')[0],
                notes: '',
                items: []
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-xs shadow-orange-500/20 transition-all shrink-0"
          >
            <Plus size={15} />
            <span>Record Quotation</span>
          </button>
        </div>
      </div>

      {/* Inward Quotation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center text-slate-400">#</th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Quote Number"
                    columnKey="quoteNumber"
                    distinctValues={distinctQuoteNumbers}
                    selectedValues={columnFilters.quoteNumber}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, quoteNumber: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => handleSortChange(field, dir)}
                  />
                </th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="RFQ Ref"
                    columnKey="rfqNumber"
                    distinctValues={distinctRfqRefs}
                    selectedValues={columnFilters.rfqNumber}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, rfqNumber: vals }))}
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
                    title="Quoted Value"
                    columnKey="quotedAmount"
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
                    title="Lead Time"
                    columnKey="leadTimeDays"
                    distinctValues={distinctLeadTimes}
                    selectedValues={columnFilters.leadTimeDays}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, leadTimeDays: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(field, dir) => handleSortChange(field, dir)}
                  />
                </th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Payment Terms"
                    columnKey="paymentTerms"
                    distinctValues={distinctPaymentTerms}
                    selectedValues={columnFilters.paymentTerms}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, paymentTerms: vals }))}
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
                    Loading quotations...
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No inward quotations found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q, idx) => {
                  const quoteAmt = q.quotedAmount ?? q.totalAmountINR ?? 0;
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedQuoteForPreview(q)}
                          className="font-mono font-bold text-orange-600 hover:text-orange-700 hover:underline text-left"
                        >
                          {q.quoteNumber}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{q.rfqNumber || '—'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{q.vendorName}</td>
                      <td className="py-3 px-4 font-mono font-extrabold text-slate-900">
                        {formatCurrency(quoteAmt)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {q.leadTimeDays ? `${q.leadTimeDays}d` : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{q.paymentTerms || '—'}</td>
                      <td className="py-3 px-4">{getStatusBadge(q.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedQuoteForPreview(q)}
                            title="View Quotation Dossier"
                            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
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

      {/* Clickable Row Preview Dossier Modal */}
      {selectedQuoteForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            {/* Header Ribbon (Title and Icon Only) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {selectedQuoteForPreview.quoteNumber}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">Inward Vendor Quotation Dossier</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedQuoteForPreview(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto text-xs">
              {/* Primary Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Vendor Name</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedQuoteForPreview.vendorName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">RFQ Reference</span>
                  <span className="font-mono font-bold text-orange-600 text-sm">
                    {selectedQuoteForPreview.rfqNumber || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Quoted Total Value</span>
                  <span className="font-mono font-extrabold text-slate-900 text-sm">
                    {formatCurrency(
                      selectedQuoteForPreview.quotedAmount ?? selectedQuoteForPreview.totalAmountINR ?? 0
                    )}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Lead Time</span>
                  <span className="font-semibold text-slate-800">
                    {selectedQuoteForPreview.leadTimeDays ? `${selectedQuoteForPreview.leadTimeDays} Days` : '—'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Payment Terms</span>
                  <span className="font-semibold text-slate-800">
                    {selectedQuoteForPreview.paymentTerms || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Status</span>
                  <div>{getStatusBadge(selectedQuoteForPreview.status)}</div>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Received Date</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {selectedQuoteForPreview.receivedDate ||
                      (selectedQuoteForPreview.createdAt
                        ? new Date(selectedQuoteForPreview.createdAt).toLocaleDateString('en-IN')
                        : '—')}
                  </span>
                </div>
                {selectedQuoteForPreview.projectId && (
                  <div>
                    <span className="font-bold text-slate-500 block mb-0.5">Linked Project</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {selectedQuoteForPreview.projectId}
                    </span>
                  </div>
                )}
              </div>

              {/* Quoted Line Items Table */}
              {Array.isArray(selectedQuoteForPreview.items) && selectedQuoteForPreview.items.length > 0 && (
                <div>
                  <div className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <FileText size={15} className="text-orange-600" />
                    <span>Quoted Line Items ({selectedQuoteForPreview.items.length})</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Item Code</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3 text-right">Qty</th>
                          <th className="py-2 px-3 text-right">Unit Rate (₹)</th>
                          <th className="py-2 px-3 text-right">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                        {selectedQuoteForPreview.items.map((item: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-900">{item.itemCode || `ITEM-${i + 1}`}</td>
                            <td className="py-2 px-3 font-sans text-slate-600">{item.description || '—'}</td>
                            <td className="py-2 px-3 text-right">{item.qty || 1}</td>
                            <td className="py-2 px-3 text-right">{formatCurrency(item.unitRate || 0)}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              {formatCurrency(item.total || (item.qty || 1) * (item.unitRate || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedQuoteForPreview.notes && (
                <div>
                  <span className="font-bold text-slate-500 block mb-1">Commercial Notes / Terms</span>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-wrap">
                    {selectedQuoteForPreview.notes}
                  </div>
                </div>
              )}

              {/* Complete Audit Section */}
              <div className="pt-4 border-t border-slate-200">
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
                  Audit Tracking
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created By</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {selectedQuoteForPreview.createdByName || 'System User'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {selectedQuoteForPreview.createdAt
                        ? new Date(selectedQuoteForPreview.createdAt).toLocaleString('en-IN')
                        : '—'}
                    </div>
                  </div>

                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Updated By</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {selectedQuoteForPreview.updatedByName ||
                        selectedQuoteForPreview.createdByName ||
                        'System User'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {selectedQuoteForPreview.updatedAt
                        ? new Date(selectedQuoteForPreview.updatedAt).toLocaleString('en-IN')
                        : selectedQuoteForPreview.createdAt
                        ? new Date(selectedQuoteForPreview.createdAt).toLocaleString('en-IN')
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedQuoteForPreview(null)}
                  className="px-5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Quotation Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            {/* Header Ribbon (Title and Icon Only) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Record Inward Vendor Quotation
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">Log received quote for comparative statement</div>
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
            <form onSubmit={handleSubmitQuotation} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vendor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="vendorList"
                    placeholder="Select or enter vendor name"
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                    required
                  />
                  <datalist id="vendorList">
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.vendorName || v.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    RFQ Reference
                  </label>
                  <input
                    type="text"
                    list="rfqList"
                    placeholder="Link to Outward RFQ"
                    value={formData.rfqNumber}
                    onChange={(e) => setFormData({ ...formData, rfqNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                  />
                  <datalist id="rfqList">
                    {rfqs.map((r: any) => (
                      <option key={r.id} value={r.rfqNumber} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vendor Quote Reference Number
                  </label>
                  <input
                    type="text"
                    placeholder="Vendor's internal quote number (optional)"
                    value={formData.quoteNumber}
                    onChange={(e) => setFormData({ ...formData, quoteNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Received Date
                  </label>
                  <input
                    type="date"
                    value={formData.receivedDate}
                    onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quoted Total Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Total amount"
                    value={formData.quotedAmount}
                    onChange={(e) => setFormData({ ...formData, quotedAmount: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lead Time (Days)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 14"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 30 Days Net, 100% Against Dispatch"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Linked Work Order / Project
                  </label>
                  <input
                    type="text"
                    placeholder="Project / Work Order ID"
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              {/* Item Builder */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Line Items Breakdown (Optional)
                </label>
                <div className="grid grid-cols-12 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3">
                  <div className="col-span-12 sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Item Code"
                      value={newItemCode}
                      onChange={(e) => setNewItemCode(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Description"
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <input
                      type="number"
                      placeholder="Unit Rate"
                      value={newItemRate}
                      onChange={(e) => setNewItemRate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleAddItemToForm}
                      className="w-full py-1.5 text-xs font-bold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Form Items List */}
                {formData.items.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Item Code</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3 text-right">Qty</th>
                          <th className="py-2 px-3 text-right">Unit Rate</th>
                          <th className="py-2 px-3 text-right">Total</th>
                          <th className="py-2 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                        {formData.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-900">{it.itemCode}</td>
                            <td className="py-2 px-3 font-sans text-slate-600">{it.description}</td>
                            <td className="py-2 px-3 text-right">{it.qty}</td>
                            <td className="py-2 px-3 text-right">{formatCurrency(it.unitRate)}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              {formatCurrency(it.total)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemFromForm(idx)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <X size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Terms & Commercial Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Payment milestone details, warranties, delivery conditions..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              {/* Action Buttons */}
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
                  {isCreating ? 'Saving...' : 'Record Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
