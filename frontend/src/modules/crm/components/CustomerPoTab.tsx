'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  IndianRupee,
  Search,
  Filter,
  Plus,
  Upload,
  Calendar,
  Building2,
  Phone,
  Mail,
  CheckCircle2,
  AlertOctagon,
  FileText,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  Lock,
  ArrowRight,
  FolderGit2,
  Sparkles,
  Trash2,
  Eye,
  Image as ImageIcon,
  FileSpreadsheet,
  Layers,
  MapPin,
  CreditCard,
  Maximize2,
  Download,
  PackageCheck,
  Tag,
  Receipt
} from 'lucide-react';
import {
  useGetCustomerPosQuery,
  useCreateCustomerPoMutation,
  useConvertCustomerPoToProjectMutation,
  useGetQuotationsQuery,
  useLazyGetS3PresignedUploadQuery,
  useGetCustomersQuery,
  useGetCrmMastersQuery
} from '../api/crmApi';
import { Customer, MachineCatalogProduct, CustomerPo, CustomerPoItem } from '../types';

const formatINR = (amt: any) => {
  const num = Number(amt || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

interface PoItemFormState {
  id: string;
  itemCode?: string;
  modelCode: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  basePrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  specifications?: string;
  photoUrl?: string;
}

export default function CustomerPoTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [convertTargetPo, setConvertTargetPo] = useState<any>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Queries & Mutations
  const { data, isLoading, refetch } = useGetCustomerPosQuery({
    status: statusFilter,
    search: searchTerm
  });

  const { data: customerData } = useGetCustomersQuery();
  const customerMasterList: Customer[] = customerData?.customers || [];

  const { data: mastersData } = useGetCrmMastersQuery();
  const machineCatalog: MachineCatalogProduct[] = mastersData?.masters?.machines || [];

  const { data: quotesData } = useGetQuotationsQuery({ status: 'SENT_TO_CLIENT' });
  const quotations = quotesData?.quotations || [];

  const [createCustomerPo, { isLoading: isCreatingPo }] = useCreateCustomerPoMutation();
  const [convertCustomerPoToProject, { isLoading: isConverting }] = useConvertCustomerPoToProjectMutation();
  const [triggerGetUploadUrl] = useLazyGetS3PresignedUploadQuery();

  const [convertSuccess, setConvertSuccess] = useState<any>(null);
  const customerPos = (data?.customerPos || []) as any[];

  // ----------------------------------------------------
  // Form State: New Customer PO Entry
  // ----------------------------------------------------
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryCommitmentDate, setDeliveryCommitmentDate] = useState('');
  const [quotationId, setQuotationId] = useState('');
  const [customerMode, setCustomerMode] = useState<'master' | 'custom'>('master');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Payment as per agreed terms');
  const [notes, setNotes] = useState('');

  // Multiple Line Items / Products with Tax Breakdown
  const [lineItems, setLineItems] = useState<PoItemFormState[]>([
    {
      id: 'item-1',
      modelCode: '',
      description: '',
      hsnCode: '84798100',
      quantity: 1,
      unitPrice: 0,
      basePrice: 0,
      taxRate: 18,
      taxAmount: 0,
      lineTotal: 0
    }
  ]);

  // PDF Document File & URL
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [pastedPdfUrl, setPastedPdfUrl] = useState<string>('');
  const [isUploadingS3, setIsUploadingS3] = useState(false);

  // Machine / PO Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [pastedPhotoUrl, setPastedPhotoUrl] = useState('');

  const [formError, setFormError] = useState('');

  // ----------------------------------------------------
  // Full-Screen Preview Modals State
  // ----------------------------------------------------
  const [previewPdfModal, setPreviewPdfModal] = useState<{ url: string; title: string } | null>(null);
  const [previewPhotoGallery, setPreviewPhotoGallery] = useState<{ photos: string[]; activeIndex: number; title: string } | null>(null);
  const [selectedPoDossier, setSelectedPoDossier] = useState<any | null>(null);

  // Check if at least one PO document (PDF or Photo) is attached
  const hasProof = useMemo(() => {
    return Boolean(selectedPdfFile || pastedPdfUrl.trim() || pdfPreviewUrl || (photos && photos.length > 0));
  }, [selectedPdfFile, pastedPdfUrl, pdfPreviewUrl, photos]);

  // Computed Totals: Subtotal (Product price before tax), Total Tax, Grand Total (Product price with tax)
  const computedTotals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let grandTotal = 0;
    lineItems.forEach((it) => {
      subtotal += Number(it.basePrice) || 0;
      tax += Number(it.taxAmount) || 0;
      grandTotal += Number(it.lineTotal) || 0;
    });
    return { subtotal, tax, grandTotal };
  }, [lineItems]);

  // Reset form when modal opens
  const handleOpenAddModal = () => {
    setFormError('');
    setPoNumber('');
    setPoDate(new Date().toISOString().split('T')[0]);
    setDeliveryCommitmentDate('');
    setQuotationId('');
    setCustomerMode('master');
    setSelectedCustomerId('');
    setCustomerName('');
    setCompanyName('');
    setContactEmail('');
    setContactPhone('');
    setBillingAddress('');
    setGstin('');
    setPaymentTerms('Payment as per agreed terms');
    setNotes('');
    setLineItems([
      {
        id: 'item-1',
        modelCode: '',
        description: '',
        hsnCode: '84798100',
        quantity: 1,
        unitPrice: 0,
        basePrice: 0,
        taxRate: 18,
        taxAmount: 0,
        lineTotal: 0
      }
    ]);
    setSelectedPdfFile(null);
    setPdfPreviewUrl('');
    setPastedPdfUrl('');
    setPhotos([]);
    setPastedPhotoUrl('');
    setIsAddModalOpen(true);
  };

  // When Customer is selected from Customer Master
  const handleSelectCustomerFromMaster = (cId: string) => {
    setSelectedCustomerId(cId);
    if (!cId) {
      setCustomerName('');
      setCompanyName('');
      setContactEmail('');
      setContactPhone('');
      setBillingAddress('');
      setGstin('');
      return;
    }
    const cust = customerMasterList.find((c) => c._id === cId);
    if (cust) {
      setCustomerName(cust.primaryContact?.name || cust.companyName);
      setCompanyName(cust.companyName);
      setContactEmail(cust.primaryContact?.email || '');
      setContactPhone(cust.primaryContact?.mobile || cust.primaryContact?.phone || '');
      const addr = cust.billingAddress
        ? `${cust.billingAddress.addressLine1 || ''}, ${cust.billingAddress.city || ''}, ${cust.billingAddress.state || ''} ${cust.billingAddress.pincode || ''}`.trim()
        : '';
      setBillingAddress(addr);
      setGstin(cust.gstin || cust.pan || '');
      if (cust.paymentTerms) {
        setPaymentTerms(cust.paymentTerms);
      }
    }
  };

  // When Quotation is selected in modal (auto-fills items and customer details)
  const handleSelectQuotation = (qId: string) => {
    setQuotationId(qId);
    if (!qId) return;
    const selectedQuote = quotations.find((q: any) => q._id === qId) as any;
    if (selectedQuote) {
      setCustomerName(selectedQuote.customerName);
      setCompanyName(selectedQuote.companyName || selectedQuote.customerName);
      setContactEmail(selectedQuote.contactEmail || '');
      setContactPhone(selectedQuote.contactPhone || '');
      setGstin(selectedQuote.gstin || '');

      if (selectedQuote.items && selectedQuote.items.length > 0) {
        const mappedItems: PoItemFormState[] = selectedQuote.items.map((it: any, idx: number) => {
          const q = Number(it.quantity) || 1;
          const p = Number(it.unitPrice) || 0;
          const baseP = Math.round(q * p);
          const tRate = 18;
          const tAmt = Math.round((baseP * tRate) / 100);
          return {
            id: `quote-item-${idx}`,
            modelCode: it.modelCode || '',
            description: it.modelName || it.description || 'Machine Order Item',
            hsnCode: '84798100',
            quantity: q,
            unitPrice: p,
            basePrice: baseP,
            taxRate: tRate,
            taxAmount: tAmt,
            lineTotal: baseP + tAmt,
            specifications: it.specifications || ''
          };
        });
        setLineItems(mappedItems);
      }
    }
  };

  // Line Items Handlers: Calculate Price with Tax
  const handleSelectProductForLineItem = (itemId: string, modelCode: string) => {
    const machine = machineCatalog.find((m) => m.modelCode === modelCode);
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (!machine) {
          return { ...item, modelCode: '', description: item.description || '' };
        }
        const unitP = Number(machine.basePriceINR || machine.price || 0);
        const q = Number(item.quantity) || 1;
        const baseP = Math.round(q * unitP);
        const tRate = item.taxRate !== undefined ? item.taxRate : 18;
        const tAmt = Math.round((baseP * tRate) / 100);
        return {
          ...item,
          modelCode: machine.modelCode,
          description: `${machine.modelName} (Model: ${machine.modelCode})`,
          hsnCode: item.hsnCode || '84798100',
          unitPrice: unitP,
          basePrice: baseP,
          taxRate: tRate,
          taxAmount: tAmt,
          lineTotal: baseP + tAmt,
          photoUrl: machine.photoUrl || (machine.photos && machine.photos[0]) || ''
        };
      })
    );
  };

  const handleLineItemFieldChange = (
    itemId: string,
    field: 'description' | 'modelCode' | 'hsnCode' | 'quantity' | 'unitPrice' | 'taxRate',
    val: any
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, [field]: val };
        const q = field === 'quantity' ? Math.max(1, Number(val) || 1) : Number(item.quantity) || 1;
        const p = field === 'unitPrice' ? Math.max(0, Number(val) || 0) : Number(item.unitPrice) || 0;
        const r = field === 'taxRate' ? Math.max(0, Number(val) || 0) : (item.taxRate !== undefined ? item.taxRate : 18);
        const baseP = Math.round(q * p);
        const tAmt = Math.round((baseP * r) / 100);
        updated.quantity = q;
        updated.unitPrice = p;
        updated.taxRate = r;
        updated.basePrice = baseP;
        updated.taxAmount = tAmt;
        updated.lineTotal = baseP + tAmt;
        return updated;
      })
    );
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        modelCode: '',
        description: '',
        hsnCode: '84798100',
        quantity: 1,
        unitPrice: 0,
        basePrice: 0,
        taxRate: 18,
        taxAmount: 0,
        lineTotal: 0
      }
    ]);
  };

  const handleRemoveLineItem = (itemId: string) => {
    if (lineItems.length === 1) {
      showToast('At least one line item is required.', 'info');
      return;
    }
    setLineItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // PDF File Upload Handler
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfPreviewUrl(url);
    }
  };

  // Photos Handler
  const handlePhotoFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newUrls: string[] = [];
      Array.from(files).forEach((f) => {
        const url = URL.createObjectURL(f);
        newUrls.push(url);
      });
      setPhotos((prev) => [...prev, ...newUrls]);
    }
  };

  const handleAddPhotoUrl = () => {
    if (!pastedPhotoUrl.trim()) return;
    setPhotos((prev) => [...prev, pastedPhotoUrl.trim()]);
    setPastedPhotoUrl('');
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit PO
  const handleCreatePoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!poNumber.trim()) {
      setFormError('Customer PO Number is required.');
      return;
    }
    if (!customerName.trim() || !companyName.trim()) {
      setFormError('Customer Name and Company Name are required.');
      return;
    }
    if (!deliveryCommitmentDate) {
      setFormError('Delivery Commitment Date is required.');
      return;
    }
    if (lineItems.some((it) => !it.description.trim())) {
      setFormError('All line items must have a valid description or selected machine.');
      return;
    }

    // Enforce mandatory PO document proof (At least one PDF or Photo required)
    if (!hasProof) {
      setFormError('Please attach at least one PO document — either the signed PO PDF or at least one PO photo (proof is required).');
      showToast('Please upload signed PO PDF or machine photos before saving.', 'error');
      return;
    }

    try {
      let documentKey = '';
      const finalPdfUrl = pastedPdfUrl.trim() || pdfPreviewUrl;

      // Upload Signed Customer PO to AWS S3 if file selected
      if (selectedPdfFile) {
        setIsUploadingS3(true);
        const fileExt = selectedPdfFile.name.split('.').pop() || 'pdf';
        const cleanPoNum = poNumber.toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
        documentKey = `crm/customer-pos/${cleanPoNum}/${Date.now()}_signed_po.${fileExt}`;

        try {
          const presignedRes = await triggerGetUploadUrl({
            key: documentKey,
            contentType: selectedPdfFile.type || 'application/pdf'
          }).unwrap();

          if (presignedRes?.url) {
            await fetch(presignedRes.url, {
              method: 'PUT',
              headers: { 'Content-Type': selectedPdfFile.type || 'application/pdf' },
              body: selectedPdfFile
            });
          }
        } catch (s3Err) {
          console.warn('Presigned upload fallback to local preview URL:', s3Err);
        }
        setIsUploadingS3(false);
      }

      const payload = {
        poNumber: poNumber.toUpperCase().trim(),
        poDate,
        customerId: customerMode === 'master' && selectedCustomerId ? selectedCustomerId : undefined,
        quotationId: quotationId || undefined,
        customerName,
        companyName,
        contactEmail,
        contactPhone,
        billingAddress,
        gstin,
        items: lineItems.map((it, idx) => ({
          itemCode: it.itemCode || `ITEM-${idx + 1}`,
          modelCode: it.modelCode,
          description: it.description,
          hsnCode: it.hsnCode || '84798100',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          taxRate: Number(it.taxRate !== undefined ? it.taxRate : 18),
          taxAmount: Number(it.taxAmount) || 0,
          lineTotal: Number(it.lineTotal) || 0,
          specifications: it.specifications || ''
        })),
        subtotalAmount: {
          currency: 'INR',
          amount: computedTotals.subtotal,
          exchangeRate: 1.0,
          baseAmountINR: computedTotals.subtotal
        },
        totalTaxAmount: {
          currency: 'INR',
          amount: computedTotals.tax,
          exchangeRate: 1.0,
          baseAmountINR: computedTotals.tax
        },
        totalAmount: {
          currency: 'INR',
          amount: computedTotals.grandTotal,
          exchangeRate: 1.0,
          baseAmountINR: computedTotals.grandTotal
        },
        deliveryCommitmentDate,
        paymentTerms,
        notes,
        s3DocumentKey: documentKey,
        pdfUrl: finalPdfUrl,
        photos: photos.filter(Boolean)
      };

      await createCustomerPo(payload as any).unwrap();
      setIsAddModalOpen(false);
      showToast('All set! Customer PO recorded successfully.', 'success');
      refetch();
    } catch (err: any) {
      setIsUploadingS3(false);
      setFormError(err.data?.message || err.message || 'We could not save this Customer PO right now.');
    }
  };

  // Convert to Project Setup Spine
  const handleExecuteConvert = async (poId: string) => {
    try {
      const res: any = await convertCustomerPoToProject({ id: poId }).unwrap();
      setConvertSuccess({
        poNumber: convertTargetPo?.poNumber || convertTargetPo?.customerPoNumber,
        projectId: res.projectId || res.project?._id,
        workOrderNumber: res.workOrderNumber || res.project?.workOrderNumber
      });
      showToast(`Great! PO converted to live project ${res.projectId || 'PRJ-XXXX'}.`, 'success');
      setConvertTargetPo(null);
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || 'We could not convert this PO right now. Please try again.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Focused Action Toolbar: Search Bar, Status Filter, and Add PO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PO Number, Customer, Company, PRJ-XXXX..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-orange-500 transition-all font-medium"
          />
        </div>

        {/* Status Filter & Add PO Button */}
        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-orange-500 transition-all cursor-pointer"
          >
            <option value="ALL">All PO Statuses</option>
            <option value="RECEIVED">Active Orders</option>
            <option value="PROJECT_CONVERTED">Project Converted (PRJ-XXXX)</option>
          </select>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Add PO</span>
          </button>
        </div>
      </div>

      {/* 2. Success Banner for Project Conversion */}
      {convertSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900">
                Customer PO {convertSuccess.poNumber} converted to Live Project Spine:
              </span>{' '}
              <span className="font-mono font-black text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                {convertSuccess.projectId}
              </span>{' '}
              <span className="text-emerald-700 font-mono">({convertSuccess.workOrderNumber})</span>
            </div>
          </div>
          <Link
            href="/project-setup/projects"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
          >
            <span>View in Project Setup</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* 3. Customer PO Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Customer PO # &amp; Date</th>
                <th className="py-3 px-4">Delivery Date</th>
                <th className="py-3 px-4">Client &amp; Company</th>
                <th className="py-3 px-4">Machines / Items</th>
                <th className="py-3 px-4 text-right">Products Price</th>
                <th className="py-3 px-4 text-right">GST Tax</th>
                <th className="py-3 px-4 text-right">Total with Tax (₹)</th>
                <th className="py-3 px-4">PO Documents</th>
                <th className="py-3 px-4">Spine Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Loader2 size={22} className="animate-spin mx-auto mb-2 text-orange-500" />
                    <span>Loading customer purchase orders...</span>
                  </td>
                </tr>
              ) : customerPos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No Customer POs logged yet. Click &quot;Add PO&quot; to record your confirmed orders.
                  </td>
                </tr>
              ) : (
                customerPos.map((po: any) => {
                  const isConverted = po.status === 'PROJECT_CONVERTED' || Boolean(po.convertedProjectId);
                  const itemsCount = po.items?.length || 0;
                  const poPdf = po.presignedDownloadUrl || po.pdfUrl || po.s3DocumentUrl;
                  const poPhotos = po.photos || [];

                  // Compute financial breakdown
                  const subtotalVal = po.subtotalAmount?.amount ?? po.items?.reduce((acc: number, it: any) => {
                    const q = Number(it.quantity || 1);
                    const p = Number(it.unitPrice?.amount ?? it.unitPrice ?? 0);
                    return acc + (q * p);
                  }, 0) ?? 0;

                  const taxVal = po.totalTaxAmount?.amount ?? po.items?.reduce((acc: number, it: any) => {
                    const q = Number(it.quantity || 1);
                    const p = Number(it.unitPrice?.amount ?? it.unitPrice ?? 0);
                    const r = Number(it.taxRate !== undefined ? it.taxRate : 18);
                    return acc + Math.round((q * p * r) / 100);
                  }, 0) ?? 0;

                  const grandTotalVal = po.totalAmount?.baseAmountINR || po.totalAmount?.amount || (subtotalVal + taxVal);

                  return (
                    <tr key={po._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* PO Number & Date */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{po.poNumber || po.customerPoNumber}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {po.poDate ? new Date(po.poDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>

                      {/* Delivery Commitment Date */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-orange-600">
                          {po.deliveryCommitmentDate || po.deliveryDueDate
                            ? new Date(po.deliveryCommitmentDate || po.deliveryDueDate).toLocaleDateString()
                            : 'TBD'}
                        </span>
                      </td>

                      {/* Client & Company */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{po.companyName}</div>
                        <div className="text-[11px] text-slate-500">{po.customerName}</div>
                      </td>

                      {/* Line Items Summary */}
                      <td className="py-3 px-4">
                        {itemsCount > 0 ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold">
                              <PackageCheck size={11} className="text-orange-500" />
                              <span>{itemsCount} {itemsCount === 1 ? 'Item' : 'Items'}</span>
                            </span>
                            <div className="text-[10px] text-slate-500 truncate max-w-[170px]" title={po.items.map((i: any) => `${i.description} (x${i.quantity})`).join(', ')}>
                              {po.items[0]?.description || 'Order item'}
                              {itemsCount > 1 ? ` +${itemsCount - 1} more` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Machine Unit</span>
                        )}
                      </td>

                      {/* Products Subtotal Price */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-600 text-right">
                        {formatINR(subtotalVal)}
                      </td>

                      {/* GST Tax */}
                      <td className="py-3 px-4 font-mono text-xs text-amber-800 text-right">
                        {formatINR(taxVal)}
                      </td>

                      {/* Total with Tax (Grand Total) */}
                      <td className="py-3 px-4 font-mono font-extrabold text-slate-900 text-right">
                        {formatINR(grandTotalVal)}
                      </td>

                      {/* PDF & Photos Clickable Previews */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {poPdf ? (
                            <button
                              type="button"
                              onClick={() => setPreviewPdfModal({ url: poPdf, title: `Customer PO ${po.poNumber || po.customerPoNumber} - Signed Document` })}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Click to preview Signed PO PDF"
                            >
                              <FileText size={11} />
                              <span>PDF Preview</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No PDF</span>
                          )}

                          {poPhotos.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoGallery({ photos: poPhotos, activeIndex: 0, title: `Photos: PO ${po.poNumber || po.customerPoNumber} (${po.companyName})` })}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Click to preview Machine Photos"
                            >
                              <ImageIcon size={11} />
                              <span>{poPhotos.length} {poPhotos.length === 1 ? 'Photo' : 'Photos'}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Spine Status */}
                      <td className="py-3 px-4">
                        {isConverted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-mono font-bold">
                            <FolderGit2 size={11} />
                            <span>{po.convertedProjectId || po.convertedToProjectId}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                            Active Order
                          </span>
                        )}
                      </td>

                      {/* Action Handover */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Complete Dossier View Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedPoDossier(po)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="View Full PO Dossier with Items, Taxes, PDF & Photos"
                          >
                            <Eye size={14} />
                          </button>

                          {isConverted ? (
                            <Link
                              href="/project-setup/projects"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                            >
                              <span>Spine</span>
                              <ChevronRight size={12} />
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConvertTargetPo(po)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                            >
                              <Sparkles size={11} />
                              <span>Convert</span>
                            </button>
                          )}
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

      {/* ---------------------------------------------------- */}
      {/* 4. EXPANSIVE / WIDE MODAL: Add Customer PO           */}
      {/* ---------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          {/* Master Form standard size: w-full max-w-6xl xl:max-w-7xl max-h-[92vh] */}
          <div className="w-full max-w-6xl xl:max-w-7xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header: Crisp White Header with Amber/Yellow Top Accent Stripe (Master Standard) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <IndianRupee size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    Add Customer Purchase Order (Customer PO)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Record client order with machine line items, HSN codes, product pricing with GST tax, and mandatory PO document proof.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreatePoSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5">
                  <AlertOctagon size={16} className="text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* SECTION A: PO Numbers, Dates & Customer Source */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-orange-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      1. PO Details &amp; Customer Information
                    </span>
                  </div>

                  {/* Customer Mode Switcher: Master vs Custom */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => setCustomerMode('master')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        customerMode === 'master'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      From Customer Master
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerMode('custom');
                        setSelectedCustomerId('');
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        customerMode === 'custom'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Custom / New Customer
                    </button>
                  </div>
                </div>

                {/* Row 1: PO Number, Customer PO Date, and Delivery Commitment Date (Put right next to PO Date!) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Customer PO Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Customer PO Number *</label>
                    <input
                      type="text"
                      required
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="e.g. PO-ABB-2026-089"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>

                  {/* Customer PO Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Customer PO Date *</label>
                    <input
                      type="date"
                      required
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>

                  {/* Delivery Commitment Date (Put right next to PO Date!) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Delivery Commitment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={deliveryCommitmentDate}
                      onChange={(e) => setDeliveryCommitmentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-orange-600 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Customer Details Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                  {/* Customer Selection from Master or Custom Company */}
                  {customerMode === 'master' ? (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Select from Customer Master *
                      </label>
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => handleSelectCustomerFromMaster(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-orange-500 cursor-pointer"
                      >
                        <option value="">-- Choose Existing Customer --</option>
                        {customerMasterList.map((c) => (
                          <option key={c._id} value={c._id}>
                            [{c.customerCode}] {c.companyName} {c.billingAddress?.city ? `(${c.billingAddress.city})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Company / Customer Name *</label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Bharat Heavy Electricals Ltd (BHEL)"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                  )}

                  {/* Contact Person Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person Name *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Mr. Rajesh Sharma"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone / Mobile</label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="e.g. purchase@bhel.in"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>

                  {/* GSTIN / PAN */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN / Tax ID</label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      placeholder="e.g. 29AAAAA0000A1Z5"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>

                  {/* Full Billing Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Billing &amp; Works Address</label>
                    <input
                      type="text"
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      placeholder="Plant address, city, state, pin code..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>

                  {/* Optional Quotation Link */}
                  {quotations.length > 0 && (
                    <div className="sm:col-span-2 sm:col-start-1 lg:col-span-4 p-2.5 bg-orange-50/70 border border-orange-200 rounded-xl flex items-center gap-3">
                      <span className="text-[11px] font-bold text-orange-950 shrink-0">
                        Link Active Quotation:
                      </span>
                      <select
                        value={quotationId}
                        onChange={(e) => handleSelectQuotation(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-orange-200 rounded-lg text-xs font-medium cursor-pointer"
                      >
                        <option value="">-- No linked quote (Standalone PO) --</option>
                        {quotations.map((q: any) => (
                          <option key={q._id} value={q._id}>
                            {q.quoteNumber} — {q.companyName || q.customerName} ({formatINR(q.totalAmount?.amount || q.grandTotalINR)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION B: Multiple Products / Machine Line Items (with Tax breakdown) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-orange-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      2. Machine &amp; Line Items (Customer or from Master with Tax)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Items Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Product / Machine Description</th>
                        <th className="py-2.5 px-3 w-28">Model Code</th>
                        <th className="py-2.5 px-3 w-24">HSN Code</th>
                        <th className="py-2.5 px-3 w-16 text-center">Qty</th>
                        <th className="py-2.5 px-3 w-28 text-right">Unit Price (₹)</th>
                        <th className="py-2.5 px-3 w-28 text-right">Product Price (₹)</th>
                        <th className="py-2.5 px-3 w-20 text-center">GST %</th>
                        <th className="py-2.5 px-3 w-24 text-right">Tax (₹)</th>
                        <th className="py-2.5 px-3 w-32 text-right">Price with Tax (₹)</th>
                        <th className="py-2.5 px-2 text-center w-10">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {lineItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>

                          {/* Product Selection / Description */}
                          <td className="py-2 px-3 space-y-1">
                            {machineCatalog.length > 0 && (
                              <select
                                value={item.modelCode}
                                onChange={(e) => handleSelectProductForLineItem(item.id, e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-orange-500 cursor-pointer"
                              >
                                <option value="">-- Custom Machine / Manual Description --</option>
                                {machineCatalog.map((m) => (
                                  <option key={m.modelCode} value={m.modelCode}>
                                    {m.modelName} ({m.modelCode}) — {formatINR(m.basePriceINR || m.price)}
                                  </option>
                                ))}
                              </select>
                            )}
                            <input
                              type="text"
                              required
                              placeholder="Machine Description / Item Name..."
                              value={item.description}
                              onChange={(e) => handleLineItemFieldChange(item.id, 'description', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-orange-500"
                            />
                          </td>

                          {/* Model Code */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="e.g. MH-SW-800"
                              value={item.modelCode}
                              onChange={(e) => handleLineItemFieldChange(item.id, 'modelCode', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-orange-500"
                            />
                          </td>

                          {/* HSN Code */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="84798100"
                              value={item.hsnCode}
                              onChange={(e) => handleLineItemFieldChange(item.id, 'hsnCode', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-orange-500"
                            />
                          </td>

                          {/* Quantity */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="1"
                              required
                              value={item.quantity}
                              onChange={(e) => handleLineItemFieldChange(item.id, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 text-center focus:outline-hidden focus:border-orange-500"
                            />
                          </td>

                          {/* Unit Price */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              required
                              value={item.unitPrice}
                              onChange={(e) => handleLineItemFieldChange(item.id, 'unitPrice', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 text-right focus:outline-hidden focus:border-orange-500"
                            />
                          </td>

                          {/* Product Price (Base Price) */}
                          <td className="py-2 px-3 font-mono font-bold text-slate-700 text-right">
                            {formatINR(item.basePrice)}
                          </td>

                          {/* GST Rate */}
                          <td className="py-2 px-3">
                            <select
                              value={item.taxRate}
                              onChange={(e) => handleLineItemFieldChange(item.id, 'taxRate', Number(e.target.value))}
                              className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 text-center cursor-pointer focus:outline-hidden focus:border-orange-500"
                            >
                              <option value={18}>18%</option>
                              <option value={12}>12%</option>
                              <option value={5}>5%</option>
                              <option value={28}>28%</option>
                              <option value={0}>0%</option>
                            </select>
                          </td>

                          {/* Tax Amount */}
                          <td className="py-2 px-3 font-mono text-xs text-slate-600 text-right">
                            {formatINR(item.taxAmount)}
                          </td>

                          {/* Price with Tax (Line Total) */}
                          <td className="py-2 px-3 font-mono font-extrabold text-orange-700 text-right">
                            {formatINR(item.lineTotal)}
                          </td>

                          {/* Delete Item */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(item.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Display Card: All Product Price, GST, and Total Agreed Price with Tax */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      All Products Price (Excl. Tax)
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                      {formatINR(computedTotals.subtotal)}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Total GST Tax
                    </span>
                    <span className="font-mono text-sm font-bold text-amber-800 mt-0.5">
                      {formatINR(computedTotals.tax)}
                    </span>
                  </div>

                  <div className="flex flex-col sm:items-end">
                    <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">
                      Total Product Price with Tax (Agreed Grand Total)
                    </span>
                    <span className="font-mono text-base font-black text-orange-700 bg-white px-3 py-0.5 rounded-lg border border-orange-300 shadow-2xs mt-0.5">
                      {formatINR(computedTotals.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION C: Signed PDF Document & Machine Photos Upload (Proof Required) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Upload size={16} className="text-orange-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      3. Signed PO Document (PDF) &amp; Machine Photos (Proof Required *)
                    </span>
                  </div>

                  {/* Dynamic Proof Status Indicator */}
                  {hasProof ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      <span>PO Document Attached</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold">
                      <AlertOctagon size={12} className="text-amber-600" />
                      <span>1 PDF or Photos Required *</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Signed PO PDF Upload & In-Modal Preview */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText size={14} className="text-orange-500" />
                        <span>Signed Customer PO (PDF / Scan)</span>
                      </span>
                      {pdfPreviewUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewPdfModal({ url: pdfPreviewUrl, title: 'Signed PO PDF Preview' })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Maximize2 size={12} />
                          <span>Clickable Preview</span>
                        </button>
                      )}
                    </div>

                    {/* Upload button or paste URL */}
                    <div className="flex items-center gap-2">
                      <label className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-700 text-center cursor-pointer transition-colors">
                        <span>{selectedPdfFile ? selectedPdfFile.name : 'Choose PDF File to Upload'}</span>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handlePdfFileChange}
                          className="hidden"
                        />
                      </label>
                      {selectedPdfFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPdfFile(null);
                            setPdfPreviewUrl('');
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 cursor-pointer"
                          title="Remove file"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Or paste direct PDF URL:
                      <input
                        type="url"
                        placeholder="https://.../signed_po.pdf"
                        value={pastedPdfUrl}
                        onChange={(e) => {
                          setPastedPdfUrl(e.target.value);
                          if (e.target.value.trim()) {
                            setPdfPreviewUrl(e.target.value.trim());
                          }
                        }}
                        className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500"
                      />
                    </div>

                    {/* PDF Mini Preview Card / Iframe */}
                    {pdfPreviewUrl ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
                        <div className="px-3 py-1.5 bg-slate-200 text-slate-700 flex items-center justify-between text-[11px] font-bold">
                          <span>PDF Document Ready</span>
                          <button
                            type="button"
                            onClick={() => setPreviewPdfModal({ url: pdfPreviewUrl, title: 'Signed PO PDF Preview' })}
                            className="text-orange-600 hover:text-orange-700 underline text-[11px]"
                          >
                            Open Fullscreen Preview
                          </button>
                        </div>
                        <iframe
                          src={pdfPreviewUrl}
                          className="w-full h-44 border-0"
                          title="PO PDF Preview"
                        />
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs italic">
                        No signed PO PDF selected. Upload a file or paste a link to enable preview.
                      </div>
                    )}
                  </div>

                  {/* Right: Machine Photos Upload & Gallery */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-orange-500" />
                        <span>Machine &amp; Drawing Photos ({photos.length})</span>
                      </span>
                      {photos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoGallery({ photos, activeIndex: 0, title: 'Customer PO Photos Gallery' })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Maximize2 size={12} />
                          <span>Clickable Preview</span>
                        </button>
                      )}
                    </div>

                    {/* File upload + URL input */}
                    <div className="space-y-2">
                      <label className="block w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-700 text-center cursor-pointer transition-colors">
                        <span>Upload Photos from Device (Multi-select)</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePhotoFilesChange}
                          className="hidden"
                        />
                      </label>

                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          placeholder="Or paste Image URL..."
                          value={pastedPhotoUrl}
                          onChange={(e) => setPastedPhotoUrl(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddPhotoUrl}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Photos Grid with Delete & Click-to-preview */}
                    {photos.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                        {photos.map((ph, idx) => (
                          <div
                            key={idx}
                            onClick={() => setPreviewPhotoGallery({ photos, activeIndex: idx, title: `Photo ${idx + 1} of ${photos.length}` })}
                            className="group relative h-20 rounded-lg overflow-hidden border border-slate-200 bg-white cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all"
                          >
                            <img
                              src={ph}
                              alt={`Machine photo ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePhoto(idx);
                              }}
                              className="absolute top-1 right-1 p-1 rounded-md bg-slate-900/70 text-white hover:bg-red-600 transition-colors"
                              title="Delete photo"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs italic">
                        No machine photos uploaded yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Internal Engineering &amp; Commercial Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Special tooling fixtures included, 415V 50Hz 3-phase plant power requirement..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500 font-medium">
                  Agreed Total (With Tax):{' '}
                  <span className="font-mono font-bold text-slate-900">{formatINR(computedTotals.grandTotal)}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingPo || isUploadingS3}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isUploadingS3 ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Uploading PDF to S3...</span>
                      </>
                    ) : isCreatingPo ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Recording Customer PO...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={15} />
                        <span>Record Customer PO</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. CLICKABLE FULL-SCREEN PDF PREVIEW MODAL           */}
      {/* ---------------------------------------------------- */}
      {previewPdfModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-5xl h-[88vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header: Crisp White Header with Amber/Yellow Top Accent Stripe */}
            <div className="px-5 py-3.5 bg-white border-t-4 border-t-amber-400 border-b border-slate-200 text-slate-900 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <FileText size={18} className="text-orange-500" />
                <span className="text-sm font-bold text-slate-900 truncate max-w-md">{previewPdfModal.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewPdfModal.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdfModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-2">
              <iframe
                src={previewPdfModal.url}
                className="w-full h-full rounded-xl border border-slate-200 bg-white"
                title="Full Screen Signed PO PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. CLICKABLE FULL-SCREEN PHOTO GALLERY MODAL         */}
      {/* ---------------------------------------------------- */}
      {previewPhotoGallery && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-5xl h-[88vh] flex flex-col items-center justify-between">
            {/* Gallery Top Bar */}
            <div className="w-full flex items-center justify-between text-white py-2 px-4">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="text-orange-400" />
                <span className="text-sm font-bold">{previewPhotoGallery.title}</span>
                <span className="text-xs text-slate-400">
                  ({previewPhotoGallery.activeIndex + 1} of {previewPhotoGallery.photos.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoGallery(null)}
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Active Photo Container */}
            <div className="relative flex-1 w-full flex items-center justify-center p-4 overflow-hidden">
              <img
                src={previewPhotoGallery.photos[previewPhotoGallery.activeIndex]}
                alt="Full resolution machine view"
                className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
              />

              {/* Prev / Next controls */}
              {previewPhotoGallery.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewPhotoGallery((prev) =>
                        prev
                          ? {
                              ...prev,
                              activeIndex: (prev.activeIndex - 1 + prev.photos.length) % prev.photos.length
                            }
                          : null
                      )
                    }
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-orange-500 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewPhotoGallery((prev) =>
                        prev
                          ? {
                              ...prev,
                              activeIndex: (prev.activeIndex + 1) % prev.photos.length
                            }
                          : null
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-orange-500 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Thumbnails Strip */}
            {previewPhotoGallery.photos.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-2 px-4 max-w-full">
                {previewPhotoGallery.photos.map((photo, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setPreviewPhotoGallery((prev) => (prev ? { ...prev, activeIndex: i } : null))
                    }
                    className={`h-14 w-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      i === previewPhotoGallery.activeIndex ? 'border-orange-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 7. COMPLETE CUSTOMER PO DOSSIER VIEWER MODAL        */}
      {/* ---------------------------------------------------- */}
      {selectedPoDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
            {/* Header: Crisp White Header with Amber/Yellow Top Accent Stripe */}
            <div className="px-6 py-4 bg-white border-t-4 border-t-amber-400 border-b border-slate-200 text-slate-900 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <FileText size={18} className="text-orange-500" />
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
                    PO Dossier: {selectedPoDossier.poNumber || selectedPoDossier.customerPoNumber}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {selectedPoDossier.companyName} • {selectedPoDossier.customerName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPoDossier(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-800">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">PO Date</span>
                  <span className="font-semibold text-slate-900">
                    {selectedPoDossier.poDate ? new Date(selectedPoDossier.poDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Delivery Commitment</span>
                  <span className="font-bold text-orange-600">
                    {selectedPoDossier.deliveryCommitmentDate || selectedPoDossier.deliveryDueDate
                      ? new Date(selectedPoDossier.deliveryCommitmentDate || selectedPoDossier.deliveryDueDate).toLocaleDateString()
                      : 'TBD'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">GSTIN / Tax ID</span>
                  <span className="font-mono font-semibold">{selectedPoDossier.gstin || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Order Status</span>
                  <span className="font-bold text-emerald-700">
                    {selectedPoDossier.status || 'Active Order'}
                  </span>
                </div>
              </div>

              {/* Line Items Breakdown */}
              <div className="space-y-2">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                  Ordered Machines &amp; Line Items (with Taxes)
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-600">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3">Model Code</th>
                        <th className="py-2 px-3">HSN Code</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Unit Price (₹)</th>
                        <th className="py-2 px-3 text-center">GST %</th>
                        <th className="py-2 px-3 text-right">Tax (₹)</th>
                        <th className="py-2 px-3 text-right">Total with Tax (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedPoDossier.items || []).map((it: any, i: number) => {
                        const uPrice = it.unitPrice?.amount ?? it.unitPrice ?? 0;
                        const q = Number(it.quantity || 1);
                        const baseP = q * uPrice;
                        const tRate = Number(it.taxRate !== undefined ? it.taxRate : 18);
                        const tAmt = it.taxAmount?.amount ?? Math.round((baseP * tRate) / 100);
                        const lTot = it.lineTotal?.amount ?? it.lineTotal ?? (baseP + tAmt);
                        return (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-400 font-mono">{i + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{it.description}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">{it.modelCode || '—'}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{it.hsnCode || '84798100'}</td>
                            <td className="py-2 px-3 text-center font-bold font-mono">{it.quantity}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatINR(uPrice)}</td>
                            <td className="py-2 px-3 text-center font-mono">{tRate}%</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">{formatINR(tAmt)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(lTot)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <div className="text-right space-y-1">
                    <div className="text-xs text-slate-500">
                      <span>Total Agreed Price (With Tax): </span>
                      <span className="font-mono font-black text-sm text-orange-700 ml-1">
                        {formatINR(selectedPoDossier.totalAmount?.baseAmountINR || selectedPoDossier.totalAmount?.amount || selectedPoDossier.totalAmountINR)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Photos Gallery preview if any */}
              {selectedPoDossier.photos && selectedPoDossier.photos.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                    Machine &amp; Drawing Photos ({selectedPoDossier.photos.length})
                  </span>
                  <div className="grid grid-cols-4 gap-2.5">
                    {selectedPoDossier.photos.map((ph: string, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewPhotoGallery({ photos: selectedPoDossier.photos, activeIndex: idx, title: `PO Photo ${idx + 1}` })}
                        className="group relative h-24 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all"
                      >
                        <img src={ph} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PDF Preview if any */}
              {(selectedPoDossier.presignedDownloadUrl || selectedPoDossier.pdfUrl || selectedPoDossier.s3DocumentUrl) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Signed Customer PO Document (PDF)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPdfModal({
                          url: selectedPoDossier.presignedDownloadUrl || selectedPoDossier.pdfUrl || selectedPoDossier.s3DocumentUrl,
                          title: `Signed PO Document: ${selectedPoDossier.poNumber || selectedPoDossier.customerPoNumber}`
                        })
                      }
                      className="text-orange-600 hover:text-orange-700 font-bold text-xs underline cursor-pointer"
                    >
                      Open in Fullscreen Preview
                    </button>
                  </div>
                  <iframe
                    src={selectedPoDossier.presignedDownloadUrl || selectedPoDossier.pdfUrl || selectedPoDossier.s3DocumentUrl}
                    className="w-full h-64 rounded-xl border border-slate-200"
                    title="Dossier PO PDF Preview"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPoDossier(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 8. CONVERT PO TO PROJECT CONFIRMATION MODAL         */}
      {/* ---------------------------------------------------- */}
      {convertTargetPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Convert PO to Project Setup Spine
                </h3>
                <p className="text-xs text-slate-500">
                  Mint Unique Project ID (PRJ-XXXX) &amp; Work Order
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
              <div>
                <span className="text-slate-500">Customer PO:</span>{' '}
                <span className="font-mono font-bold text-slate-900">{convertTargetPo.poNumber || convertTargetPo.customerPoNumber}</span>
              </div>
              <div>
                <span className="text-slate-500">Client:</span>{' '}
                <span className="font-bold text-slate-900">{convertTargetPo.companyName}</span>
              </div>
              <div>
                <span className="text-slate-500">Total Value:</span>{' '}
                <span className="font-mono font-bold text-emerald-700">
                  {formatINR(convertTargetPo.totalAmount?.baseAmountINR || convertTargetPo.totalAmount?.amount || convertTargetPo.totalAmountINR)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will create the Master Unique Project Spine (PRJ-YYYY-XXXX), initialize 6 lifecycle baseline milestones, and link Design, Purchase, and Production modules.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConvertTargetPo(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExecuteConvert(convertTargetPo._id)}
                disabled={isConverting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>{isConverting ? 'Minting Project...' : 'Confirm & Mint PRJ-XXXX'}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating System Toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200 border ${
            toastType === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : toastType === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          {toastType === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertOctagon className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
