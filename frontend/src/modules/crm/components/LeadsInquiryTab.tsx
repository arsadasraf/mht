'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Search,
  Filter,
  Plus,
  Upload,
  Kanban,
  Table as TableIcon,
  Phone,
  Mail,
  Building2,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  CheckCheck,
  CreditCard,
  ShieldCheck,
  Clock,
  UserCheck,
  Download,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
  MapPin,
  Cpu,
  Layers,
  Sparkles,
  Send,
  FileText,
  MessageSquarePlus,
  History,
  ArrowRightLeft,
  Printer,
  Copy,
  Eye,
  RotateCcw
} from 'lucide-react';
import {
  useGetLeadsQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useUpdateLeadStageMutation,
  useAddLeadFollowUpNoteMutation,
  useDeleteLeadMutation,
  useGetCrmMastersQuery,
  useGetQuotationsQuery,
  useCreateQuotationMutation,
  useCreateQuotationRevisionMutation,
  useLazyGetQuotationRevisionsQuery
} from '../api/crmApi';
import BulkImportModal from './BulkImportModal';
import {
  CompanyBillingInfo,
  OrderAcceptanceBankDetails,
  OrderAcceptanceSignatory,
  MachineCatalogProduct
} from '../types';

interface LeadsInquiryTabProps {
  initialViewMode?: 'table' | 'kanban' | 'quotations';
}

