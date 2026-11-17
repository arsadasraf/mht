'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  IndianRupee,
  X,
  Plus,
  Trash2,
  Search,
  Truck,
  Package,
  FileText,
  AlertCircle,
  Building2,
  CheckCircle2,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import {
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useGetVendorsQuery
} from '../api/purchaseApi';
import { useGetProjectsQuery } from '../../project-setup/api/projectApi';
import { useGetRmItemsQuery, useGetFgItemsQuery } from '../../design/api/designApi';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';

export interface PoLineItem {
  id: string;
  itemCode: string;
  itemName: string;
  description: string;
  hsnCode: string;
  count?: number;
  uom: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface OutwardPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPo?: any;
  initialProjectId?: string;
  initialVendorId?: string;
  initialVendorName?: string;
  initialItems?: Array<{
    itemCode?: string;
    itemName?: string;
    name?: string;
    description?: string;
    specification?: string;
    hsnCode?: string;
    uom?: string;
    quantity?: number;
    qty?: number;
    rate?: number;
    unitPrice?: number;
    count?: number;
  }>;
  existingPos?: any[];
  onPoCreated?: (newPo: any) => void;
}

const COMMON_UOMS = ['Nos', 'KG', 'Mtr', 'Set', 'Pcs', 'Box', 'Roll', 'Ltr', 'Pkts'];

