'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  RotateCcw,
  X,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Mail,
  Phone,
  User,
  CreditCard,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import {
  useGetVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useGetPurchaseConfigQuery
} from '../api/purchaseApi';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

interface VendorMasterSectionProps {
  className?: string;
}

export default function VendorMasterSection({ className = '' }: VendorMasterSectionProps) {
  const dispatch = useAppDispatch();
  const { data: vendorData, isLoading, refetch: refetchVendors } = useGetVendorsQuery({});
  const { data: configData } = useGetPurchaseConfigQuery({});
  const [createVendor, { isLoading: isCreating }] = useCreateVendorMutation();
  const [updateVendor, { isLoading: isUpdating }] = useUpdateVendorMutation();
  const [deleteVendor] = useDeleteVendorMutation();

  const vendors = useMemo(() => vendorData?.vendors || [], [vendorData]);
  const prefixPolicy = configData?.prefixLockPolicy || {};

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Excel Column Filters State
  const [excelFilters, setExcelFilters] = useState<{
    name: string[] | null;
    type: string[] | null;
    natureOfWork: string[] | null;
    priority: string[] | null;
    email: string[] | null;
    phone: string[] | null;
    contactPerson: string[] | null;
    gstin: string[] | null;
    paymentTerm: string[] | null;
    status: string[] | null;
  }>({
    name: null,
    type: null,
    natureOfWork: null,
    priority: null,
    email: null,
    phone: null,
    contactPerson: null,
    gstin: null,
    paymentTerm: null,
    status: null
  });

  // Modal States
  const [previewVendor, setPreviewVendor] = useState<any | null>(null);
  const [vendorModal, setVendorModal] = useState<{ isOpen: boolean; mode: 'CREATE' | 'EDIT'; item?: any } | null>(null);
  const [deleteConfirmVendor, setDeleteConfirmVendor] = useState<any | null>(null);

  // Form State
  const [vendorForm, setVendorForm] = useState({
    name: '',
    type: 'MANUFACTURER',
    natureOfWork: '',
    priority: 'P1 - High',
    address: '',
    email: '',
    phone: '',
    contactPerson: '',
    gstin: '',
    paymentTerm: '30 Days Net'
  });
  const [formError, setFormError] = useState('');

  // Distinct Values for Header Excel Column Filters
  const distinctVendorNames = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = String(v.name || '(Blanks)').trim();
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [vendors]);

  const distinctTypes = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = String(v.type || '(Blanks)').trim();
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [vendors]);

  const distinctNatureOfWorks = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = String(v.natureOfWork || '(Blanks)').trim();
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [vendors]);

  const distinctPriorities = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = String(v.priority || '(Blanks)').trim();
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [vendors]);

  const distinctEmails = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = String(v.email || '(Blanks)').trim();
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [vendors]);

  const distinctPhones = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = String(v.phone || '(Blanks)').trim();
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [vendors]);

  const distinctContactPersons = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = String(v.contactPerson || '(Blanks)').trim();
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [vendors]);

  const distinctGstins = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = String(v.gstin || '(Blanks)').trim();
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [vendors]);

  const distinctPaymentTerms = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = String(v.paymentTerm || '(Blanks)').trim();
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [vendors]);

  const distinctStatuses = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = v.isActive !== false ? 'Active' : 'Inactive';
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [vendors]);

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm.trim() !== '' ||
      excelFilters.name !== null ||
      excelFilters.type !== null ||
      excelFilters.natureOfWork !== null ||
      excelFilters.priority !== null ||
      excelFilters.email !== null ||
      excelFilters.phone !== null ||
      excelFilters.contactPerson !== null ||
      excelFilters.gstin !== null ||
      excelFilters.paymentTerm !== null ||
      excelFilters.status !== null
    );
  }, [searchTerm, excelFilters]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setExcelFilters({
      name: null,
      type: null,
      natureOfWork: null,
      priority: null,
      email: null,
      phone: null,
      contactPerson: null,
      gstin: null,
      paymentTerm: null,
      status: null
    });
    setSortField('name');
    setSortDirection('asc');
  };

  // Filtered & Sorted Vendors
  const filteredAndSortedVendors = useMemo(() => {
    return vendors
      .filter((v: any) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchCode = v.vendorCode?.toLowerCase().includes(q);
          const matchName = v.name?.toLowerCase().includes(q);
          const matchType = v.type?.toLowerCase().includes(q);
          const matchWork = v.natureOfWork?.toLowerCase().includes(q);
          const matchEmail = v.email?.toLowerCase().includes(q);
          const matchPhone = v.phone?.toLowerCase().includes(q);
          const matchContact = v.contactPerson?.toLowerCase().includes(q);
          const matchGst = v.gstin?.toLowerCase().includes(q);
          const matchTerm = v.paymentTerm?.toLowerCase().includes(q);
          if (
            !matchCode &&
            !matchName &&
            !matchType &&
            !matchWork &&
            !matchEmail &&
            !matchPhone &&
            !matchContact &&
            !matchGst &&
            !matchTerm
          ) {
            return false;
          }
        }

        if (excelFilters.name && !excelFilters.name.includes(String(v.name || '(Blanks)').trim())) {
          return false;
        }
        if (excelFilters.type && !excelFilters.type.includes(String(v.type || '(Blanks)').trim())) {
          return false;
        }
        if (
          excelFilters.natureOfWork &&
          !excelFilters.natureOfWork.includes(String(v.natureOfWork || '(Blanks)').trim())
        ) {
          return false;
        }
        if (excelFilters.priority && !excelFilters.priority.includes(String(v.priority || '(Blanks)').trim())) {
          return false;
        }
        if (excelFilters.email && !excelFilters.email.includes(String(v.email || '(Blanks)').trim())) {
          return false;
        }
        if (excelFilters.phone && !excelFilters.phone.includes(String(v.phone || '(Blanks)').trim())) {
          return false;
        }
        if (
          excelFilters.contactPerson &&
          !excelFilters.contactPerson.includes(String(v.contactPerson || '(Blanks)').trim())
        ) {
          return false;
        }
        if (excelFilters.gstin && !excelFilters.gstin.includes(String(v.gstin || '(Blanks)').trim())) {
          return false;
        }
        if (
          excelFilters.paymentTerm &&
          !excelFilters.paymentTerm.includes(String(v.paymentTerm || '(Blanks)').trim())
        ) {
          return false;
        }
        if (excelFilters.status) {
          const s = v.isActive !== false ? 'Active' : 'Inactive';
          if (!excelFilters.status.includes(s)) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (typeof valA === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
      });
  }, [vendors, searchTerm, excelFilters, sortField, sortDirection]);

  const handleOpenCreateVendor = () => {
    setVendorForm({
      name: '',
      type: 'MANUFACTURER',
      natureOfWork: '',
      priority: 'P1 - High',
      address: '',
      email: '',
      phone: '',
      contactPerson: '',
      gstin: '',
      paymentTerm: '30 Days Net'
    });
    setFormError('');
    setVendorModal({ isOpen: true, mode: 'CREATE' });
  };

  const handleOpenEditVendor = (v: any) => {
    setVendorForm({
      name: v.name || '',
      type: v.type || 'MANUFACTURER',
      natureOfWork: v.natureOfWork || '',
      priority: v.priority || 'P1 - High',
      address: v.address || '',
      email: v.email || '',
      phone: v.phone || '',
      contactPerson: v.contactPerson || '',
      gstin: v.gstin || '',
      paymentTerm: v.paymentTerm || (v.paymentTermsDays ? `${v.paymentTermsDays} Days` : '30 Days Net')
    });
    setFormError('');
    setVendorModal({ isOpen: true, mode: 'EDIT', item: v });
  };

  const handleToggleStatus = async (v: any) => {
    try {
      const res: any = await deleteVendor(v.id || v._id).unwrap();
      dispatch(addToast({ type: 'success', message: res?.message || 'Updated vendor status.' }));
      refetchVendors();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err?.data?.message || 'Could not update vendor status.' }));
    }
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name.trim()) {
      setFormError('Vendor Name is compulsory.');
      return;
    }

    setFormError('');

    try {
      if (vendorModal?.mode === 'CREATE') {
        const res: any = await createVendor(vendorForm).unwrap();
        dispatch(addToast({ type: 'success', message: res?.message || 'All set! Vendor saved successfully.' }));
      } else {
        const res: any = await updateVendor({
          id: vendorModal?.item?.id || vendorModal?.item?._id,
          ...vendorForm
        }).unwrap();
        dispatch(addToast({ type: 'success', message: res?.message || 'All set! Vendor updated successfully.' }));
      }

      setVendorModal(null);
      refetchVendors();
    } catch (err: any) {
      setFormError(err?.data?.message || 'Could not save vendor. Please check required fields.');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Dedicated In-Line Table Action Toolbar (Search on Left, Add New & Reset on Right) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Left: Dedicated In-Line Search Bar */}
        <div className="relative flex-1 min-w-[260px] max-w-lg">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendors by name, type, work, email, phone, GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Reset Filters + Add Vendor Button */}
        <div className="flex items-center gap-2 shrink-0">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all cursor-pointer shadow-2xs"
              title="Reset all active column filters and search"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenCreateVendor}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
          >
            <Plus size={14} />
            <span>Add New Vendor</span>
          </button>
        </div>
      </div>

      {/* Vendors Table with Column-Based Excel Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
              <tr>
                {/* # Row Serial */}
                <th className="py-3 px-3 w-10 text-center font-bold text-slate-700 tracking-wider text-[11px]">#</th>

                {/* 1. Vendor Names */}
                <th className="py-3 px-3 min-w-[220px]">
                  <ExcelColumnFilter
                    title="Vendor Names"
                    columnKey="name"
                    distinctValues={distinctVendorNames}
                    selectedValues={excelFilters.name}
                    onFilterChange={(selected) => setExcelFilters((prev) => ({ ...prev, name: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>

                {/* 2. Type */}
                <th className="py-3 px-3 min-w-[140px]">
                  <ExcelColumnFilter
                    title="Type"
                    columnKey="type"
                    distinctValues={distinctTypes}
                    selectedValues={excelFilters.type}
                    onFilterChange={(selected) => setExcelFilters((prev) => ({ ...prev, type: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>

                {/* 3. Nature of Work */}
                <th className="py-3 px-3 min-w-[150px]">
                  <ExcelColumnFilter
                    title="Nature of Work"
                    columnKey="natureOfWork"
                    distinctValues={distinctNatureOfWorks}
                    selectedValues={excelFilters.natureOfWork}
                    onFilterChange={(selected) => setExcelFilters((prev) => ({ ...prev, natureOfWork: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>

                {/* 4. Priority */}
                <th className="py-3 px-3 min-w-[120px]">
                  <ExcelColumnFilter
                    title="Priority"
                    columnKey="priority"
                    distinctValues={distinctPriorities}
                    selectedValues={excelFilters.priority}
                    onFilterChange={(selected) => setExcelFilters((prev) => ({ ...prev, priority: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>

                {/* 5. Address (Clean Plain Header) */}
                <th className="py-3 px-3 min-w-[180px] font-bold text-slate-700 tracking-wider text-[11px]">
                  Address
                </th>

                {/* 6. Email ID */}
                <th className="py-3 px-3 min-w-[160px]">
                  <ExcelColumnFilter
                    title="Email ID"
                    columnKey="email"
                    distinctValues={distinctEmails}
                    selectedValues={excelFilters.email}
                    onFilterChange={(selected) => setExcelFilters((prev) => ({ ...prev, email: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>

                {/* 7. Contact No */}
                <th className="py-3 px-3 min-w-[130px]">
                  <ExcelColumnFilter
                    title="Contact No"
                    columnKey="phone"
                    distinctValues={distinctPhones}
                    selectedValues={excelFilters.phone}
                    onFilterChange={(selected) => setExcelFilters((prev) => ({ ...prev, phone: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>

                {/* 8. Name (Contact Person) */}
                <th className="py-3 px-3 min-w-[140px]">
                  <ExcelColumnFilter
                    title="Name"
                    columnKey="contactPerson"
                    distinctValues={distinctContactPersons}
                    selectedValues={excelFilters.contactPerson}
                    onFilterChange={(selected) => setExcelFilters((prev) => ({ ...prev, contactPerson: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>

                {/* 9. GST No */}
                <th className="py-3 px-3 min-w-[140px]">
                  <ExcelColumnFilter
                    title="GST No"
                    columnKey="gstin"
                    distinctValues={distinctGstins}
                    selectedValues={excelFilters.gstin}
                    onFilterChange={(selected) => setExcelFilters((prev) => ({ ...prev, gstin: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>

                {/* 10. Payment Term */}
                <th className="py-3 px-3 min-w-[130px]">
                  <ExcelColumnFilter
                    title="Payment Term"
                    columnKey="paymentTerm"
                    distinctValues={distinctPaymentTerms}
                    selectedValues={excelFilters.paymentTerm}
                    onFilterChange={(selected) => setExcelFilters((prev) => ({ ...prev, paymentTerm: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>

                {/* Status */}
                <th className="py-3 px-3 text-center min-w-[100px]">
                  <ExcelColumnFilter
                    title="Status"
                    columnKey="status"
                    distinctValues={distinctStatuses}
                    selectedValues={excelFilters.status}
                    onFilterChange={(selected) => setExcelFilters((prev) => ({ ...prev, status: selected }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                    align="right"
                  />
                </th>

                {/* Actions */}
                <th className="py-3 px-3 text-center min-w-[100px] font-bold text-slate-700 tracking-wider text-[11px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400">
                    Loading Vendors...
                  </td>
                </tr>
              ) : filteredAndSortedVendors.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <Building2 size={32} className="text-slate-300" />
                      <span className="text-xs font-semibold text-slate-600">
                        {hasActiveFilters ? 'No vendors match your search or filters' : 'No Vendors found'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {hasActiveFilters
                          ? 'Try clearing active filters or search term'
                          : 'Click "Add New Vendor" to register your first supplier.'}
                      </span>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all cursor-pointer shadow-xs"
                        >
                          <RotateCcw size={13} />
                          <span>Reset All Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedVendors.map((v: any, idx: number) => {
                  const isActive = v.isActive !== false;
                  const priorityStr = v.priority || 'P1 - High';
                  const isHighPriority = priorityStr.includes('P1') || priorityStr.toLowerCase().includes('high');
                  const isMedPriority = priorityStr.includes('P2') || priorityStr.toLowerCase().includes('medium');

                  return (
                    <tr key={v.id || v._id || idx} className="hover:bg-slate-50/70 transition-colors">
                      {/* # Serial */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>

                      {/* 1. Vendor Names (Clickable Identifier) */}
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => setPreviewVendor(v)}
                          className="font-extrabold text-slate-900 hover:text-orange-600 transition-colors text-left cursor-pointer group block"
                          title="Click to view full vendor dossier & audit trail"
                        >
                          <span className="underline decoration-slate-300 group-hover:decoration-orange-500 underline-offset-2 block">
                            {v.name}
                          </span>
                          {v.vendorCode && (
                            <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                              {v.vendorCode}
                            </span>
                          )}
                        </button>
                      </td>

                      {/* 2. Type */}
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {v.type || 'MANUFACTURER'}
                        </span>
                      </td>

                      {/* 3. Nature of Work */}
                      <td className="py-2.5 px-3 text-slate-700 font-medium truncate max-w-[160px]" title={v.natureOfWork}>
                        {v.natureOfWork || <span className="text-slate-300 italic">—</span>}
                      </td>

                      {/* 4. Priority */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isHighPriority
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isMedPriority
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isHighPriority ? 'bg-emerald-500' : isMedPriority ? 'bg-amber-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{priorityStr}</span>
                        </span>
                      </td>

                      {/* 5. Address */}
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-[200px]" title={v.address}>
                        {v.address || <span className="text-slate-300 italic">—</span>}
                      </td>

                      {/* 6. Email ID */}
                      <td className="py-2.5 px-3 text-slate-700 truncate max-w-[180px]" title={v.email}>
                        {v.email ? (
                          <span className="font-mono text-[11px]">{v.email}</span>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>

                      {/* 7. Contact No */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        {v.phone || <span className="text-slate-300 italic">—</span>}
                      </td>

                      {/* 8. Name (Contact Person) */}
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {v.contactPerson || <span className="text-slate-300 italic">—</span>}
                      </td>

                      {/* 9. GST No */}
                      <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-800 whitespace-nowrap">
                        {v.gstin || <span className="text-slate-300 italic font-normal">—</span>}
                      </td>

                      {/* 10. Payment Term */}
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {v.paymentTerm || (v.paymentTermsDays ? `${v.paymentTermsDays} Days` : '30 Days Net')}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(v)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer transition-all ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title={isActive ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewVendor(v)}
                            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                            title="Preview Vendor Dossier"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditVendor(v)}
                            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Vendor"
                          >
                            <Edit2 size={13} />
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

      {/* MODAL 1: ADD / EDIT VENDOR MODAL */}
      {vendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl lg:max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard (Crisp White Header with Amber Top Stripe) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    {vendorModal.mode === 'CREATE' ? 'Add New Vendor' : `Edit Vendor — ${vendorForm.name}`}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setVendorModal(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveVendor} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Vendor Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vendor Names <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Siemens India Industrial Automation"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
                  />
                </div>

                {/* 2. Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={vendorForm.type}
                    onChange={(e) => setVendorForm({ ...vendorForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
                  >
                    <option value="MANUFACTURER">Manufacturer</option>
                    <option value="TRADER">Trader / Distributor</option>
                    <option value="FABRICATOR">Fabricator / Machine Shop</option>
                    <option value="SERVICE">Service Provider</option>
                    <option value="OEM">Original Equipment Manufacturer (OEM)</option>
                  </select>
                </div>

                {/* 3. Priority */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={vendorForm.priority}
                    onChange={(e) => setVendorForm({ ...vendorForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
                  >
                    <option value="P1 - High">P1 - High (Primary Strategic)</option>
                    <option value="P2 - Medium">P2 - Medium (Standard Regular)</option>
                    <option value="P3 - Low">P3 - Low (Backup / Spot Vendor)</option>
                  </select>
                </div>

                {/* 4. Nature of Work */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nature of Work</label>
                  <input
                    type="text"
                    placeholder="e.g. Servo Motors, VFDs, Automation PLCs, Heavy Precision Machining"
                    value={vendorForm.natureOfWork}
                    onChange={(e) => setVendorForm({ ...vendorForm, natureOfWork: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
                  />
                </div>

                {/* 5. Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                  <textarea
                    rows={2}
                    placeholder="Factory / Office Street Address, Industrial Area, City, Pin Code"
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
                  />
                </div>

                {/* 6. Email ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email ID</label>
                  <input
                    type="email"
                    placeholder="sales@vendor.com"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all font-mono"
                  />
                </div>

                {/* 7. Contact No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact No</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all font-mono"
                  />
                </div>

                {/* 8. Name (Contact Person) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Key account contact name"
                    value={vendorForm.contactPerson}
                    onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
                  />
                </div>

                {/* 9. GST No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="27AACCS1234F1Z5"
                    value={vendorForm.gstin}
                    onChange={(e) => setVendorForm({ ...vendorForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all font-mono uppercase"
                  />
                </div>

                {/* 10. Payment Term */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Term</label>
                  <input
                    type="text"
                    placeholder="e.g. 30 Days Net, 100% Against PI, 15 Days from GRN"
                    value={vendorForm.paymentTerm}
                    onChange={(e) => setVendorForm({ ...vendorForm, paymentTerm: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setVendorModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  {isCreating || isUpdating
                    ? 'Saving...'
                    : vendorModal.mode === 'CREATE'
                    ? 'Save Vendor'
                    : 'Update Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CLICKABLE ROW PREVIEW DOSSIER WITH COMPLETE AUDIT TRAIL */}
      {previewVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl lg:max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard (Crisp White Header with Amber Top Stripe) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                      {previewVendor.name}
                    </h3>
                    {previewVendor.vendorCode && (
                      <span className="font-mono text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                        {previewVendor.vendorCode}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {previewVendor.type || 'MANUFACTURER'} • {previewVendor.priority || 'P1 - High'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = previewVendor;
                    setPreviewVendor(null);
                    handleOpenEditVendor(toEdit);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all cursor-pointer"
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewVendor(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Primary Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Vendor Code</span>
                  <span className="font-mono font-bold text-orange-600 text-sm mt-0.5 block">
                    {previewVendor.vendorCode || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Category / Type</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {previewVendor.type || 'MANUFACTURER'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Priority</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {previewVendor.priority || 'P1 - High'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Contact Person</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {previewVendor.contactPerson || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Contact Phone</span>
                  <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                    {previewVendor.phone || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Email Address</span>
                  <span className="font-mono font-semibold text-slate-800 mt-0.5 block truncate">
                    {previewVendor.email || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">GSTIN / Tax ID</span>
                  <span className="font-mono font-extrabold text-slate-900 mt-0.5 block">
                    {previewVendor.gstin || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Payment Terms</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {previewVendor.paymentTerm || '30 Days Net'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Operational Status</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                      previewVendor.isActive !== false
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {previewVendor.isActive !== false ? 'Active Supplier' : 'Inactive'}
                  </span>
                </div>
                <div className="sm:col-span-3 pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Nature of Work</span>
                  <span className="text-slate-800 font-medium mt-0.5 block">
                    {previewVendor.natureOfWork || 'General Engineering Goods & Services'}
                  </span>
                </div>
                <div className="sm:col-span-3">
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Factory / Registered Address</span>
                  <span className="text-slate-800 font-medium mt-0.5 block whitespace-pre-wrap">
                    {previewVendor.address || '—'}
                  </span>
                </div>
              </div>

              {/* Complete Audit Section */}
              <div className="pt-2 border-t border-slate-200">
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
                  Audit Tracking
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created By</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {previewVendor.createdByName || 'System User'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {previewVendor.createdAt ? new Date(previewVendor.createdAt).toLocaleString('en-IN') : '—'}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Updated By</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {previewVendor.updatedByName || previewVendor.createdByName || 'System User'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {previewVendor.updatedAt
                        ? new Date(previewVendor.updatedAt).toLocaleString('en-IN')
                        : previewVendor.createdAt
                        ? new Date(previewVendor.createdAt).toLocaleString('en-IN')
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewVendor(null)}
                  className="px-5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