const KANBAN_STAGES = [
  { id: 'NEW', title: 'New Inquiries', color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { id: 'TECHNICAL_REVIEW', title: 'Technical Review', color: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  { id: 'QUOTE_PREPARED', title: 'Quote Sent', color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { id: 'NEGOTIATION', title: 'Negotiation', color: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { id: 'WON', title: 'PO Received (Won)', color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { id: 'IN_PRODUCTION', title: 'In Production', color: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  { id: 'DISPATCHED', title: 'Dispatched', color: 'bg-teal-600', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  { id: 'LOST', title: 'Lost Deals', color: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' }
];

const formatINR = (amt: any) => {
  const num = Number(amt || 0);
  if (num === 0) return '₹ -';
  return `₹ ${num.toLocaleString('en-IN')}`;
};

const formatDateDDMMYYYY = (dateStr: any) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

const amountToWordsINR = (num: number): string => {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertGroup = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  const integerPart = Math.floor(num);
  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const remainder = integerPart % 1000;

  let words = '';
  if (crore > 0) words += convertGroup(crore) + 'Crore ';
  if (lakh > 0) words += convertGroup(lakh) + 'Lakh ';
  if (thousand > 0) words += convertGroup(thousand) + 'Thousand ';
  if (remainder > 0) words += convertGroup(remainder);

  return `${words.trim()} Rupees Only`;
};

export const DEFAULT_QUOTE_TERMS = {
  priceBasis: 'Ex-Works Bangalore',
  tax: 'GST - 18% Extra',
  delivery: '8 weeks from the date of P.O. along with advance',
  paymentTerms: '50% Advance along with purchase order\n50% Before dispatch',
  installationAndCommissioning: 'Inclusive',
  freight: 'To buyer / At Actuals',
  packaging: 'Inclusive',
  insurance: 'To buyer',
  validity: '30 Days',
  warranty: '12 Months from the date of supply/commissioning'
};

export const DEFAULT_OA_BANK: OrderAcceptanceBankDetails = {
  accountName: 'Machine House Technologies',
  bankName: 'HDFC',
  branch: 'Hulimavu Branch',
  accountNo: '50200017432572',
  ifscCode: 'HDFC0004117',
  gstNo: '29AENPR8339C1ZZ'
};

export const DEFAULT_OA_SIGNATORY: OrderAcceptanceSignatory = {
  forCompany: 'Machine House Technologies',
  signatoryName: 'Roshan M P',
  signatoryPhone: '9845444962',
  companyAddress:
    '#3 Muniyappa Building, Hommadevanahalli, Kempegowda Road, Basavanapura, Gottigere Post, Bangalore – 560083',
  companyPhone: '+91 98454 44962',
  companyEmail: 'marketing@machinehousetechnologies.com',
  companyWebsite: 'www.machinehousewindingtechnologies.com'
};

export default function LeadsInquiryTab({ initialViewMode = 'table' }: LeadsInquiryTabProps) {
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'quotations'>(initialViewMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);

  // Active Quotation Modal (Create R0 or Revise R1, R2...)
  const [activeQuoteModal, setActiveQuoteModal] = useState<{
    isOpen: boolean;
    mode: 'CREATE' | 'REVISE';
    lead?: any;
    targetQuote?: any;
  } | null>(null);

  // Form State for Quotation
  const [quoteCustomerName, setQuoteCustomerName] = useState('');
  const [quoteCompanyName, setQuoteCompanyName] = useState('');
  const [quoteContactEmail, setQuoteContactEmail] = useState('');
  const [quoteContactPhone, setQuoteContactPhone] = useState('');
  const [quoteBillingAddress, setQuoteBillingAddress] = useState('');
  const [quoteShippingAddress, setQuoteShippingAddress] = useState('');
  const [quoteGstin, setQuoteGstin] = useState('');
  const [quoteMachineModel, setQuoteMachineModel] = useState('');
  const [quoteRevisionNotes, setQuoteRevisionNotes] = useState('');
  const [quoteItems, setQuoteItems] = useState<any[]>([]);

  // Commercial Pricing & Taxation
  const [quotePackingType, setQuotePackingType] = useState<'INCLUDED' | 'PERCENT' | 'FIXED'>('INCLUDED');
  const [quotePackingValue, setQuotePackingValue] = useState<number>(0);
  const [quoteIsPackingGstApplicable, setQuoteIsPackingGstApplicable] = useState(true);
  const [quoteTransportationType, setQuoteTransportationType] = useState<'BUYER_ACTUALS' | 'INCLUDED' | 'FIXED'>('BUYER_ACTUALS');
  const [quoteTransportationValue, setQuoteTransportationValue] = useState<number>(0);
  const [quoteIsTransportationGstApplicable, setQuoteIsTransportationGstApplicable] = useState(true);
  const [quoteGstCategory, setQuoteGstCategory] = useState<'INTRA_STATE' | 'INTER_STATE'>('INTRA_STATE');
  const [quoteTaxRate, setQuoteTaxRate] = useState<number>(18);
  const [quoteIsGstIncluded, setQuoteIsGstIncluded] = useState<boolean>(false);
  const [quoteCurrency, setQuoteCurrency] = useState('INR');

  // Terms & Conditions
  const [quoteDeliveryWeeks, setQuoteDeliveryWeeks] = useState(8);
  const [quotePaymentTerms, setQuotePaymentTerms] = useState(DEFAULT_QUOTE_TERMS.paymentTerms);
  const [quotePriceBasis, setQuotePriceBasis] = useState(DEFAULT_QUOTE_TERMS.priceBasis);
  const [quoteValidityDays, setQuoteValidityDays] = useState(30);
  const [quoteWarrantyMonths, setQuoteWarrantyMonths] = useState(12);
  const [quoteInstallation, setQuoteInstallation] = useState('Inclusive');
  const [quoteInsurance, setQuoteInsurance] = useState('To buyer');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState('');
  const [quoteErrorMsg, setQuoteErrorMsg] = useState('');

  // Toast State
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 4500);
  };

  // Stage Transition Note Modal State
  const [stageTransitionLead, setStageTransitionLead] = useState<any>(null);
  const [targetStage, setTargetStage] = useState('');
  const [transitionNote, setTransitionNote] = useState('');
  const [lossReason, setLossReason] = useState('');

  // Follow-Up Notes & Stage History Modal State
  const [notesModalLead, setNotesModalLead] = useState<any>(null);
  const [newFollowUpNote, setNewFollowUpNote] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  // Quotation Preview & Revision History Modal State
  const [previewQuote, setPreviewQuote] = useState<any>(null);
  const [revisionHistoryList, setRevisionHistoryList] = useState<any[]>([]);

  // API Queries & Mutations
  const { data: leadsData, isLoading, refetch } = useGetLeadsQuery({
    source: selectedSource || undefined,
    priority: selectedPriority || undefined,
    stage: selectedStage || undefined,
    search: searchTerm || undefined
  });

  const { data: quotationsData, refetch: refetchQuotations } = useGetQuotationsQuery();
  const quotations = quotationsData?.quotations || [];

  const { data: mastersData } = useGetCrmMastersQuery();
  const machinePresets = (mastersData?.masters?.machines || []) as any[];
  const companyBilling = mastersData?.masters?.companyBillingInfo;

  const [createLead, { isLoading: isCreatingLead }] = useCreateLeadMutation();
  const [createQuotation, { isLoading: isCreatingQuote }] = useCreateQuotationMutation();
  const [createQuotationRevision, { isLoading: isCreatingRevision }] = useCreateQuotationRevisionMutation();
  const [triggerGetRevisions] = useLazyGetQuotationRevisionsQuery();
  const [updateLeadStage, { isLoading: isUpdatingStage }] = useUpdateLeadStageMutation();
  const [addLeadFollowUpNote, { isLoading: isAddingNote }] = useAddLeadFollowUpNoteMutation();
  const [deleteLead] = useDeleteLeadMutation();

  // Multi-Product Form State for Manual Entry
  const [newLead, setNewLead] = useState({
    customerName: '',
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    city: 'Bengaluru',
    country: 'India',
    source: 'DIRECT_SALES',
    priority: 'MEDIUM',
    notes: '',
    products: [
      {
        modelCode: '',
        modelName: '',
        quantity: 1,
        unitPrice: 0,
        currency: 'INR',
        specifications: '',
        customToolingNotes: ''
      }
    ]
  });

  const leads = leadsData?.leads || [];

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((ld) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          ld.leadNumber?.toLowerCase().includes(q) ||
          ld.customerName?.toLowerCase().includes(q) ||
          ld.companyName?.toLowerCase().includes(q) ||
          (ld as any).machineModel?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [leads, searchTerm]);

  // Handle Multi-Product Row Add
  const handleAddProductRow = () => {
    const defaultPreset = machinePresets[0] || {
      modelCode: 'MHT-2100',
      modelName: 'MHT-2100 Table Top Coil Winder',
      basePriceINR: 285000
    };

    setNewLead((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          modelCode: defaultPreset.modelCode,
          modelName: defaultPreset.modelName,
          quantity: 1,
          unitPrice: defaultPreset.basePriceINR,
          currency: 'INR',
          specifications: '',
          customToolingNotes: ''
        }
      ]
    }));
  };

  // Handle Multi-Product Row Remove
  const handleRemoveProductRow = (index) => {
    setNewLead((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  // Handle Multi-Product Change
  const handleProductChange = (index, field, value) => {
    setNewLead((prev) => {
      const updated = [...prev.products];
      if (field === 'modelCode') {
        const preset = machinePresets.find((m) => m.modelCode === value);
        if (preset) {
          updated[index].modelCode = preset.modelCode;
          updated[index].modelName = preset.modelName;
          updated[index].unitPrice = preset.basePriceINR;
        } else {
          updated[index].modelCode = value;
        }
      } else {
        updated[index][field] = value;
      }
      return { ...prev, products: updated };
    });
  };

  // Compute Total Estimate for New Lead
  const computedLeadTotal = useMemo(() => {
    return newLead.products.reduce((acc, p) => acc + (Number(p.quantity || 1) * Number(p.unitPrice || 0)), 0);
  }, [newLead.products]);

  // Submit Manual Lead Creation
  const handleCreateLeadSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newLead,
        machineRequirement: newLead.products.map(p => `${p.quantity}x ${p.modelCode}`).join(', '),
        estimatedValue: {
          currency: newLead.products[0]?.currency || 'INR',
          amount: computedLeadTotal,
          exchangeRate: 1.0,
          baseAmountINR: computedLeadTotal
        }
      };

      await createLead(payload as any).unwrap();
      setIsAddLeadModalOpen(false);
      setNewLead({
        customerName: '',
        companyName: '',
        contactEmail: '',
        contactPhone: '',
        city: 'Bengaluru',
        country: 'India',
        source: 'DIRECT_SALES',
        priority: 'MEDIUM',
        notes: '',
        products: [
          {
            modelCode: '',
            modelName: '',
            quantity: 1,
            unitPrice: 0,
            currency: 'INR',
            specifications: '',
            customToolingNotes: ''
          }
        ]
      });
      refetch();
      showToast('All set! New customer enquiry recorded.', 'success');
    } catch (err: any) {
      showToast(err.data?.message || 'We could not save this enquiry right now.', 'error');
    }
  };

  // Open Stage Transition Modal
  const handleOpenStageTransition = (lead: any, nextStage?: string) => {
    setStageTransitionLead(lead);
    const defaultNext =
      nextStage ||
      KANBAN_STAGES[(KANBAN_STAGES.findIndex((s) => s.id === lead.stage) + 1) % KANBAN_STAGES.length]?.id ||
      'TECHNICAL_REVIEW';
    setTargetStage(defaultNext);
    setTransitionNote('');
    setLossReason('');
  };

  // Submit Stage Transition with Note
  const handleConfirmStageTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageTransitionLead || !targetStage) return;
    if (!transitionNote.trim()) {
      showToast('Please enter a transition note before moving stages.', 'error');
      return;
    }
    try {
      await updateLeadStage({
        id: stageTransitionLead._id,
        stage: targetStage,
        transitionNote: transitionNote.trim(),
        notes: transitionNote.trim(),
        lossReason: targetStage === 'LOST' ? lossReason : undefined
      }).unwrap();
      showToast(`Moved ${stageTransitionLead.leadNumber} to ${targetStage}!`, 'success');
      setStageTransitionLead(null);
      setTransitionNote('');
      refetch();
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not update stage right now.', 'error');
    }
  };

  // Submit In-Stage Follow-Up Note
  const handleAddFollowUpNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesModalLead || !newFollowUpNote.trim()) return;
    try {
      const res = await addLeadFollowUpNote({
        id: notesModalLead._id,
        note: newFollowUpNote.trim(),
        nextFollowUpDate: nextFollowUpDate || undefined
      }).unwrap();
      setNotesModalLead(res.lead);
      setNewFollowUpNote('');
      setNextFollowUpDate('');
      showToast('Follow-up note added!', 'success');
      refetch();
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not add follow-up note.', 'error');
    }
  };

  // Quotation Line Item Handlers
  const handleAddLineItem = (qtyType: 'NUMERIC' | 'EXTRA' | 'INCLUDED' = 'NUMERIC') => {
    setQuoteItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        slNo: prev.length + 1,
        itemCode: qtyType === 'EXTRA' ? 'EXTRA-ACC' : `ITEM-${prev.length + 1}`,
        modelCode: '',
        description: qtyType === 'EXTRA' ? 'Optional Extra Accessory / Attachment' : '',
        specifications: '',
        hsnCode: '8479',
        qtyType,
        quantity: qtyType === 'EXTRA' ? 0 : 1,
        uom: qtyType === 'EXTRA' ? '' : 'No.',
        unitPrice: 0,
        totalAmount: 0
      }
    ]);
  };

  const handleLineItemChange = (id: string, field: string, val: any) => {
    setQuoteItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: val };
        if (field === 'quantity' || field === 'unitPrice' || field === 'qtyType') {
          const q = updated.qtyType === 'EXTRA' ? 0 : Number(updated.quantity) || 0;
          const p = Number(updated.unitPrice) || 0;
          updated.totalAmount = Math.round(q * p * 100) / 100;
        }
        return updated;
      })
    );
  };

  const handleRemoveLineItem = (id: string) => {
    if (quoteItems.length <= 1) {
      showToast('At least one item is required in the quotation.', 'info');
      return;
    }
    setQuoteItems((prev) =>
      prev
        .filter((it) => it.id !== id)
        .map((it, idx) => ({ ...it, slNo: idx + 1 }))
    );
  };

  // Computed Financials for Quotation (PO-Style Commercial Breakdown)
  const quoteComputedTotals = useMemo(() => {
    const itemsSubtotal = quoteItems.reduce((acc, it) => {
      if (it.qtyType === 'EXTRA') return acc;
      return acc + (Number(it.quantity || 1) * Number(it.unitPrice || 0));
    }, 0);

    let packingAmount = 0;
    if (quotePackingType === 'PERCENT') {
      packingAmount = Math.round(((itemsSubtotal * Number(quotePackingValue || 0)) / 100) * 100) / 100;
    } else if (quotePackingType === 'FIXED') {
      packingAmount = Number(quotePackingValue || 0);
    }

    let transportationAmount = 0;
    if (quoteTransportationType === 'FIXED') {
      transportationAmount = Number(quoteTransportationValue || 0);
    }

    const taxablePacking = quoteIsPackingGstApplicable ? packingAmount : 0;
    const taxableFreight = quoteIsTransportationGstApplicable ? transportationAmount : 0;

    let taxableAmount = itemsSubtotal + taxablePacking + taxableFreight;
    let tax = 0;
    let grandTotal = 0;

    if (quoteIsGstIncluded) {
      const gross = itemsSubtotal + packingAmount + transportationAmount;
      taxableAmount = Math.round((gross / (1 + Number(quoteTaxRate) / 100)) * 100) / 100;
      tax = Math.round((gross - taxableAmount) * 100) / 100;
      grandTotal = gross;
    } else {
      tax = Math.round(((taxableAmount * Number(quoteTaxRate)) / 100) * 100) / 100;
      grandTotal = Math.round((itemsSubtotal + packingAmount + transportationAmount + tax) * 100) / 100;
    }

    const cgstAmount = quoteGstCategory === 'INTRA_STATE' ? Math.round((tax / 2) * 100) / 100 : 0;
    const sgstAmount = quoteGstCategory === 'INTRA_STATE' ? Math.round((tax - cgstAmount) * 100) / 100 : 0;
    const igstAmount = quoteGstCategory === 'INTER_STATE' ? tax : 0;

    return {
      itemsSubtotal,
      packingAmount,
      transportationAmount,
      taxableAmount,
      tax,
      cgstAmount,
      sgstAmount,
      igstAmount,
      grandTotal
    };
  }, [
    quoteItems,
    quotePackingType,
    quotePackingValue,
    quoteIsPackingGstApplicable,
    quoteTransportationType,
    quoteTransportationValue,
    quoteIsTransportationGstApplicable,
    quoteGstCategory,
    quoteTaxRate,
    quoteIsGstIncluded
  ]);

  // Open "Send Quote" Modal for a specific lead (Initial R0)
  const handleOpenSendQuote = (lead: any) => {
    setActiveQuoteModal({ isOpen: true, mode: 'CREATE', lead });
    setQuoteCustomerName(lead.customerName || '');
    setQuoteCompanyName(lead.companyName || '');
    setQuoteContactEmail(lead.contactEmail || '');
    setQuoteContactPhone(lead.contactPhone || '');
    setQuoteBillingAddress(lead.address || '');
    setQuoteShippingAddress(lead.address || '');
    setQuoteGstin(lead.gstin || '');
    setQuoteMachineModel(lead.machineModel || '');
    setQuoteRevisionNotes('Initial Commercial Quotation (R0)');

    let items: any[] = [];
    if (lead.products && lead.products.length > 0) {
      items = lead.products.map((p: any, idx: number) => ({
        id: `item-${Date.now()}-${idx}`,
        slNo: idx + 1,
        itemCode: p.modelCode || `ITEM-${idx + 1}`,
        modelCode: p.modelCode || '',
        description: p.modelName ? `${p.modelName} — ${p.modelCode}` : (p.description || lead.machineModel || 'Precision Winding Machine'),
        specifications: p.specifications || '',
        hsnCode: '8479',
        qtyType: 'NUMERIC',
        quantity: Number(p.quantity || 1),
        uom: 'No.',
        unitPrice: Number(p.unitPrice?.amount || p.unitPrice || 250000),
        totalAmount: Number(p.quantity || 1) * Number(p.unitPrice?.amount || p.unitPrice || 250000)
      }));
    } else {
      items = [
        {
          id: `item-${Date.now()}-1`,
          slNo: 1,
          itemCode: lead.machineModel || 'MHT-2100',
          modelCode: lead.machineModel || 'MHT-2100',
          description: `${lead.machineModel || 'Precision Winding Machine'} — Base Automated Assembly`,
          specifications: '',
          hsnCode: '8479',
          qtyType: 'NUMERIC',
          quantity: 1,
          uom: 'No.',
          unitPrice: Number(lead.estimatedValue?.amount || lead.estimatedValue || 250000),
          totalAmount: Number(lead.estimatedValue?.amount || lead.estimatedValue || 250000)
        }
      ];
    }
    setQuoteItems(items);
    setQuotePackingType('INCLUDED');
    setQuotePackingValue(0);
    setQuoteIsPackingGstApplicable(true);
    setQuoteTransportationType('BUYER_ACTUALS');
    setQuoteTransportationValue(0);
    setQuoteIsTransportationGstApplicable(true);
    setQuoteGstCategory('INTRA_STATE');
    setQuoteTaxRate(18);
    setQuoteIsGstIncluded(false);
    setQuoteCurrency(lead.estimatedValue?.currency || 'INR');
    setQuoteDeliveryWeeks(8);
    setQuotePaymentTerms(DEFAULT_QUOTE_TERMS.paymentTerms);
    setQuotePriceBasis(DEFAULT_QUOTE_TERMS.priceBasis);
    setQuoteValidityDays(30);
    setQuoteWarrantyMonths(12);
    setQuoteInstallation('Inclusive');
    setQuoteInsurance('To buyer');
    setQuoteNotes('');
    setQuoteErrorMsg('');
    setQuoteSuccessMsg('');
  };

  // Open "Revise Quotation" Modal (R1, R2...)
  const handleOpenReviseQuote = (q: any) => {
    setActiveQuoteModal({ isOpen: true, mode: 'REVISE', targetQuote: q });
    setQuoteCustomerName(q.customerName || '');
    setQuoteCompanyName(q.companyName || '');
    setQuoteContactEmail(q.contactEmail || '');
    setQuoteContactPhone(q.contactPhone || '');
    setQuoteBillingAddress(q.billingAddress || '');
    setQuoteShippingAddress(q.shippingAddress || q.billingAddress || '');
    setQuoteGstin(q.gstin || '');
    setQuoteMachineModel(q.machineModel || '');
    setQuoteRevisionNotes('');

    const items = (q.items || []).map((it: any, idx: number) => ({
      id: `item-${Date.now()}-${idx}`,
      slNo: idx + 1,
      itemCode: it.itemCode || `ITEM-${idx + 1}`,
      modelCode: it.modelCode || '',
      description: it.description || it.modelName || 'Machine Item',
      specifications: it.specifications || '',
      hsnCode: it.hsnCode || '8479',
      qtyType: it.qtyType || 'NUMERIC',
      quantity: it.qtyType === 'EXTRA' ? 0 : Number(it.quantity || 1),
      uom: it.qtyType === 'EXTRA' ? '' : (it.uom || 'No.'),
      unitPrice: Number(it.unitPrice?.amount ?? it.unitPrice ?? 0),
      totalAmount: it.qtyType === 'EXTRA' ? 0 : (Number(it.quantity || 1) * Number(it.unitPrice?.amount ?? it.unitPrice ?? 0))
    }));
    setQuoteItems(items.length > 0 ? items : [
      {
        id: `item-${Date.now()}-1`,
        slNo: 1,
        itemCode: 'MHT-2100',
        modelCode: 'MHT-2100',
        description: 'Precision Winding Machine',
        specifications: '',
        hsnCode: '8479',
        qtyType: 'NUMERIC',
        quantity: 1,
        uom: 'No.',
        unitPrice: 250000,
        totalAmount: 250000
      }
    ]);

    setQuotePackingType(q.packingType || 'INCLUDED');
    setQuotePackingValue(Number(q.packingValue || 0));
    setQuoteIsPackingGstApplicable(q.isPackingGstApplicable !== false);
    setQuoteTransportationType(q.transportationType || 'BUYER_ACTUALS');
    setQuoteTransportationValue(Number(q.transportationValue || 0));
    setQuoteIsTransportationGstApplicable(q.isTransportationGstApplicable !== false);
    setQuoteGstCategory(q.gstCategory || 'INTRA_STATE');
    setQuoteTaxRate(Number(q.taxRatePercent ?? 18));
    setQuoteIsGstIncluded(Boolean(q.isGstIncluded));
    setQuoteCurrency(q.currency || 'INR');
    setQuoteDeliveryWeeks(Number(q.deliveryWeeks ?? 8));
    setQuotePaymentTerms(q.termsAndConditions?.paymentTerms || q.paymentTerms || DEFAULT_QUOTE_TERMS.paymentTerms);
    setQuotePriceBasis(q.termsAndConditions?.priceBasis || DEFAULT_QUOTE_TERMS.priceBasis);
    setQuoteValidityDays(Number(q.validityDays ?? 30));
    setQuoteWarrantyMonths(Number(q.warrantyMonths ?? 12));
    setQuoteInstallation(q.termsAndConditions?.installationAndCommissioning || 'Inclusive');
    setQuoteInsurance(q.termsAndConditions?.insurance || 'To buyer');
    setQuoteNotes(q.notes || '');
    setQuoteErrorMsg('');
    setQuoteSuccessMsg('');
  };

  // Submit Save Quotation (R0 or Revision R1, R2...)
  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuoteModal) return;

    if (!quoteCompanyName.trim() || !quoteCustomerName.trim()) {
      setQuoteErrorMsg('Please provide Customer Name and Company Name.');
      return;
    }

    if (activeQuoteModal.mode === 'REVISE' && !quoteRevisionNotes.trim()) {
      setQuoteErrorMsg('Please enter revision notes explaining what changed in this revision.');
      return;
    }

    if (quoteItems.some((it) => !it.description.trim())) {
      setQuoteErrorMsg('Please provide description for all line items.');
      return;
    }

    try {
      const billingInfo: Partial<CompanyBillingInfo> = mastersData?.masters?.companyBillingInfo || {};
      const mappedBankDetails: OrderAcceptanceBankDetails = {
        accountName: billingInfo.companyName || DEFAULT_OA_BANK.accountName,
        bankName: billingInfo.bankName || DEFAULT_OA_BANK.bankName,
        branch: billingInfo.bankBranch || DEFAULT_OA_BANK.branch,
        accountNo: billingInfo.accountNumber || DEFAULT_OA_BANK.accountNo,
        ifscCode: billingInfo.ifscCode || DEFAULT_OA_BANK.ifscCode,
        gstNo: billingInfo.gstin || DEFAULT_OA_BANK.gstNo
      };

      const mappedSignatory: OrderAcceptanceSignatory = {
        forCompany: billingInfo.companyName || DEFAULT_OA_SIGNATORY.forCompany,
        signatoryName: billingInfo.authorizedSignatory || DEFAULT_OA_SIGNATORY.signatoryName,
        signatoryPhone: billingInfo.phone || DEFAULT_OA_SIGNATORY.signatoryPhone,
        companyAddress: billingInfo.worksAddress || DEFAULT_OA_SIGNATORY.companyAddress,
        companyPhone: billingInfo.phone || DEFAULT_OA_SIGNATORY.companyPhone,
        companyEmail: billingInfo.email || DEFAULT_OA_SIGNATORY.companyEmail,
        companyWebsite: billingInfo.website || DEFAULT_OA_SIGNATORY.companyWebsite
      };

      const taxLabel = quoteIsGstIncluded
        ? quoteGstCategory === 'INTRA_STATE'
          ? `GST - ${quoteTaxRate}% (CGST ${(quoteTaxRate / 2).toFixed(1).replace(/\.0$/, '')}% + SGST ${(quoteTaxRate / 2).toFixed(1).replace(/\.0$/, '')}%) (Inclusive)`
          : `IGST - ${quoteTaxRate}% (Inclusive)`
        : quoteGstCategory === 'INTRA_STATE'
        ? `GST - ${quoteTaxRate}% (CGST ${(quoteTaxRate / 2).toFixed(1).replace(/\.0$/, '')}% + SGST ${(quoteTaxRate / 2).toFixed(1).replace(/\.0$/, '')}%) Extra`
        : `IGST - ${quoteTaxRate}% Extra`;

      const mappedTerms = {
        priceBasis: quotePriceBasis,
        tax: taxLabel,
        delivery: `${quoteDeliveryWeeks} weeks from the date of P.O. along with advance`,
        paymentTerms: quotePaymentTerms,
        installationAndCommissioning: quoteInstallation,
        freight:
          quoteTransportationType === 'BUYER_ACTUALS'
            ? 'To buyer / At Actuals'
            : quoteTransportationType === 'INCLUDED'
            ? 'Inclusive'
            : `₹ ${quoteTransportationValue} (Prepaid & Added)`,
        packaging:
          quotePackingType === 'INCLUDED'
            ? 'Inclusive'
            : quotePackingType === 'PERCENT'
            ? `${quotePackingValue}% Extra`
            : `₹ ${quotePackingValue} Extra`,
        insurance: quoteInsurance,
        validity: `${quoteValidityDays} Days`,
        warranty: `${quoteWarrantyMonths} Months from the date of supply/commissioning`
      };

      const payload = {
        customerName: quoteCustomerName.trim(),
        companyName: quoteCompanyName.trim(),
        contactEmail: quoteContactEmail.trim(),
        contactPhone: quoteContactPhone.trim(),
        billingAddress: quoteBillingAddress.trim(),
        shippingAddress: (quoteShippingAddress || quoteBillingAddress).trim(),
        gstin: quoteGstin.trim().toUpperCase(),
        machineModel: quoteMachineModel || quoteItems[0]?.modelCode || quoteItems[0]?.itemCode || 'MHT-2100',
        items: quoteItems.map((it, idx) => ({
          slNo: idx + 1,
          itemCode: it.itemCode || `ITEM-${idx + 1}`,
          modelCode: it.modelCode || '',
          description: it.description,
          specifications: it.specifications || '',
          hsnCode: it.hsnCode || '8479',
          qtyType: it.qtyType,
          quantity: it.qtyType === 'EXTRA' ? 0 : Number(it.quantity) || 1,
          qtyLabel: it.qtyType === 'EXTRA' ? 'Extra' : it.qtyType === 'INCLUDED' ? 'Included' : String(it.quantity || 1),
          uom: it.qtyType === 'EXTRA' ? '' : it.uom || 'No.',
          unitPrice: Number(it.unitPrice) || 0,
          totalAmount: Number(it.totalAmount) || 0
        })),
        currency: quoteCurrency,
        exchangeRate: quoteCurrency === 'INR' ? 1.0 : 85.0,
        taxRatePercent: Number(quoteTaxRate),
        gstCategory: quoteGstCategory,
        isGstIncluded: quoteIsGstIncluded,
        packingType: quotePackingType,
        packingValue: quotePackingValue,
        isPackingGstApplicable: quoteIsPackingGstApplicable,
        transportationType: quoteTransportationType,
        transportationValue: quoteTransportationValue,
        isTransportationGstApplicable: quoteIsTransportationGstApplicable,
        deliveryWeeks: Number(quoteDeliveryWeeks),
        paymentTerms: quotePaymentTerms,
        validUntil: new Date(Date.now() + quoteValidityDays * 24 * 60 * 60 * 1000),
        notes: quoteNotes.trim(),
        termsAndConditions: mappedTerms,
        bankDetails: mappedBankDetails,
        signatory: mappedSignatory
      };

      if (activeQuoteModal.mode === 'CREATE') {
        const createPayload = {
          ...payload,
          leadId: activeQuoteModal.lead?._id,
          revisionNotes: 'Initial Commercial Quotation (R0)'
        };
        const res: any = await createQuotation(createPayload as any).unwrap();
        showToast(`All set! Quotation ${res.quotation?.quoteNumber} (R0) created successfully!`, 'success');
        setActiveQuoteModal(null);
        refetch();
        refetchQuotations();
      } else {
        const revisePayload = {
          ...payload,
          id: activeQuoteModal.targetQuote._id,
          revisionNotes: quoteRevisionNotes.trim()
        };
        const res: any = await createQuotationRevision(revisePayload as any).unwrap();
        showToast(`All set! Revision ${res.quotation?.quoteNumber} (${res.quotation?.revisionCode}) created!`, 'success');
        setActiveQuoteModal(null);
        refetchQuotations();
        refetch();
      }
    } catch (err: any) {
      setQuoteErrorMsg(err?.data?.message || err?.message || 'Could not save quotation.');
    }
  };

  // Open Quotation PDF Preview & Load All Revisions
  const handleOpenQuotePreview = async (q: any) => {
    setPreviewQuote(q);
    setRevisionHistoryList(q.revisions || [q]);
    try {
      const res = await triggerGetRevisions(q._id).unwrap();
      if (res?.revisions?.length) {
        setRevisionHistoryList(res.revisions);
      }
    } catch {
      // Keep local list
    }
  };

  // Isolated Iframe Print Generator for Pixel-Perfect Multi-Page Quotation PDF
  const handlePrintQuotation = (quote: any) => {
    const printableElement = document.getElementById('quote-printable-document');
    if (!printableElement) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute(
      'style',
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
    );
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      window.print();
      return;
    }

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quotation_${quote.quoteNumber || 'Quotation'}</title>
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            body {
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .quote-printable-page {
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: 1px solid #cbd5e1 !important;
              margin-bottom: 0 !important;
            }
            .quote-page-break {
              page-break-before: always;
              break-before: page;
              margin-top: 8mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          ${printableElement.outerHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 400);
  };

  return (
    <div className="space-y-4">
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-white text-xs font-semibold shadow-2xl flex items-center gap-2 ${
            toastType === 'error' ? 'bg-red-600' : toastType === 'info' ? 'bg-slate-800' : 'bg-emerald-600'
          }`}
        >
          <CheckCircle2 size={15} />
          <span>{toastMsg}</span>
        </div>
      )}
      
      {/* 1. Focused Single-Line Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Lead #, Customer, Company, Machine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-orange-500 transition-all font-medium"
          />
        </div>

        {/* Right Action Controls: Filters, View Toggle, Import & Add Lead */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-orange-500 transition-all cursor-pointer"
          >
            <option value="">All Stages</option>
            {KANBAN_STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-orange-500 transition-all cursor-pointer"
          >
            <option value="">All Sources</option>
            <option value="DIRECT_SALES">Direct Sales</option>
            <option value="INDIAMART">IndiaMART</option>
            <option value="TRADEINDIA">TradeIndia</option>
            <option value="EXHIBITION">Exhibition</option>
            <option value="WEBSITE">Website Portal</option>
          </select>

          {/* View Switcher: Table vs Kanban vs Quotations & Revisions (Button Pills) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon size={13} />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Kanban Board View (Enquiry to Dispatch)"
            >
              <Kanban size={13} />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('quotations')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'quotations'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Quotations & Revisions (R0, R1, R2...)"
            >
              <FileText size={13} />
              <span>Quotations ({quotations.length})</span>
            </button>
          </div>

          {/* Excel Import Button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:border-orange-300 bg-slate-50 hover:bg-white text-slate-700 hover:text-orange-600 text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Upload size={14} className="text-slate-500" />
            <span>Import (Excel)</span>
          </button>

          {/* Manual Entry Button */}
          <button
            type="button"
            onClick={() => setIsAddLeadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Lead</span>
          </button>
        </div>

      </div>

      {/* 3. Main Content: Table View, Kanban View, or Quotations & Revisions View */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Lead # &amp; Date</th>
                  <th className="py-3 px-4">Customer &amp; Company</th>
                  <th className="py-3 px-4">Machines / Products Requested</th>
                  <th className="py-3 px-4">Est. Value</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Actions &amp; Stage Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <Loader2 size={20} className="animate-spin mx-auto mb-2 text-orange-500" />
                      <span>Loading inquiries...</span>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No customer leads found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((ld) => {
                    const stageObj = KANBAN_STAGES.find((s) => s.id === ld.stage) || KANBAN_STAGES[0];
                    const hasMultiple = ld.products && ld.products.length > 0;
                    const noteCount = (ld.followUpNotes?.length || 0) + (ld.stageHistory?.length || 0);
                    return (
                      <tr key={ld._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <div>{ld.leadNumber}</div>
                          <div className="text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                            {new Date(ld.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{ld.companyName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{ld.customerName}</span>
                            <span>•</span>
                            <span>{ld.city || 'India'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {hasMultiple ? (
                            <div className="flex flex-wrap gap-1">
                              {ld.products.map((p, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-800 text-[10px] font-mono font-bold"
                                >
                                  <span>{p.quantity}x</span>
                                  <span>{p.modelCode}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-bold">
                              {(ld as any).machineModel || 'Precision SPM'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {formatINR((ld as any).estimatedValue?.baseAmountINR || (ld as any).estimatedValueINR || (ld as any).estimatedValue?.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {ld.source || 'DIRECT'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${stageObj.bg} ${stageObj.text} ${stageObj.border}`}>
                            {stageObj.title}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setNotesModalLead(ld)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] transition-all cursor-pointer"
                              title="Follow-Up Notes & Stage History"
                            >
                              <MessageSquarePlus size={12} className="text-orange-500" />
                              <span>Notes ({noteCount})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenStageTransition(ld)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-orange-300 text-slate-700 hover:text-orange-600 font-bold text-[11px] transition-all cursor-pointer"
                              title="Move Stage with Transition Note"
                            >
                              <ArrowRightLeft size={12} />
                              <span>Move Stage</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenSendQuote(ld)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                            >
                              <Send size={12} />
                              <span>Send Quote</span>
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
      ) : viewMode === 'kanban' ? (
        /* Kanban View (Enquiry -> Technical Review -> Quote Sent -> Negotiation -> Won -> In Production -> Dispatched) */
        <div className="flex gap-3.5 overflow-x-auto pb-3">
          {KANBAN_STAGES.map((col) => {
            const colLeads = filteredLeads.filter((l) => (l.stage || 'NEW') === col.id);
            return (
              <div key={col.id} className="min-w-[270px] w-[270px] shrink-0 bg-slate-100/70 border border-slate-200 rounded-2xl p-3 flex flex-col space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${col.color}`}></span>
                    <span className="text-xs font-bold text-slate-800">{col.title}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    {colLeads.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[620px]">
                  {colLeads.map((ld) => {
                    const latestFollowUp = ld.followUpNotes?.[0];
                    const latestTransition = ld.stageHistory?.[0];
                    return (
                      <div
                        key={ld._id}
                        className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-orange-300 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-slate-400">{ld.leadNumber}</span>
                          <span className="text-xs font-mono font-black text-slate-900">
                            {formatINR((ld as any).estimatedValue?.baseAmountINR || (ld as any).estimatedValueINR || (ld as any).estimatedValue?.amount)}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-slate-900 leading-tight">{ld.companyName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{ld.customerName}</div>
                        </div>

                        {/* Products requested pills */}
                        <div className="flex flex-wrap gap-1">
                          {ld.products && ld.products.length > 0 ? (
                            ld.products.map((p, idx) => (
                              <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200">
                                {p.quantity}x {p.modelCode}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {(ld as any).machineModel || 'SPM'}
                            </span>
                          )}
                        </div>

                        {/* Latest Stage / Follow-Up Note Preview */}
                        {(latestFollowUp || latestTransition) && (
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[10px] text-slate-600">
                            <span className="font-bold text-slate-800 block truncate">
                              {latestFollowUp ? `Note: ${latestFollowUp.note}` : `Moved: ${latestTransition?.transitionNote}`}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {latestFollowUp?.createdByName || latestTransition?.createdByName || 'Sales'}
                            </span>
                          </div>
                        )}

                        {/* Kanban Card Actions: Notes, Move Stage, Send Quote */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setNotesModalLead(ld)}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold transition-all cursor-pointer"
                          >
                            <MessageSquarePlus size={11} className="text-orange-500" />
                            <span>Notes ({(ld.followUpNotes?.length || 0) + (ld.stageHistory?.length || 0)})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenStageTransition(ld)}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:border-orange-300 text-slate-700 hover:text-orange-600 text-[10px] font-bold transition-all cursor-pointer"
                          >
                            <ArrowRightLeft size={11} />
                            <span>Move Stage</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenSendQuote(ld)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <Send size={11} />
                          <span>Send Quote</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Quotations & Immutable Revision History View (R0, R1, R2...) */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Quote # &amp; Revision</th>
                  <th className="py-3 px-4">Customer &amp; Company</th>
                  <th className="py-3 px-4">Grand Total (INR)</th>
                  <th className="py-3 px-4">Delivery &amp; Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Prepared By</th>
                  <th className="py-3 px-4 text-right">Revision &amp; PDF Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No quotations generated yet. Click &quot;Send Quote&quot; on any enquiry to generate R0.
                    </td>
                  </tr>
                ) : (
                  quotations.map((q: any) => (
                    <tr key={q._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{q.quoteNumber}</span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 font-mono text-[10px] font-extrabold">
                            {q.revisionCode || `R${q.revisionNumber ?? 0}`}
                          </span>
                          {(q.revisionCount || 1) > 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                              {q.revisionCount} Revs
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(q.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{q.companyName}</div>
                        <div className="text-[11px] text-slate-500">{q.customerName}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-orange-600">
                        ₹{Number(q.grandTotalINR || q.totalAmount?.baseAmountINR || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{q.deliveryWeeks || 8} Weeks</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{q.paymentTerms}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {q.status || 'SENT'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        <div className="font-semibold text-slate-800">{q.createdByName || 'Sales Engineer'}</div>
                        {q.revisionNotes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]" title={q.revisionNotes}>
                            {q.revisionNotes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenQuotePreview(q)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] cursor-pointer"
                          >
                            <Eye size={12} className="text-orange-500" />
                            <span>PDF &amp; History</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReviseQuote(q)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] shadow-xs cursor-pointer"
                          >
                            <Copy size={12} />
                            <span>Revise (R{(q.revisionNumber ?? 0) + 1})</span>
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

      {/* 4. Modal: Manual Entry with Multiple Product Option */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Inbox size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    New Customer Inquiry &amp; Multi-Machine Entry
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Capture lead contact information and machine requirements.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddLeadModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Customer Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={newLead.customerName}
                    onChange={(e) => setNewLead({ ...newLead, customerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-orange-500"
                    placeholder="e.g. Mr. Rajesh Sharma"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company / Organization *</label>
                  <input
                    type="text"
                    required
                    value={newLead.companyName}
                    onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-orange-500"
                    placeholder="e.g. Apex Transformers &amp; Electricals"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={newLead.contactEmail}
                    onChange={(e) => setNewLead({ ...newLead, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-orange-500"
                    placeholder="rajesh@apexelec.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={newLead.contactPhone}
                    onChange={(e) => setNewLead({ ...newLead, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-orange-500 font-mono"
                    placeholder="+91 9845012345"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City &amp; Country</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newLead.city}
                      onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      placeholder="City (e.g. Bengaluru)"
                    />
                    <input
                      type="text"
                      value={newLead.country}
                      onChange={(e) => setNewLead({ ...newLead, country: e.target.value })}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      placeholder="Country (India)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Inquiry Source &amp; Priority</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newLead.source}
                      onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                      className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="DIRECT_SALES">Direct Sales</option>
                      <option value="INDIAMART">IndiaMART</option>
                      <option value="TRADEINDIA">TradeIndia</option>
                      <option value="EXHIBITION">Exhibition</option>
                      <option value="WEBSITE">Website Portal</option>
                    </select>

                    <select
                      value={newLead.priority}
                      onChange={(e) => setNewLead({ ...newLead, priority: e.target.value })}
                      className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="LOW">Low Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="HIGH">High Priority</option>
                      <option value="CRITICAL">Critical Priority</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Multi-Product Section (Requirement: multiple product option should be there) */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu size={15} className="text-orange-500" />
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      Machines / Products Requested (Multiple Selection)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProductRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-orange-300 text-slate-700 hover:text-orange-600 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Another Machine</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newLead.products.map((prod, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      {/* Product Selector */}
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Select SPM / Machine</label>
                        <select
                          value={prod.modelCode}
                          onChange={(e) => handleProductChange(idx, 'modelCode', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                        >
                          {machinePresets.map((m) => (
                            <option key={m.modelCode} value={m.modelCode}>
                              {m.modelCode} — {m.modelName}
                            </option>
                          ))}
                          <option value="CUSTOM_SPM">Custom Engineered Automation SPM</option>
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={prod.quantity}
                          onChange={(e) => handleProductChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Unit Price (₹ INR)</label>
                        <input
                          type="number"
                          value={prod.unitPrice}
                          onChange={(e) => handleProductChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>

                      {/* Delete Row Button */}
                      <div className="sm:col-span-1 flex justify-end">
                        {newLead.products.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProductRow(idx)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Remove Product"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {/* Technical Notes / Wire Range */}
                      <div className="sm:col-span-12">
                        <input
                          type="text"
                          placeholder="Wire range / tooling customizations / customer specific requirements..."
                          value={prod.specifications}
                          onChange={(e) => handleProductChange(idx, 'specifications', e.target.value)}
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal Tally */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-50/70 border border-orange-200 text-xs">
                  <span className="font-bold text-orange-950">Estimated Inquiry Total ({newLead.products.length} Machines):</span>
                  <span className="font-mono font-extrabold text-orange-700 text-sm">{formatINR(computedLeadTotal)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingLead}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {isCreatingLead ? 'Recording Inquiry...' : 'Save Customer Inquiry'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Expansive Quotation Builder Form (R0 Initial or Revision R1, R2...) */}
      {activeQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] max-h-[92vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto">
            {/* Header Ribbon */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  {activeQuoteModal.mode === 'REVISE' ? <Copy size={18} /> : <FileText size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    {activeQuoteModal.mode === 'REVISE'
                      ? `Create Quotation Revision — ${activeQuoteModal.targetQuote?.quoteNumber || 'Quotation'}`
                      : `Generate Official Quotation (R0) — ${activeQuoteModal.lead?.leadNumber || 'Inquiry'}`}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeQuoteModal.mode === 'REVISE'
                      ? `Current: ${activeQuoteModal.targetQuote?.revisionCode || 'R0'} → New Revision: R${(activeQuoteModal.targetQuote?.revisionNumber ?? 0) + 1}`
                      : `${quoteCompanyName || 'Customer'} • Attn: ${quoteCustomerName || 'Representative'}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveQuoteModal(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveQuotation} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                
                {/* Alert Banners */}
                {quoteErrorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5">
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                    <span className="font-medium">{quoteErrorMsg}</span>
                  </div>
                )}
                {quoteSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    <span className="font-medium">{quoteSuccessMsg}</span>
                  </div>
                )}

                {/* Mandatory Revision Notes Card (For Revisions) */}
                {activeQuoteModal.mode === 'REVISE' && (
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <History size={14} className="text-amber-600" />
                        <span>Revision Notes / Commercial Changes *</span>
                      </label>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white text-amber-700 border border-amber-300">
                        Targeting R{(activeQuoteModal.targetQuote?.revisionNumber ?? 0) + 1}
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={quoteRevisionNotes}
                      onChange={(e) => setQuoteRevisionNotes(e.target.value)}
                      placeholder="e.g. Applied 5% bulk discount on winding heads, added safety guard tooling, revised delivery timeline to 6 weeks as requested by client."
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                )}

                {/* Section 1: Customer Profile & Addresses */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Building2 size={14} className="text-orange-500" />
                      <span>Customer Profile &amp; Billing / Shipping Details</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuoteShippingAddress(quoteBillingAddress)}
                      className="text-[11px] font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
                    >
                      Copy Billing to Shipping Address
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer / Contact Name *</label>
                      <input
                        type="text"
                        required
                        value={quoteCustomerName}
                        onChange={(e) => setQuoteCustomerName(e.target.value)}
                        placeholder="e.g. Mr. Rajesh Sharma"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Company / Organization *</label>
                      <input
                        type="text"
                        required
                        value={quoteCompanyName}
                        onChange={(e) => setQuoteCompanyName(e.target.value)}
                        placeholder="e.g. Apex Transformers & Electricals"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={quoteContactEmail}
                        onChange={(e) => setQuoteContactEmail(e.target.value)}
                        placeholder="client@company.com"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={quoteContactPhone}
                        onChange={(e) => setQuoteContactPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">GSTIN Number</label>
                      <input
                        type="text"
                        value={quoteGstin}
                        onChange={(e) => setQuoteGstin(e.target.value.toUpperCase())}
                        placeholder="29AAAAA0000A1Z5"
                        maxLength={15}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-800 focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Machine Model Code</label>
                      <input
                        type="text"
                        value={quoteMachineModel}
                        onChange={(e) => setQuoteMachineModel(e.target.value)}
                        placeholder="e.g. MHT-2100"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Billing Address</label>
                      <input
                        type="text"
                        value={quoteBillingAddress}
                        onChange={(e) => setQuoteBillingAddress(e.target.value)}
                        placeholder="Plot / Street / City / State"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Shipping / Works Address</label>
                      <input
                        type="text"
                        value={quoteShippingAddress}
                        onChange={(e) => setQuoteShippingAddress(e.target.value)}
                        placeholder="Factory / Delivery site"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Machine Line Items & Pricing */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 block">
                        Line Items &amp; Technical Scope ({quoteItems.length})
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Line item description is calibrated to ~30% width so pricing, HSN, and quantity fit cleanly.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddLineItem('NUMERIC')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Plus size={13} className="text-orange-500" />
                        <span>Add Machine Item</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddLineItem('EXTRA')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add Optional Extra / Attachment</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                    <table className="w-full text-left text-xs bg-white">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3 w-44">Preset / Model</th>
                          <th className="py-2.5 px-3 w-[280px] min-w-[260px]">Description &amp; Specifications</th>
                          <th className="py-2.5 px-3 w-24">HSN</th>
                          <th className="py-2.5 px-3 w-36">Qty Type</th>
                          <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                          <th className="py-2.5 px-3 w-20">UOM</th>
                          <th className="py-2.5 px-3 w-32 text-right">Unit Price (₹)</th>
                          <th className="py-2.5 px-3 w-36 text-right">Line Total (₹)</th>
                          <th className="py-2.5 px-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {quoteItems.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={item.modelCode || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const preset = machinePresets.find((m: any) => m.modelCode === val);
                                  if (preset) {
                                    handleLineItemChange(item.id, 'modelCode', preset.modelCode);
                                    handleLineItemChange(item.id, 'itemCode', preset.modelCode);
                                    handleLineItemChange(item.id, 'description', `${preset.modelName} — ${preset.modelCode}`);
                                    handleLineItemChange(item.id, 'unitPrice', preset.basePriceINR || 250000);
                                  } else {
                                    handleLineItemChange(item.id, 'modelCode', val);
                                  }
                                }}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                              >
                                <option value="">Custom Item</option>
                                {machinePresets.map((m: any) => (
                                  <option key={m.modelCode} value={m.modelCode}>
                                    {m.modelCode}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <textarea
                                rows={2}
                                required
                                value={item.description}
                                onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                                placeholder="Machine description and specifications..."
                                className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.hsnCode || '8479'}
                                onChange={(e) => handleLineItemChange(item.id, 'hsnCode', e.target.value)}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={item.qtyType || 'NUMERIC'}
                                onChange={(e) => handleLineItemChange(item.id, 'qtyType', e.target.value)}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                              >
                                <option value="NUMERIC">Standard (Numbered)</option>
                                <option value="INCLUDED">Included in Base</option>
                                <option value="EXTRA">Optional Extra (Tooling)</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min={item.qtyType === 'EXTRA' ? 0 : 1}
                                disabled={item.qtyType === 'EXTRA'}
                                value={item.qtyType === 'EXTRA' ? 0 : item.quantity}
                                onChange={(e) => handleLineItemChange(item.id, 'quantity', Number(e.target.value))}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-center disabled:opacity-40"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                disabled={item.qtyType === 'EXTRA'}
                                value={item.qtyType === 'EXTRA' ? '' : (item.uom || 'No.')}
                                onChange={(e) => handleLineItemChange(item.id, 'uom', e.target.value)}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-center disabled:opacity-40"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => handleLineItemChange(item.id, 'unitPrice', Number(e.target.value))}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-right text-slate-900"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-extrabold text-orange-600">
                              {item.qtyType === 'EXTRA' ? (
                                <span className="text-[11px] text-amber-700 font-semibold">Optional</span>
                              ) : (
                                `₹${(Number(item.quantity || 1) * Number(item.unitPrice || 0)).toLocaleString('en-IN')}`
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(item.id)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
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
                </div>

                {/* Section 3: Commercial Pricing & Taxation Setup (Simple, Clear, Human-Understandable) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <CreditCard size={14} className="text-orange-500" />
                      <span>Commercial Pricing &amp; Taxation Setup</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Standardized packaging, freight options, and GST calculation.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card A: Packaging & Forwarding */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Packaging &amp; Forwarding</span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {quotePackingType}
                        </span>
                      </div>
                      <select
                        value={quotePackingType}
                        onChange={(e) => setQuotePackingType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                      >
                        <option value="INCLUDED">Inclusive in Machine Price</option>
                        <option value="PERCENT">Percentage (%) of Machine Base</option>
                        <option value="FIXED">Fixed Lump-Sum Amount (₹)</option>
                      </select>

                      {quotePackingType !== 'INCLUDED' && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            {quotePackingType === 'PERCENT' ? 'Packaging Rate (%)' : 'Packaging Charge (₹)'}
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={quotePackingValue}
                            onChange={(e) => setQuotePackingValue(Number(e.target.value))}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                        <span className="text-[11px] text-slate-600">GST on Packing:</span>
                        <button
                          type="button"
                          onClick={() => setQuoteIsPackingGstApplicable(!quoteIsPackingGstApplicable)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            quoteIsPackingGstApplicable
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {quoteIsPackingGstApplicable ? 'GST Applicable' : 'No Tax'}
                        </button>
                      </div>
                    </div>

                    {/* Card B: Transportation / Freight */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Transportation / Freight</span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {quoteTransportationType}
                        </span>
                      </div>
                      <select
                        value={quoteTransportationType}
                        onChange={(e) => setQuoteTransportationType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                      >
                        <option value="BUYER_ACTUALS">To Buyer's Account (Pay at Delivery / Actuals)</option>
                        <option value="INCLUDED">Inclusive (Free Delivery by MH)</option>
                        <option value="FIXED">Fixed Freight Added on Invoice (₹)</option>
                      </select>

                      {quoteTransportationType === 'FIXED' && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Freight Charge (₹)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={quoteTransportationValue}
                            onChange={(e) => setQuoteTransportationValue(Number(e.target.value))}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                        <span className="text-[11px] text-slate-600">GST on Freight:</span>
                        <button
                          type="button"
                          onClick={() => setQuoteIsTransportationGstApplicable(!quoteIsTransportationGstApplicable)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            quoteIsTransportationGstApplicable
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {quoteIsTransportationGstApplicable ? 'GST Applicable' : 'No Tax'}
                        </button>
                      </div>
                    </div>

                    {/* Card C: Goods & Services Tax (GST) */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">GST Jurisdiction &amp; Rate</span>
                        <span className="text-[10px] font-mono font-bold text-orange-600">
                          {quoteGstCategory === 'INTRA_STATE' ? 'CGST+SGST' : 'IGST'} ({quoteTaxRate}%)
                        </span>
                      </div>

                      {/* Intra vs Inter-State Segmented Buttons */}
                      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setQuoteGstCategory('INTRA_STATE')}
                          className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            quoteGstCategory === 'INTRA_STATE'
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Intra-State (CGST+SGST)
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuoteGstCategory('INTER_STATE')}
                          className={`py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            quoteGstCategory === 'INTER_STATE'
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Inter-State (IGST)
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">GST Rate (%)</label>
                          <select
                            value={quoteTaxRate}
                            onChange={(e) => setQuoteTaxRate(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                          >
                            <option value={18}>18% (Standard)</option>
                            <option value={12}>12% (Concession)</option>
                            <option value={5}>5%</option>
                            <option value={0}>0% (Export/SEZ)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">GST Mode</label>
                          <button
                            type="button"
                            onClick={() => setQuoteIsGstIncluded(!quoteIsGstIncluded)}
                            className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              quoteIsGstIncluded
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {quoteIsGstIncluded ? 'GST Included' : 'GST Extra'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary Breakdown Slip */}
                  <div className="flex justify-end pt-2">
                    <div className="w-full sm:w-96 p-4 rounded-xl bg-orange-50/70 border border-orange-200 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Items Subtotal:</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{quoteComputedTotals.itemsSubtotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {quoteComputedTotals.packingAmount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Packaging &amp; Forwarding:</span>
                          <span className="font-mono font-bold text-slate-900">
                            ₹{quoteComputedTotals.packingAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                      {quoteComputedTotals.transportationAmount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Transportation / Freight:</span>
                          <span className="font-mono font-bold text-slate-900">
                            ₹{quoteComputedTotals.transportationAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600 pt-1 border-t border-orange-200/60">
                        <span>Taxable Amount:</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{quoteComputedTotals.taxableAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {quoteGstCategory === 'INTRA_STATE' ? (
                        <>
                          <div className="flex justify-between text-slate-600">
                            <span>CGST ({(quoteTaxRate / 2).toFixed(1)}%):</span>
                            <span className="font-mono font-bold text-slate-900">
                              ₹{quoteComputedTotals.cgstAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>SGST ({(quoteTaxRate / 2).toFixed(1)}%):</span>
                            <span className="font-mono font-bold text-slate-900">
                              ₹{quoteComputedTotals.sgstAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-slate-600">
                          <span>IGST ({quoteTaxRate}%):</span>
                          <span className="font-mono font-bold text-slate-900">
                            ₹{quoteComputedTotals.igstAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t-2 border-orange-300 text-sm font-extrabold text-orange-950">
                        <span>Grand Total:</span>
                        <span className="font-mono text-base font-black text-orange-700">
                          ₹{quoteComputedTotals.grandTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-[10px] text-orange-800/80 font-medium italic pt-0.5">
                        {amountToWordsINR(quoteComputedTotals.grandTotal)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Terms & Conditions */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-orange-500" />
                    <span>Commercial Terms &amp; Conditions</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Delivery Lead Time (Weeks)</label>
                      <input
                        type="number"
                        min={1}
                        value={quoteDeliveryWeeks}
                        onChange={(e) => setQuoteDeliveryWeeks(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Price Basis</label>
                      <input
                        type="text"
                        value={quotePriceBasis}
                        onChange={(e) => setQuotePriceBasis(e.target.value)}
                        placeholder="Ex-Works, Bangalore"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Validity (Days)</label>
                      <input
                        type="number"
                        min={1}
                        value={quoteValidityDays}
                        onChange={(e) => setQuoteValidityDays(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Warranty (Months)</label>
                      <input
                        type="number"
                        min={0}
                        value={quoteWarrantyMonths}
                        onChange={(e) => setQuoteWarrantyMonths(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Milestones</label>
                      <input
                        type="text"
                        value={quotePaymentTerms}
                        onChange={(e) => setQuotePaymentTerms(e.target.value)}
                        placeholder="30% Advance with PO, 60% against Proforma, 10% after commissioning"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Installation &amp; Commissioning</label>
                      <input
                        type="text"
                        value={quoteInstallation}
                        onChange={(e) => setQuoteInstallation(e.target.value)}
                        placeholder="Inclusive"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Transit Insurance</label>
                      <input
                        type="text"
                        value={quoteInsurance}
                        onChange={(e) => setQuoteInsurance(e.target.value)}
                        placeholder="To buyer"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2 lg:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Special Notes / Technical Clarifications</label>
                      <textarea
                        rows={2}
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        placeholder="Any additional machine technical specifications, motor brands, PLC inclusions, or customized tooling scopes..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Sticky Footer */}
              <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Grand Total:</span>
                  <span className="text-xl font-mono font-black text-orange-600">
                    ₹{quoteComputedTotals.grandTotal.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                    ({quoteItems.length} {quoteItems.length === 1 ? 'Item' : 'Items'})
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveQuoteModal(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingQuote || isCreatingRevision}
                    className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {activeQuoteModal.mode === 'REVISE' ? (
                      <>
                        <Copy size={14} />
                        <span>
                          {isCreatingRevision
                            ? 'Saving Revision...'
                            : `Save Revision R${(activeQuoteModal.targetQuote?.revisionNumber ?? 0) + 1}`}
                        </span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>{isCreatingQuote ? 'Generating Quotation...' : 'Confirm & Generate Quotation (R0)'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Stage Transition Note (Mandatory Note on Stage Move) */}
      {stageTransitionLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <ArrowRightLeft size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    Move Enquiry Stage — {stageTransitionLead.leadNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {stageTransitionLead.companyName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStageTransitionLead(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmStageTransition} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Pipeline Stage *</label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-orange-500"
                >
                  {KANBAN_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              {targetStage === 'LOST' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for Loss</label>
                  <input
                    type="text"
                    value={lossReason}
                    onChange={(e) => setLossReason(e.target.value)}
                    placeholder="e.g. Price variation / Lead time constraint"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Stage Transition / Handover Note *
                </label>
                <textarea
                  rows={3}
                  required
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                  placeholder="Enter summary of discussion, technical clearance, or handover remarks..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStageTransitionLead(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStage}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingStage ? 'Moving Stage...' : 'Save Note & Move Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Follow-Up Notes, Stage History & Audit Dossier */}
      {notesModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <MessageSquarePlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    Enquiry Notes &amp; Stage History — {notesModalLead.leadNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {notesModalLead.companyName} • Current Stage: {notesModalLead.stage}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotesModalLead(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Add In-Stage Follow-Up Note Form */}
              <form onSubmit={handleAddFollowUpNoteSubmit} className="p-4 rounded-xl bg-orange-50/50 border border-orange-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-orange-800">
                    Add In-Stage Follow-Up Note
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white text-orange-700 border border-orange-200">
                    Stage: {notesModalLead.stage}
                  </span>
                </div>
                <textarea
                  rows={2}
                  required
                  value={newFollowUpNote}
                  onChange={(e) => setNewFollowUpNote(e.target.value)}
                  placeholder="Log customer call summary, technical query, or follow-up update..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-orange-500"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-600">Next Follow-Up Date:</label>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAddingNote || !newFollowUpNote.trim()}
                    className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isAddingNote ? 'Saving Note...' : 'Add Follow-Up Note'}
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Follow-Up Notes List */}
                <div className="space-y-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                    Follow-Up Notes ({notesModalLead.followUpNotes?.length || 0})
                  </span>
                  {(!notesModalLead.followUpNotes || notesModalLead.followUpNotes.length === 0) ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400">
                      No follow-up notes recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {notesModalLead.followUpNotes.map((n: any, idx: number) => (
                        <div key={n.id || idx} className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-orange-600 font-mono">{n.stageAtNote}</span>
                            <span className="text-slate-400 font-mono">
                              {new Date(n.createdAt).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 font-medium">{n.note}</p>
                          <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                            <span>By: <strong>{n.createdByName || 'Sales'}</strong></span>
                            {n.nextFollowUpDate && (
                              <span className="text-amber-700 font-semibold">
                                Next: {new Date(n.nextFollowUpDate).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stage Transition History List */}
                <div className="space-y-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                    Stage Transition Log ({notesModalLead.stageHistory?.length || 0})
                  </span>
                  {(!notesModalLead.stageHistory || notesModalLead.stageHistory.length === 0) ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400">
                      No stage transitions recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {notesModalLead.stageHistory.map((h: any, idx: number) => (
                        <div key={h.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono font-bold text-slate-800">
                              {h.fromStage ? `${h.fromStage} → ${h.toStage}` : `Created in ${h.toStage}`}
                            </span>
                            <span className="text-slate-400 font-mono">
                              {new Date(h.createdAt || h.changedAt).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700">{h.transitionNote}</p>
                          <div className="text-[10px] text-slate-500">
                            By: <strong>{h.createdByName || h.changedByName || 'Sales'}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Universal Action Tracking Audit Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Created By</span>
                  <span className="text-xs font-bold text-slate-900">{notesModalLead.createdByName || 'System Admin'}</span>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    {new Date(notesModalLead.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Last Updated By</span>
                  <span className="text-xs font-bold text-slate-900">{notesModalLead.updatedByName || notesModalLead.createdByName || 'System Admin'}</span>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    {new Date(notesModalLead.updatedAt).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal: Branded Quotation Dossier & Independent PDF Generator */}
      {previewQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] max-h-[94vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto">
            {/* Header Ribbon */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    Quotation {previewQuote.quoteNumber} ({previewQuote.revisionCode || 'R0'})
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {previewQuote.companyName} • Immutable Revision Dossier &amp; Independent A4 Printable Sheet
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenReviseQuote(previewQuote)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Copy size={13} />
                  <span>Revise (R{(previewQuote.revisionNumber ?? 0) + 1})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintQuotation(previewQuote)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  <Printer size={13} />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewQuote(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-slate-100/70">
              
              {/* Revision Switcher Bar */}
              {revisionHistoryList.length > 0 && (
                <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 mr-1">
                      <History size={14} className="text-orange-500" />
                      <span>Revision History ({revisionHistoryList.length}):</span>
                    </span>
                    {revisionHistoryList.map((rev: any) => {
                      const active = rev._id === previewQuote._id || rev.quoteNumber === previewQuote.quoteNumber;
                      const revCode = rev.revisionCode || `R${rev.revisionNumber ?? 0}`;
                      const totalVal = Number(rev.grandTotalINR || rev.totalAmount?.baseAmountINR || 0);
                      return (
                        <button
                          key={rev._id || rev.quoteNumber}
                          type="button"
                          onClick={() => setPreviewQuote(rev)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                            active
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{revCode}</span>
                          <span className={active ? 'text-orange-100' : 'text-slate-500'}>
                            — ₹{totalVal.toLocaleString('en-IN')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {previewQuote.revisionNotes && (
                    <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl max-w-md truncate">
                      <strong>Notes:</strong> {previewQuote.revisionNotes}
                    </div>
                  )}
                </div>
              )}

              {/* Two-Page Calibrated A4 Printable Document Container */}
              <div id="quote-printable-document" className="space-y-6 max-w-5xl mx-auto">
                
                {/* PAGE 1: Commercial Quotation & Financial Slip */}
                <div className="quote-printable-page bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  
                  {/* Letterhead */}
                  <div className="flex items-start justify-between pb-5 border-b-2 border-slate-900 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center p-2 shrink-0">
                        <img
                          src={previewQuote.companySnapshot?.logoIconUrl || companyBilling?.logoIconUrl || '/branding/mh_icon.png'}
                          alt="MH Logo"
                          className="object-contain w-full h-full"
                        />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                          {previewQuote.companySnapshot?.companyName || companyBilling?.companyName || 'Machine House - Winding Technologies'}
                        </h2>
                        <div className="text-xs font-bold text-orange-600 uppercase tracking-widest">
                          {previewQuote.companySnapshot?.tagline || companyBilling?.tagline || 'House of Innovations.....'}
                        </div>
                        <p className="text-[11px] text-slate-500 max-w-lg mt-1 leading-snug">
                          {previewQuote.companySnapshot?.worksAddress || companyBilling?.worksAddress || 'Basavanapura, Gottigere Post, Bangalore – 560083'}
                        </p>
                        <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                          GSTIN: {previewQuote.companySnapshot?.gstin || companyBilling?.gstin || '29AENPR8339C1ZZ'} • Email: marketing@machinehousetechnologies.com
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-block px-3 py-1 rounded-lg bg-orange-500 text-white font-extrabold text-xs uppercase tracking-wider mb-1.5">
                        Commercial Quotation
                      </div>
                      <div className="font-mono text-xs space-y-0.5">
                        <div className="font-extrabold text-slate-900 text-sm">{previewQuote.quoteNumber}</div>
                        <div className="text-orange-600 font-bold">Revision: {previewQuote.revisionCode || 'R0'}</div>
                        <div className="text-slate-500">Date: {formatDateDDMMYYYY(previewQuote.createdAt)}</div>
                        <div className="text-slate-500">Valid Until: {formatDateDDMMYYYY(previewQuote.validUntil || Date.now() + 30 * 86400000)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Client & Reference Metadata Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Quotation To</span>
                      <div className="font-extrabold text-slate-900 text-sm">{previewQuote.companyName}</div>
                      <div className="text-slate-700 font-medium">Attn: {previewQuote.customerName}</div>
                      {previewQuote.contactPhone && <div className="text-slate-600 font-mono">Phone: {previewQuote.contactPhone}</div>}
                      {previewQuote.contactEmail && <div className="text-slate-600 font-mono">Email: {previewQuote.contactEmail}</div>}
                      {previewQuote.gstin && <div className="text-slate-600 font-mono font-semibold">GSTIN: {previewQuote.gstin}</div>}
                      {previewQuote.billingAddress && (
                        <div className="text-slate-500 text-[11px] pt-1">
                          <strong>Billing:</strong> {previewQuote.billingAddress}
                        </div>
                      )}
                      {previewQuote.shippingAddress && previewQuote.shippingAddress !== previewQuote.billingAddress && (
                        <div className="text-slate-500 text-[11px]">
                          <strong>Shipping:</strong> {previewQuote.shippingAddress}
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Order &amp; Delivery Baseline</span>
                      <div className="text-slate-800">
                        <strong>Delivery Timeline:</strong> {previewQuote.deliveryWeeks || 8} Weeks from advance
                      </div>
                      <div className="text-slate-800">
                        <strong>Price Basis:</strong> {previewQuote.termsAndConditions?.priceBasis || 'Ex-Works, Bangalore'}
                      </div>
                      <div className="text-slate-800">
                        <strong>Payment Terms:</strong> {previewQuote.paymentTerms || previewQuote.termsAndConditions?.paymentTerms || DEFAULT_QUOTE_TERMS.paymentTerms}
                      </div>
                      <div className="text-slate-800">
                        <strong>Tax Treatment:</strong> {previewQuote.termsAndConditions?.tax || `${previewQuote.taxRatePercent || 18}% GST`}
                      </div>
                      <div className="text-slate-800">
                        <strong>Prepared By:</strong> {previewQuote.createdByName || 'Sales Engineering'}
                      </div>
                      {previewQuote.revisionNotes && (
                        <div className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-1.5 text-[11px] font-semibold mt-1">
                          Revision Notes: {previewQuote.revisionNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3">Item / Machine Description</th>
                          <th className="py-2.5 px-3 w-20 font-mono text-center">HSN</th>
                          <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                          <th className="py-2.5 px-3 w-28 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 w-32 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(previewQuote.items || []).map((it: any, idx: number) => {
                          const uPrice = Number(it.unitPrice?.amount ?? it.unitPrice ?? 0);
                          const isExtra = it.qtyType === 'EXTRA';
                          const isIncluded = it.qtyType === 'INCLUDED';
                          const lTotal = isExtra
                            ? 0
                            : Number(it.lineTotal?.amount ?? it.totalPrice ?? it.totalAmount ?? uPrice * Number(it.quantity || 1));
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{it.itemCode || it.modelCode}</div>
                                <div className="text-[11px] text-slate-600 whitespace-pre-line">{it.description || it.modelName}</div>
                                {it.specifications && (
                                  <div className="text-[10px] text-slate-500 italic mt-0.5">{it.specifications}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-slate-600">{it.hsnCode || '8479'}</td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                {isExtra ? (
                                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Optional</span>
                                ) : isIncluded ? (
                                  <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Included</span>
                                ) : (
                                  `${it.quantity} ${it.uom || 'No.'}`
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                                ₹{uPrice.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                                {isExtra ? '—' : `₹${lTotal.toLocaleString('en-IN')}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Summary Slip */}
                  <div className="flex justify-end pt-1">
                    <div className="w-80 space-y-1.5 text-xs p-4 rounded-xl bg-orange-50/70 border border-orange-200">
                      <div className="flex justify-between text-slate-600">
                        <span>Items Subtotal:</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{Number(previewQuote.subtotalINR || previewQuote.subtotalAmount?.baseAmountINR || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {Number(previewQuote.packingAmount || 0) > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Packaging &amp; Forwarding:</span>
                          <span className="font-mono font-bold text-slate-900">
                            ₹{Number(previewQuote.packingAmount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                      {Number(previewQuote.transportationAmount || 0) > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Transportation / Freight:</span>
                          <span className="font-mono font-bold text-slate-900">
                            ₹{Number(previewQuote.transportationAmount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600 pt-1 border-t border-orange-200/60">
                        <span>Taxable Base Value:</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{Number(previewQuote.taxableAmount || previewQuote.subtotalINR || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>GST Tax ({previewQuote.taxRatePercent || 18}%):</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{Number(previewQuote.taxAmountINR || previewQuote.taxAmount?.baseAmountINR || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-orange-200 text-sm font-extrabold text-orange-950">
                        <span>Grand Total (INR):</span>
                        <span className="font-mono text-base font-black text-orange-700">
                          ₹{Number(previewQuote.grandTotalINR || previewQuote.totalAmount?.baseAmountINR || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-[10px] text-orange-800/80 font-medium italic pt-1">
                        {amountToWordsINR(Number(previewQuote.grandTotalINR || previewQuote.totalAmount?.baseAmountINR || 0))}
                      </div>
                    </div>
                  </div>

                  {/* Page 1 Footer Ribbon */}
                  <div className="pt-4 border-t-2 border-orange-400 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Machine House - Winding Technologies • Quotation Ref: {previewQuote.quoteNumber}</span>
                    <span className="font-bold text-slate-700">Page 1 of 2</span>
                  </div>

                </div>

                {/* PAGE 2: Terms & Conditions, Bank Details & Authorized Signatory */}
                <div className="quote-printable-page quote-page-break bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  
                  {/* Page 2 Header */}
                  <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
                    <div>
                      <h3 className="text-base font-black text-slate-900 uppercase">
                        Terms &amp; Conditions of Commercial Sale
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Machine House - Winding Technologies • Ref: {previewQuote.quoteNumber} ({previewQuote.revisionCode || 'R0'})
                      </p>
                    </div>
                    <div className="text-right font-mono text-xs text-slate-500">
                      Date: {formatDateDDMMYYYY(previewQuote.createdAt)}
                    </div>
                  </div>

                  {/* Technical Notes (If provided) */}
                  {previewQuote.notes && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        Technical Notes &amp; Scope Details
                      </span>
                      <p className="text-slate-800 whitespace-pre-line">{previewQuote.notes}</p>
                    </div>
                  )}

                  {/* Terms & Conditions Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3 w-44">Clause / Term</th>
                          <th className="py-2 px-3">Standard Terms &amp; Conditions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        <tr>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">1</td>
                          <td className="py-2 px-3 font-bold text-slate-800">Price Basis</td>
                          <td className="py-2 px-3 text-slate-700">{previewQuote.termsAndConditions?.priceBasis || 'Ex-Works, Bangalore'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">2</td>
                          <td className="py-2 px-3 font-bold text-slate-800">Taxes &amp; Duties</td>
                          <td className="py-2 px-3 text-slate-700">{previewQuote.termsAndConditions?.tax || `${previewQuote.taxRatePercent || 18}% GST Extra`}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">3</td>
                          <td className="py-2 px-3 font-bold text-slate-800">Delivery Period</td>
                          <td className="py-2 px-3 text-slate-700">{previewQuote.termsAndConditions?.delivery || `${previewQuote.deliveryWeeks || 8} weeks from date of PO along with advance`}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">4</td>
                          <td className="py-2 px-3 font-bold text-slate-800">Payment Terms</td>
                          <td className="py-2 px-3 text-slate-700">{previewQuote.termsAndConditions?.paymentTerms || previewQuote.paymentTerms || DEFAULT_QUOTE_TERMS.paymentTerms}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">5</td>
                          <td className="py-2 px-3 font-bold text-slate-800">Installation &amp; Commissioning</td>
                          <td className="py-2 px-3 text-slate-700">{previewQuote.termsAndConditions?.installationAndCommissioning || 'Inclusive — Machine House service engineer will be deputed at site.'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">6</td>
                          <td className="py-2 px-3 font-bold text-slate-800">Freight &amp; Forwarding</td>
                          <td className="py-2 px-3 text-slate-700">{previewQuote.termsAndConditions?.freight || 'To buyer / At actuals'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">7</td>
                          <td className="py-2 px-3 font-bold text-slate-800">Packaging &amp; Crating</td>
                          <td className="py-2 px-3 text-slate-700">{previewQuote.termsAndConditions?.packaging || 'Inclusive'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">8</td>
                          <td className="py-2 px-3 font-bold text-slate-800">Transit Insurance</td>
                          <td className="py-2 px-3 text-slate-700">{previewQuote.termsAndConditions?.insurance || 'To buyer'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">9</td>
                          <td className="py-2 px-3 font-bold text-slate-800">Validity</td>
                          <td className="py-2 px-3 text-slate-700">{previewQuote.termsAndConditions?.validity || '30 Days from date of offer'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">10</td>
                          <td className="py-2 px-3 font-bold text-slate-800">Warranty</td>
                          <td className="py-2 px-3 text-slate-700">{previewQuote.termsAndConditions?.warranty || `${previewQuote.warrantyMonths || 12} Months from date of supply/commissioning`}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Bank Details & Authorized Signatory Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Bank Details Table */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 block flex items-center gap-1.5">
                        <CreditCard size={13} className="text-orange-500" />
                        <span>Machine House Bank Details</span>
                      </span>
                      <table className="w-full text-[11px]">
                        <tbody className="divide-y divide-slate-200/60">
                          <tr>
                            <td className="py-1 text-slate-500">Account Name:</td>
                            <td className="py-1 font-bold text-slate-900">{previewQuote.bankDetails?.accountName || companyBilling?.companyName || DEFAULT_OA_BANK.accountName}</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-slate-500">Bank Name:</td>
                            <td className="py-1 font-bold text-slate-900">{previewQuote.bankDetails?.bankName || companyBilling?.bankName || DEFAULT_OA_BANK.bankName}</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-slate-500">Branch:</td>
                            <td className="py-1 text-slate-800">{previewQuote.bankDetails?.branch || companyBilling?.bankBranch || DEFAULT_OA_BANK.branch}</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-slate-500">Account No:</td>
                            <td className="py-1 font-mono font-bold text-slate-900">{previewQuote.bankDetails?.accountNo || companyBilling?.accountNumber || DEFAULT_OA_BANK.accountNo}</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-slate-500">IFSC Code:</td>
                            <td className="py-1 font-mono font-bold text-orange-600">{previewQuote.bankDetails?.ifscCode || companyBilling?.ifscCode || DEFAULT_OA_BANK.ifscCode}</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-slate-500">GSTIN:</td>
                            <td className="py-1 font-mono text-slate-800">{previewQuote.bankDetails?.gstNo || companyBilling?.gstin || DEFAULT_OA_BANK.gstNo}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Authorized Signatory Block */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 block">
                          For {previewQuote.signatory?.forCompany || companyBilling?.companyName || 'Machine House - Winding Technologies'}
                        </span>
                        <div className="h-16 mt-2 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[11px] text-slate-400 bg-white">
                          [Authorized Stamp &amp; Signature]
                        </div>
                      </div>
                      <div className="pt-2 text-[11px] text-slate-700">
                        <div className="font-extrabold text-slate-900">
                          {previewQuote.signatory?.signatoryName || companyBilling?.authorizedSignatory || 'Roshan M P'}
                        </div>
                        <div className="text-slate-500">Authorized Signatory</div>
                        <div className="font-mono text-slate-500">{previewQuote.signatory?.signatoryPhone || '+91 98454 44962'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Page 2 Footer Ribbon */}
                  <div className="pt-4 border-t-2 border-orange-400 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Machine House - Winding Technologies • House of Innovations.....</span>
                    <span className="font-bold text-slate-700">Page 2 of 2</span>
                  </div>

                </div>

              </div>

              {/* Universal Action Tracking Audit Cards */}
              <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Created By</span>
                  <span className="text-xs font-bold text-slate-900">{previewQuote.createdByName || 'Sales Engineer'}</span>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    {new Date(previewQuote.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Last Updated By</span>
                  <span className="text-xs font-bold text-slate-900">{previewQuote.updatedByName || previewQuote.createdByName || 'Sales Engineer'}</span>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    {new Date(previewQuote.updatedAt).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 10. Modal: Excel Bulk Import */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          refetch();
        }}
      />

    </div>
  );
}
