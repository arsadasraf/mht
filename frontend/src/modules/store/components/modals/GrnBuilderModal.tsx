'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  X,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  Boxes,
  Truck,
  Package,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Check,
  Download,
  Clock
} from 'lucide-react';
import {
  useCreateGrnMutation,
  useUpdateGrnMutation,
  useGetNextGrnNumberQuery,
  useGetOpenPurchaseOrdersQuery,
  useGetInventoryQuery,
  useGetStoreLocationsQuery
} from '../../api/storeApi';
import { useGetVendorsQuery } from '../../../purchase/api/purchaseApi';

interface GrnLineItem {
  id: string;
  itemCode: string;
  itemName: string;
  description?: string;
  revision: string;
  make?: string;
  qty: number;
  uom: string;
  unitRate: number;
  taxPercent: number;
  taxAmount: number;
  subtotal: number;
  totalAmount: number;
  locationName: string;
  itemType?: 'RM_BO' | 'DRAWING';
  category?: string;
}

interface GrnBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  preselectedItem?: any;
  editingGrn?: any;
}

const GST_RATES = [0, 5, 12, 18, 28];

export function GrnBuilderModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedItem,
  editingGrn
}: GrnBuilderModalProps) {
  const { data: nextNumData, refetch: refetchNextNum } = useGetNextGrnNumberQuery(undefined, {
    skip: !isOpen || Boolean(editingGrn)
  });
  const { data: vendorData } = useGetVendorsQuery({});
  const { data: locationsData } = useGetStoreLocationsQuery({});

  // Design Master items (RM & BO and Drawings)
  const { data: rmData } = useGetInventoryQuery({ category: 'RM_BO' }, { skip: !isOpen });
  const { data: dwData } = useGetInventoryQuery({ category: 'DRAWINGS' }, { skip: !isOpen });

  const [createGrnTrigger, { isLoading: isCreating }] = useCreateGrnMutation();
  const [updateGrnTrigger, { isLoading: isUpdating }] = useUpdateGrnMutation();

  const vendors = useMemo(() => vendorData?.vendors || [], [vendorData]);
  const locations = useMemo(() => locationsData?.locations || [], [locationsData]);

  // Master Design items pool for search (categorized & labeled for dual-type picking)
  const masterItems = useMemo(() => {
    const listA = (Array.isArray(rmData?.items) ? rmData.items : []).map((it: any) => ({
      ...it,
      itemType: 'RM_BO' as const,
      itemTypeLabel: 'RM / BO'
    }));
    const listB = (Array.isArray(dwData?.items) ? dwData.items : []).map((it: any) => ({
      ...it,
      itemType: 'DRAWING' as const,
      itemTypeLabel: 'Design Drawing'
    }));
    return [...listA, ...listB];
  }, [rmData, dwData]);

  // Form State
  const [grnNumber, setGrnNumber] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedVendorName, setSelectedVendorName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [qcGate, setQcGate] = useState<'DIRECT_ACCEPTED' | 'IN_QC'>('DIRECT_ACCEPTED');
  const [notes, setNotes] = useState('');

  // Selected Outward PO
  const [selectedPoNumber, setSelectedPoNumber] = useState('');
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isPoDetailsExpanded, setIsPoDetailsExpanded] = useState(false);

  // Global Tax Rate Toggle
  const [isGlobalTaxActive, setIsGlobalTaxActive] = useState(false);
  const [globalTaxRate, setGlobalTaxRate] = useState(18);

  // Line Items
  const [lineItems, setLineItems] = useState<GrnLineItem[]>([]);

  // Item Search Dropdown & Filter Pills (All, RM & BO, Drawings)
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);
  const [itemTypeFilter, setItemTypeFilter] = useState<'ALL' | 'RM_BO' | 'DRAWING'>('ALL');

  // Transportation & Freight Charges
  const [transportationCharges, setTransportationCharges] = useState(0);
  const [transportationGstPercent, setTransportationGstPercent] = useState(0); // 0, 5, 12, 18, 28

  // Packing & Forwarding Charges
  const [packingCharges, setPackingCharges] = useState(0);
  const [packingGstPercent, setPackingGstPercent] = useState(0); // 0, 5, 12, 18, 28

  const [errorMessage, setErrorMessage] = useState('');

  // Open Outward POs for selected vendor
  const { data: openPosData } = useGetOpenPurchaseOrdersQuery(
    { vendorName: selectedVendorName },
    { skip: !selectedVendorName || !isOpen }
  );
  const openPos = useMemo(() => openPosData?.openPurchaseOrders || [], [openPosData]);

  // Set default next GRN number when fetched (only in create mode)
  useEffect(() => {
    if (nextNumData?.nextGrnNumber && !grnNumber && !editingGrn) {
      setGrnNumber(nextNumData.nextGrnNumber);
    }
  }, [nextNumData, grnNumber, editingGrn]);

  // Pre-fill form when editing an existing GRN
  useEffect(() => {
    if (editingGrn) {
      setGrnNumber(editingGrn.grnNumber || '');
      setSelectedVendorName(editingGrn.vendorName || '');
      setSelectedVendorId(editingGrn.vendorId || '');
      setInvoiceNo(editingGrn.invoiceNo || '');
      if (editingGrn.invoiceDate) {
        setInvoiceDate(new Date(editingGrn.invoiceDate).toISOString().split('T')[0]);
      }
      if (editingGrn.receivedDate) {
        setReceivedDate(new Date(editingGrn.receivedDate).toISOString().split('T')[0]);
      }
      setSelectedPoNumber(editingGrn.poNumber || '');
      setSelectedPoId(editingGrn.poId || '');
      setSelectedProjectId(editingGrn.projectId || '');
      const isAccepted = editingGrn.qcStatus === 'QC_ACCEPTED' || editingGrn.qcStatus === 'DIRECT_ACCEPTED';
      setQcGate(isAccepted ? 'DIRECT_ACCEPTED' : 'IN_QC');
      setTransportationCharges(Number(editingGrn.transportationCharges || 0));
      setTransportationGstPercent(Number(editingGrn.transportationGstPercent || 0));
      setPackingCharges(Number(editingGrn.packingCharges || 0));
      setPackingGstPercent(Number(editingGrn.packingGstPercent || 0));
      setNotes(editingGrn.notes || '');

      if (Array.isArray(editingGrn.items)) {
        setLineItems(
          editingGrn.items.map((it: any, idx: number) => {
            const qty = Number(it.receivedQty ?? it.quantity ?? 1);
            const rate = Number(it.unitRate || 0);
            const tax = Number(it.taxPercent || 18);
            const subtotal = Number(it.subtotal ?? qty * rate);
            const taxAmount = Number(it.taxAmount ?? (subtotal * tax) / 100);
            const isDw =
              String(it.itemType || '').toUpperCase() === 'DRAWING' ||
              String(it.category || '').toUpperCase().includes('DRAWING') ||
              String(it.itemCode || '').toUpperCase().startsWith('DWG-');
            return {
              id: `item-${idx}-${Date.now()}`,
              itemCode: it.itemCode || '',
              itemName: it.itemName || it.itemCode || '',
              description: it.description || '',
              revision: it.revision || 'Rev 1.0',
              make: it.make || '',
              qty,
              uom: it.baseUom || it.uom || 'Nos',
              unitRate: rate,
              taxPercent: tax,
              taxAmount,
              subtotal,
              totalAmount: Number(it.totalAmount ?? subtotal + taxAmount),
              locationName: it.locationName || editingGrn.binLocation || '',
              itemType: isDw ? 'DRAWING' : 'RM_BO',
              category: isDw ? 'DRAWING' : (it.category || 'BO')
            };
          })
        );
      }
    }
  }, [editingGrn]);

  // Handle preselected item if opened from an inventory row
  useEffect(() => {
    if (preselectedItem && lineItems.length === 0) {
      const rate = Number(preselectedItem.standardRateINR || 0);
      const tax = 18;
      const subtotal = rate * 1;
      const taxAmount = (subtotal * tax) / 100;
      const code = preselectedItem.itemCode || preselectedItem.drawingNumber || '';
      const isDw =
        preselectedItem.itemType === 'DRAWING' ||
        preselectedItem.classification === 'DRAWING' ||
        code.toUpperCase().startsWith('DWG-');
      setLineItems([
        {
          id: `item-${Date.now()}`,
          itemCode: code,
          itemName: preselectedItem.itemName || preselectedItem.title || '',
          description: preselectedItem.description || '',
          revision: preselectedItem.revision || 'Rev 1.0',
          make: preselectedItem.make || '',
          qty: 1,
          uom: preselectedItem.baseUom || 'Nos',
          unitRate: rate,
          taxPercent: tax,
          taxAmount,
          subtotal,
          totalAmount: subtotal + taxAmount,
          locationName: preselectedItem.locationName !== 'Unassigned' ? preselectedItem.locationName : '',
          itemType: isDw ? 'DRAWING' : 'RM_BO',
          category: isDw ? 'DRAWING' : (preselectedItem.category || 'BO')
        }
      ]);
    }
  }, [preselectedItem]);

  // Vendor selection handler
  const handleSelectVendor = (vendorName: string) => {
    setSelectedVendorName(vendorName);
    const v = vendors.find((vend: any) => (vend.vendorName || vend.name) === vendorName);
    setSelectedVendorId(v?.id || '');
    // Reset selected PO when vendor changes
    setSelectedPoNumber('');
    setSelectedPoId('');
    setSelectedProjectId('');
    setIsPoDetailsExpanded(false);
  };

  // Select Open PO handler
  const handleSelectPo = (po: any) => {
    if (selectedPoNumber === po.poNumber) {
      // Toggle off
      setSelectedPoNumber('');
      setSelectedPoId('');
      setSelectedProjectId('');
      setIsPoDetailsExpanded(false);
    } else {
      setSelectedPoNumber(po.poNumber);
      setSelectedPoId(po.id || '');
      setSelectedProjectId(po.projectId || '');
      setIsPoDetailsExpanded(false); // default hidden as requested
    }
  };

  // Fetch single line item from selected PO into GRN with PO price
  const handleFetchSinglePoItem = (it: any) => {
    const defaultLoc = locations[0]?.locationName || 'General Store';
    const qty = it.balanceQty > 0 ? it.balanceQty : (it.orderedQty || 1);
    const rate = Number(it.unitRate || 0);
    const taxRate = isGlobalTaxActive ? globalTaxRate : Number(it.taxPercent || 18);
    const subtotal = qty * rate;
    const taxAmount = (subtotal * taxRate) / 100;
    const isDw = String(it.itemCode || '').toUpperCase().startsWith('DWG-');

    const newLine: GrnLineItem = {
      id: `po-item-${it.itemCode}-${Date.now()}`,
      itemCode: it.itemCode,
      itemName: it.itemName,
      description: it.description || '',
      revision: it.revision || 'Rev 1.0',
      make: it.make || '',
      qty,
      uom: it.baseUom || 'Nos',
      unitRate: rate,
      taxPercent: taxRate,
      taxAmount,
      subtotal,
      totalAmount: subtotal + taxAmount,
      locationName: defaultLoc,
      itemType: isDw ? 'DRAWING' : 'RM_BO',
      category: isDw ? 'DRAWING' : 'BO'
    };

    setLineItems((prev) => {
      const idx = prev.findIndex((p) => p.itemCode === it.itemCode);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newLine;
        return copy;
      }
      return [...prev, newLine];
    });
  };

  // Fetch all items from selected PO into GRN with PO price
  const handleFetchAllPoItems = (po: any) => {
    const defaultLoc = locations[0]?.locationName || 'General Store';
    const newLines: GrnLineItem[] = (po.items || []).map((it: any, idx: number) => {
      const qty = it.balanceQty > 0 ? it.balanceQty : (it.orderedQty || 1);
      const rate = Number(it.unitRate || 0);
      const taxRate = isGlobalTaxActive ? globalTaxRate : Number(it.taxPercent || 18);
      const subtotal = qty * rate;
      const taxAmount = (subtotal * taxRate) / 100;
      const isDw = String(it.itemCode || '').toUpperCase().startsWith('DWG-');
      return {
        id: `po-item-${idx}-${Date.now()}`,
        itemCode: it.itemCode,
        itemName: it.itemName,
        description: it.description || '',
        revision: it.revision || 'Rev 1.0',
        make: it.make || '',
        qty,
        uom: it.baseUom || 'Nos',
        unitRate: rate,
        taxPercent: taxRate,
        taxAmount,
        subtotal,
        totalAmount: subtotal + taxAmount,
        locationName: defaultLoc,
        itemType: isDw ? 'DRAWING' : 'RM_BO',
        category: isDw ? 'DRAWING' : 'BO'
      };
    });

    setLineItems(newLines);
  };

  // Add Item from Design Master Picker
  const handleAddMasterItem = (item: any) => {
    const code = item.itemCode || item.drawingNumber || '';
    const name = item.itemName || item.title || code;
    const rate = Number(item.unitRate || item.standardRateINR || 0);
    const taxRate = isGlobalTaxActive ? globalTaxRate : 18;
    const subtotal = rate * 1;
    const taxAmount = (subtotal * taxRate) / 100;
    const loc = item.locationName && item.locationName !== 'Unassigned' ? item.locationName : (locations[0]?.locationName || 'General Store');
    const isDw =
      item.itemType === 'DRAWING' ||
      item.classification === 'DRAWING' ||
      code.toUpperCase().startsWith('DWG-');

    const newLine: GrnLineItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      itemCode: code,
      itemName: name,
      description: item.description || '',
      revision: item.revision || 'Rev 1.0',
      make: item.make || '',
      qty: 1,
      uom: item.baseUom || 'Nos',
      unitRate: rate,
      taxPercent: taxRate,
      taxAmount,
      subtotal,
      totalAmount: subtotal + taxAmount,
      locationName: loc,
      itemType: isDw ? 'DRAWING' : 'RM_BO',
      category: isDw ? 'DRAWING' : (item.category || 'BO')
    };

    setLineItems((prev) => [...prev, newLine]);
    setItemSearchTerm('');
    setIsItemSearchOpen(false);
  };

  // Add Empty Custom Line Item
  const handleAddEmptyLine = () => {
    const defaultLoc = locations[0]?.locationName || 'General Store';
    const taxRate = isGlobalTaxActive ? globalTaxRate : 18;
    setLineItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        itemCode: '',
        itemName: '',
        revision: 'Rev 1.0',
        qty: 1,
        uom: 'Nos',
        unitRate: 0,
        taxPercent: taxRate,
        taxAmount: 0,
        subtotal: 0,
        totalAmount: 0,
        locationName: defaultLoc,
        itemType: 'RM_BO',
        category: 'BO'
      }
    ]);
  };

  // Remove Line Item
  const handleRemoveLine = (id: string) => {
    setLineItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Update Line Item Field
  const handleUpdateLine = (id: string, field: keyof GrnLineItem, value: any) => {
    setLineItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };

        const qty = field === 'qty' ? Math.max(0, Number(value) || 0) : it.qty;
        const unitRate = field === 'unitRate' ? Math.max(0, Number(value) || 0) : it.unitRate;
        const taxPercent =
          field === 'taxPercent'
            ? Number(value) || 0
            : isGlobalTaxActive
            ? globalTaxRate
            : it.taxPercent;

        const subtotal = qty * unitRate;
        const taxAmount = (subtotal * taxPercent) / 100;
        const totalAmount = subtotal + taxAmount;

        return {
          ...updated,
          qty,
          unitRate,
          taxPercent,
          subtotal,
          taxAmount,
          totalAmount
        };
      })
    );
  };

  // Apply Global Tax Rate to all lines when toggled or changed
  const handleApplyGlobalTax = (active: boolean, rate: number) => {
    setIsGlobalTaxActive(active);
    setGlobalTaxRate(rate);
    if (active) {
      setLineItems((prev) =>
        prev.map((it) => {
          const taxAmount = (it.subtotal * rate) / 100;
          return {
            ...it,
            taxPercent: rate,
            taxAmount,
            totalAmount: it.subtotal + taxAmount
          };
        })
      );
    }
  };

  // Calculations
  const taxableSubtotal = useMemo(() => {
    return lineItems.reduce((sum, it) => sum + (it.subtotal || 0), 0);
  }, [lineItems]);

  const totalItemTax = useMemo(() => {
    return lineItems.reduce((sum, it) => sum + (it.taxAmount || 0), 0);
  }, [lineItems]);

  const transportationGstAmount = useMemo(() => {
    return (transportationCharges * transportationGstPercent) / 100;
  }, [transportationCharges, transportationGstPercent]);

  const packingGstAmount = useMemo(() => {
    return (packingCharges * packingGstPercent) / 100;
  }, [packingCharges, packingGstPercent]);

  const grandTotal = useMemo(() => {
    const raw =
      taxableSubtotal +
      totalItemTax +
      transportationCharges +
      transportationGstAmount +
      packingCharges +
      packingGstAmount;
    return Math.round(raw * 100) / 100;
  }, [
    taxableSubtotal,
    totalItemTax,
    transportationCharges,
    transportationGstAmount,
    packingCharges,
    packingGstAmount
  ]);

  // Filtered Master Items for search with Quick Type Filter Pills (All, RM & BO, Drawings)
  const filteredMasterItems = useMemo(() => {
    let pool = masterItems;
    if (itemTypeFilter !== 'ALL') {
      pool = pool.filter((it: any) => it.itemType === itemTypeFilter);
    }
    if (!itemSearchTerm.trim()) return pool.slice(0, 25);
    const q = itemSearchTerm.toLowerCase().trim();
    return pool
      .filter((it: any) => {
        const code = (it.itemCode || it.drawingNumber || '').toLowerCase();
        const name = (it.itemName || it.title || '').toLowerCase();
        const make = (it.make || '').toLowerCase();
        const cat = (it.category || '').toLowerCase();
        return code.includes(q) || name.includes(q) || make.includes(q) || cat.includes(q);
      })
      .slice(0, 30);
  }, [masterItems, itemSearchTerm, itemTypeFilter]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!grnNumber.trim()) {
      setErrorMessage('Please enter or verify the GRN number.');
      return;
    }
    if (!selectedVendorName) {
      setErrorMessage('Please select a vendor from Vendor Master.');
      return;
    }
    if (!invoiceNo.trim()) {
      setErrorMessage('Please enter the Challan or Invoice Number.');
      return;
    }
    if (lineItems.length === 0) {
      setErrorMessage('Please add at least one line item to this GRN.');
      return;
    }

    try {
      const payload = {
        grnNumber: grnNumber.trim().toUpperCase(),
        vendorId: selectedVendorId || null,
        vendorName: selectedVendorName,
        invoiceNo: invoiceNo.trim(),
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
        poNumber: selectedPoNumber,
        poId: selectedPoId || null,
        projectId: selectedProjectId,
        binLocation: lineItems[0]?.locationName || 'General Store',
        qcGate,
        items: lineItems.map((it) => {
          const isDw =
            it.itemType === 'DRAWING' ||
            it.category === 'DRAWING' ||
            String(it.itemCode || '').toUpperCase().startsWith('DWG-');
          const finalItemType = isDw ? 'DRAWING' : 'RM_BO';
          const finalCategory = isDw ? 'DRAWING' : (it.category || 'BO');
          return {
            itemCode: it.itemCode,
            itemName: it.itemName,
            description: it.description || '',
            revision: it.revision || 'Rev 1.0',
            make: it.make || '',
            receivedQty: it.qty,
            baseUom: it.uom,
            unitRate: it.unitRate,
            taxPercent: it.taxPercent,
            taxAmount: it.taxAmount,
            subtotal: it.subtotal,
            totalAmount: it.totalAmount,
            locationName: it.locationName,
            itemType: finalItemType,
            category: finalCategory
          };
        }),
        taxableSubtotal,
        totalItemTax,
        transportationCharges,
        transportationGstPercent,
        transportationGstAmount,
        packingCharges,
        packingGstPercent,
        packingGstAmount,
        roundOff: 0,
        grandTotal,
        notes: notes.trim()
      };

      if (editingGrn) {
        await updateGrnTrigger({ id: editingGrn.id || editingGrn._id, ...payload }).unwrap();
        onSuccess(`All set! GRN ${grnNumber} updated and stock re-balanced successfully.`);
      } else {
        await createGrnTrigger(payload).unwrap();
        onSuccess(
          qcGate === 'DIRECT_ACCEPTED'
            ? `All set! GRN ${grnNumber} inwarded successfully into Available Stock.`
            : `All set! GRN ${grnNumber} inwarded and placed in Incoming QC Quarantine.`
        );
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'We could not save this GRN right now. Please verify required fields.');
    }
  };

  if (!isOpen) return null;

  const currentPo = openPos.find((p: any) => p.poNumber === selectedPoNumber);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1560px] max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Crisp White Header with Amber Accent Stripe (AGENTS.md mandate) */}
        <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                {editingGrn ? `Edit Goods Receipt Note — ${editingGrn.grnNumber}` : 'Inward Goods Receipt Note (GRN) Builder'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {editingGrn
                  ? 'Update line items, rates, taxes or quantities. Stock differential re-calculates automatically.'
                  : 'Receive materials, verify against open Outward POs, assign locations & apply line taxes'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 pb-28">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION 1: Top Master Metadata with QC Required Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
            {/* Auto GRN Number */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                GRN Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={grnNumber}
                onChange={(e) => setGrnNumber(e.target.value.toUpperCase())}
                placeholder="GRN-2026-0001"
                className="w-full px-3 py-2 text-xs font-mono font-extrabold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-orange-950 transition-all"
              />
              <p className="text-[10px] text-slate-400 mt-1">Auto-incremented prefix</p>
            </div>

            {/* Vendor Selector from Master */}
            <div className="lg:col-span-3">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Vendor / Supplier <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedVendorName}
                onChange={(e) => handleSelectVendor(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 transition-all cursor-pointer"
              >
                <option value="">-- Choose Vendor from Master --</option>
                {vendors.map((v: any) => (
                  <option key={v.id} value={v.vendorName || v.name}>
                    {v.vendorName || v.name} {v.city ? `(${v.city})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Sourced live from Vendor Master</p>
            </div>

            {/* Challan / Invoice No */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Invoice / Challan No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="e.g. INV-99214"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 transition-all"
              />
            </div>

            {/* Received Date */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Received Date
              </label>
              <input
                type="date"
                required
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 transition-all"
              />
            </div>

            {/* QC Required Small Toggle */}
            <div className="lg:col-span-3">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Quality Clearance Routing
              </label>
              <div className="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-white shadow-2xs h-[38px] px-3">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className={`w-4 h-4 ${qcGate === 'IN_QC' ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-800">QC Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold ${qcGate === 'IN_QC' ? 'text-amber-700' : 'text-slate-400'}`}>
                    {qcGate === 'IN_QC' ? 'ON' : 'OFF'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQcGate(qcGate === 'IN_QC' ? 'DIRECT_ACCEPTED' : 'IN_QC')}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      qcGate === 'IN_QC' ? 'bg-amber-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        qcGate === 'IN_QC' ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <p className={`text-[10px] mt-1 font-medium ${qcGate === 'IN_QC' ? 'text-amber-700 font-bold' : 'text-emerald-700'}`}>
                {qcGate === 'IN_QC' ? '• Routes to Incoming Quality module' : '• Direct store clearance'}
              </p>
            </div>
          </div>

          {/* SECTION 2: Open Outward Purchase Orders Bar & Attached Line Items */}
          {selectedVendorName && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-amber-900 uppercase mb-1">
                    Open Outward Purchase Orders for {selectedVendorName}
                  </label>
                  {openPos.length === 0 ? (
                    <div className="text-xs text-amber-800 bg-white/80 border border-amber-200 rounded-xl px-3 py-2 italic">
                      No open POs found for this vendor. Direct inwarding active without PO linkage.
                    </div>
                  ) : (
                    <select
                      value={selectedPoNumber}
                      onChange={(e) => {
                        const poNum = e.target.value;
                        setSelectedPoNumber(poNum);
                        const found = openPos.find((p: any) => p.poNumber === poNum);
                        if (found) {
                          setSelectedPoId(found.id || found._id || '');
                          setSelectedProjectId(found.projectId || '');
                        } else {
                          setSelectedPoId('');
                          setSelectedProjectId('');
                        }
                      }}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 transition-all cursor-pointer"
                    >
                      <option value="">-- Choose Open Outward PO ({openPos.length} Available) --</option>
                      {openPos.map((po: any) => (
                        <option key={po.id || po._id} value={po.poNumber}>
                          {po.poNumber} {po.projectId ? `• Project ${po.projectId}` : ''} • ({po.totalItemsCount || po.items?.length || 0} line items)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedPoNumber && currentPo && (
                  <div className="flex items-center gap-2 self-start sm:self-end">
                    <button
                      type="button"
                      onClick={() => handleFetchAllPoItems(currentPo)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Fetch All Items ({currentPo.items?.length || 0})</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Inside a PO: Attached Line Items Table with PO Price & Individual Fetch */}
              {selectedPoNumber && currentPo && (
                <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                        <FileText size={14} className="text-orange-500" />
                        <span>Attached Line Items in {currentPo.poNumber}</span>
                        {currentPo.projectId && (
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
                            {currentPo.projectId}
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Fetch all line items together or fetch individual items with PO price into GRN
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleFetchAllPoItems(currentPo)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Fetch All Items into GRN</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-56 border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3">Item Code</th>
                          <th className="py-2.5 px-3">Description &amp; Revision</th>
                          <th className="py-2.5 px-3 text-center">Ordered</th>
                          <th className="py-2.5 px-3 text-center">Inwarded</th>
                          <th className="py-2.5 px-3 text-center">Balance Qty</th>
                          <th className="py-2.5 px-3 text-right">PO Price (Unit Rate)</th>
                          <th className="py-2.5 px-3 text-center w-28">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(currentPo.items || []).map((it: any, idx: number) => {
                          const isFetched = lineItems.some((line) => line.itemCode === it.itemCode);
                          const balanceQty = it.balanceQty > 0 ? it.balanceQty : (it.orderedQty || 1);

                          return (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 text-center font-mono text-slate-400 text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-orange-600">
                                {it.itemCode}
                              </td>
                              <td className="py-2 px-3">
                                <div className="font-semibold text-slate-900">{it.itemName}</div>
                                {it.revision && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    Rev: {it.revision}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-slate-600">
                                {it.orderedQty} {it.baseUom}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-slate-500">
                                {it.alreadyReceivedQty || 0}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-extrabold text-emerald-700">
                                {balanceQty} {it.baseUom}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                ₹{Number(it.unitRate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleFetchSinglePoItem(it)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isFetched
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                                      : 'bg-orange-500 text-white hover:bg-orange-600 shadow-2xs'
                                  }`}
                                  title={isFetched ? 'Already fetched. Click to re-fetch/update.' : 'Fetch this line item into GRN with PO price'}
                                >
                                  {isFetched ? (
                                    <>
                                      <Check size={12} className="text-emerald-700" />
                                      <span>Fetched</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus size={12} />
                                      <span>Fetch</span>
                                    </>
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: Line Items Table with Global Tax Toggle */}
          <div className="space-y-3">
            {/* Table Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              {/* Item Adder from Design Master */}
              <div className="relative w-full sm:w-96">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={itemSearchTerm}
                      onFocus={() => setIsItemSearchOpen(true)}
                      onChange={(e) => {
                        setItemSearchTerm(e.target.value);
                        setIsItemSearchOpen(true);
                      }}
                      placeholder="Search item code, name, make to add..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddEmptyLine}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shrink-0 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Custom Line</span>
                  </button>
                </div>

                {/* Search Popover with Dual-Type Filter Pills */}
                {isItemSearchOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-full sm:w-[520px] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                    <div className="p-2.5 bg-slate-50 border-b border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span>Pick item from Design Master ({filteredMasterItems.length} matches)</span>
                        <button
                          type="button"
                          onClick={() => setIsItemSearchOpen(false)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setItemTypeFilter('ALL')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            itemTypeFilter === 'ALL'
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          All Items
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemTypeFilter('RM_BO')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            itemTypeFilter === 'RM_BO'
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          RM &amp; BO Items
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemTypeFilter('DRAWING')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            itemTypeFilter === 'DRAWING'
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          Design Drawings
                        </button>
                      </div>
                    </div>
                    {filteredMasterItems.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No matching design items found.
                      </div>
                    ) : (
                      filteredMasterItems.map((mItem: any) => (
                        <button
                          key={mItem.id || mItem._id}
                          type="button"
                          onClick={() => handleAddMasterItem(mItem)}
                          className="w-full text-left p-3 hover:bg-orange-50/70 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600 font-mono">
                                {mItem.itemCode || mItem.drawingNumber}
                              </span>
                              <span
                                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${
                                  mItem.itemType === 'DRAWING'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                }`}
                              >
                                {mItem.itemType === 'DRAWING' ? 'Design Drawing' : 'RM / BO'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {mItem.itemName || mItem.title} {mItem.make ? `• Make: ${mItem.make}` : ''}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                            {mItem.baseUom || 'Nos'}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Global Tax Rate Toggle */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGlobalTaxActive}
                    onChange={(e) => handleApplyGlobalTax(e.target.checked, globalTaxRate)}
                    className="w-4 h-4 text-orange-500 rounded-sm focus:ring-orange-500 cursor-pointer"
                  />
                  <span>Apply Global Tax Rate to All:</span>
                </label>

                <select
                  disabled={!isGlobalTaxActive}
                  value={globalTaxRate}
                  onChange={(e) => handleApplyGlobalTax(true, Number(e.target.value))}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:border-orange-500 cursor-pointer"
                >
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}% GST
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Strict User Line Items Table:
                "items name & description & revision , qty, uom,unit rate, tax, sub total, this feild only shoudl show in line items" */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto min-h-[160px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 min-w-[280px]">Item Name, Description &amp; Revision</th>
                      <th className="py-3 px-3 w-28 text-center">Qty</th>
                      <th className="py-3 px-3 w-24">UOM</th>
                      <th className="py-3 px-3 w-32 text-right">Unit Rate (₹)</th>
                      <th className="py-3 px-3 w-28 text-center">Tax (%)</th>
                      <th className="py-3 px-3 w-36 text-right">Sub Total (₹)</th>
                      <th className="py-3 px-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                          <p className="text-xs font-bold text-slate-700">No line items added yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Search items above from Design Master, click custom line, or fetch from an open PO.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>

                          {/* Item Name & Description & Revision */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={item.itemCode}
                                  onChange={(e) => {
                                    const newCode = e.target.value.toUpperCase();
                                    handleUpdateLine(item.id, 'itemCode', newCode);
                                    if (newCode.startsWith('DWG-') && item.itemType !== 'DRAWING') {
                                      handleUpdateLine(item.id, 'itemType', 'DRAWING');
                                      handleUpdateLine(item.id, 'category', 'DRAWING');
                                    }
                                  }}
                                  placeholder="Item code / Drawing #"
                                  className="font-mono font-bold text-orange-600 text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white focus:border-orange-500 w-36"
                                  required
                                />
                                <select
                                  value={item.itemType || (item.itemCode.startsWith('DWG-') ? 'DRAWING' : 'RM_BO')}
                                  onChange={(e) => {
                                    const newType = e.target.value as 'RM_BO' | 'DRAWING';
                                    handleUpdateLine(item.id, 'itemType', newType);
                                    handleUpdateLine(item.id, 'category', newType === 'DRAWING' ? 'DRAWING' : 'BO');
                                  }}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                                    (item.itemType || (item.itemCode.startsWith('DWG-') ? 'DRAWING' : 'RM_BO')) === 'DRAWING'
                                      ? 'bg-sky-50 text-sky-700 border-sky-300'
                                      : 'bg-orange-50 text-orange-700 border-orange-300'
                                  }`}
                                  title="Destination: RM/BO Tab vs Design Drawings Tab"
                                >
                                  <option value="RM_BO">RM / BO</option>
                                  <option value="DRAWING">Drawing</option>
                                </select>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {item.revision || 'Rev 1.0'}
                                </span>
                              </div>
                              <input
                                type="text"
                                value={item.itemName}
                                onChange={(e) => handleUpdateLine(item.id, 'itemName', e.target.value)}
                                placeholder="Item name & description..."
                                className="w-full text-xs font-semibold text-slate-900 px-2 py-1 rounded-lg border border-slate-200 bg-white focus:border-orange-500"
                                required
                              />
                            </div>
                          </td>

                          {/* Qty */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              required
                              min="0.001"
                              step="any"
                              value={item.qty}
                              onChange={(e) => handleUpdateLine(item.id, 'qty', e.target.value)}
                              className="w-full text-center font-extrabold text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:border-orange-500"
                            />
                          </td>

                          {/* UOM */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              required
                              value={item.uom}
                              onChange={(e) => handleUpdateLine(item.id, 'uom', e.target.value)}
                              className="w-full font-mono font-bold text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:border-orange-500 text-slate-700"
                            />
                          </td>

                          {/* Unit Rate */}
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitRate}
                              onChange={(e) => handleUpdateLine(item.id, 'unitRate', e.target.value)}
                              className="w-full text-right font-mono font-bold text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:border-orange-500"
                            />
                          </td>

                          {/* Tax % */}
                          <td className="py-3 px-3 text-center">
                            <select
                              disabled={isGlobalTaxActive}
                              value={item.taxPercent}
                              onChange={(e) => handleUpdateLine(item.id, 'taxPercent', e.target.value)}
                              className="w-full text-center font-bold text-xs px-1.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:border-orange-500 cursor-pointer"
                            >
                              {GST_RATES.map((r) => (
                                <option key={r} value={r}>
                                  {r}%
                                </option>
                              ))}
                            </select>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              +₹{Math.round(item.taxAmount * 100) / 100}
                            </div>
                          </td>

                          {/* Sub Total (₹) */}
                          <td className="py-3 px-3 text-right">
                            <div className="font-mono font-extrabold text-slate-900 text-xs">
                              ₹{Math.round(item.subtotal * 100) / 100}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Total: ₹{Math.round(item.totalAmount * 100) / 100}
                            </div>
                          </td>

                          {/* Delete Action */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(item.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 4: Transportation, Packing & Forwarding with Tax Dropdowns, QC Gate & Totals */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Left Column (8 cols): Charges & QC Routing */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-4">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                  Additional Inward Charges &amp; Taxes
                </span>

                {/* Transportation / Freight Charges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-500" />
                      <span>Transportation / Freight Charges (₹)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={transportationCharges}
                      onChange={(e) => setTransportationCharges(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Transportation Tax Rate
                    </label>
                    <select
                      value={transportationGstPercent}
                      onChange={(e) => setTransportationGstPercent(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 cursor-pointer"
                    >
                      <option value={0}>None (0%)</option>
                      <option value={5}>5% GST (RCM / GTA)</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST (Forward Charge)</option>
                      <option value={28}>28% GST</option>
                    </select>
                    {transportationGstPercent > 0 && transportationCharges > 0 && (
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Tax: +₹{Math.round(transportationGstAmount * 100) / 100}
                      </p>
                    )}
                  </div>
                </div>

                {/* Packing & Forwarding Charges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-3 border-t border-slate-200/60">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-slate-500" />
                      <span>Packing &amp; Forwarding Charges (₹)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={packingCharges}
                      onChange={(e) => setPackingCharges(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Packing Tax Rate
                    </label>
                    <select
                      value={packingGstPercent}
                      onChange={(e) => setPackingGstPercent(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 cursor-pointer"
                    >
                      <option value={0}>None (0%)</option>
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST</option>
                      <option value={28}>28% GST</option>
                    </select>
                    {packingGstPercent > 0 && packingCharges > 0 && (
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Tax: +₹{Math.round(packingGstAmount * 100) / 100}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Inward Remarks / Heat &amp; Mill Cert Details
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Heat #88924, physical condition intact, verified against test report."
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Right Column (5 cols): Financial Summary Card */}
            <div className="lg:col-span-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 sticky top-4">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block border-b border-slate-100 pb-2">
                  GRN Valuation Summary
                </span>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Taxable Items Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{Math.round(taxableSubtotal * 100) / 100}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Total Items GST:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{Math.round(totalItemTax * 100) / 100}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Transportation (+ Tax):</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{Math.round((transportationCharges + transportationGstAmount) * 100) / 100}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Packing &amp; Forwarding (+ Tax):</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{Math.round((packingCharges + packingGstAmount) * 100) / 100}
                    </span>
                  </div>

                  <div className="pt-3 border-t-2 border-dashed border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 uppercase">
                        Grand Total (INR)
                      </span>
                      <p className="text-[10px] text-slate-400">Total payable / inventory valuation</p>
                    </div>
                    <span className="text-xl font-mono font-extrabold text-orange-600">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Information Callout */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-2 mt-4">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Submitting this GRN automatically logs inward Gate Entry in Quality and increments inventory stock.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Footer */}
          <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 flex items-center justify-between px-8 z-20">
            <div className="text-xs text-slate-500 font-medium">
              Line Items: <strong className="text-slate-900">{lineItems.length}</strong> • Total Valuation:{' '}
              <strong className="text-orange-600 font-mono">₹{grandTotal}</strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || isUpdating || lineItems.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>
                  {editingGrn
                    ? isUpdating
                      ? 'Saving Changes...'
                      : 'Update GRN & Re-balance Stock'
                    : isCreating
                    ? 'Inwarding...'
                    : 'Complete Inward GRN'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
export default GrnBuilderModal;

