'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Tag,
  Search,
  Plus,
  X,
  CheckCircle2,
  RotateCcw,
  Edit2,
  Eye,
  Star,
  Building2,
  Boxes,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  Percent,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  useGetVendorsQuery,
  useGetPriceAgreementsQuery,
  useCreateVendorPriceAgreementMutation,
  useUpdateVendorPriceAgreementMutation,
  useDeleteVendorPriceAgreementMutation
} from '../api/purchaseApi';
import { useGetRmItemsQuery, useGetFgItemsQuery } from '../../design/api/designApi';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

interface PriceListTabProps {
  initialSubTab?: 'rm-bo' | 'fg';
}

export default function PriceListTab({ initialSubTab }: PriceListTabProps) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  const activeSubTab: 'rm-bo' | 'fg' =
    initialSubTab || (pathname?.includes('/price-list/fg') ? 'fg' : 'rm-bo');

  // Queries
  const { data: vendorData, isLoading: isLoadingVendors } = useGetVendorsQuery({ includeInactive: true });
  const { data: agreementsData, isLoading: isLoadingAgreements } = useGetPriceAgreementsQuery({});
  const { data: rmData, isLoading: isLoadingRm } = useGetRmItemsQuery(undefined, {
    skip: activeSubTab !== 'rm-bo'
  });
  const { data: fgData, isLoading: isLoadingFg } = useGetFgItemsQuery(undefined, {
    skip: activeSubTab !== 'fg'
  });

  // Mutations
  const [createPriceAgreement, { isLoading: isCreating }] = useCreateVendorPriceAgreementMutation();
  const [updatePriceAgreement, { isLoading: isUpdating }] = useUpdateVendorPriceAgreementMutation();
  const [deletePriceAgreement] = useDeleteVendorPriceAgreementMutation();

  const vendors = vendorData?.vendors || [];
  const agreements = agreementsData?.priceAgreements || [];
  const rmItems = rmData?.items || [];
  const fgItems = fgData?.items || [];

  // Dedicated In-Line Search Bar State
  const [searchTerm, setSearchTerm] = useState('');

  // Column-Based Excel Filters State for RM-BO
  const [rmExcelFilters, setRmExcelFilters] = useState<{
    name: string[] | null;
    category: string[] | null;
    make: string[] | null;
    uom: string[] | null;
    taxRate: string[] | null;
    vendor: string[] | null;
    status: string[] | null;
  }>({
    name: null,
    category: null,
    make: null,
    uom: null,
    taxRate: null,
    vendor: null,
    status: null
  });

  // Column-Based Excel Filters State for FG
  const [fgExcelFilters, setFgExcelFilters] = useState<{
    name: string[] | null;
    classification: string[] | null;
    category: string[] | null;
    uom: string[] | null;
    taxRate: string[] | null;
    vendor: string[] | null;
    status: string[] | null;
  }>({
    name: null,
    classification: null,
    category: null,
    uom: null,
    taxRate: null,
    vendor: null,
    status: null
  });

  // Sorting State
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  // Preview Dossier State
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  // Edit / Add Price Modal State (Wider standard layout)
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    mode: 'CREATE' | 'EDIT';
    item: any;
  } | null>(null);

  // Form State (Single UOM fetched per item; strictly RM & BO vs FG)
  const [formData, setFormData] = useState<{
    itemType: 'RM_BO' | 'FG';
    itemCode: string;
    itemName: string;
    description: string;
    category: string;
    make: string;
    uom: string;
    price: string;
    taxRatePercent: number;
    vendorCode: string;
    vendorName: string;
    isPreferred: boolean;
    remarks: string;
    agreementId?: string;
    updatedByName?: string;
    updatedAt?: string;
  }>({
    itemType: 'RM_BO',
    itemCode: '',
    itemName: '',
    description: '',
    category: '',
    make: '',
    uom: 'Kg',
    price: '',
    taxRatePercent: 18,
    vendorCode: '',
    vendorName: '',
    isPreferred: true,
    remarks: '',
    agreementId: undefined,
    updatedByName: '',
    updatedAt: ''
  });

  // Merged Table Rows for RM & BO Items
  const mergedRmRows = useMemo(() => {
    const rows = rmItems.map((item: any) => {
      const agr = agreements.find(
        (a: any) =>
          (a.itemCode?.toLowerCase() === item.name?.toLowerCase() ||
            a.itemName?.toLowerCase() === item.name?.toLowerCase()) &&
          ['RM_BO', 'RM', 'BO'].includes(a.itemType?.toUpperCase())
      );

      const unitPrice = agr ? agr.unitPrice : item.standardRateINR || 0;
      const taxRate = agr ? agr.taxRatePercent : 18;
      const vendorName = agr?.vendorName || (unitPrice > 0 ? 'Standard Base Rate' : 'Unassigned');
      const isPreferred = agr ? agr.isPreferred : unitPrice > 0;
      const status = unitPrice > 0 ? (agr?.vendorName ? 'Active Agreement' : 'Base Rate Only') : 'Unset';

      return {
        id: item.id,
        agreementId: agr?.id,
        itemCode: item.name,
        name: item.name,
        description: item.description || '',
        category: item.categoryName || 'General',
        make: item.make || '-',
        uom: item.uom || 'Kg',
        unitPrice,
        taxRate,
        vendorCode: agr?.vendorCode || '',
        vendorName,
        isPreferred,
        remarks: agr?.remarks || '',
        status,
        itemType: 'RM_BO',
        createdByName: agr?.createdByName || item.createdByName || 'System',
        createdAt: agr?.createdAt || item.createdAt,
        updatedByName: agr?.updatedByName || item.updatedByName || 'System',
        updatedAt: agr?.updatedAt || item.updatedAt
      };
    });

    // Standalone agreements
    agreements
      .filter((a: any) => ['RM_BO', 'RM', 'BO'].includes(a.itemType?.toUpperCase()))
      .forEach((agr: any) => {
        const alreadyIncluded = rows.some(
          (r: any) => r.itemCode?.toLowerCase() === agr.itemCode?.toLowerCase()
        );
        if (!alreadyIncluded) {
          rows.push({
            id: agr.id,
            agreementId: agr.id,
            itemCode: agr.itemCode,
            name: agr.itemName || agr.itemCode,
            description: agr.description || '',
            category: agr.category || 'General',
            make: '-',
            uom: agr.uom || 'Nos',
            unitPrice: agr.unitPrice,
            taxRate: agr.taxRatePercent || 18,
            vendorCode: agr.vendorCode || '',
            vendorName: agr.vendorName || 'Standard Base Rate',
            isPreferred: agr.isPreferred,
            remarks: agr.remarks || '',
            status: agr.vendorName ? 'Active Agreement' : 'Base Rate Only',
            itemType: 'RM_BO',
            createdByName: agr.createdByName || 'System',
            createdAt: agr.createdAt,
            updatedByName: agr.updatedByName || 'System',
            updatedAt: agr.updatedAt
          });
        }
      });

    return rows;
  }, [rmItems, agreements]);

  // Merged Table Rows for FG Items
  const mergedFgRows = useMemo(() => {
    const rows = fgItems.map((item: any) => {
      const agr = agreements.find(
        (a: any) =>
          (a.itemCode?.toLowerCase() === item.name?.toLowerCase() ||
            a.itemName?.toLowerCase() === item.name?.toLowerCase()) &&
          ['FG', 'COMPONENT', 'SUB_ASSEMBLY', 'ASSEMBLY'].includes(a.itemType?.toUpperCase())
      );

      const unitPrice = agr ? agr.unitPrice : 0;
      const taxRate = agr ? agr.taxRatePercent : 18;
      const vendorName = agr?.vendorName || (unitPrice > 0 ? 'Standard Base Rate' : 'Unassigned');
      const isPreferred = agr ? agr.isPreferred : unitPrice > 0;
      const status = unitPrice > 0 ? (agr?.vendorName ? 'Active Agreement' : 'Base Rate Only') : 'Unset';

      return {
        id: item.id,
        agreementId: agr?.id,
        itemCode: item.name,
        name: item.name,
        description: item.description || '',
        classification: item.classification || 'COMPONENT',
        category: item.categoryName || 'Machined Parts',
        uom: item.uom || 'Nos',
        unitPrice,
        taxRate,
        vendorCode: agr?.vendorCode || '',
        vendorName,
        isPreferred,
        remarks: agr?.remarks || '',
        status,
        itemType: 'FG',
        createdByName: agr?.createdByName || item.createdByName || 'System',
        createdAt: agr?.createdAt || item.createdAt,
        updatedByName: agr?.updatedByName || item.updatedByName || 'System',
        updatedAt: agr?.updatedAt || item.updatedAt
      };
    });

    agreements
      .filter((a: any) =>
        ['FG', 'COMPONENT', 'SUB_ASSEMBLY', 'ASSEMBLY'].includes(a.itemType?.toUpperCase())
      )
      .forEach((agr: any) => {
        const alreadyIncluded = rows.some(
          (r: any) => r.itemCode?.toLowerCase() === agr.itemCode?.toLowerCase()
        );
        if (!alreadyIncluded) {
          rows.push({
            id: agr.id,
            agreementId: agr.id,
            itemCode: agr.itemCode,
            name: agr.itemName || agr.itemCode,
            description: agr.description || '',
            classification: agr.itemType || 'COMPONENT',
            category: agr.category || 'General',
            uom: agr.uom || 'Nos',
            unitPrice: agr.unitPrice,
            taxRate: agr.taxRatePercent || 18,
            vendorCode: agr.vendorCode || '',
            vendorName: agr.vendorName || 'Standard Base Rate',
            isPreferred: agr.isPreferred,
            remarks: agr.remarks || '',
            status: agr.vendorName ? 'Active Agreement' : 'Base Rate Only',
            itemType: 'FG',
            createdByName: agr.createdByName || 'System',
            createdAt: agr.createdAt,
            updatedByName: agr.updatedByName || 'System',
            updatedAt: agr.updatedAt
          });
        }
      });

    return rows;
  }, [fgItems, agreements]);

  // Distinct Values for RM-BO Columns
  const rmDistinctValues = useMemo(() => {
    const build = (getter: (r: any) => string) => {
      const map: Record<string, number> = {};
      mergedRmRows.forEach((r) => {
        const v = getter(r) || '(Blanks)';
        map[v] = (map[v] || 0) + 1;
      });
      return Object.entries(map)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    };
    return {
      name: build((r) => r.name),
      category: build((r) => r.category),
      make: build((r) => r.make),
      uom: build((r) => r.uom),
      taxRate: build((r) => `${r.taxRate}%`),
      vendor: build((r) => r.vendorName),
      status: build((r) => r.status)
    };
  }, [mergedRmRows]);

  // Distinct Values for FG Columns
  const fgDistinctValues = useMemo(() => {
    const build = (getter: (r: any) => string) => {
      const map: Record<string, number> = {};
      mergedFgRows.forEach((r) => {
        const v = getter(r) || '(Blanks)';
        map[v] = (map[v] || 0) + 1;
      });
      return Object.entries(map)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    };
    return {
      name: build((r) => r.name),
      classification: build((r) => r.classification),
      category: build((r) => r.category),
      uom: build((r) => r.uom),
      taxRate: build((r) => `${r.taxRate}%`),
      vendor: build((r) => r.vendorName),
      status: build((r) => r.status)
    };
  }, [mergedFgRows]);

  // Filtered & Sorted RM Rows
  const filteredRmRows = useMemo(() => {
    let result = mergedRmRows.filter((r) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          r.name?.toLowerCase().includes(q) ||
          r.itemCode?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.make?.toLowerCase().includes(q) ||
          r.vendorName?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (rmExcelFilters.name && !rmExcelFilters.name.includes(r.name || '(Blanks)')) return false;
      if (rmExcelFilters.category && !rmExcelFilters.category.includes(r.category || '(Blanks)')) return false;
      if (rmExcelFilters.make && !rmExcelFilters.make.includes(r.make || '(Blanks)')) return false;
      if (rmExcelFilters.uom && !rmExcelFilters.uom.includes(r.uom || '(Blanks)')) return false;
      if (rmExcelFilters.taxRate && !rmExcelFilters.taxRate.includes(`${r.taxRate}%`)) return false;
      if (rmExcelFilters.vendor && !rmExcelFilters.vendor.includes(r.vendorName || '(Blanks)')) return false;
      if (rmExcelFilters.status && !rmExcelFilters.status.includes(r.status || '(Blanks)')) return false;

      return true;
    });

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
  }, [mergedRmRows, searchTerm, rmExcelFilters, sortField, sortDirection]);

  // Filtered & Sorted FG Rows
  const filteredFgRows = useMemo(() => {
    let result = mergedFgRows.filter((r) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          r.name?.toLowerCase().includes(q) ||
          r.itemCode?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.classification?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.vendorName?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (fgExcelFilters.name && !fgExcelFilters.name.includes(r.name || '(Blanks)')) return false;
      if (fgExcelFilters.classification && !fgExcelFilters.classification.includes(r.classification || '(Blanks)')) return false;
      if (fgExcelFilters.category && !fgExcelFilters.category.includes(r.category || '(Blanks)')) return false;
      if (fgExcelFilters.uom && !fgExcelFilters.uom.includes(r.uom || '(Blanks)')) return false;
      if (fgExcelFilters.taxRate && !fgExcelFilters.taxRate.includes(`${r.taxRate}%`)) return false;
      if (fgExcelFilters.vendor && !fgExcelFilters.vendor.includes(r.vendorName || '(Blanks)')) return false;
      if (fgExcelFilters.status && !fgExcelFilters.status.includes(r.status || '(Blanks)')) return false;

      return true;
    });

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
  }, [mergedFgRows, searchTerm, fgExcelFilters, sortField, sortDirection]);

  const hasActiveRmFilters =
    Boolean(searchTerm.trim()) ||
    Object.values(rmExcelFilters).some((f) => f !== null);

  const hasActiveFgFilters =
    Boolean(searchTerm.trim()) ||
    Object.values(fgExcelFilters).some((f) => f !== null);

  const handleResetFilters = () => {
    setSearchTerm('');
    if (activeSubTab === 'rm-bo') {
      setRmExcelFilters({
        name: null,
        category: null,
        make: null,
        uom: null,
        taxRate: null,
        vendor: null,
        status: null
      });
    } else {
      setFgExcelFilters({
        name: null,
        classification: null,
        category: null,
        uom: null,
        taxRate: null,
        vendor: null,
        status: null
      });
    }
  };

  // Open Edit Price Modal pre-filled
  const handleOpenEditModal = (item?: any) => {
    const isRm = activeSubTab === 'rm-bo';

    if (item) {
      setFormData({
        itemType: isRm ? 'RM_BO' : 'FG',
        itemCode: item.itemCode || item.name,
        itemName: item.name || item.itemCode,
        description: item.description || '',
        category: item.category || '',
        make: item.make || '',
        uom: item.uom || (isRm ? 'Kg' : 'Nos'),
        price: item.unitPrice ? String(item.unitPrice) : '',
        taxRatePercent: item.taxRate || 18,
        vendorCode: item.vendorCode || '',
        vendorName: item.vendorName && item.vendorName !== 'Standard Base Rate' && item.vendorName !== 'Unassigned' ? item.vendorName : '',
        isPreferred: item.isPreferred !== undefined ? item.isPreferred : true,
        remarks: item.remarks || '',
        agreementId: item.agreementId,
        updatedByName: item.updatedByName,
        updatedAt: item.updatedAt
      });
      setEditModal({ isOpen: true, mode: 'EDIT', item });
    } else {
      setFormData({
        itemType: isRm ? 'RM_BO' : 'FG',
        itemCode: '',
        itemName: '',
        description: '',
        category: '',
        make: '',
        uom: isRm ? 'Kg' : 'Nos',
        price: '',
        taxRatePercent: 18,
        vendorCode: '',
        vendorName: '',
        isPreferred: true,
        remarks: '',
        agreementId: undefined,
        updatedByName: '',
        updatedAt: ''
      });
      setEditModal({ isOpen: true, mode: 'CREATE', item: null });
    }
  };

  // Switch Item Type inside the modal (only RM_BO vs FG)
  const handleModalTypeChange = (type: 'RM_BO' | 'FG') => {
    const defaultUom = type === 'RM_BO' ? 'Kg' : 'Nos';
    setFormData((prev) => ({
      ...prev,
      itemType: type,
      itemCode: '',
      itemName: '',
      description: '',
      category: '',
      make: '',
      uom: defaultUom,
      price: '',
      agreementId: undefined
    }));
  };

  // Handle selecting an existing item to auto-fetch its UOM and specs
  const handleSelectItem = (name: string) => {
    if (!name) {
      setFormData((prev) => ({
        ...prev,
        itemCode: '',
        itemName: '',
        description: '',
        category: '',
        make: '',
        uom: prev.itemType === 'RM_BO' ? 'Kg' : 'Nos'
      }));
      return;
    }

    const isRm = formData.itemType === 'RM_BO';
    const list = isRm ? rmItems : fgItems;
    const found = list.find((i: any) => i.name === name);

    if (found) {
      // Look for existing price agreement for this item
      const existingAgr = agreements.find(
        (a: any) =>
          a.itemCode?.toLowerCase() === found.name?.toLowerCase() ||
          a.itemName?.toLowerCase() === found.name?.toLowerCase()
      );

      setFormData((prev) => ({
        ...prev,
        itemCode: found.name,
        itemName: found.name,
        description: found.description || '',
        category: found.categoryName || '',
        make: found.make || '',
        uom: found.uom || (isRm ? 'Kg' : 'Nos'),
        price: existingAgr?.unitPrice
          ? String(existingAgr.unitPrice)
          : found.standardRateINR
          ? String(found.standardRateINR)
          : prev.price,
        taxRatePercent: existingAgr?.taxRatePercent || prev.taxRatePercent,
        vendorCode: existingAgr?.vendorCode || prev.vendorCode,
        vendorName: existingAgr?.vendorName || prev.vendorName,
        isPreferred: existingAgr ? existingAgr.isPreferred : true,
        remarks: existingAgr?.remarks || prev.remarks,
        agreementId: existingAgr?.id
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        itemCode: name,
        itemName: name
      }));
    }
  };

  // Submit Price Modal
  const handleSubmitPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemCode && !formData.itemName) {
      dispatch(addToast({ type: 'warning', message: 'Please specify or select an item.' }));
      return;
    }

    const unitPrice = parseFloat(formData.price) || 0;

    try {
      const payload: any = {
        itemCode: formData.itemCode || formData.itemName,
        itemName: formData.itemName || formData.itemCode,
        description: formData.description,
        itemType: formData.itemType,
        category: formData.category,
        vendorCode: formData.vendorCode,
        vendorName: formData.vendorName || 'Standard Base Rate',
        unitPrice,
        taxRatePercent: formData.taxRatePercent,
        currency: 'INR',
        uom: formData.uom,
        isPreferred: formData.isPreferred,
        remarks: formData.remarks
      };

      if (formData.agreementId) {
        await updatePriceAgreement({ id: formData.agreementId, ...payload }).unwrap();
        dispatch(addToast({ type: 'success', message: 'All set! Item price list updated successfully.' }));
      } else {
        await createPriceAgreement(payload).unwrap();
        dispatch(addToast({ type: 'success', message: 'All set! Item price configured successfully.' }));
      }

      setEditModal(null);
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || 'We could not save this price list right now. Please try again.'
        })
      );
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amt || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
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

  return (
    <div className="space-y-4">
      {/* Sub-Tab Navigation (Modern Button-Type Segmented Pill Tabs - Zero Line-Underline Tabs) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/purchase/price-list/rm-bo"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'rm-bo'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>RM & BO Items</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeSubTab === 'rm-bo'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {mergedRmRows.length}
            </span>
          </Link>

          <Link
            href="/purchase/price-list/fg"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'fg'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>FG Items</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeSubTab === 'fg'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {mergedFgRows.length}
            </span>
          </Link>
        </div>

        <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5 font-medium">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Rates synced across Procurement & BOM Costing</span>
        </div>
      </div>

      {/* Top Dedicated In-Line Table Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left Side: Dedicated In-Line Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${activeSubTab === 'rm-bo' ? 'RM & BO items' : 'FG items'} by name, spec, vendor, category...`}
            className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Side: Reset Filters + Primary Add Button */}
        <div className="flex items-center gap-2 justify-end">
          {((activeSubTab === 'rm-bo' && hasActiveRmFilters) ||
            (activeSubTab === 'fg' && hasActiveFgFilters)) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}

          <button
            onClick={() => handleOpenEditModal()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs shadow-orange-500/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Configure Price</span>
          </button>
        </div>
      </div>

      {/* RM & BO Items Data Table */}
      {activeSubTab === 'rm-bo' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="Item Name & Code"
                      columnKey="name"
                      distinctValues={rmDistinctValues.name}
                      selectedValues={rmExcelFilters.name}
                      onFilterChange={(selected) =>
                        setRmExcelFilters((prev) => ({ ...prev, name: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Category"
                      columnKey="category"
                      distinctValues={rmDistinctValues.category}
                      selectedValues={rmExcelFilters.category}
                      onFilterChange={(selected) =>
                        setRmExcelFilters((prev) => ({ ...prev, category: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Make"
                      columnKey="make"
                      distinctValues={rmDistinctValues.make}
                      selectedValues={rmExcelFilters.make}
                      onFilterChange={(selected) =>
                        setRmExcelFilters((prev) => ({ ...prev, make: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="UOM"
                      columnKey="uom"
                      distinctValues={rmDistinctValues.uom}
                      selectedValues={rmExcelFilters.uom}
                      onFilterChange={(selected) =>
                        setRmExcelFilters((prev) => ({ ...prev, uom: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <div className="text-right">Unit Price (₹)</div>
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="GST %"
                      columnKey="taxRate"
                      distinctValues={rmDistinctValues.taxRate}
                      selectedValues={rmExcelFilters.taxRate}
                      onFilterChange={(selected) =>
                        setRmExcelFilters((prev) => ({ ...prev, taxRate: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Preferred Supplier"
                      columnKey="vendor"
                      distinctValues={rmDistinctValues.vendor}
                      selectedValues={rmExcelFilters.vendor}
                      onFilterChange={(selected) =>
                        setRmExcelFilters((prev) => ({ ...prev, vendor: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Status"
                      columnKey="status"
                      distinctValues={rmDistinctValues.status}
                      selectedValues={rmExcelFilters.status}
                      onFilterChange={(selected) =>
                        setRmExcelFilters((prev) => ({ ...prev, status: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-4 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {isLoadingRm || isLoadingAgreements ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Loading RM & BO price records...
                    </td>
                  </tr>
                ) : filteredRmRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <div className="max-w-sm mx-auto text-center space-y-2">
                        <Tag className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">No RM or BO items match criteria.</p>
                        <p className="text-[11px] text-slate-400">
                          Configure new item rates using the "Configure Price" button above.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRmRows.map((row: any, idx: number) => (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setPreviewItem(row)}
                    >
                      <td className="py-3 px-3 text-center text-slate-400 text-[11px] font-mono">
                        {idx + 1}
                      </td>

                      {/* Clickable Identifier */}
                      <td className="py-3 px-4 font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                        <div>
                          <span className="font-bold">{row.name}</span>
                          {row.description && (
                            <p className="text-[11px] text-slate-400 font-normal italic truncate max-w-xs">
                              {row.description}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {row.category}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600">{row.make}</td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-800 font-bold px-2 py-0.5 bg-slate-100 rounded-md">
                          {row.uom}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="font-bold font-mono text-slate-900">
                          {row.unitPrice > 0 ? formatCurrency(row.unitPrice) : '—'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/50">
                          {row.taxRate}%
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {row.isPreferred && row.vendorName !== 'Unassigned' && (
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                          )}
                          <span
                            className={`truncate max-w-[180px] font-medium ${
                              row.vendorName === 'Unassigned'
                                ? 'text-slate-400 italic'
                                : 'text-slate-800'
                            }`}
                          >
                            {row.vendorName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            row.status === 'Active Agreement'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : row.status === 'Base Rate Only'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {row.status === 'Active Agreement' && <Check className="w-2.5 h-2.5" />}
                          {row.status}
                        </span>
                      </td>

                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setPreviewItem(row)}
                            title="Preview Details"
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(row)}
                            title="Edit Price List"
                            className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
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
      )}

      {/* FG Items Data Table */}
      {activeSubTab === 'fg' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="Item Name & Code"
                      columnKey="name"
                      distinctValues={fgDistinctValues.name}
                      selectedValues={fgExcelFilters.name}
                      onFilterChange={(selected) =>
                        setFgExcelFilters((prev) => ({ ...prev, name: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Classification"
                      columnKey="classification"
                      distinctValues={fgDistinctValues.classification}
                      selectedValues={fgExcelFilters.classification}
                      onFilterChange={(selected) =>
                        setFgExcelFilters((prev) => ({ ...prev, classification: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Category"
                      columnKey="category"
                      distinctValues={fgDistinctValues.category}
                      selectedValues={fgExcelFilters.category}
                      onFilterChange={(selected) =>
                        setFgExcelFilters((prev) => ({ ...prev, category: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="UOM"
                      columnKey="uom"
                      distinctValues={fgDistinctValues.uom}
                      selectedValues={fgExcelFilters.uom}
                      onFilterChange={(selected) =>
                        setFgExcelFilters((prev) => ({ ...prev, uom: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <div className="text-right">Unit Price (₹)</div>
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="GST %"
                      columnKey="taxRate"
                      distinctValues={fgDistinctValues.taxRate}
                      selectedValues={fgExcelFilters.taxRate}
                      onFilterChange={(selected) =>
                        setFgExcelFilters((prev) => ({ ...prev, taxRate: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Preferred Supplier"
                      columnKey="vendor"
                      distinctValues={fgDistinctValues.vendor}
                      selectedValues={fgExcelFilters.vendor}
                      onFilterChange={(selected) =>
                        setFgExcelFilters((prev) => ({ ...prev, vendor: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Status"
                      columnKey="status"
                      distinctValues={fgDistinctValues.status}
                      selectedValues={fgExcelFilters.status}
                      onFilterChange={(selected) =>
                        setFgExcelFilters((prev) => ({ ...prev, status: selected }))
                      }
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={handleSortChange}
                    />
                  </th>
                  <th className="py-3 px-4 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {isLoadingFg || isLoadingAgreements ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Loading FG price records...
                    </td>
                  </tr>
                ) : filteredFgRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <div className="max-w-sm mx-auto text-center space-y-2">
                        <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">No FG items match criteria.</p>
                        <p className="text-[11px] text-slate-400">
                          Configure new item rates using the "Configure Price" button above.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFgRows.map((row: any, idx: number) => (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setPreviewItem(row)}
                    >
                      <td className="py-3 px-3 text-center text-slate-400 text-[11px] font-mono">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                        <div>
                          <span className="font-bold">{row.name}</span>
                          {row.description && (
                            <p className="text-[11px] text-slate-400 font-normal italic truncate max-w-xs">
                              {row.description}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/50">
                          {row.classification}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {row.category}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-800 font-bold px-2 py-0.5 bg-slate-100 rounded-md">
                          {row.uom}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="font-bold font-mono text-slate-900">
                          {row.unitPrice > 0 ? formatCurrency(row.unitPrice) : '—'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/50">
                          {row.taxRate}%
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {row.isPreferred && row.vendorName !== 'Unassigned' && (
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                          )}
                          <span
                            className={`truncate max-w-[180px] font-medium ${
                              row.vendorName === 'Unassigned'
                                ? 'text-slate-400 italic'
                                : 'text-slate-800'
                            }`}
                          >
                            {row.vendorName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            row.status === 'Active Agreement'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : row.status === 'Base Rate Only'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {row.status === 'Active Agreement' && <Check className="w-2.5 h-2.5" />}
                          {row.status}
                        </span>
                      </td>

                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setPreviewItem(row)}
                            title="Preview Details"
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(row)}
                            title="Edit Price List"
                            className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
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
      )}

      {/* Edit Item Price List Modal — Standard Wider Layout (max-w-3xl lg:max-w-4xl) with Single UOM & 2 Item Types */}
      {editModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl lg:max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Crisp White Header Ribbon with Amber/Yellow Top Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {editModal.mode === 'EDIT' ? 'Edit Item Price List' : 'Configure Item Price'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Item price & preferred supplier assignment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body in 2-Column Responsive Layout */}
            <form onSubmit={handleSubmitPrice} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {/* Select Item Type: Only Two Options (RM & BO Items vs FG Items) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Select Item Type *
                </label>
                <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl max-w-md">
                  <button
                    type="button"
                    onClick={() => handleModalTypeChange('RM_BO')}
                    className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                      formData.itemType === 'RM_BO'
                        ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Boxes className="w-4 h-4" />
                    <span>RM & BO Items</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModalTypeChange('FG')}
                    className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                      formData.itemType === 'FG'
                        ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>FG Items</span>
                  </button>
                </div>
              </div>

              {/* Item Selection / Item Details Card */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  {formData.itemType === 'RM_BO' ? 'Raw Material / Bought Out Item *' : 'Finished Good / Component Item *'}
                </label>
                {editModal.mode === 'EDIT' ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900">{formData.itemName}</h4>
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-orange-100 text-orange-700">
                          {formData.itemType === 'RM_BO' ? 'RM & BO' : 'FG'}
                        </span>
                      </div>
                      {formData.description && (
                        <p className="text-xs text-slate-500 italic">{formData.description}</p>
                      )}
                      {formData.make && (
                        <p className="text-[11px] text-slate-600 font-medium">Make: {formData.make}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {formData.category && (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-xs">
                          {formData.category}
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-slate-900 text-white shadow-xs">
                        UOM: {formData.uom}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={formData.itemCode}
                      onChange={(e) => handleSelectItem(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
                    >
                      <option value="">-- Choose Existing Item to Auto-Fetch UOM & Specs --</option>
                      {(formData.itemType === 'RM_BO' ? rmItems : fgItems).map((i: any) => (
                        <option key={i.id || i.name} value={i.name}>
                          {i.name} {i.categoryName ? `• [${i.categoryName}]` : ''} • ({i.uom || 'Nos'})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Or type custom item name / code..."
                        value={formData.itemName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            itemCode: e.target.value,
                            itemName: e.target.value
                          }))
                        }
                        className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2-Column Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Price (per fetched UOM) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Price (₹ per {formData.uom}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* Single UOM: Fetched from Item */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Unit of Measurement (UOM)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.uom}
                      readOnly
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 cursor-not-allowed"
                    />
                    <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                      Fetched from item
                    </span>
                  </div>
                </div>

                {/* Tax Rate (% GST) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Tax Rate (%) (GST) *
                  </label>
                  <select
                    value={formData.taxRatePercent}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        taxRatePercent: Number(e.target.value)
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (Standard)</option>
                    <option value={28}>28%</option>
                  </select>
                </div>

                {/* Vendor / Supplier (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Vendor / Supplier (Optional)
                    </label>
                    <span className="text-[10px] text-slate-400">Blank for base rate</span>
                  </div>
                  <select
                    value={formData.vendorCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const v = vendors.find((vend: any) => vend.vendorCode === code);
                      setFormData((prev) => ({
                        ...prev,
                        vendorCode: code,
                        vendorName: v ? v.name : ''
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
                  >
                    <option value="">-- No Specific Vendor (Standard Base Rate) --</option>
                    {vendors.map((v: any) => (
                      <option key={v.id || v.vendorCode} value={v.vendorCode}>
                        {v.name} ({v.vendorCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preferred Supplier Highlight Banner */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 space-y-1.5">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-amber-900">
                  <input
                    type="checkbox"
                    checked={formData.isPreferred}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isPreferred: e.target.checked }))
                    }
                    className="w-4 h-4 text-orange-500 rounded-md focus:ring-orange-500/20"
                  />
                  <span>⭐ Preferred Supplier for this Material</span>
                </label>
                <p className="text-[11px] text-amber-700 pl-6.5 leading-relaxed">
                  Procurement Workbench and BOM Costing will prioritize this vendor quote when generating Purchase Orders and cost estimations.
                </p>
              </div>

              {/* Remarks (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Remarks / Commercial Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Optional notes, supplier quotation reference number, or validity..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-slate-400"
                />
              </div>

              {/* Audit Metadata (if updating) */}
              {formData.updatedAt && (
                <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span>Last Updated: {formData.updatedByName || 'System'}</span>
                  <span>{formatDate(formData.updatedAt)}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{isCreating || isUpdating ? 'Saving...' : 'Update Price List'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Price Preview Dossier Modal (Standard Modal Sizing + Dual-Card Universal Action Tracking) */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Crisp White Header Ribbon with Amber/Yellow Top Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {previewItem.name} — Price Agreement
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {previewItem.category} • {previewItem.uom}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const item = previewItem;
                    setPreviewItem(null);
                    handleOpenEditModal(item);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Price</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dossier Content */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Technical & Commercial Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Item Specifications
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Item Name:</span>
                      <span className="font-bold text-slate-900">{previewItem.name}</span>
                    </div>
                    {previewItem.description && (
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Description:</span>
                        <span className="text-slate-800 text-right max-w-[200px]">{previewItem.description}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Category:</span>
                      <span className="font-semibold text-slate-800">{previewItem.category}</span>
                    </div>
                    {previewItem.make && previewItem.make !== '-' && (
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Make / Brand:</span>
                        <span className="font-semibold text-slate-800">{previewItem.make}</span>
                      </div>
                    )}
                    {previewItem.classification && (
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Classification:</span>
                        <span className="font-semibold text-slate-800">{previewItem.classification}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Unit of Measurement:</span>
                      <span className="font-mono font-bold text-slate-900">{previewItem.uom}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Commercial & Rate Terms
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Base Unit Rate:</span>
                      <span className="font-mono font-extrabold text-slate-900 text-sm">
                        {previewItem.unitPrice > 0 ? formatCurrency(previewItem.unitPrice) : 'Unset'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Tax Rate (GST):</span>
                      <span className="font-semibold text-blue-700">{previewItem.taxRate}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Rate Incl. GST:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {previewItem.unitPrice > 0
                          ? formatCurrency(previewItem.unitPrice * (1 + previewItem.taxRate / 100))
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Preferred Supplier:</span>
                      <span className="font-bold text-slate-900 text-right max-w-[200px]">
                        {previewItem.vendorName || 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Rate Status:</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          previewItem.status === 'Active Agreement'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {previewItem.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {previewItem.remarks && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <h4 className="text-xs font-bold text-slate-700">Notes & Commercial Remarks</h4>
                  <p className="text-xs text-slate-600 italic">{previewItem.remarks}</p>
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
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Created By</p>
                      <p className="text-xs font-bold text-slate-800">{previewItem.createdByName || 'System'}</p>
                      <p className="text-[11px] text-slate-500">{formatDate(previewItem.createdAt)}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Last Updated By</p>
                      <p className="text-xs font-bold text-slate-800">{previewItem.updatedByName || 'System'}</p>
                      <p className="text-[11px] text-slate-500">{formatDate(previewItem.updatedAt)}</p>
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
