'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Users,
  Search,
  Plus,
  X,
  CheckCircle2,
  FileText,
  CreditCard,
  ShieldCheck,
  Star,
  Phone,
  Mail,
  RotateCcw,
  Edit2,
  Eye,
  Lock,
  Clock,
  UserCheck,
  MapPin,
  Tag,
  AlertCircle,
  Save,
  Briefcase
} from 'lucide-react';
import {
  useGetVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useUpdatePurchaseConfigMutation
} from '../api/purchaseApi';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

export default function PurchaseMastersTab({
  initialSubTab
}: {
  initialSubTab?: 'vendors' | 'company' | 'policy';
} = {}) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const activeSubTab: 'vendors' | 'company' | 'policy' =
    initialSubTab ||
    (pathname?.endsWith('/company')
      ? 'company'
      : pathname?.endsWith('/policy')
      ? 'policy'
      : 'vendors');

  const { data: vendorData, isLoading, refetch: refetchVendors } = useGetVendorsQuery(
    { includeInactive: true },
    { skip: activeSubTab === 'company' }
  );

  const [createVendor, { isLoading: isCreatingVendor }] = useCreateVendorMutation();
  const [updateVendor, { isLoading: isUpdatingVendor }] = useUpdateVendorMutation();
  const [deleteVendor] = useDeleteVendorMutation();
  const [updatePurchaseConfig] = useUpdatePurchaseConfigMutation();

  const vendors = vendorData?.vendors || [];
  const [policyForm, setPolicyForm] = useState<any>(null);
  const currentPolicy = policyForm || vendorData?.prefixLockPolicy || {
    vendorPrefix: 'VND',
    rfqPrefix: 'RFQ',
    inwardQuotePrefix: 'VQT',
    poPrefix: 'PO',
    billPrefix: 'PB',
    lockPoAfterApproval: true
  };

  // Dedicated In-Line Search Bar State
  const [searchTerm, setSearchTerm] = useState('');

  // Column-Based Excel Filters State
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

  // Sorting State
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  // Vendor Modal State (Add / Edit)
  const [vendorModal, setVendorModal] = useState<{
    isOpen: boolean;
    mode: 'CREATE' | 'EDIT';
    item?: any;
  } | null>(null);

  // Vendor Preview Dossier Modal State
  const [previewVendor, setPreviewVendor] = useState<any | null>(null);

  // Vendor Form State (10 fields from user Excel specification)
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

  // Company Profile State (Plant / Purchasing Entity)
  const [companyProfile, setCompanyProfile] = useState({
    legalEntityName: 'Machine House - Winding Technologies Pvt Ltd',
    tagline: 'House of Innovations.....',
    cin: 'U29253PN2015PTC155421',
    pan: 'AACCM8892K',
    gstin: '27AACCM8892K1Z8',
    registeredOffice: 'Plot No. 44, Electronic Zone, MIDC Bhosari, Pune - 411026, Maharashtra, India',
    unit1Plant: 'Plot No. 12/B, Industrial Sector 7, Chakan Industrial Area, Pune - 410501, Maharashtra, India',
    billingEmail: 'accounts@machinehouse.in',
    purchaseEmail: 'purchase@machinehouse.in',
    phone: '+91 20 2712 4490',
    bankName: 'HDFC Bank Ltd',
    bankBranch: 'Bhosari Industrial Branch, Pune',
    accountNumber: '50200028479218',
    ifscCode: 'HDFC0001824',
    authorizedSignatory: 'Arshad Asraf',
    signatoryDesignation: 'Managing Director & Plant Head',
    standardPoTerms: [
      'Material must conform strictly to the approved engineering CAD drawing and technical specifications.',
      'Delivery destination: FOR Destination Machine House Unit 1 Chakan unless otherwise stated.',
      'Inspection: Goods are subject to Incoming QC inspection at our factory premises before formal acceptance.',
      'Rejection: Rejected materials will be held in Quarantine and must be replaced within 7 working days.',
      'Payment terms: 30 days from date of QC Acceptance and 3-way invoice matching.',
      'Warranty: Minimum 12 months comprehensive replacement warranty against manufacturing defects.'
    ]
  });

  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const handleSaveCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  // Distinct Values for Excel Column Filters
  const distinctVendorNames = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = (v.name || '').trim();
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [vendors]);

  const distinctTypes = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = (v.type || 'MANUFACTURER').trim();
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [vendors]);

  const distinctNatureOfWorks = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = (v.natureOfWork || '').trim();
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [vendors]);

  const distinctPriorities = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = (v.priority || 'P1 - High').trim();
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [vendors]);

  const distinctEmails = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = (v.email || '').trim();
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [vendors]);

  const distinctPhones = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = (v.phone || '').trim();
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [vendors]);

  const distinctContactPersons = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = (v.contactPerson || '').trim();
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [vendors]);

  const distinctGstins = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = (v.gstin || '').trim();
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [vendors]);

  const distinctPaymentTerms = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    vendors.forEach((v: any) => {
      const val = (v.paymentTerm || (v.paymentTermsDays ? `${v.paymentTermsDays} Days` : '30 Days Net')).trim();
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [vendors]);

  const distinctStatuses = useMemo<DistinctValueItem[]>(() => {
    let activeCount = 0;
    let inactiveCount = 0;
    vendors.forEach((v: any) => {
      if (v.isActive !== false) activeCount++;
      else inactiveCount++;
    });
    const items: DistinctValueItem[] = [];
    if (activeCount > 0) items.push({ value: 'Active', count: activeCount });
    if (inactiveCount > 0) items.push({ value: 'Inactive', count: inactiveCount });
    return items;
  }, [vendors]);

  // Filtered & Sorted Vendors List
  const filteredAndSortedVendors = useMemo(() => {
    let result = [...vendors];

    // 1. In-line text search across all attributes
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (v: any) =>
          (v.name || '').toLowerCase().includes(q) ||
          (v.vendorCode || '').toLowerCase().includes(q) ||
          (v.type || '').toLowerCase().includes(q) ||
          (v.natureOfWork || '').toLowerCase().includes(q) ||
          (v.priority || '').toLowerCase().includes(q) ||
          (v.address || '').toLowerCase().includes(q) ||
          (v.email || '').toLowerCase().includes(q) ||
          (v.phone || '').toLowerCase().includes(q) ||
          (v.contactPerson || '').toLowerCase().includes(q) ||
          (v.gstin || '').toLowerCase().includes(q) ||
          (v.paymentTerm || '').toLowerCase().includes(q)
      );
    }

    // 2. Column-based Excel filters
    if (excelFilters.name && excelFilters.name.length > 0) {
      result = result.filter((v: any) => excelFilters.name!.includes((v.name || '').trim()));
    }
    if (excelFilters.type && excelFilters.type.length > 0) {
      result = result.filter((v: any) => excelFilters.type!.includes((v.type || 'MANUFACTURER').trim()));
    }
    if (excelFilters.natureOfWork && excelFilters.natureOfWork.length > 0) {
      result = result.filter((v: any) => excelFilters.natureOfWork!.includes((v.natureOfWork || '').trim()));
    }
    if (excelFilters.priority && excelFilters.priority.length > 0) {
      result = result.filter((v: any) => excelFilters.priority!.includes((v.priority || 'P1 - High').trim()));
    }
    if (excelFilters.email && excelFilters.email.length > 0) {
      result = result.filter((v: any) => excelFilters.email!.includes((v.email || '').trim()));
    }
    if (excelFilters.phone && excelFilters.phone.length > 0) {
      result = result.filter((v: any) => excelFilters.phone!.includes((v.phone || '').trim()));
    }
    if (excelFilters.contactPerson && excelFilters.contactPerson.length > 0) {
      result = result.filter((v: any) => excelFilters.contactPerson!.includes((v.contactPerson || '').trim()));
    }
    if (excelFilters.gstin && excelFilters.gstin.length > 0) {
      result = result.filter((v: any) => excelFilters.gstin!.includes((v.gstin || '').trim()));
    }
    if (excelFilters.paymentTerm && excelFilters.paymentTerm.length > 0) {
      result = result.filter((v: any) => {
        const pt = v.paymentTerm || (v.paymentTermsDays ? `${v.paymentTermsDays} Days` : '30 Days Net');
        return excelFilters.paymentTerm!.includes(pt.trim());
      });
    }
    if (excelFilters.status && excelFilters.status.length > 0) {
      result = result.filter((v: any) => {
        const s = v.isActive !== false ? 'Active' : 'Inactive';
        return excelFilters.status!.includes(s);
      });
    }

    // 3. Sorting
    result.sort((a: any, b: any) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [vendors, searchTerm, excelFilters, sortField, sortDirection]);

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(searchTerm.trim()) ||
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
      setFormError(err?.data?.message || err?.message || 'We could not save this vendor right now.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-Tab Switcher (Button-Type Segmented Pill Tabs) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        <Link
          href="/purchase/masters/vendors"
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
            activeSubTab === 'vendors'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Building2 size={14} />
          <span>Vendor Master</span>
          {vendors.length > 0 && (
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeSubTab === 'vendors' ? 'bg-white text-orange-600' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {vendors.length}
            </span>
          )}
        </Link>

        <Link
          href="/purchase/masters/company"
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
            activeSubTab === 'company'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ShieldCheck size={14} />
          <span>Company Profile &amp; PO Terms</span>
        </Link>

        <Link
          href="/purchase/masters/policy"
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
            activeSubTab === 'policy'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <FileText size={14} />
          <span>Prefix &amp; Lock Policy</span>
        </Link>
      </div>

      {/* SUB-TAB 3: PREFIX & LOCK POLICY */}
      {activeSubTab === 'policy' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900">Purchase Prefix &amp; Lock Policy (RFQ, Quote, Outward PO)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { key: 'vendorPrefix', label: 'Vendor Code Prefix' },
              { key: 'rfqPrefix', label: 'Outward RFQ Prefix' },
              { key: 'inwardQuotePrefix', label: 'Inward Quotation Prefix' },
              { key: 'poPrefix', label: 'Outward PO Prefix' }
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-slate-700 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={currentPolicy[f.key] || ''}
                  onChange={(e) => setPolicyForm({ ...currentPolicy, [f.key]: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={async () => {
                await updatePurchaseConfig({ prefixLockPolicy: currentPolicy });
                dispatch(addToast({ type: 'success', message: 'All set! Purchase prefixes & lock policy saved.' }));
              }}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 cursor-pointer"
            >
              Save Prefix &amp; Lock Policy
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 1: VENDOR MASTER (UNIVERSAL TABLE ARCHITECTURE) */}
      {activeSubTab === 'vendors' && (
        <div className="space-y-4">
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
                              <a
                                href={`mailto:${v.email}`}
                                className="text-sky-600 hover:text-sky-800 hover:underline"
                              >
                                {v.email}
                              </a>
                            ) : (
                              <span className="text-slate-300 italic">—</span>
                            )}
                          </td>

                          {/* 7. Contact No */}
                          <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                            {v.phone || <span className="text-slate-300 italic">—</span>}
                          </td>

                          {/* 8. Name (Contact Person) */}
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {v.contactPerson || <span className="text-slate-300 italic">—</span>}
                          </td>

                          {/* 9. GST No */}
                          <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-800 uppercase whitespace-nowrap">
                            {v.gstin || <span className="text-slate-300 italic font-normal">—</span>}
                          </td>

                          {/* 10. Payment Term */}
                          <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                            {v.paymentTerm || (v.paymentTermsDays ? `${v.paymentTermsDays} Days` : '30 Days Net')}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isActive ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              <span>{isActive ? 'Active' : 'Inactive'}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              {/* Preview */}
                              <button
                                type="button"
                                onClick={() => setPreviewVendor(v)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
                                title="Preview Vendor Dossier & Audit Trail"
                              >
                                <Eye size={13} />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditVendor(v)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                title="Edit Vendor"
                              >
                                <Edit2 size={13} />
                              </button>

                              {/* Toggle Active */}
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(v)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  isActive
                                    ? 'border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600'
                                    : 'border-emerald-200 hover:bg-emerald-50 text-emerald-600'
                                }`}
                                title={isActive ? 'Deactivate Vendor' : 'Activate Vendor'}
                              >
                                {isActive ? <Lock size={13} /> : <CheckCircle2 size={13} />}
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
        </div>
      )}

      {/* SUB-TAB 2: COMPANY PROFILE */}
      {activeSubTab === 'company' && (
        <form onSubmit={handleSaveCompanyProfile} className="space-y-4">
          {isSavedNotice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} /> Changes updated.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Legal Entity & Tax Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 size={16} className="text-orange-600" /> Purchasing Legal Entity
                </h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Legal Name</label>
                <input
                  type="text"
                  value={companyProfile.legalEntityName}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, legalEntityName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={companyProfile.gstin}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, gstin: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PAN</label>
                  <input
                    type="text"
                    value={companyProfile.pan}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, pan: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Registered Office Address</label>
                <textarea
                  rows={2}
                  value={companyProfile.registeredOffice}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, registeredOffice: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Billing Email</label>
                  <input
                    type="email"
                    value={companyProfile.billingEmail}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, billingEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={companyProfile.phone}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <CreditCard size={16} className="text-orange-600" /> Bank &amp; Payment Details
                </h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={companyProfile.bankName}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, bankName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Branch</label>
                <input
                  type="text"
                  value={companyProfile.bankBranch}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, bankBranch: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={companyProfile.accountNumber}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={companyProfile.ifscCode}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, ifscCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Authorized Signatory</label>
                  <input
                    type="text"
                    value={companyProfile.authorizedSignatory}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, authorizedSignatory: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Signatory Designation</label>
                  <input
                    type="text"
                    value={companyProfile.signatoryDesignation}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, signatoryDesignation: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
            >
              Save Company Profile
            </button>
          </div>
        </form>
      )}

      {/* ADD / EDIT VENDOR MODAL */}
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
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveVendor} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Vendor Names */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Vendor Names *
                    </label>
                    <input
                      type="text"
                      required
                      value={vendorForm.name}
                      onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                      placeholder="e.g. Hiwin Motion Controls India Pvt Ltd"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* 2. Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Type
                    </label>
                    <select
                      value={vendorForm.type}
                      onChange={(e) => setVendorForm({ ...vendorForm, type: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500"
                    >
                      <option value="MANUFACTURER">Manufacturer</option>
                      <option value="TRADER">Trader</option>
                      <option value="FABRICATOR">Fabricator</option>
                      <option value="SERVICE_PROVIDER">Service Provider</option>
                      <option value="OEM">OEM</option>
                      <option value="DISTRIBUTOR">Distributor / Dealer</option>
                    </select>
                  </div>

                  {/* 3. Nature of Work */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Nature of Work
                    </label>
                    <input
                      type="text"
                      value={vendorForm.natureOfWork}
                      onChange={(e) => setVendorForm({ ...vendorForm, natureOfWork: e.target.value })}
                      placeholder="e.g. Machined Parts, Laser Cutting, Fasteners, Electrical"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* 4. Priority */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Priority
                    </label>
                    <select
                      value={vendorForm.priority}
                      onChange={(e) => setVendorForm({ ...vendorForm, priority: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500"
                    >
                      <option value="P1 - High">P1 - High / Strategic</option>
                      <option value="P2 - Medium">P2 - Medium / Preferred</option>
                      <option value="P3 - Low">P3 - Low / Secondary</option>
                    </select>
                  </div>

                  {/* 8. Name (Contact Person) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Name (Contact Person)
                    </label>
                    <input
                      type="text"
                      value={vendorForm.contactPerson}
                      onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                      placeholder="e.g. Suresh Menon"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* 7. Contact No */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Contact No
                    </label>
                    <input
                      type="text"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                      placeholder="e.g. +91 98450 12345"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* 6. Email ID */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Email ID
                    </label>
                    <input
                      type="email"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      placeholder="e.g. sales@vendor.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* 9. GST No */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      GST No
                    </label>
                    <input
                      type="text"
                      value={vendorForm.gstin}
                      onChange={(e) => setVendorForm({ ...vendorForm, gstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 29AABCH1234F1Z5"
                      maxLength={15}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase font-semibold text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* 10. Payment Term */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Payment Term
                    </label>
                    <input
                      type="text"
                      value={vendorForm.paymentTerm}
                      onChange={(e) => setVendorForm({ ...vendorForm, paymentTerm: e.target.value })}
                      placeholder="e.g. 30 Days Net, 45 Days, Immediate, 50% Advance + 50% Against Delivery"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* 5. Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Address
                    </label>
                    <textarea
                      rows={2}
                      value={vendorForm.address}
                      onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                      placeholder="Plant / Registered office address, city, state, pin code..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setVendorModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingVendor || isUpdatingVendor}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>
                    {isCreatingVendor || isUpdatingVendor
                      ? 'Saving...'
                      : vendorModal.mode === 'EDIT'
                      ? 'Update Vendor'
                      : 'Save Vendor'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VENDOR PREVIEW DOSSIER MODAL WITH FULL AUDIT TRAIL */}
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        previewVendor.isActive !== false
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          previewVendor.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      <span>{previewVendor.isActive !== false ? 'Active' : 'Inactive'}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {previewVendor.type || 'MANUFACTURER'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const v = previewVendor;
                    setPreviewVendor(null);
                    handleOpenEditVendor(v);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Edit2 size={13} className="text-slate-500" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewVendor(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Key Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Priority Tier</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {previewVendor.priority || 'P1 - High'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nature of Work</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {previewVendor.natureOfWork || 'General Supply'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GSTIN</span>
                  <span className="text-xs font-bold font-mono text-slate-900 block mt-1">
                    {previewVendor.gstin || '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Term</span>
                  <span className="text-xs font-bold text-slate-900 block mt-1">
                    {previewVendor.paymentTerm || (previewVendor.paymentTermsDays ? `${previewVendor.paymentTermsDays} Days` : '30 Days Net')}
                  </span>
                </div>
              </div>

              {/* Key Contact Information */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Users size={14} className="text-orange-500" />
                  Key Contact Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Person</span>
                    <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                      {previewVendor.contactPerson || '—'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone / Mobile</span>
                    <span className="text-xs font-mono font-semibold text-slate-800 block mt-0.5">
                      {previewVendor.phone || '—'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                    <span className="text-xs font-semibold text-slate-800 block mt-0.5 truncate">
                      {previewVendor.email || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plant / Registered Address */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin size={14} className="text-orange-500" />
                  Plant &amp; Registered Address
                </span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {previewVendor.address || 'No physical address recorded for this vendor.'}
                </p>
              </div>

              {/* Record Audit & Universal Action Tracking Trail */}
              <div className="pt-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-orange-500" />
                  <span>Audit Trail &amp; Record History</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Created By Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Created By
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {previewVendor.createdByName || 'System Provisioned'}
                        </span>
                        {previewVendor.createdById && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            User ID: {previewVendor.createdById.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                        <Clock size={11} className="text-slate-400" />
                        Created At
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                        {previewVendor.createdAt
                          ? new Date(previewVendor.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Last Updated By Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Last Updated By
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {previewVendor.updatedByName || previewVendor.createdByName || 'System Provisioned'}
                        </span>
                        {previewVendor.updatedById && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            User ID: {previewVendor.updatedById.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                        <Clock size={11} className="text-slate-400" />
                        Updated At
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                        {previewVendor.updatedAt
                          ? new Date(previewVendor.updatedAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
