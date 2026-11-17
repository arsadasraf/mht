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
  Briefcase,
  Workflow,
  Layers,
  ChevronRight,
  Trash2,
  Globe,
  UploadCloud,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import {
  useGetSubStageMastersQuery,
  useCreateSubStageMasterMutation,
  useUpdateSubStageMasterMutation,
  useDeleteSubStageMasterMutation,
  useGetDepartmentUsersQuery
} from '../../project-setup/api/projectApi';
import {
  useGetVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useUpdatePurchaseConfigMutation,
  useGetPurchaseConfigQuery,
  useUploadDirectToS3Mutation
} from '../api/purchaseApi';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

export default function PurchaseMastersTab({
  initialSubTab
}: {
  initialSubTab?: 'vendors' | 'company' | 'policy' | 'sub-stages' | 'approval';
} = {}) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const activeSubTab: 'vendors' | 'company' | 'policy' | 'sub-stages' | 'approval' =
    initialSubTab ||
    (pathname?.endsWith('/company')
      ? 'company'
      : pathname?.endsWith('/policy')
      ? 'policy'
      : pathname?.endsWith('/sub-stages')
      ? 'sub-stages'
      : pathname?.endsWith('/approval')
      ? 'approval'
      : 'vendors');

  const { data: vendorData, isLoading, refetch: refetchVendors } = useGetVendorsQuery({ includeInactive: true });
  const { data: configData, refetch: refetchConfig } = useGetPurchaseConfigQuery(undefined);

  const [createVendor, { isLoading: isCreatingVendor }] = useCreateVendorMutation();
  const [updateVendor, { isLoading: isUpdatingVendor }] = useUpdateVendorMutation();
  const [deleteVendor] = useDeleteVendorMutation();
  const [updatePurchaseConfig] = useUpdatePurchaseConfigMutation();
  const [uploadDirectToS3] = useUploadDirectToS3Mutation();

  // Users Query for Outward PO Approver Assignment
  const { data: usersData } = useGetDepartmentUsersQuery(undefined, {
    skip: activeSubTab !== 'approval'
  });
  const allUsers = useMemo(() => usersData?.users || [], [usersData]);
  const [selectedApproverUserId, setSelectedApproverUserId] = useState('');
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // Purchase Sub-Stage Masters Query & Mutations
  const {
    data: subStagesData,
    isLoading: isSubStagesLoading,
    refetch: refetchSubStages
  } = useGetSubStageMastersQuery(
    activeSubTab === 'sub-stages' ? { departmentModule: 'purchase' } : undefined,
    { skip: activeSubTab !== 'sub-stages' }
  );
  const [createSubStage, { isLoading: isCreatingSubStage }] = useCreateSubStageMasterMutation();
  const [updateSubStage, { isLoading: isUpdatingSubStage }] = useUpdateSubStageMasterMutation();
  const [deleteSubStage] = useDeleteSubStageMasterMutation();

  const subStages = useMemo(() => subStagesData?.subStages || [], [subStagesData]);

  // Sub-Stage In-Line Search
  const [subStageSearch, setSubStageSearch] = useState('');

  // Sub-Stage Column-Based Excel Filters
  const [subStageExcelFilters, setSubStageExcelFilters] = useState<{
    name: string[] | null;
    status: string[] | null;
  }>({
    name: null,
    status: null
  });

  // Sub-Stage Sorting
  const [subStageSortField, setSubStageSortField] = useState<string>('name');
  const [subStageSortDirection, setSubStageSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSubStageSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSubStageSortField(field);
    setSubStageSortDirection(direction);
  };

  // Sub-Stage Modal State
  const [subStageModal, setSubStageModal] = useState<{
    isOpen: boolean;
    mode: 'CREATE' | 'EDIT';
    item?: any;
  } | null>(null);

  // Sub-Stage Preview Dossier Modal State
  const [previewSubStage, setPreviewSubStage] = useState<any | null>(null);

  // Sub-Stage Form State
  const [subStageForm, setSubStageForm] = useState({
    name: '',
    description: '',
    isActive: true
  });
  const [subStageFormError, setSubStageFormError] = useState('');

  const distinctSubStageNames = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    subStages.forEach((s: any) => {
      const val = (s.name || s.subStageName || '').trim();
      if (val) counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [subStages]);

  const distinctSubStageStatuses = useMemo<DistinctValueItem[]>(() => {
    let activeCount = 0;
    let inactiveCount = 0;
    subStages.forEach((s: any) => {
      if (s.isActive !== false) activeCount++;
      else inactiveCount++;
    });
    const items: DistinctValueItem[] = [];
    if (activeCount > 0) items.push({ value: 'Active', count: activeCount });
    if (inactiveCount > 0) items.push({ value: 'Inactive', count: inactiveCount });
    return items;
  }, [subStages]);

  const filteredAndSortedSubStages = useMemo(() => {
    let result = [...subStages];

    if (subStageSearch.trim()) {
      const q = subStageSearch.toLowerCase().trim();
      result = result.filter(
        (s: any) =>
          (s.name || s.subStageName || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q)
      );
    }

    if (subStageExcelFilters.name && subStageExcelFilters.name.length > 0) {
      result = result.filter((s: any) =>
        subStageExcelFilters.name!.includes((s.name || s.subStageName || '').trim())
      );
    }

    if (subStageExcelFilters.status && subStageExcelFilters.status.length > 0) {
      result = result.filter((s: any) => {
        const statusStr = s.isActive !== false ? 'Active' : 'Inactive';
        return subStageExcelFilters.status!.includes(statusStr);
      });
    }

    result.sort((a: any, b: any) => {
      let valA: any = a[subStageSortField] || a.name || a.subStageName;
      let valB: any = b[subStageSortField] || b.name || b.subStageName;
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      if (valA < valB) return subStageSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return subStageSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [subStages, subStageSearch, subStageExcelFilters, subStageSortField, subStageSortDirection]);

  const hasActiveSubStageFilters = Boolean(
    subStageSearch.trim() ||
      (subStageExcelFilters.name && subStageExcelFilters.name.length > 0) ||
      (subStageExcelFilters.status && subStageExcelFilters.status.length > 0)
  );

  const handleResetSubStageFilters = () => {
    setSubStageSearch('');
    setSubStageExcelFilters({ name: null, status: null });
    setSubStageSortField('name');
    setSubStageSortDirection('asc');
  };

  const handleOpenCreateSubStage = () => {
    setSubStageForm({
      name: '',
      description: '',
      isActive: true
    });
    setSubStageFormError('');
    setSubStageModal({ isOpen: true, mode: 'CREATE' });
  };

  const handleOpenEditSubStage = (s: any) => {
    setSubStageForm({
      name: s.name || s.subStageName || '',
      description: s.description || '',
      isActive: s.isActive !== false
    });
    setSubStageFormError('');
    setSubStageModal({ isOpen: true, mode: 'EDIT', item: s });
  };

  const handleToggleSubStageActive = async (s: any) => {
    try {
      const res: any = await updateSubStage({
        id: s.id || s._id,
        isActive: s.isActive === false ? true : false,
        departmentModule: 'purchase'
      }).unwrap();
      dispatch(addToast({ type: 'success', message: res?.message || 'Updated sub-stage status.' }));
      refetchSubStages();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err?.data?.message || 'Could not update sub-stage status.' }));
    }
  };

  const handleSaveSubStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subStageForm.name.trim()) {
      setSubStageFormError('Sub-Stage Name is compulsory.');
      return;
    }

    setSubStageFormError('');

    try {
      if (subStageModal?.mode === 'CREATE') {
        const res: any = await createSubStage({
          name: subStageForm.name.trim(),
          description: subStageForm.description.trim(),
          departmentModule: 'purchase'
        }).unwrap();
        dispatch(addToast({ type: 'success', message: res?.message || 'All set! Purchase sub-stage created.' }));
      } else {
        const res: any = await updateSubStage({
          id: subStageModal?.item?.id || subStageModal?.item?._id,
          name: subStageForm.name.trim(),
          description: subStageForm.description.trim(),
          isActive: subStageForm.isActive,
          departmentModule: 'purchase'
        }).unwrap();
        dispatch(addToast({ type: 'success', message: res?.message || 'All set! Purchase sub-stage updated.' }));
      }

      setSubStageModal(null);
      refetchSubStages();
    } catch (err: any) {
      setSubStageFormError(err?.data?.message || err?.message || 'We could not save this sub-stage right now.');
    }
  };


  const vendors = vendorData?.vendors || [];
  const [policyForm, setPolicyForm] = useState<any>(null);
  const currentPolicy = policyForm || vendorData?.prefixLockPolicy || {
    vendorPrefix: 'VND',
    rfqPrefix: 'RFQ',
    inwardQuotePrefix: 'VQT',
    poPrefix: 'PO',
    billPrefix: 'PB',
    lockPoAfterApproval: true,
    approverUserIds: [],
    approverUsers: [],
    requireApprovalBeforePoRelease: true,
    editTimeLimitMode: 'UNLIMITED',
    editTimeLimitHours: 0,
    deleteTimeLimitMode: 'UNLIMITED',
    deleteTimeLimitHours: 0
  };

  const handleSaveApprovalPolicy = async (customPolicy?: any) => {
    const policyToSave = customPolicy || currentPolicy;
    setIsSavingPolicy(true);
    try {
      await updatePurchaseConfig({ prefixLockPolicy: policyToSave }).unwrap();
      dispatch(addToast({ type: 'success', message: 'All set! Outward PO approval & time policies saved.' }));
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err?.data?.message || 'We could not save the policy right now.' }));
    } finally {
      setIsSavingPolicy(false);
    }
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
  const [companyProfile, setCompanyProfile] = useState<{
    legalEntityName: string;
    tradeName?: string;
    tagline: string;
    cin: string;
    pan: string;
    gstin: string;
    state?: string;
    stateCode?: string;
    msmeUdyamNumber?: string;
    registeredOffice: string;
    unit1Plant: string;
    dispatchAddress?: string;
    billingEmail: string;
    purchaseEmail: string;
    supportEmail?: string;
    phone: string;
    altPhone?: string;
    websiteUrl?: string;
    bankName: string;
    bankBranch: string;
    accountNumber: string;
    accountType?: string;
    ifscCode: string;
    swiftCode?: string;
    authorizedSignatory: string;
    signatoryDesignation: string;
    department?: string;
    logoUrl?: string;
    iconUrl?: string;
    standardPoTerms: string[];
  }>({
    legalEntityName: 'Machine House - Winding Technologies Pvt Ltd',
    tradeName: 'Machine House',
    tagline: 'House of Innovations.....',
    cin: 'U29253PN2015PTC155421',
    pan: 'AACCM8892K',
    gstin: '27AACCM8892K1Z8',
    state: 'Maharashtra',
    stateCode: '27',
    msmeUdyamNumber: 'UDYAM-MH-26-0038192',
    registeredOffice: 'Plot No. 44, Electronic Zone, MIDC Bhosari, Pune - 411026, Maharashtra, India',
    unit1Plant: 'Plot No. 12/B, Industrial Sector 7, Chakan Industrial Area, Pune - 410501, Maharashtra, India',
    dispatchAddress: 'Gate No. 3, Machine House Plant 1, Chakan Phase II, Pune - 410501',
    billingEmail: 'accounts@machinehouse.in',
    purchaseEmail: 'purchase@machinehouse.in',
    supportEmail: 'service@machinehouse.in',
    phone: '+91 20 2712 4490',
    altPhone: '+91 98220 18490',
    websiteUrl: 'https://machinehouse.in',
    bankName: 'HDFC Bank Ltd',
    bankBranch: 'Bhosari Industrial Branch, Pune',
    accountNumber: '50200028479218',
    accountType: 'Current Account',
    ifscCode: 'HDFC0001824',
    swiftCode: 'HDFCINBB',
    authorizedSignatory: 'Arshad Asraf',
    signatoryDesignation: 'Managing Director & Plant Head',
    department: 'Corporate & Operations',
    logoUrl: '/branding/mh_logo_plate.png',
    iconUrl: '/branding/mh_icon.png',
    standardPoTerms: [
      '1. Materials must be supplied strictly as per the specifications, drawings, and make mentioned in this Outward PO.',
      '2. Test certificates (MTR / Mill TC / Guarantee Certificate) must accompany every consignment.',
      '3. Materials are subject to physical count, store verification, and Incoming Quality Control (IQC) inspection at our plant.',
      '4. Any rejected or non-conforming goods will be quarantined and returned at vendor cost and risk within 15 days.',
      '5. Invoices must clearly cite our Outward PO Number, HSN/SAC codes, and vehicle registration numbers.',
      '6. Payment terms shall apply from the date of final store acceptance (GRN sign-off), not invoice date.'
    ]
  });

  const [isSavingCompanyProfile, setIsSavingCompanyProfile] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);
  const iconInputRef = React.useRef<HTMLInputElement | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadBrandingImage = async (file: File, type: 'logo' | 'icon') => {
    if (!file) return;
    const isLogo = type === 'logo';
    if (isLogo) setIsUploadingLogo(true);
    else setIsUploadingIcon(true);

    try {
      const base64 = await fileToBase64(file);
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const folder = isLogo ? 'logos' : 'icons';
      const key = `company/branding/${folder}/${Date.now()}_${cleanName}`;

      const uploadRes = await uploadDirectToS3({
        key,
        contentType: file.type || 'image/png',
        base64Data: base64
      }).unwrap();

      const targetUrl = uploadRes?.url || uploadRes?.permanentUrl || base64;
      const updatedProfile = {
        ...companyProfile,
        [isLogo ? 'logoUrl' : 'iconUrl']: targetUrl
      };
      setCompanyProfile(updatedProfile);

      // Auto-persist to company config in backend
      try {
        await updatePurchaseConfig({ companyProfile: updatedProfile }).unwrap();
        refetchConfig();
      } catch (saveErr) {
        // Non-blocking, user can still click Save Company Profile
      }

      dispatch(
        addToast({
          type: 'success',
          message: `All set! ${isLogo ? 'Corporate logo plate' : 'Brand circular icon'} uploaded to S3 bucket.`
        })
      );
    } catch (err: any) {
      console.warn('S3 branding upload fallback to base64', err);
      const base64 = await fileToBase64(file);
      const updatedProfile = {
        ...companyProfile,
        [isLogo ? 'logoUrl' : 'iconUrl']: base64
      };
      setCompanyProfile(updatedProfile);
      dispatch(
        addToast({
          type: 'warning',
          message: 'Saved image locally (S3 upload encountered an issue).'
        })
      );
    } finally {
      if (isLogo) setIsUploadingLogo(false);
      else setIsUploadingIcon(false);
    }
  };

  // Sync state from live backend config or vendorData
  React.useEffect(() => {
    if (configData?.companyProfile) {
      setCompanyProfile((prev) => ({
        ...prev,
        ...configData.companyProfile
      }));
    } else if (vendorData?.companyProfile) {
      setCompanyProfile((prev) => ({
        ...prev,
        ...vendorData.companyProfile
      }));
    }
  }, [configData, vendorData]);

  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompanyProfile(true);
    try {
      await updatePurchaseConfig({ companyProfile }).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: 'All set! Company profile and Outward PO template updated successfully.'
        })
      );
      refetchConfig();
      if (refetchVendors) refetchVendors();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || err?.message || 'We could not save the company profile right now.'
        })
      );
    } finally {
      setIsSavingCompanyProfile(false);
    }
  };

  const handleUpdatePoTerm = (index: number, val: string) => {
    setCompanyProfile((prev) => {
      const copy = [...prev.standardPoTerms];
      copy[index] = val;
      return { ...prev, standardPoTerms: copy };
    });
  };

  const handleAddPoTerm = () => {
    setCompanyProfile((prev) => ({
      ...prev,
      standardPoTerms: [
        ...prev.standardPoTerms,
        `${prev.standardPoTerms.length + 1}. New purchase order term clause.`
      ]
    }));
  };

  const handleRemovePoTerm = (index: number) => {
    setCompanyProfile((prev) => ({
      ...prev,
      standardPoTerms: prev.standardPoTerms.filter((_, idx) => idx !== index)
    }));
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
          href="/purchase/masters/sub-stages"
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
            activeSubTab === 'sub-stages'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Workflow size={14} />
          <span>Sub-Stages</span>
          {subStages.length > 0 && (
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeSubTab === 'sub-stages' ? 'bg-white text-orange-600' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {subStages.length}
            </span>
          )}
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

        <Link
          href="/purchase/masters/approval"
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
            activeSubTab === 'approval'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ShieldCheck size={14} />
          <span>
            Approval &amp; Time Policy{' '}
            {Array.isArray(currentPolicy.approverUserIds) && currentPolicy.approverUserIds.length > 0
              ? `(${currentPolicy.approverUserIds.length})`
              : ''}
          </span>
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

      {/* SUB-TAB 4: SUB-STAGES (UNIVERSAL TABLE ARCHITECTURE) */}
      {activeSubTab === 'sub-stages' && (
        <div className="space-y-4">
          {/* Dedicated In-Line Table Action Toolbar (Search on Left, Add New & Reset on Right) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Left: Dedicated In-Line Search Bar */}
            <div className="relative flex-1 min-w-[260px] max-w-lg">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search purchase sub-stages by name, description..."
                value={subStageSearch}
                onChange={(e) => setSubStageSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
              />
              {subStageSearch && (
                <button
                  type="button"
                  onClick={() => setSubStageSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right: Reset Filters + Add Sub-Stage Button */}
            <div className="flex items-center gap-2 shrink-0">
              {hasActiveSubStageFilters && (
                <button
                  type="button"
                  onClick={handleResetSubStageFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all cursor-pointer shadow-2xs"
                  title="Reset all active column filters and search"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenCreateSubStage}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                <Plus size={14} />
                <span>Add Sub-Stage</span>
              </button>
            </div>
          </div>

          {/* Sub-Stages Table with Column-Based Excel Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                  <tr>
                    {/* Non-Filter Header: Row Serial Number */}
                    <th className="py-3 px-4 w-12 text-center">#</th>

                    {/* Excel Filter: Sub-Stage Name */}
                    <th className="py-3 px-4 min-w-[280px]">
                      <ExcelColumnFilter
                        title="Sub-Stage Name *"
                        columnKey="name"
                        distinctValues={distinctSubStageNames}
                        selectedValues={subStageExcelFilters.name}
                        onFilterChange={(selected) => setSubStageExcelFilters((prev) => ({ ...prev, name: selected }))}
                        currentSortField={subStageSortField}
                        currentSortDirection={subStageSortDirection}
                        onSortChange={handleSubStageSortChange}
                      />
                    </th>

                    {/* Non-Filter Header: Description */}
                    <th className="py-3 px-4 min-w-[320px]">Description</th>

                    {/* Excel Filter: Status */}
                    <th className="py-3 px-4 text-center min-w-[120px]">
                      <ExcelColumnFilter
                        title="Status"
                        columnKey="status"
                        distinctValues={distinctSubStageStatuses}
                        selectedValues={subStageExcelFilters.status}
                        onFilterChange={(selected) => setSubStageExcelFilters((prev) => ({ ...prev, status: selected }))}
                        currentSortField={subStageSortField}
                        currentSortDirection={subStageSortDirection}
                        onSortChange={handleSubStageSortChange}
                        align="right"
                      />
                    </th>

                    {/* Non-Filter Header: Actions */}
                    <th className="py-3 px-4 text-center min-w-[110px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isSubStagesLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Loading Purchase Sub-Stages...
                      </td>
                    </tr>
                  ) : filteredAndSortedSubStages.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                          <Workflow size={32} className="text-slate-300" />
                          <span className="text-xs font-semibold text-slate-600">
                            {hasActiveSubStageFilters ? 'No sub-stages match your filters' : 'No Purchase Sub-Stages found'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {hasActiveSubStageFilters
                              ? 'Try clearing column filters or search term'
                              : 'Click "Add Sub-Stage" to create your first purchase procurement activity.'}
                          </span>
                          {hasActiveSubStageFilters && (
                            <button
                              type="button"
                              onClick={handleResetSubStageFilters}
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
                    filteredAndSortedSubStages.map((s: any, idx: number) => {
                      const isActive = s.isActive !== false;
                      const displayName = s.name || s.subStageName || 'Unnamed Sub-Stage';
                      return (
                        <tr key={s.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>

                          {/* Sub-Stage Name (Clickable Identifier) */}
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => setPreviewSubStage(s)}
                              className="font-extrabold text-slate-900 hover:text-orange-600 transition-colors text-left cursor-pointer group block"
                              title="Click to view details and audit trail"
                            >
                              <span className="underline decoration-slate-300 group-hover:decoration-orange-500 underline-offset-2">
                                {displayName}
                              </span>
                            </button>
                          </td>

                          {/* Description */}
                          <td className="py-3 px-4 text-slate-600 max-w-md truncate" title={s.description}>
                            {s.description || <span className="text-slate-300 italic">—</span>}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                              />
                              <span>{isActive ? 'Active' : 'Inactive'}</span>
                            </span>
                          </td>

                          {/* Row Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewSubStage(s)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Preview Details & Audit Trail"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditSubStage(s)}
                                className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Sub-Stage"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleSubStageActive(s)}
                                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                  isActive
                                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={isActive ? 'Deactivate Sub-Stage' : 'Activate Sub-Stage'}
                              >
                                {isActive ? <Lock size={14} /> : <CheckCircle2 size={14} />}
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
      {/* SUB-TAB 2: DYNAMIC MASTER COMPANY PROFILE */}
      {activeSubTab === 'company' && (
        <form onSubmit={handleSaveCompanyProfile} className="space-y-5">
          {/* Top Action Header Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Company Profile &amp; Letterhead Master
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Universal master entity specifications rendered dynamically on all Outward PO sheets, PDFs, and legal correspondence.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingCompanyProfile}
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs shadow-xs shadow-orange-500/20 cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
            >
              <Save size={14} />
              <span>{isSavingCompanyProfile ? 'Saving Changes...' : 'Save Company Profile'}</span>
            </button>
          </div>

          {/* 6-Card High-Contrast Industrial Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* CARD 1: BRAND IDENTITY & LOGOS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <ImageIcon size={15} className="text-orange-600" />
                  <span>Brand Identity &amp; Corporate Logos</span>
                </h4>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Live in PDF
                </span>
              </div>

              {/* Live Visual Preview of Logos & Dynamic S3 Upload */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-around gap-6">
                {/* Corporate Nameplate */}
                <div className="text-center flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Corporate Nameplate
                  </span>
                  <div className="h-20 min-w-[200px] px-4 py-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-2xs relative group">
                    {isUploadingLogo ? (
                      <div className="flex flex-col items-center gap-1 text-orange-600">
                        <Loader2 size={24} className="animate-spin" />
                        <span className="text-[10px] font-bold">Uploading to S3...</span>
                      </div>
                    ) : (
                      <img
                        src={companyProfile.logoUrl || '/branding/mh_logo_plate.png'}
                        alt="Corporate Logo"
                        className="max-h-16 w-auto object-contain"
                      />
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadBrandingImage(f, 'logo');
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingLogo ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                    <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo to S3'}</span>
                  </button>
                </div>

                {/* Circular Brand Icon */}
                <div className="text-center flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Circular Brand Icon
                  </span>
                  <div className="w-20 h-20 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-2xs relative mx-auto group">
                    {isUploadingIcon ? (
                      <div className="flex flex-col items-center gap-1 text-orange-600">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-[9px] font-bold">Uploading...</span>
                      </div>
                    ) : (
                      <img
                        src={companyProfile.iconUrl || '/branding/mh_icon.png'}
                        alt="Brand Icon"
                        className="w-16 h-16 object-contain"
                      />
                    )}
                  </div>
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadBrandingImage(f, 'icon');
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => iconInputRef.current?.click()}
                    disabled={isUploadingIcon}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingIcon ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                    <span>{isUploadingIcon ? 'Uploading...' : 'Upload Icon to S3'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Corporate Logo S3 URL</label>
                  <input
                    type="text"
                    value={companyProfile.logoUrl}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, logoUrl: e.target.value })}
                    placeholder="/branding/mh_logo_plate.png"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Brand Circular Icon S3 URL</label>
                  <input
                    type="text"
                    value={companyProfile.iconUrl}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, iconUrl: e.target.value })}
                    placeholder="/branding/mh_icon.png"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Corporate Tagline / Slogan</label>
                <input
                  type="text"
                  value={companyProfile.tagline}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, tagline: e.target.value })}
                  placeholder="House of Innovations....."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 italic text-orange-700 font-medium"
                />
              </div>
            </div>

            {/* CARD 2: CORPORATE ENTITY & LEGAL REGISTRATIONS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <Building2 size={15} className="text-orange-600" />
                  <span>Entity &amp; Statutory Registrations</span>
                </h4>
                <span className="font-mono text-[10px] font-bold bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-lg border border-orange-200">
                  {companyProfile.cin || 'CIN'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Legal Entity Name (Registered)</label>
                  <input
                    type="text"
                    required
                    value={companyProfile.legalEntityName}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, legalEntityName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trade / Display Name</label>
                  <input
                    type="text"
                    value={companyProfile.tradeName || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, tradeName: e.target.value })}
                    placeholder="Machine House"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Corporate CIN</label>
                  <input
                    type="text"
                    value={companyProfile.cin}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, cin: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={companyProfile.gstin}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, gstin: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={companyProfile.pan}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, pan: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State &amp; State Code</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={companyProfile.state || ''}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, state: e.target.value })}
                      placeholder="Maharashtra"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
                    />
                    <input
                      type="text"
                      value={companyProfile.stateCode || ''}
                      onChange={(e) => setCompanyProfile({ ...companyProfile, stateCode: e.target.value })}
                      placeholder="27"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-semibold text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">MSME / Udyam Reg. No.</label>
                  <input
                    type="text"
                    value={companyProfile.msmeUdyamNumber || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, msmeUdyamNumber: e.target.value })}
                    placeholder="UDYAM-MH-26-0038192"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* CARD 3: PLANT & OPERATIONAL ADDRESSES */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <MapPin size={15} className="text-orange-600" />
                  <span>Facilities &amp; Plant Locations</span>
                </h4>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Registered Corporate Office</label>
                <textarea
                  rows={2}
                  value={companyProfile.registeredOffice}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, registeredOffice: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unit 1 Manufacturing Plant (Delivery Destination)</label>
                <textarea
                  rows={2}
                  value={companyProfile.unit1Plant}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, unit1Plant: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dispatch Yard / Loading Gate Address</label>
                <textarea
                  rows={2}
                  value={companyProfile.dispatchAddress || ''}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, dispatchAddress: e.target.value })}
                  placeholder="Gate No. 3, Machine House Plant 1, Chakan Phase II, Pune - 410501"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-medium"
                />
              </div>
            </div>

            {/* CARD 4: COMMUNICATION & ACCOUNTS CONTACTS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <Mail size={15} className="text-orange-600" />
                  <span>Official Communication &amp; Emails</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Purchase &amp; Sourcing Email</label>
                  <input
                    type="email"
                    value={companyProfile.purchaseEmail}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, purchaseEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Billing &amp; Accounts Email</label>
                  <input
                    type="email"
                    value={companyProfile.billingEmail}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, billingEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plant Primary Phone</label>
                  <input
                    type="text"
                    value={companyProfile.phone}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alternate / Mobile Phone</label>
                  <input
                    type="text"
                    value={companyProfile.altPhone || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, altPhone: e.target.value })}
                    placeholder="+91 98220 18490"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Website URL</label>
                  <input
                    type="text"
                    value={companyProfile.websiteUrl || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, websiteUrl: e.target.value })}
                    placeholder="https://machinehouse.in"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* CARD 5: BANKING & SETTLEMENT CREDENTIALS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <CreditCard size={15} className="text-orange-600" />
                  <span>Banking &amp; Remittance Details</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={companyProfile.bankName}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, bankName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={companyProfile.bankBranch}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, bankBranch: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={companyProfile.accountNumber}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Type</label>
                  <input
                    type="text"
                    value={companyProfile.accountType || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, accountType: e.target.value })}
                    placeholder="Current Account"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={companyProfile.ifscCode}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, ifscCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SWIFT / BIC Code</label>
                  <input
                    type="text"
                    value={companyProfile.swiftCode || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, swiftCode: e.target.value })}
                    placeholder="HDFCINBB"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* CARD 6: AUTHORIZED SIGNATORY & PLANT AUTHORITY */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <UserCheck size={15} className="text-orange-600" />
                  <span>Authorized Signatory &amp; Approval Stamp</span>
                </h4>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Authorized Signatory Full Name</label>
                <input
                  type="text"
                  value={companyProfile.authorizedSignatory}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, authorizedSignatory: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={companyProfile.signatoryDesignation}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, signatoryDesignation: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={companyProfile.department || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, department: e.target.value })}
                    placeholder="Corporate & Operations"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-medium"
                  />
                </div>
              </div>

              {/* Digital Stamp Preview */}
              <div className="p-3 border-2 border-dashed border-orange-300 rounded-xl bg-orange-50/40 text-left">
                <span className="text-[10px] font-black uppercase text-orange-700 tracking-wider block">
                  Official Digital Approval Stamp Stamp Preview
                </span>
                <div className="text-[11px] font-bold text-slate-900 mt-1">
                  For {companyProfile.legalEntityName}
                </div>
                <div className="text-[10px] text-slate-600 font-medium">
                  {companyProfile.authorizedSignatory} ({companyProfile.signatoryDesignation})
                </div>
              </div>
            </div>
          </div>

          {/* CARD 7: STANDARD PURCHASE ORDER TERMS & CONDITIONS BUILDER */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                  <FileText size={15} className="text-orange-600" />
                  <span>Standard Outward Purchase Order Terms &amp; Conditions Clauses</span>
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  These numbered clauses appear automatically on all Outward Purchase Order PDF sheets.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddPoTerm}
                className="px-3.5 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus size={13} />
                <span>Add Clause</span>
              </button>
            </div>

            <div className="space-y-3">
              {companyProfile.standardPoTerms.map((term: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="w-6 h-6 rounded-lg bg-white border border-slate-300 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-1">
                    {idx + 1}
                  </span>
                  <textarea
                    rows={2}
                    value={term}
                    onChange={(e) => handleUpdatePoTerm(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-orange-500 font-medium leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePoTerm(idx)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer shrink-0 mt-0.5"
                    title="Remove Clause"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Save Action Bar */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingCompanyProfile}
              className="px-8 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs shadow-xs shadow-orange-500/20 cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSavingCompanyProfile ? 'Saving Company Profile...' : 'Save Company Profile'}</span>
            </button>
          </div>
        </form>
      )}


      {/* SUB-TAB 5: APPROVAL & TIME POLICY */}
      {activeSubTab === 'approval' && (
        <div className="space-y-6">
          {/* Card 1: Outward PO Approval User Assignment */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Outward Purchase Order Approval Assignment
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {Array.isArray(currentPolicy.approverUserIds) && currentPolicy.approverUserIds.length > 0
                      ? 'Approval Required: Newly created Outward POs remain in "CREATED" status and require sign-off by an assigned approver before release.'
                      : 'Auto-Approved Mode: No approver user assigned, so newly created Outward POs are automatically approved upon creation.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSaveApprovalPolicy()}
                disabled={isSavingPolicy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Save size={15} />
                <span>{isSavingPolicy ? 'Saving...' : 'Save Approval & Policy'}</span>
              </button>
            </div>

            {/* Add Approver User Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Assign User to Approve Outward Purchase Orders
                </label>
                <select
                  value={selectedApproverUserId}
                  onChange={(e) => setSelectedApproverUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-orange-500 focus:outline-hidden"
                >
                  <option value="">-- Select User from Company Directory --</option>
                  {allUsers
                    .filter(
                      (u: any) =>
                        !(Array.isArray(currentPolicy.approverUserIds) ? currentPolicy.approverUserIds : []).includes(
                          u.id || u._id
                        )
                    )
                    .map((u: any) => (
                      <option key={u.id || u._id} value={u.id || u._id}>
                        {u.name} ({u.email}) — {u.roleName || u.department || 'Staff'}
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="button"
                disabled={!selectedApproverUserId || isSavingPolicy}
                onClick={() => {
                  if (!selectedApproverUserId) return;
                  const foundUser = allUsers.find(
                    (u: any) => (u.id || u._id) === selectedApproverUserId
                  );
                  const currentIds = Array.isArray(currentPolicy.approverUserIds)
                    ? currentPolicy.approverUserIds
                    : [];
                  const currentUsers = Array.isArray(currentPolicy.approverUsers)
                    ? currentPolicy.approverUsers
                    : [];
                  if (!currentIds.includes(selectedApproverUserId)) {
                    const updatedPolicy = {
                      ...currentPolicy,
                      approverUserIds: [...currentIds, selectedApproverUserId],
                      approverUsers: foundUser
                        ? [
                            ...currentUsers.filter((cu: any) => cu.id !== selectedApproverUserId),
                            {
                              id: foundUser.id || foundUser._id,
                              name: foundUser.name,
                              email: foundUser.email,
                              roleName: foundUser.roleName || '',
                              department: foundUser.department || ''
                            }
                          ]
                        : currentUsers
                    };
                    setPolicyForm(updatedPolicy);
                    setSelectedApproverUserId('');
                    handleSaveApprovalPolicy(updatedPolicy);
                  } else {
                    setSelectedApproverUserId('');
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus size={15} />
                <span>Assign Approver</span>
              </button>
            </div>

            {/* Assigned Approver Users List */}
            {!Array.isArray(currentPolicy.approverUserIds) || currentPolicy.approverUserIds.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">
                      No Approver Assigned — Outward POs Auto-Approved on Creation
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Assign one or more users above if you want Outward POs to require sign-off before releasing them to vendors and inventory.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Assigned Approvers ({currentPolicy.approverUserIds.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updatedPolicy = {
                        ...currentPolicy,
                        approverUserIds: [],
                        approverUsers: []
                      };
                      setPolicyForm(updatedPolicy);
                      handleSaveApprovalPolicy(updatedPolicy);
                    }}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    Clear All (Switch to Auto-Approve)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentPolicy.approverUserIds.map((uid: string) => {
                    const cached =
                      (Array.isArray(currentPolicy.approverUsers)
                        ? currentPolicy.approverUsers.find((cu: any) => cu.id === uid)
                        : null) ||
                      allUsers.find((u: any) => (u.id || u._id) === uid);

                    return (
                      <div
                        key={uid}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {(cached?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {cached?.name || uid}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {cached?.email || ''}{' '}
                              {cached?.roleName ? `• ${cached.roleName}` : ''}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const updatedPolicy = {
                              ...currentPolicy,
                              approverUserIds: currentPolicy.approverUserIds.filter(
                                (id: string) => id !== uid
                              ),
                              approverUsers: Array.isArray(currentPolicy.approverUsers)
                                ? currentPolicy.approverUsers.filter((cu: any) => cu.id !== uid)
                                : []
                            };
                            setPolicyForm(updatedPolicy);
                            handleSaveApprovalPolicy(updatedPolicy);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove Approver"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Outward PO Edit & Delete Time Policy (0 to Unlimited) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Outward PO Edit &amp; Delete Time Window Policy (0 to Unlimited)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Controls how long after creation an Outward PO remains editable or deletable (0 hours = locked immediately, or Unlimited time).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSaveApprovalPolicy()}
                disabled={isSavingPolicy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Save size={15} />
                <span>{isSavingPolicy ? 'Saving...' : 'Save Time Policy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Edit Time Policy */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-900">
                    Outward PO Edit Time Policy
                  </label>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    {(currentPolicy.editTimeLimitMode || 'UNLIMITED') === 'UNLIMITED'
                      ? 'Unlimited Time'
                      : `${Number(currentPolicy.editTimeLimitHours || 0)} Hours`}
                  </span>
                </div>

                {/* Pill Toggle: Unlimited vs Custom Hours */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-xl">
                  <button
                    type="button"
                    onClick={() =>
                      setPolicyForm({ ...currentPolicy, editTimeLimitMode: 'UNLIMITED' })
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      (currentPolicy.editTimeLimitMode || 'UNLIMITED') === 'UNLIMITED'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Unlimited Time
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPolicyForm({
                        ...currentPolicy,
                        editTimeLimitMode: 'LIMITED',
                        editTimeLimitHours: Number(currentPolicy.editTimeLimitHours ?? 24)
                      })
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentPolicy.editTimeLimitMode === 'LIMITED'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Time Limit (0 – ∞ Hrs)
                  </button>
                </div>

                {currentPolicy.editTimeLimitMode === 'LIMITED' && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Allowed Edit Window After Creation (Hours)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={currentPolicy.editTimeLimitHours ?? 0}
                      onChange={(e) =>
                        setPolicyForm({
                          ...currentPolicy,
                          editTimeLimitHours: Math.max(0, Number(e.target.value) || 0)
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-orange-500 focus:outline-hidden"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[0, 1, 12, 24, 48, 72, 168].map((hrs) => (
                        <button
                          key={hrs}
                          type="button"
                          onClick={() =>
                            setPolicyForm({ ...currentPolicy, editTimeLimitHours: hrs })
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            Number(currentPolicy.editTimeLimitHours) === hrs
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {hrs === 0 ? '0h (Locked)' : hrs === 168 ? '168h (7d)' : `${hrs}h`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Delete Time Policy */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-900">
                    Outward PO Delete Time Policy
                  </label>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    {(currentPolicy.deleteTimeLimitMode || 'UNLIMITED') === 'UNLIMITED'
                      ? 'Unlimited Time'
                      : `${Number(currentPolicy.deleteTimeLimitHours || 0)} Hours`}
                  </span>
                </div>

                {/* Pill Toggle: Unlimited vs Custom Hours */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-xl">
                  <button
                    type="button"
                    onClick={() =>
                      setPolicyForm({ ...currentPolicy, deleteTimeLimitMode: 'UNLIMITED' })
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      (currentPolicy.deleteTimeLimitMode || 'UNLIMITED') === 'UNLIMITED'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Unlimited Time
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPolicyForm({
                        ...currentPolicy,
                        deleteTimeLimitMode: 'LIMITED',
                        deleteTimeLimitHours: Number(currentPolicy.deleteTimeLimitHours ?? 24)
                      })
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentPolicy.deleteTimeLimitMode === 'LIMITED'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Time Limit (0 – ∞ Hrs)
                  </button>
                </div>

                {currentPolicy.deleteTimeLimitMode === 'LIMITED' && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Allowed Delete Window After Creation (Hours)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={currentPolicy.deleteTimeLimitHours ?? 0}
                      onChange={(e) =>
                        setPolicyForm({
                          ...currentPolicy,
                          deleteTimeLimitHours: Math.max(0, Number(e.target.value) || 0)
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-orange-500 focus:outline-hidden"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[0, 1, 12, 24, 48, 72, 168].map((hrs) => (
                        <button
                          key={hrs}
                          type="button"
                          onClick={() =>
                            setPolicyForm({ ...currentPolicy, deleteTimeLimitHours: hrs })
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            Number(currentPolicy.deleteTimeLimitHours) === hrs
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {hrs === 0 ? '0h (Locked)' : hrs === 168 ? '168h (7d)' : `${hrs}h`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 pt-1">
                  Note: Outward POs with linked GRN records or inwards cannot be deleted under any policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT SUB-STAGE MODAL */}
      {subStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-xl lg:max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard (Crisp White Header with Amber Top Stripe) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    {subStageModal.mode === 'CREATE' ? 'Add New Purchase Sub-Stage' : `Edit Sub-Stage — ${subStageForm.name}`}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSubStageModal(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveSubStage} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {subStageFormError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{subStageFormError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Sub-Stage Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Sub-Stage Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={subStageForm.name}
                      onChange={(e) => setSubStageForm({ ...subStageForm, name: e.target.value })}
                      placeholder="e.g. Sourcing RM & BO Quotes, Commercial PO Release..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={subStageForm.description}
                      onChange={(e) => setSubStageForm({ ...subStageForm, description: e.target.value })}
                      placeholder="Briefly describe procurement scope, supplier RFQ milestones, or delivery tracking requirements..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSubStageModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSubStage || isUpdatingSubStage}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>
                    {isCreatingSubStage || isUpdatingSubStage
                      ? 'Saving...'
                      : subStageModal.mode === 'EDIT'
                      ? 'Update Sub-Stage'
                      : 'Save Sub-Stage'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-STAGE PREVIEW DOSSIER MODAL WITH FULL AUDIT TRAIL */}
      {previewSubStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Ribbon Standard (Crisp White Header with Amber Top Stripe) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    {previewSubStage.name || previewSubStage.subStageName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        previewSubStage.isActive !== false
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          previewSubStage.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      <span>{previewSubStage.isActive !== false ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const s = previewSubStage;
                    setPreviewSubStage(null);
                    handleOpenEditSubStage(s);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Edit2 size={13} className="text-slate-500" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSubStage(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Description & Scope */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers size={14} className="text-orange-500" />
                  Sub-Stage Description
                </span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {previewSubStage.description || 'No description recorded for this sub-stage.'}
                </p>
              </div>

              {/* Record Audit & Universal Action Tracking Trail */}
              <div className="pt-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-orange-500" />
                  <span>Audit Trail & Record History</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Created By Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Created By
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {previewSubStage.createdByName || 'System Provisioned'}
                        </span>
                        {previewSubStage.createdById && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            User ID: {previewSubStage.createdById.slice(0, 8)}...
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
                        {previewSubStage.createdAt
                          ? new Date(previewSubStage.createdAt).toLocaleString('en-IN', {
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
                          {previewSubStage.updatedByName || previewSubStage.createdByName || 'System Provisioned'}
                        </span>
                        {previewSubStage.updatedById && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            User ID: {previewSubStage.updatedById.slice(0, 8)}...
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
                        {previewSubStage.updatedAt
                          ? new Date(previewSubStage.updatedAt).toLocaleString('en-IN', {
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