export default function OutwardPurchaseOrderModal({
  isOpen,
  onClose,
  editingPo,
  initialProjectId = '',
  initialVendorId = '',
  initialVendorName = '',
  initialItems = [],
  existingPos = [],
  onPoCreated
}: OutwardPurchaseOrderModalProps) {
  const dispatch = useAppDispatch();
  const isEditMode = Boolean(editingPo);

  // Queries
  const { data: vendorData } = useGetVendorsQuery({});
  const { data: projectsData } = useGetProjectsQuery({});
  const { data: rmData } = useGetRmItemsQuery({});
  const { data: boData } = useGetFgItemsQuery({ classification: 'BOUGHT_OUT' });

  const [createPurchaseOrder, { isLoading: isCreating }] = useCreatePurchaseOrderMutation();
  const [updatePurchaseOrder, { isLoading: isUpdating }] = useUpdatePurchaseOrderMutation();
  const isSubmitting = isCreating || isUpdating;

  const vendors = useMemo(() => vendorData?.vendors || [], [vendorData]);
  const projects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const rmItems = useMemo(() => rmData?.items || [], [rmData]);
  const boItems = useMemo(() => boData?.items || [], [boData]);

  // Master Prefix Policy
  const poPrefix = vendorData?.prefixLockPolicy?.poPrefix || 'PO';

  // Form State
  const [poType, setPoType] = useState<'RM' | 'BO' | 'CONSUMABLE'>('BO');
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedVendorId, setSelectedVendorId] = useState(initialVendorId);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);

  // Line Items State
  const [lineItems, setLineItems] = useState<PoLineItem[]>([]);
  const [itemSearchFilter, setItemSearchFilter] = useState('');

  // Logistics & Terms
  const [freightTransportMode, setFreightTransportMode] = useState('Road Freight');
  const [freightCharges, setFreightCharges] = useState<number | string>(0);
  const [freightTaxable, setFreightTaxable] = useState(true);

  const [packagingType, setPackagingType] = useState('Standard Packaging');
  const [packagingCharges, setPackagingCharges] = useState<number | string>(0);
  const [packagingTaxable, setPackagingTaxable] = useState(true);

  const [paymentTerms, setPaymentTerms] = useState('30 Days Net');
  const [deliveryPlant, setDeliveryPlant] = useState('');
  const [deliverySchedule, setDeliverySchedule] = useState('');
  const [remarks, setRemarks] = useState('');

  // Taxes & Grand Total
  const [taxType, setTaxType] = useState<'INTRA_STATE' | 'INTER_STATE'>('INTRA_STATE');
  const [gstRate, setGstRate] = useState<number>(18);
  const [roundOffEnabled, setRoundOffEnabled] = useState(true);

  // Auto-generate PO Number on Modal Open or Prefix Change
  useEffect(() => {
    if (!isOpen) return;

    if (editingPo) {
      setPoNumber(editingPo.poNumber || '');
      setPoType(editingPo.totalAmount?.poType || 'BO');
      setPoDate(
        editingPo.totalAmount?.poDate ||
          (editingPo.createdAt ? new Date(editingPo.createdAt).toISOString().split('T')[0] : '')
      );
      setSelectedVendorId(
        editingPo.vendorId?.id || editingPo.vendorId?._id || editingPo.vendorId || ''
      );
      setSelectedProjectId(editingPo.projectId || '');
      setFreightTransportMode(editingPo.totalAmount?.freightTransportMode || 'Road Freight');
      setFreightCharges(editingPo.totalAmount?.freightAmount || 0);
      setFreightTaxable(editingPo.totalAmount?.freightTaxable !== false);
      setPackagingType(editingPo.totalAmount?.packagingType || 'Standard Packaging');
      setPackagingCharges(editingPo.totalAmount?.packagingAmount || 0);
      setPackagingTaxable(editingPo.totalAmount?.packagingTaxable !== false);
      setTaxType(editingPo.totalAmount?.taxType || 'INTRA_STATE');
      setGstRate(editingPo.totalAmount?.gstRate || 18);
      setPaymentTerms(editingPo.totalAmount?.paymentTerms || '30 Days Net');
      setDeliveryPlant(editingPo.totalAmount?.deliveryPlant || '');
      setRemarks(editingPo.notes || '');

      if (Array.isArray(editingPo.items) && editingPo.items.length > 0) {
        const mapped = editingPo.items.map((it: any, idx: number) => {
          const qty = Number(
            typeof it.quantity === 'object' ? it.quantity?.baseQty : it.quantity || 1
          );
          const rate = Number(
            typeof it.unitPrice === 'object'
              ? it.unitPrice?.baseAmountINR || it.unitPrice?.amount
              : it.unitPrice || it.rate || 0
          );
          return {
            id: it.id || `item-${Date.now()}-${idx}`,
            itemCode: it.itemCode || '',
            itemName: it.itemName || it.name || '',
            description: it.description || '',
            hsnCode: it.hsnCode || '84799090',
            uom: it.quantity?.baseUom || it.uom || 'Nos',
            quantity: qty,
            rate: rate,
            amount: Number(
              typeof it.lineTotal === 'object'
                ? it.lineTotal?.baseAmountINR || it.lineTotal?.amount
                : it.lineTotal || qty * rate
            )
          };
        });
        setLineItems(mapped);
      }
      return;
    }

    const currentYear = new Date().getFullYear();
    const prefixString = `${poPrefix}-${currentYear}-`;

    // Find highest sequence from existing POs
    const matchingSeqs = (existingPos || [])
      .map((p: any) => {
        const num = String(p.poNumber || '').toUpperCase();
        if (num.startsWith(prefixString)) {
          const suffix = parseInt(num.replace(prefixString, ''), 10);
          return isNaN(suffix) ? 0 : suffix;
        }
        return 0;
      })
      .filter((seq: number) => seq > 0);

    const maxSeq = matchingSeqs.length > 0 ? Math.max(...matchingSeqs) : 0;
    const nextCandidate = `${prefixString}${String(maxSeq + 1).padStart(4, '0')}`;
    setPoNumber(nextCandidate);
  }, [isOpen, poPrefix, existingPos, editingPo]);

  // Pre-seed Form when opened from attached BOM
  useEffect(() => {
    if (!isOpen) return;

    if (initialProjectId) setSelectedProjectId(initialProjectId);
    if (initialVendorId) setSelectedVendorId(initialVendorId);

    if (initialItems && initialItems.length > 0) {
      const seeded = initialItems.map((item, idx) => {
        const qty = Number(item.quantity ?? item.qty ?? 1);
        const rate = Number(item.rate ?? item.unitPrice ?? 0);
        return {
          id: `item-${Date.now()}-${idx}`,
          itemCode: item.itemCode || `ITEM-${idx + 1}`,
          itemName: item.itemName || item.name || 'Sourced Component',
          description: item.description || item.specification || '',
          hsnCode: item.hsnCode || '84799090',
          count: Number(item.count || 0),
          uom: item.uom || 'Nos',
          quantity: qty,
          rate: rate,
          amount: Math.round(qty * rate * 100) / 100
        };
      });
      setLineItems(seeded);
    } else {
      // Default initial row
      setLineItems([
        {
          id: `item-${Date.now()}-0`,
          itemCode: '',
          itemName: '',
          description: '',
          hsnCode: '84799090',
          count: 0,
          uom: 'Nos',
          quantity: 1,
          rate: 0,
          amount: 0
        }
      ]);
    }
  }, [isOpen, initialProjectId, initialVendorId, initialItems]);

  // Selected Vendor lookup
  const selectedVendor = useMemo(() => {
    return vendors.find((v: any) => v.id === selectedVendorId || v._id === selectedVendorId);
  }, [vendors, selectedVendorId]);

  // Auto-detect Intra vs Inter State from Vendor GSTIN
  useEffect(() => {
    if (selectedVendor?.gstin) {
      const gstinTrimmed = selectedVendor.gstin.trim();
      // Maharashtra state code is 27
      if (gstinTrimmed.startsWith('27')) {
        setTaxType('INTRA_STATE');
      } else if (gstinTrimmed.length >= 2) {
        setTaxType('INTER_STATE');
      }
    }
    if (selectedVendor?.paymentTerm) {
      setPaymentTerms(selectedVendor.paymentTerm);
    }
  }, [selectedVendor]);

  // Duplicate PO Number Detection
  const isDuplicatePoNumber = useMemo(() => {
    const clean = poNumber.trim().toUpperCase();
    if (!clean) return false;
    return (existingPos || []).some((p: any) => {
      if (editingPo && (p.id === editingPo.id || p._id === editingPo.id || p.id === editingPo._id || p._id === editingPo._id)) {
        return false;
      }
      return String(p.poNumber || '').trim().toUpperCase() === clean;
    });
  }, [poNumber, existingPos, editingPo]);

  // Calculations
  const calculations = useMemo(() => {
    const itemsSubtotal = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const freight = Math.max(0, Number(freightCharges) || 0);
    const packaging = Math.max(0, Number(packagingCharges) || 0);

    let taxableBase = itemsSubtotal;
    if (freightTaxable) taxableBase += freight;
    if (packagingTaxable) taxableBase += packaging;
    taxableBase = Math.round(taxableBase * 100) / 100;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (taxType === 'INTRA_STATE') {
      const halfRate = gstRate / 2;
      cgstAmount = Math.round((taxableBase * (halfRate / 100)) * 100) / 100;
      sgstAmount = Math.round((taxableBase * (halfRate / 100)) * 100) / 100;
    } else {
      igstAmount = Math.round((taxableBase * (gstRate / 100)) * 100) / 100;
    }

    const unroundedTotal = itemsSubtotal + freight + packaging + cgstAmount + sgstAmount + igstAmount;
    let grandTotal = unroundedTotal;
    let roundOff = 0;

    if (roundOffEnabled) {
      grandTotal = Math.round(unroundedTotal);
      roundOff = Math.round((grandTotal - unroundedTotal) * 100) / 100;
    }

    return {
      itemsSubtotal: Math.round(itemsSubtotal * 100) / 100,
      freight,
      packaging,
      taxableBase,
      cgstAmount,
      sgstAmount,
      igstAmount,
      roundOff,
      grandTotal: Math.round(grandTotal * 100) / 100
    };
  }, [lineItems, freightCharges, freightTaxable, packagingCharges, packagingTaxable, taxType, gstRate, roundOffEnabled]);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  // Row Manipulation
  const handleAddItemRow = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        itemCode: '',
        itemName: '',
        description: '',
        hsnCode: '84799090',
        count: 0,
        uom: 'Nos',
        quantity: 1,
        rate: 0,
        amount: 0
      }
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (lineItems.length <= 1) {
      dispatch(addToast({ type: 'warning', message: 'At least one line item is required for an Outward PO.' }));
      return;
    }
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof PoLineItem, value: any) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          const qty = field === 'quantity' ? Number(value) || 0 : item.quantity;
          const rate = field === 'rate' ? Number(value) || 0 : item.rate;
          updated.amount = Math.round(qty * rate * 100) / 100;
        }
        return updated;
      })
    );
  };

  // Quick Autocomplete from RM & BO Masters
  const availableMasterItems = useMemo(() => {
    const rms = rmItems.map((r: any) => ({
      code: r.itemCode,
      name: r.name,
      description: r.grade ? `${r.grade} • ${r.sizeOrThickness || ''}` : r.description || '',
      uom: r.uom || 'KG',
      hsn: r.hsnSac || '72083800',
      rate: Number(r.standardRate || 0),
      type: 'RM'
    }));
    const bos = boItems.map((b: any) => ({
      code: b.itemCode,
      name: b.name,
      description: b.make ? `Make: ${b.make} • Model: ${b.modelNumber || ''}` : b.description || '',
      uom: b.uom || 'Nos',
      hsn: b.hsnSac || '84799090',
      rate: Number(b.standardCost || b.agreedRate || 0),
      type: 'BO'
    }));
    return [...bos, ...rms];
  }, [rmItems, boItems]);

  const handleSelectMasterItem = (id: string, itemCode: string) => {
    const found = availableMasterItems.find((m) => m.code === itemCode);
    if (!found) return;

    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const qty = item.quantity || 1;
        const rate = found.rate || item.rate || 0;
        return {
          ...item,
          itemCode: found.code,
          itemName: found.name,
          description: found.description || item.description,
          uom: found.uom || item.uom,
          hsnCode: found.hsn || item.hsnCode,
          rate: rate,
          amount: Math.round(qty * rate * 100) / 100
        };
      })
    );
  };

  // Filtered rows for in-table search
  const visibleLineItems = useMemo(() => {
    if (!itemSearchFilter.trim()) return lineItems;
    const q = itemSearchFilter.toLowerCase();
    return lineItems.filter(
      (item) =>
        item.itemCode.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.hsnCode.toLowerCase().includes(q)
    );
  }, [lineItems, itemSearchFilter]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!poNumber.trim()) {
      dispatch(addToast({ type: 'warning', message: 'Please enter a valid Outward PO Number.' }));
      return;
    }
    if (isDuplicatePoNumber) {
      dispatch(addToast({ type: 'error', message: `PO Number "${poNumber}" already exists. Please choose a unique number.` }));
      return;
    }
    if (!selectedVendorId) {
      dispatch(addToast({ type: 'warning', message: 'Please select an approved Vendor / Supplier.' }));
      return;
    }

    const validItems = lineItems.filter((i) => i.itemName.trim() || i.itemCode.trim());
    if (validItems.length === 0) {
      dispatch(addToast({ type: 'warning', message: 'Please add at least one line item with a name or code.' }));
      return;
    }

    try {
      const payload = {
        poNumber: poNumber.trim().toUpperCase(),
        poType,
        poDate,
        projectId: selectedProjectId || 'GENERAL-STOCK',
        vendorId: selectedVendorId,
        vendorCode: selectedVendor?.vendorCode || '',
        vendorName: selectedVendor?.name || '',
        freightTransportMode,
        freightAmount: Number(freightCharges) || 0,
        freightTaxable,
        packagingType,
        packagingAmount: Number(packagingCharges) || 0,
        packagingTaxable,
        taxType,
        gstRate,
        paymentTerms,
        deliveryPlant,
        deliverySchedule,
        notes: remarks,
        currency: 'INR',
        exchangeRate: 1.0,
        items: validItems.map((item) => ({
          itemCode: item.itemCode,
          itemName: item.itemName,
          description: item.description,
          itemType: poType,
          hsnCode: item.hsnCode,
          count: item.count,
          uom: item.uom,
          quantity: item.quantity,
          rate: item.rate,
          taxRate: gstRate,
          amount: item.amount
        }))
      };

      if (isEditMode) {
        const result: any = await updatePurchaseOrder({
          id: editingPo.id || editingPo._id,
          ...payload
        }).unwrap();

        dispatch(
          addToast({
            type: 'success',
            message: `All set! Outward PO ${result?.purchaseOrder?.poNumber || poNumber} updated successfully.`
          })
        );
      } else {
        const result: any = await createPurchaseOrder(payload).unwrap();

        dispatch(
          addToast({
            type: 'success',
            message: `All set! Outward PO ${result?.purchaseOrder?.poNumber || poNumber} released successfully.`
          })
        );

        if (onPoCreated) {
          onPoCreated(result?.purchaseOrder);
        }
      }
      onClose();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || err?.message || (isEditMode ? 'We could not update this Outward PO right now. Please try again.' : 'We could not create this Outward PO right now. Please try again.')
        })
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-[96vw] xl:max-w-[1600px] 2xl:max-w-[1760px] max-h-[95vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Crisp White Header with Amber Accent Stripe */}
        <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
              <IndianRupee size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                {isEditMode ? `Edit Outward Purchase Order — ${editingPo?.poNumber}` : 'Create Outward Purchase Order'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 pb-44">
          {/* Section 1: Order Particulars & Header Details */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4.5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Outward PO Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Outward PO Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. PO-2026-0001"
                    className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border transition-all ${
                      isDuplicatePoNumber
                        ? 'border-red-400 bg-red-50/60 text-red-950 focus:border-red-500'
                        : 'border-slate-200 bg-white text-slate-900 focus:border-orange-500'
                    }`}
                  />
                  {isDuplicatePoNumber && (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-red-600 mt-1">
                      <AlertCircle size={12} />
                      <span>PO Number already in use</span>
                    </div>
                  )}
                </div>
              </div>

              {/* PO Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  PO Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-orange-500"
                />
              </div>

              {/* Vendor / Supplier */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vendor / Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-orange-500"
                >
                  <option value="">Select Vendor / Supplier...</option>
                  {vendors.map((v: any) => (
                    <option key={v.id || v._id} value={v.id || v._id}>
                      {v.vendorCode ? `[${v.vendorCode}] ` : ''}
                      {v.name}
                    </option>
                  ))}
                </select>
                {selectedVendor && (
                  <div className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                    GSTIN: {selectedVendor.gstin || 'Unregistered'} • {selectedVendor.city || selectedVendor.paymentTerm || 'Standard'}
                  </div>
                )}
              </div>

              {/* Linked Work Order / Project */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Linked Work Order (Optional)
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-orange-500"
                >
                  <option value="">None (General Store / Inventory Stock)</option>
                  {projects.map((p: any) => (
                    <option key={p.id || p.projectId} value={p.projectId || p.id}>
                      {p.projectId} — {p.customerName || p.title || 'Work Order'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Line Items Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {/* Line Items Header */}
            <div className="bg-slate-50/80 px-4.5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Line Items
                </span>
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold text-[11px] flex items-center justify-center">
                  {lineItems.length}
                </span>
              </div>

              {/* Search in table */}
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Find row, name, desc, HSN..."
                  value={itemSearchFilter}
                  onChange={(e) => setItemSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[320px]">Material Name &amp; Description *</th>
                    <th className="py-2.5 px-3 w-32">HSN / SAC</th>
                    <th className="py-2.5 px-3 w-28">UOM *</th>
                    <th className="py-2.5 px-3 w-32">Quantity *</th>
                    <th className="py-2.5 px-3 w-36">Rate (₹) *</th>
                    <th className="py-2.5 px-3 w-20 text-center">GST %</th>
                    <th className="py-2.5 px-3 w-36 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 w-12 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {visibleLineItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Material Name & Description */}
                      <td className="py-2.5 px-3 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          {availableMasterItems.length > 0 && (
                            <select
                              value={item.itemCode}
                              onChange={(e) => handleSelectMasterItem(item.id, e.target.value)}
                              className="w-40 shrink-0 px-2 py-1 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-slate-50 focus:border-orange-500"
                            >
                              <option value="">Custom Item...</option>
                              {availableMasterItems.map((m) => (
                                <option key={m.code} value={m.code}>
                                  [{m.type}] {m.code} — {m.name.slice(0, 22)}
                                </option>
                              ))}
                            </select>
                          )}
                          <input
                            type="text"
                            placeholder="Material / Component Name"
                            value={item.itemName}
                            onChange={(e) => handleUpdateItem(item.id, 'itemName', e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 focus:outline-hidden focus:border-orange-500"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Description / Specification / Grade / Size..."
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                          className="w-full px-2.5 py-1 text-[11px] text-slate-600 rounded-lg border border-slate-200/80 bg-slate-50/60 focus:outline-hidden focus:border-orange-500"
                        />
                      </td>

                      {/* HSN / SAC */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.hsnCode}
                          onChange={(e) => handleUpdateItem(item.id, 'hsnCode', e.target.value)}
                          className="w-full px-2 py-1 text-xs font-mono rounded-lg border border-slate-200 focus:outline-hidden focus:border-orange-500"
                        />
                      </td>

                      {/* UOM */}
                      <td className="py-2.5 px-3">
                        <select
                          value={item.uom}
                          onChange={(e) => handleUpdateItem(item.id, 'uom', e.target.value)}
                          className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white focus:border-orange-500"
                        >
                          {COMMON_UOMS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-xs font-mono font-semibold rounded-lg border border-slate-200 focus:outline-hidden focus:border-orange-500"
                        />
                      </td>

                      {/* Rate (₹) */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={item.rate}
                          onChange={(e) => handleUpdateItem(item.id, 'rate', Number(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-xs font-mono font-semibold text-slate-900 rounded-lg border border-slate-200 focus:outline-hidden focus:border-orange-500"
                        />
                      </td>

                      {/* GST Tax Rate */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                          {gstRate}%
                        </span>
                      </td>

                      {/* Amount (₹) */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatINR(item.amount)}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(item.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Add Row Bar */}
            <div className="p-3 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all"
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>

              <div className="text-xs text-slate-500 font-semibold">
                Items Subtotal:{' '}
                <span className="font-mono font-bold text-slate-900 ml-1">
                  {formatINR(calculations.itemsSubtotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Dual Column - Logistics / Packaging & Taxes / Grand Total */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left Card: LOGISTICS, PACKAGING & NOTES */}
            <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4.5 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200/80">
                <Truck size={14} className="text-orange-500" />
                <span>Logistics, Packaging &amp; Notes</span>
              </div>

              {/* Freight Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Freight / Transport Mode
                  </label>
                  <input
                    type="text"
                    value={freightTransportMode}
                    onChange={(e) => setFreightTransportMode(e.target.value)}
                    placeholder="e.g. Road Freight"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:border-orange-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Freight Charges (₹)
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-semibold text-sky-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={freightTaxable}
                        onChange={(e) => setFreightTaxable(e.target.checked)}
                        className="rounded text-orange-500 focus:ring-0"
                      />
                      <span>Taxable (+18% GST)</span>
                    </label>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={freightCharges}
                    onChange={(e) => setFreightCharges(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Packaging Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Packaging Type
                  </label>
                  <input
                    type="text"
                    value={packagingType}
                    onChange={(e) => setPackagingType(e.target.value)}
                    placeholder="e.g. Standard Packaging"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:border-orange-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Packaging Charges (₹)
                    </label>
                    <label className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={packagingTaxable}
                        onChange={(e) => setPackagingTaxable(e.target.checked)}
                        className="rounded text-orange-500 focus:ring-0"
                      />
                      <span>Taxable (+18% GST)</span>
                    </label>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={packagingCharges}
                    onChange={(e) => setPackagingCharges(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Payment & Delivery Plant */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. 30 Days Net"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:border-orange-500"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Terms &amp; Conditions / Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Payment terms, delivery schedule, test certificates required..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* Right Card: CONSOLIDATED GST & GRAND TOTAL */}
            <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4.5 space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200/80">
                  <IndianRupee size={14} className="text-orange-500" />
                  <span>Consolidated GST &amp; Grand Total</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      GST Tax Type
                    </label>
                    <select
                      value={taxType}
                      onChange={(e) => setTaxType(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:border-orange-500"
                    >
                      <option value="INTRA_STATE">Intra-State (CGST + SGST)</option>
                      <option value="INTER_STATE">Inter-State (IGST)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      GST Tax Rate (%)
                    </label>
                    <select
                      value={gstRate}
                      onChange={(e) => setGstRate(Number(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:border-orange-500"
                    >
                      <option value={18}>18% GST (Standard)</option>
                      <option value={12}>12% GST</option>
                      <option value={5}>5% GST</option>
                      <option value={28}>28% GST</option>
                      <option value={0}>0% GST (Exempted)</option>
                    </select>
                  </div>
                </div>

                {/* Calculation Rows */}
                <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-200 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Items Subtotal:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatINR(calculations.itemsSubtotal)}
                    </span>
                  </div>

                  {calculations.freight > 0 && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Freight Charges:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatINR(calculations.freight)}
                      </span>
                    </div>
                  )}

                  {calculations.packaging > 0 && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Packaging Charges:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatINR(calculations.packaging)}
                      </span>
                    </div>
                  )}

                  {taxType === 'INTRA_STATE' ? (
                    <>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>CGST ({gstRate / 2}% on Taxable Base):</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {formatINR(calculations.cgstAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>SGST ({gstRate / 2}% on Taxable Base):</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {formatINR(calculations.sgstAmount)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>IGST ({gstRate}% on Taxable Base):</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatINR(calculations.igstAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roundOffEnabled}
                        onChange={(e) => setRoundOffEnabled(e.target.checked)}
                        className="rounded text-orange-500 focus:ring-0"
                      />
                      <span>Round Off Total</span>
                    </label>
                    {roundOffEnabled && (
                      <span className="font-mono text-xs text-slate-500">
                        {calculations.roundOff >= 0 ? `+${calculations.roundOff.toFixed(2)}` : calculations.roundOff.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Grand Total Display */}
              <div className="p-3.5 bg-orange-50 border border-orange-200/80 rounded-xl flex items-center justify-between mt-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-orange-950">
                    Grand Total (Incl. GST)
                  </div>
                  <div className="text-[11px] text-orange-700 font-medium">
                    Currency: INR (₹)
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-mono font-extrabold text-orange-600">
                  {formatINR(calculations.grandTotal)}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Sticky Action Footer Bar */}
        <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-lg">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <span>{lineItems.length} line items</span>
            {selectedVendor && (
              <>
                <span>•</span>
                <span className="font-semibold text-slate-800">{selectedVendor.name}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isDuplicatePoNumber}
              className="px-6 py-2.5 text-xs font-bold rounded-xl text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 transition-all shadow-xs shadow-orange-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isEditMode ? 'Updating PO...' : 'Releasing PO...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>{isEditMode ? 'Update Outward PO' : 'Create & Release Outward PO'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
