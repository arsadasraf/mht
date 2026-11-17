'use client';

import React, { useState, useMemo } from 'react';
import { useAppSelector } from '../../../store/hooks';
import {
  Inbox,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  X,
  Send,
  RotateCcw,
  BarChart3,
  Eye,
  Calendar,
  Users,
  Check,
  Package
} from 'lucide-react';
import { useGetVendorsQuery, useGetRfqsQuery, useCreateRfqMutation } from '../api/purchaseApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

interface RfqItem {
  id: string;
  rfqNumber: string;
  projectId: string;
  title: string;
  vendorCount: number;
  itemCount: number;
  submissionDeadline: string;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_QUOTED' | 'CLOSED';
  items?: any;
  vendors?: any;
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

export default function OutwardRfqTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data: vendorData } = useGetVendorsQuery({});
  const { data: rfqData, isLoading } = useGetRfqsQuery({});
  const [createRfqMutation, { isLoading: isCreating }] = useCreateRfqMutation();

  const vendors = vendorData?.vendors || [];
  const rfqs: RfqItem[] = rfqData?.rfqs || [];

  // Filter & Toolbar States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [showMetrics, setShowMetrics] = useState(false);

  // Column Filters State
  const [columnFilters, setColumnFilters] = useState<{
    rfqNumber: string[] | null;
    projectId: string[] | null;
    title: string[] | null;
    status: string[] | null;
  }>({
    rfqNumber: null,
    projectId: null,
    title: null,
    status: null
  });

  // Sorting State
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRfqDetails, setSelectedRfqDetails] = useState<RfqItem | null>(null);

  // Modal Form State
  const [formData, setFormData] = useState({
    title: '',
    projectId: activeProjectId || '',
    submissionDeadline: '',
    selectedVendors: [] as string[],
    notes: '',
    items: [] as Array<{ itemCode: string; description: string; qty: number; uom: string }>
  });

  // New Item Row state inside form
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUom, setNewItemUom] = useState('Nos');

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    rfqs.forEach((r) => {
      if (r.createdAt) {
        years.add(new Date(r.createdAt).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [rfqs]);

  // Distinct Values for Header Excel Column Filters
  const distinctRfqNumbers = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    rfqs.forEach((r) => {
      const code = String(r.rfqNumber || '(Blanks)').trim();
      counts.set(code, (counts.get(code) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [rfqs]);

  const distinctProjects = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    rfqs.forEach((r) => {
      const p = String(r.projectId || '(Blanks)').trim();
      counts.set(p, (counts.get(p) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [rfqs]);

  const distinctTitles = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    rfqs.forEach((r) => {
      const t = String(r.title || '(Blanks)').trim();
      counts.set(t, (counts.get(t) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [rfqs]);

  const distinctStatuses = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    rfqs.forEach((r) => {
      const s = String(r.status || '(Blanks)').trim();
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [rfqs]);

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  // Filtered & Sorted RFQs
  const filteredRfqs = useMemo(() => {
    let result = rfqs.filter((r) => {
      // 1. Month & Year filter
      if (selectedYear !== 'ALL' || selectedMonth !== 'ALL') {
        const d = r.createdAt ? new Date(r.createdAt) : null;
        if (!d) return false;
        if (selectedYear !== 'ALL' && d.getFullYear().toString() !== selectedYear) return false;
        if (selectedMonth !== 'ALL') {
          const mStr = String(d.getMonth() + 1).padStart(2, '0');
          if (mStr !== selectedMonth) return false;
        }
      }

      // 2. Keyword Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesCode = r.rfqNumber?.toLowerCase().includes(q);
        const matchesTitle = r.title?.toLowerCase().includes(q);
        const matchesProj = r.projectId?.toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle && !matchesProj) return false;
      }

      // 3. Column Filters
      if (columnFilters.rfqNumber && !columnFilters.rfqNumber.includes(r.rfqNumber || '(Blanks)')) return false;
      if (columnFilters.projectId && !columnFilters.projectId.includes(r.projectId || '(Blanks)')) return false;
      if (columnFilters.title && !columnFilters.title.includes(r.title || '(Blanks)')) return false;
      if (columnFilters.status && !columnFilters.status.includes(r.status || '(Blanks)')) return false;

      return true;
    });

    // Sorting
    result.sort((a: any, b: any) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDirection === 'asc' ? -1 : 1;
      if (va > vb) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [rfqs, selectedYear, selectedMonth, searchTerm, columnFilters, sortField, sortDirection]);

  // Check if any filter is active
  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    selectedYear !== 'ALL' ||
    selectedMonth !== 'ALL' ||
    Object.values(columnFilters).some((f) => f !== null);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedYear('ALL');
    setSelectedMonth('ALL');
    setColumnFilters({
      rfqNumber: null,
      projectId: null,
      title: null,
      status: null
    });
  };

  // Dynamic Metrics computed live from filteredRfqs
  const dynamicMetrics = useMemo(() => {
    const total = filteredRfqs.length;
    const sent = filteredRfqs.filter((r) => r.status === 'SENT').length;
    const partiallyQuoted = filteredRfqs.filter((r) => r.status === 'PARTIALLY_QUOTED').length;
    const closed = filteredRfqs.filter((r) => r.status === 'CLOSED').length;
    return { total, sent, partiallyQuoted, closed };
  }, [filteredRfqs]);

  // Handle Create RFQ submit
  const handleCreateRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      await createRfqMutation({
        title: formData.title,
        projectId: formData.projectId || activeProjectId,
        submissionDeadline: formData.submissionDeadline,
        items: formData.items,
        notes: formData.notes
      }).unwrap();

      setFormData({
        title: '',
        projectId: activeProjectId || '',
        submissionDeadline: '',
        selectedVendors: [],
        notes: '',
        items: []
      });
      setIsModalOpen(false);
    } catch {
      setIsModalOpen(false);
    }
  };

  const handleAddItemToForm = () => {
    if (!newItemCode.trim()) return;
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemCode: newItemCode.trim(),
          description: newItemDesc.trim() || newItemCode.trim(),
          qty: parseFloat(newItemQty) || 1,
          uom: newItemUom
        }
      ]
    }));
    setNewItemCode('');
    setNewItemDesc('');
    setNewItemQty('1');
    setNewItemUom('Nos');
  };

  const handleRemoveItemFromForm = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: RfqItem['status']) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock size={10} /> Active Sent
          </span>
        );
      case 'PARTIALLY_QUOTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={10} /> Partially Quoted
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={10} /> Closed
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Dashboard (Hidden by default, toggleable via BarChart3) */}
      {showMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total RFQs</div>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5 font-mono">
                {dynamicMetrics.total}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center justify-center shrink-0">
              <Inbox size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Sent</div>
              <div className="text-xl font-extrabold text-sky-600 mt-0.5 font-mono">
                {dynamicMetrics.sent}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/60 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Partially Quoted</div>
              <div className="text-xl font-extrabold text-amber-600 mt-0.5 font-mono">
                {dynamicMetrics.partiallyQuoted}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Closed / Converted</div>
              <div className="text-xl font-extrabold text-emerald-600 mt-0.5 font-mono">
                {dynamicMetrics.closed}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Top Dedicated In-Line Table Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left Side: Dedicated Search Bar */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search RFQ number, title, project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-orange-500 font-medium text-slate-800"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Center: Month & Year Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className={`text-xs px-2.5 py-2 rounded-xl border font-bold transition-all cursor-pointer focus:outline-hidden ${
              selectedYear !== 'ALL'
                ? 'bg-orange-50 border-orange-300 text-orange-900 shadow-2xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <option value="ALL">All Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={`text-xs px-2.5 py-2 rounded-xl border font-bold transition-all cursor-pointer focus:outline-hidden ${
              selectedMonth !== 'ALL'
                ? 'bg-orange-50 border-orange-300 text-orange-900 shadow-2xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <option value="ALL">Whole Year</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right Side: Metrics Toggle + Primary Add Button + Reset Filters */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowMetrics((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
              showMetrics
                ? 'bg-orange-50 border-orange-300 text-orange-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Toggle Dynamic KPI Metrics"
          >
            <BarChart3 size={14} className={showMetrics ? 'text-orange-600' : 'text-slate-500'} />
            <span className="hidden sm:inline">{showMetrics ? 'Hide Metrics' : 'Show Metrics'}</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-2xs"
              title="Reset all active filters"
            >
              <RotateCcw size={13} className="text-slate-500" />
              <span className="hidden sm:inline">Reset Filters</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setFormData({
                title: '',
                projectId: activeProjectId || '',
                submissionDeadline: '',
                selectedVendors: [],
                notes: '',
                items: []
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Outward RFQ</span>
          </button>
        </div>
      </div>

      {/* RFQ Data Table with ExcelColumnFilter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-center w-12 font-mono text-slate-400">#</th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="RFQ Number"
                    columnKey="rfqNumber"
                    distinctValues={distinctRfqNumbers}
                    selectedValues={columnFilters.rfqNumber}
                    onFilterChange={(selected) =>
                      setColumnFilters((prev) => ({ ...prev, rfqNumber: selected }))
                    }
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Work Order / Project"
                    columnKey="projectId"
                    distinctValues={distinctProjects}
                    selectedValues={columnFilters.projectId}
                    onFilterChange={(selected) =>
                      setColumnFilters((prev) => ({ ...prev, projectId: selected }))
                    }
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="RFQ Package Title"
                    columnKey="title"
                    distinctValues={distinctTitles}
                    selectedValues={columnFilters.title}
                    onFilterChange={(selected) =>
                      setColumnFilters((prev) => ({ ...prev, title: selected }))
                    }
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-center">Vendors</th>
                <th className="py-3 px-4">Submission Deadline</th>
                <th className="py-3 px-4 text-center">
                  <ExcelColumnFilter
                    title="Status"
                    columnKey="status"
                    distinctValues={distinctStatuses}
                    selectedValues={columnFilters.status}
                    onFilterChange={(selected) =>
                      setColumnFilters((prev) => ({ ...prev, status: selected }))
                    }
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading outward RFQ records...
                  </td>
                </tr>
              ) : filteredRfqs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Inbox size={32} className="mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-700">No Outward RFQs match criteria.</p>
                      <p className="text-[11px] text-slate-400">
                        {hasActiveFilters
                          ? 'Try resetting your month/year or column filters.'
                          : 'Click "Create Outward RFQ" above to dispatch your first request.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRfqs.map((rfq, idx) => (
                  <tr
                    key={rfq.id || idx}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => setSelectedRfqDetails(rfq)}
                  >
                    <td className="py-3.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Clickable RFQ Identifier */}
                    <td className="py-3.5 px-4 font-mono font-bold text-orange-600 group-hover:underline">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRfqDetails(rfq);
                        }}
                        className="text-left font-mono font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                      >
                        {rfq.rfqNumber}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {rfq.projectId || '—'}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      {rfq.title}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {rfq.itemCount || (Array.isArray(rfq.items) ? rfq.items.length : 1)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {rfq.vendorCount || (Array.isArray(rfq.vendors) ? rfq.vendors.length : 1)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {formatDate(rfq.submissionDeadline)}
                    </td>

                    <td className="py-3.5 px-4 text-center">{getStatusBadge(rfq.status)}</td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedRfqDetails(rfq)}
                        className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
                        title="View RFQ Preview Dossier"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View RFQ Preview Dossier Modal with Audit Trail */}
      {selectedRfqDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header Ribbon with Amber Top Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Inbox size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {selectedRfqDetails.rfqNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Outward Request for Quotation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRfqDetails(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto text-xs">
              {/* Specification Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                    RFQ Details
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Package Title:</span>
                      <span className="font-bold text-slate-900 text-right">{selectedRfqDetails.title}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Work Order Ref:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedRfqDetails.projectId || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Submission Deadline:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatDate(selectedRfqDetails.submissionDeadline)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Status:</span>
                      <span>{getStatusBadge(selectedRfqDetails.status)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                    Distribution Scope
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Vendors Invited:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedRfqDetails.vendorCount || 1} Suppliers
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Line Items Sourced:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedRfqDetails.itemCount || 1} Items
                      </span>
                    </div>
                    {selectedRfqDetails.notes && (
                      <div className="pt-1">
                        <span className="text-slate-500 block mb-1">Notes / Instructions:</span>
                        <p className="text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200/60">
                          {selectedRfqDetails.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items List Table */}
              {Array.isArray(selectedRfqDetails.items) && selectedRfqDetails.items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Sourced Items Checklist
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3">Item Code</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3 text-right">Required Qty</th>
                          <th className="py-2 px-3 text-center">UOM</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRfqDetails.items.map((it: any, iIdx: number) => (
                          <tr key={iIdx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 text-center font-mono text-slate-400">{iIdx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{it.itemCode}</td>
                            <td className="py-2 px-3 text-slate-700">{it.description}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {it.qty}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-600">{it.uom}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Mandatory Universal Action Tracking / Complete Audit Section */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">
                  Audit Trail
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Created By</p>
                      <p className="text-xs font-bold text-slate-800">
                        {selectedRfqDetails.createdByName || 'Procurement Team'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {formatDateTime(selectedRfqDetails.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Last Updated By</p>
                      <p className="text-xs font-bold text-slate-800">
                        {selectedRfqDetails.updatedByName || selectedRfqDetails.createdByName || 'System'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {formatDateTime(selectedRfqDetails.updatedAt || selectedRfqDetails.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedRfqDetails(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-all cursor-pointer shadow-2xs"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create RFQ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Inbox size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">Create Outward RFQ</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Float Request for Quotation to Suppliers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateRfq} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Work Order / Project Reference</label>
                  <input
                    type="text"
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-orange-500 font-mono font-semibold"
                    placeholder="e.g. WO-2026-0001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Submission Deadline *</label>
                  <input
                    type="date"
                    value={formData.submissionDeadline}
                    onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">RFQ Package Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Machined Components & Pinions Package"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-medium"
                  required
                />
              </div>

              {/* Items Table Builder */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Sourced Items ({formData.items.length})</span>
                  <span className="text-[10px] text-slate-400">Add leaf items to request quotes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Item Code / Part No."
                      value={newItemCode}
                      onChange={(e) => setNewItemCode(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Description"
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-orange-500 font-mono font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-1">
                    <select
                      value={newItemUom}
                      onChange={(e) => setNewItemUom(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-orange-500"
                    >
                      <option value="Nos">Nos</option>
                      <option value="Kg">Kg</option>
                      <option value="Set">Set</option>
                      <option value="Mtr">Mtr</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddItemToForm}
                      disabled={!newItemCode.trim()}
                      className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {formData.items.length > 0 && (
                  <div className="divide-y divide-slate-200 border border-slate-200 bg-white rounded-lg overflow-hidden">
                    {formData.items.map((it, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-orange-600">{it.itemCode}</span>
                          <span className="text-slate-600 truncate max-w-xs">{it.description}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900">
                            {it.qty} {it.uom}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromForm(idx)}
                            className="text-slate-400 hover:text-red-600 p-0.5"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Notes / Technical Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Specify delivery destination, quality cert requirements, or payment terms..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 transition-colors shadow-xs shadow-orange-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>Dispatch Outward RFQ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
