'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  IndianRupee,
  Search,
  Plus,
  Upload,
  Building2,
  CheckCircle2,
  AlertOctagon,
  FileText,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  ArrowRight,
  FolderGit2,
  Sparkles,
  Trash2,
  Eye,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Download,
  PackageCheck,
  Edit,
  Send,
  Printer,
  CheckCheck,
  Clock,
  UserCheck,
  ShieldCheck,
  CreditCard,
  Mail,
  ChevronDown,
  RotateCcw,
  ExternalLink,
  Filter,
  Lock
} from 'lucide-react';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';
import {
  useGetCustomerPosQuery,
  useCreateCustomerPoMutation,
  useUpdateCustomerPoMutation,
  useUpdateOrderAcceptanceStatusMutation,
  useGenerateOrderAcceptanceMutation,
  useDeleteCustomerPoMutation,
  useConvertCustomerPoToProjectMutation,
  useLazyGetS3PresignedUploadQuery,
  useUploadDirectToS3Mutation,
  useGetCustomersQuery,
  useGetCrmMastersQuery
} from '../api/crmApi';
import {
  Customer,
  MachineCatalogProduct,
  CustomerPo,
  OrderAcceptanceTerms,
  OrderAcceptanceBankDetails,
  OrderAcceptanceSignatory,
  PoItemQtyType,
  CompanyBillingInfo,
  CustomerPoStatus,
  CUSTOMER_PO_LIFECYCLE_STAGES
} from '../types';
import ConfirmModal from '../../../components/ui/ConfirmModal';

const formatINR = (amt: any) => {
  const num = Number(amt || 0);
  if (num === 0) return '₹ -';
  return `₹ ${num.toLocaleString('en-IN')}`;
};

const formatDateDDMMYYYY = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

export const DEFAULT_OA_TERMS: OrderAcceptanceTerms = {
  priceBasis: 'Ex-Works Bangalore',
  tax: 'GST - 18% Extra',
  delivery: '8 weeks from the date of P.O. Along with advance.',
  paymentTerms: '50% Advance along with purchase order\n50% Before dispatch',
  installationAndCommissioning: 'Inclusive',
  freight: 'To buyer',
  packaging: 'Inclusive',
  insurance: 'To buyer',
  validity: '30 Days',
  warranty: '12 Months from the date of installation',
  modeOfPayment: 'Online'
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

interface PoItemFormState {
  id: string;
  slNo: number;
  itemCode?: string;
  modelCode: string;
  description: string;
  specifications: string;
  hsnCode: string;
  qtyType: PoItemQtyType;
  quantity: number;
  qtyLabel: string;
  uom: string;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

export default function CustomerPoTab() {
  const [searchTerm, setSearchTerm] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPoId, setEditingPoId] = useState<string | null>(null);
  const [convertTargetPo, setConvertTargetPo] = useState<CustomerPo | null>(null);
  const [poToDelete, setPoToDelete] = useState<CustomerPo | null>(null);

  // Clickable PO Preview Dossier Modal State
  const [previewingCustomerPo, setPreviewingCustomerPo] = useState<CustomerPo | null>(null);

  // Excel-Style Multi-Column Filter State
  const [excelFilters, setExcelFilters] = useState<{
    poNumber: string[] | null;
    orderAcceptanceNumber: string[] | null;
    companyName: string[] | null;
    items: string[] | null;
    totalAmount: string[] | null;
    status: string[] | null;
  }>({
    poNumber: null,
    orderAcceptanceNumber: null,
    companyName: null,
    items: null,
    totalAmount: null,
    status: null
  });

  // Sorting
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Order Acceptance Preview & Send Modal State
  const [selectedPoForOa, setSelectedPoForOa] = useState<CustomerPo | null>(null);
  const [sendOaEmailInput, setSendOaEmailInput] = useState('');
  const [isSendOaBoxOpen, setIsSendOaBoxOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Queries & Mutations
  const { data, isLoading, refetch } = useGetCustomerPosQuery({});

  const { data: customerData } = useGetCustomersQuery();
  const customerMasterList: Customer[] = customerData?.customers || [];

  const { data: mastersData } = useGetCrmMastersQuery();
  const machineCatalog: MachineCatalogProduct[] = mastersData?.masters?.machines || [];

  const [createCustomerPo, { isLoading: isCreatingPo }] = useCreateCustomerPoMutation();
  const [updateCustomerPo, { isLoading: isUpdatingPo }] = useUpdateCustomerPoMutation();
  const [updateOaStatus, { isLoading: isUpdatingOaStatus }] = useUpdateOrderAcceptanceStatusMutation();
  const [generateOrderAcceptance, { isLoading: isGeneratingOa }] = useGenerateOrderAcceptanceMutation();
  const [deleteCustomerPo, { isLoading: isDeletingPo }] = useDeleteCustomerPoMutation();
  const [convertCustomerPoToProject, { isLoading: isConverting }] = useConvertCustomerPoToProjectMutation();
  const [triggerGetUploadUrl] = useLazyGetS3PresignedUploadQuery();
  const [uploadDirectToS3] = useUploadDirectToS3Mutation();

  // Dedicated Generate OA Modal State
  const [generateOaTargetPo, setGenerateOaTargetPo] = useState<CustomerPo | null>(null);
  const [genOaCommitDate, setGenOaCommitDate] = useState('');
  const [genOaDate, setGenOaDate] = useState(new Date().toISOString().split('T')[0]);
  const [genOaNumber, setGenOaNumber] = useState('');
  const [genOaNotes, setGenOaNotes] = useState('');
  const [genOaError, setGenOaError] = useState('');

  const [convertSuccess, setConvertSuccess] = useState<any>(null);
  const customerPos: CustomerPo[] = (data?.customerPos || []) as CustomerPo[];

  // Live Timer Ticker for Time-Lock Countdown
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Time Lock Calculation Helper for Customer POs
  const getPoTimeLockInfo = (po: CustomerPo) => {
    const limitMinutes = Number(mastersData?.masters?.prefixLockPolicy?.poEditDeleteTimeLimitMinutes) || 120;
    const limitMs = limitMinutes * 60 * 1000;
    const createdTime = new Date(po.createdAt || po.poDate || 0).getTime();
    const elapsedMs = Math.max(0, currentTime - createdTime);
    const remainingMs = Math.max(0, limitMs - elapsedMs);
    const isStageLocked =
      po.status === 'WORK_ORDER_CREATED' ||
      po.status === 'PROJECT_CONVERTED' ||
      Boolean(po.convertedProjectId);
    const isLocked = remainingMs <= 0 || isStageLocked;

    const remainingSec = Math.floor(remainingMs / 1000);
    const hours = Math.floor(remainingSec / 3600);
    const mins = Math.floor((remainingSec % 3600) / 60);
    const secs = remainingSec % 60;

    let countdownLabel = '';
    if (hours > 0) {
      countdownLabel = `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      countdownLabel = `${mins}m ${secs}s`;
    } else {
      countdownLabel = `${secs}s`;
    }

    return {
      limitMinutes,
      remainingMs,
      isLocked,
      isStageLocked,
      countdownLabel
    };
  };

  // ----------------------------------------------------
  // Form State: Customer PO & Order Acceptance Entry
  // ----------------------------------------------------
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderAcceptanceNumber, setOrderAcceptanceNumber] = useState('');
  const [orderAcceptanceDate, setOrderAcceptanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryCommitmentDate, setDeliveryCommitmentDate] = useState('');

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [gstin, setGstin] = useState('');

  // Line Items
  const [lineItems, setLineItems] = useState<PoItemFormState[]>([
    {
      id: 'item-1',
      slNo: 1,
      modelCode: 'MHT - 1100',
      description: 'Coil Winding Machine Model : MHT - 1100',
      specifications: '',
      hsnCode: '8479',
      qtyType: 'NUMERIC',
      quantity: 1,
      qtyLabel: '1',
      uom: 'No.',
      unitPrice: 0,
      taxRate: 18,
      taxAmount: 0,
      totalAmount: 0
    }
  ]);

  // Lump-sum / Package Total Override
  const [isLumpSumTotal, setIsLumpSumTotal] = useState(false);
  const [lumpSumSubtotal, setLumpSumSubtotal] = useState<number>(0);
  const [lumpSumTax, setLumpSumTax] = useState<number>(0);
  const [lumpSumGrandTotal, setLumpSumGrandTotal] = useState<number>(0);

  // Commercial Pricing Setup: GST Mode, Tax Rate, State Category, Packaging & Transportation
  const [gstCategory, setGstCategory] = useState<'INTRA_STATE' | 'INTER_STATE'>('INTRA_STATE');
  const [taxRate, setTaxRate] = useState<number>(18);
  const [isGstIncluded, setIsGstIncluded] = useState<boolean>(false);
  const [packingType, setPackingType] = useState<'INCLUDED' | 'FIXED' | 'PERCENT'>('INCLUDED');
  const [packingValue, setPackingValue] = useState<number>(0);
  const [isPackingGstApplicable, setIsPackingGstApplicable] = useState<boolean>(true);
  const [transportationType, setTransportationType] = useState<'BUYER_ACTUALS' | 'INCLUDED' | 'FIXED'>('BUYER_ACTUALS');
  const [transportationValue, setTransportationValue] = useState<number>(0);
  const [isTransportationGstApplicable, setIsTransportationGstApplicable] = useState<boolean>(true);

  // Page 2: Technical Specifications & 11 Terms & Conditions
  const [technicalSpecifications, setTechnicalSpecifications] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState<OrderAcceptanceTerms>({
    ...DEFAULT_OA_TERMS
  });
  const [bankDetails, setBankDetails] = useState<OrderAcceptanceBankDetails>({
    ...DEFAULT_OA_BANK
  });
  const [signatory, setSignatory] = useState<OrderAcceptanceSignatory>({
    ...DEFAULT_OA_SIGNATORY
  });

  // Optional Attachments & Notes
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [pastedPdfUrl, setPastedPdfUrl] = useState<string>('');
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState<File[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploadingS3, setIsUploadingS3] = useState(false);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Fullscreen Wide Media Previews (PDF & Photos)
  const [mediaViewerModal, setMediaViewerModal] = useState<{
    isOpen: boolean;
    type: 'pdf' | 'image';
    url: string;
    title: string;
    galleryImages?: string[];
    currentGalleryIndex?: number;
  } | null>(null);

  // Computed Financials
  const computedTotals = useMemo(() => {
    if (isLumpSumTotal) {
      const sub = Number(lumpSumSubtotal) || 0;
      const t = Number(lumpSumTax) || 0;
      const g = Number(lumpSumGrandTotal) || sub + t;
      const cgst = gstCategory === 'INTRA_STATE' ? Math.round(t / 2) : 0;
      const sgst = gstCategory === 'INTRA_STATE' ? t - cgst : 0;
      const igst = gstCategory === 'INTER_STATE' ? t : 0;
      return {
        itemsSubtotal: sub,
        packingAmount: 0,
        transportationAmount: 0,
        taxableAmount: sub,
        subtotal: sub,
        tax: t,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        grandTotal: g
      };
    }

    let itemsSubtotal = 0;
    lineItems.forEach((it) => {
      if (it.qtyType === 'NUMERIC') {
        const base = Math.round((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0));
        itemsSubtotal += base;
      }
    });

    // Calculate packaging amount
    let packingAmount = 0;
    if (packingType === 'PERCENT') {
      packingAmount = Math.round((itemsSubtotal * (Number(packingValue) || 0)) / 100);
    } else if (packingType === 'FIXED') {
      packingAmount = Number(packingValue) || 0;
    }

    // Calculate transportation amount
    let transportationAmount = 0;
    if (transportationType === 'FIXED') {
      transportationAmount = Number(transportationValue) || 0;
    }

    const currentTaxRate = Number(taxRate) || 0;
    const taxablePacking = isPackingGstApplicable ? packingAmount : 0;
    const taxableFreight = isTransportationGstApplicable ? transportationAmount : 0;

    if (isGstIncluded) {
      // GST is included in the gross contract total
      const grossContractTotal = itemsSubtotal + packingAmount + transportationAmount;
      const taxableAmount =
        currentTaxRate > 0
          ? Math.round(grossContractTotal / (1 + currentTaxRate / 100))
          : grossContractTotal;
      const tax = grossContractTotal - taxableAmount;
      const cgstAmount = gstCategory === 'INTRA_STATE' ? Math.round(tax / 2) : 0;
      const sgstAmount = gstCategory === 'INTRA_STATE' ? tax - cgstAmount : 0;
      const igstAmount = gstCategory === 'INTER_STATE' ? tax : 0;

      return {
        itemsSubtotal,
        packingAmount,
        transportationAmount,
        taxableAmount,
        subtotal: taxableAmount,
        tax,
        cgstAmount,
        sgstAmount,
        igstAmount,
        grandTotal: grossContractTotal
      };
    } else {
      // GST is extra added on top of taxable items + taxable packing + taxable freight
      const taxableAmount = itemsSubtotal + taxablePacking + taxableFreight;
      const tax = Math.round((taxableAmount * currentTaxRate) / 100);
      const grandTotal = itemsSubtotal + packingAmount + transportationAmount + tax;
      const cgstAmount = gstCategory === 'INTRA_STATE' ? Math.round(tax / 2) : 0;
      const sgstAmount = gstCategory === 'INTRA_STATE' ? tax - cgstAmount : 0;
      const igstAmount = gstCategory === 'INTER_STATE' ? tax : 0;

      return {
        itemsSubtotal,
        packingAmount,
        transportationAmount,
        taxableAmount,
        subtotal: taxableAmount,
        tax,
        cgstAmount,
        sgstAmount,
        igstAmount,
        grandTotal
      };
    }
  }, [
    lineItems,
    gstCategory,
    taxRate,
    isGstIncluded,
    packingType,
    packingValue,
    isPackingGstApplicable,
    transportationType,
    transportationValue,
    isTransportationGstApplicable,
    isLumpSumTotal,
    lumpSumSubtotal,
    lumpSumTax,
    lumpSumGrandTotal
  ]);

  // Searchable Customer Combobox Filter & Selection
  const filteredCustomerMasterList = useMemo(() => {
    if (!customerSearchQuery.trim()) return customerMasterList;
    const q = customerSearchQuery.toLowerCase();
    return customerMasterList.filter((c) => {
      const codeMatch = c.customerCode?.toLowerCase().includes(q);
      const companyMatch = c.companyName?.toLowerCase().includes(q);
      const contactMatch = c.primaryContact?.name?.toLowerCase().includes(q);
      const cityMatch = c.billingAddress?.city?.toLowerCase().includes(q);
      const gstinMatch = (c.gstin || c.pan)?.toLowerCase().includes(q);
      return Boolean(codeMatch || companyMatch || contactMatch || cityMatch || gstinMatch);
    });
  }, [customerMasterList, customerSearchQuery]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return (
      customerMasterList.find((c) => (c._id && c._id === selectedCustomerId) || (c.id && c.id === selectedCustomerId)) ||
      null
    );
  }, [customerMasterList, selectedCustomerId]);

  // Lifecycle Status Helper
  const getStatusBadge = (status?: string) => {
    const s = CUSTOMER_PO_LIFECYCLE_STAGES.find((stage) => stage.value === status);
    if (s) return s;
    if (status === 'PROJECT_CONVERTED') {
      return {
        value: 'WORK_ORDER_CREATED' as CustomerPoStatus,
        label: 'Work Order Created',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-300'
      };
    }
    return {
      value: 'RECEIVED' as CustomerPoStatus,
      label: 'Received',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-300'
    };
  };

  // Immediate Status Update via Table Dropdown
  const handleUpdateStatus = async (po: CustomerPo, newStatus: CustomerPoStatus) => {
    try {
      await updateCustomerPo({
        id: po._id || po.id || '',
        status: newStatus
      }).unwrap();
      const stage = getStatusBadge(newStatus);
      showToast(`Status updated to "${stage.label}".`, 'success');
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || err.message || 'Could not update status right now.', 'error');
    }
  };

  // Helper to compute Auto OA Number matching PREFIX-DDMM-XXXX (e.g. OA-0811-1048)
  const computeAutoOaNumber = (po: CustomerPo) => {
    const rawPrefix = mastersData?.masters?.prefixLockPolicy?.orderAcceptancePrefix || 'OA';
    const prefix = rawPrefix.trim().replace(/-+$/, '');
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const date4Digits = `${dd}${mm}`;

    const numericOnly = String(po.poNumber || '').replace(/\D/g, '');
    const po4Digits = (numericOnly.length >= 4 ? numericOnly.slice(-4) : numericOnly.padStart(4, '0')) || '1001';

    return `${prefix}-${date4Digits}-${po4Digits}`;
  };

  // Open Dedicated Generate OA Modal
  const handleOpenGenerateOa = (po: CustomerPo) => {
    setGenerateOaTargetPo(po);
    setGenOaCommitDate(
      po.deliveryCommitmentDate ? new Date(po.deliveryCommitmentDate).toISOString().split('T')[0] : ''
    );
    setGenOaDate(new Date().toISOString().split('T')[0]);
    setGenOaNumber(po.orderAcceptanceNumber || computeAutoOaNumber(po));
    setGenOaNotes(po.notes || '');
    setGenOaError('');
  };

  // Save or Update Order Acceptance from dedicated OA Form
  const handleConfirmGenerateOa = async (e?: React.FormEvent, openPdf: boolean = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!generateOaTargetPo) return;
    if (!genOaCommitDate) {
      setGenOaError('Please select a Committed Delivery Date.');
      return;
    }
    try {
      const res = await generateOrderAcceptance({
        id: generateOaTargetPo._id || generateOaTargetPo.id || '',
        deliveryCommitmentDate: genOaCommitDate,
        orderAcceptanceDate: genOaDate,
        orderAcceptanceNumber: genOaNumber.trim() ? genOaNumber.trim().toUpperCase() : undefined,
        notes: genOaNotes.trim() ? genOaNotes.trim() : undefined
      }).unwrap();
      const updatedPo = res.customerPo;
      setGenerateOaTargetPo(null);
      showToast(res.message || 'All set! Order Acceptance saved successfully.', 'success');
      refetch();
      if (openPdf && updatedPo) {
        setSelectedPoForOa(updatedPo);
        setSendOaEmailInput(updatedPo.contactEmail || '');
        setIsSendOaBoxOpen(false);
      }
    } catch (err: any) {
      setGenOaError(err.data?.message || err.message || 'We could not save Order Acceptance right now.');
    }
  };

  // High-Fidelity 2-Page Order Acceptance PDF & Print Handler
  const handlePrintOrderAcceptance = (po: CustomerPo) => {
    const printableElement = document.getElementById('oa-printable-document');
    if (!printableElement) {
      window.print();
      return;
    }

    // Create an isolated hidden iframe
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

    // Collect all stylesheets and style tags from current document
    let styleTags = '';
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach((node) => {
      styleTags += node.outerHTML;
    });

    const docTitle = `Order_Acceptance_${po.orderAcceptanceNumber || po.poNumber || 'Document'}`;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${docTitle}</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 8mm;
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              font-size: 11px !important;
              line-height: 1.35 !important;
            }
            #oa-printable-document {
              padding: 0 !important;
              margin: 0 !important;
              background: #ffffff !important;
              overflow: visible !important;
              height: auto !important;
              width: 100% !important;
            }
            .oa-print-page {
              width: 100% !important;
              max-width: 100% !important;
              min-height: 272mm !important;
              box-shadow: none !important;
              border: 1px solid #64748b !important;
              border-radius: 0 !important;
              margin: 0 0 0 0 !important;
              overflow: hidden !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              background: #ffffff !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .oa-page-break {
              page-break-after: always !important;
              break-after: page !important;
            }
            .bg-orange-400, .bg-orange-400\\/90, .bg-orange-400\\/85 {
              background-color: #fb923c !important;
              color: #020617 !important;
            }
            .bg-orange-500 {
              background-color: #f97316 !important;
              color: #ffffff !important;
            }
            .bg-amber-50, .bg-amber-50\\/80 {
              background-color: #fffbeb !important;
            }
            .border-slate-500 {
              border-color: #64748b !important;
            }
            .print\\:hidden, .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div id="oa-printable-document">
            ${printableElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Ensure all images are loaded before triggering print
    const images = iframeDoc.getElementsByTagName('img');
    let loadedCount = 0;
    const totalImages = images.length;

    const triggerPrint = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Error invoking iframe print:', e);
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }
      }, 250);
    };

    if (totalImages === 0) {
      triggerPrint();
    } else {
      for (let i = 0; i < totalImages; i++) {
        const img = images[i];
        if (img.complete) {
          loadedCount++;
          if (loadedCount === totalImages) triggerPrint();
        } else {
          img.onload = () => {
            loadedCount++;
            if (loadedCount === totalImages) triggerPrint();
          };
          img.onerror = () => {
            loadedCount++;
            if (loadedCount === totalImages) triggerPrint();
          };
        }
      }
    }
  };

  // ----------------------------------------------------
  // Excel-Style Distinct Value Extractors with Frequency Counts
  // ----------------------------------------------------
  const distinctPoNumberValues = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    customerPos.forEach((po) => {
      const val = po.poNumber || 'N/A';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [customerPos]);

  const distinctOaValues = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    customerPos.forEach((po) => {
      const val = po.orderAcceptanceNumber || 'Pending OA';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [customerPos]);

  const distinctCompanyValues = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    customerPos.forEach((po) => {
      const val = po.companyName || 'N/A';
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [customerPos]);

  const distinctItemValues = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    customerPos.forEach((po) => {
      const firstItem = po.items?.[0]?.description || po.items?.[0]?.modelCode || 'Machine Unit';
      map.set(firstItem, (map.get(firstItem) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [customerPos]);

  const distinctAmountValues = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    customerPos.forEach((po) => {
      const val = formatINR(po.totalAmount?.baseAmountINR ?? po.totalAmount?.amount ?? 0);
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [customerPos]);

  const distinctStatusValues = useMemo<DistinctValueItem[]>(() => {
    const map = new Map<string, number>();
    customerPos.forEach((po) => {
      const badge = getStatusBadge(po.status);
      const val = badge.label;
      map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [customerPos]);

  const isFilterActive = useMemo(() => {
    return (
      Boolean(searchTerm.trim()) ||
      excelFilters.poNumber !== null ||
      excelFilters.orderAcceptanceNumber !== null ||
      excelFilters.companyName !== null ||
      excelFilters.items !== null ||
      excelFilters.totalAmount !== null ||
      excelFilters.status !== null
    );
  }, [searchTerm, excelFilters]);

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setExcelFilters({
      poNumber: null,
      orderAcceptanceNumber: null,
      companyName: null,
      items: null,
      totalAmount: null,
      status: null
    });
    setSortField('createdAt');
    setSortDirection('desc');
  };

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  // Filtered and Sorted Customer POs Pipeline
  const filteredAndSortedCustomerPos = useMemo(() => {
    return customerPos
      .filter((po) => {
        // Global search
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchPo = po.poNumber?.toLowerCase().includes(q);
          const matchOa = po.orderAcceptanceNumber?.toLowerCase().includes(q);
          const matchCompany = po.companyName?.toLowerCase().includes(q);
          const matchContact = po.customerName?.toLowerCase().includes(q);
          const matchItem = po.items?.some(
            (i) => i.description?.toLowerCase().includes(q) || i.modelCode?.toLowerCase().includes(q)
          );
          if (!matchPo && !matchOa && !matchCompany && !matchContact && !matchItem) return false;
        }

        // PO Number Filter
        if (excelFilters.poNumber !== null) {
          const val = po.poNumber || 'N/A';
          if (!excelFilters.poNumber.includes(val)) return false;
        }

        // OA Number Filter
        if (excelFilters.orderAcceptanceNumber !== null) {
          const val = po.orderAcceptanceNumber || 'Pending OA';
          if (!excelFilters.orderAcceptanceNumber.includes(val)) return false;
        }

        // Company Filter
        if (excelFilters.companyName !== null) {
          const val = po.companyName || 'N/A';
          if (!excelFilters.companyName.includes(val)) return false;
        }

        // Items Filter
        if (excelFilters.items !== null) {
          const val = po.items?.[0]?.description || po.items?.[0]?.modelCode || 'Machine Unit';
          if (!excelFilters.items.includes(val)) return false;
        }

        // Total Amount Filter
        if (excelFilters.totalAmount !== null) {
          const val = formatINR(po.totalAmount?.baseAmountINR ?? po.totalAmount?.amount ?? 0);
          if (!excelFilters.totalAmount.includes(val)) return false;
        }

        // Status Filter
        if (excelFilters.status !== null) {
          const val = getStatusBadge(po.status).label;
          if (!excelFilters.status.includes(val)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'poNumber') {
          cmp = (a.poNumber || '').localeCompare(b.poNumber || '');
        } else if (sortField === 'orderAcceptanceNumber') {
          cmp = (a.orderAcceptanceNumber || '').localeCompare(b.orderAcceptanceNumber || '');
        } else if (sortField === 'companyName') {
          cmp = (a.companyName || '').localeCompare(b.companyName || '');
        } else if (sortField === 'items') {
          const aItem = a.items?.[0]?.description || '';
          const bItem = b.items?.[0]?.description || '';
          cmp = aItem.localeCompare(bItem);
        } else if (sortField === 'totalAmount') {
          const aAmt = a.totalAmount?.baseAmountINR ?? a.totalAmount?.amount ?? 0;
          const bAmt = b.totalAmount?.baseAmountINR ?? b.totalAmount?.amount ?? 0;
          cmp = aAmt - bAmt;
        } else if (sortField === 'status') {
          const aLbl = getStatusBadge(a.status).label;
          const bLbl = getStatusBadge(b.status).label;
          cmp = aLbl.localeCompare(bLbl);
        } else {
          // Default sort by poDate / createdAt
          const aTime = new Date(a.poDate || a.createdAt || 0).getTime();
          const bTime = new Date(b.poDate || b.createdAt || 0).getTime();
          cmp = aTime - bTime;
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [customerPos, searchTerm, excelFilters, sortField, sortDirection]);

  // Open Modal for New PO & Order Acceptance
  const handleOpenAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingPoId(null);
    setFormError('');
    setPoNumber('');
    setPoDate(today);
    setOrderAcceptanceNumber('');
    setOrderAcceptanceDate(today);
    setDeliveryCommitmentDate('');
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setIsCustomerDropdownOpen(false);
    setCompanyName('');
    setCustomerName('');
    setContactEmail('');
    setContactPhone('');
    setBillingAddress('');
    setShippingAddress('');
    setGstin('');
    setLineItems([
      {
        id: `item-${Date.now()}-1`,
        slNo: 1,
        modelCode: 'MHT - 1100',
        description: 'Coil Winding Machine Model : MHT - 1100',
        specifications: '',
        hsnCode: '8479',
        qtyType: 'NUMERIC',
        quantity: 1,
        qtyLabel: '1',
        uom: 'No.',
        unitPrice: 0,
        taxRate: 18,
        taxAmount: 0,
        totalAmount: 0
      }
    ]);
    setIsLumpSumTotal(false);
    setLumpSumSubtotal(0);
    setLumpSumTax(0);
    setLumpSumGrandTotal(0);
    setGstCategory('INTRA_STATE');
    setTaxRate(18);
    setIsGstIncluded(false);
    setPackingType('INCLUDED');
    setPackingValue(0);
    setIsPackingGstApplicable(true);
    setTransportationType('BUYER_ACTUALS');
    setTransportationValue(0);
    setIsTransportationGstApplicable(true);
    setTechnicalSpecifications('');
    setTermsAndConditions({ ...DEFAULT_OA_TERMS });
    setBankDetails({ ...DEFAULT_OA_BANK });
    setSignatory({ ...DEFAULT_OA_SIGNATORY });
    setSelectedPdfFile(null);
    setPdfPreviewUrl('');
    setPastedPdfUrl('');
    setSelectedPhotoFiles([]);
    setPhotos([]);
    setNotes('');
    setIsFormModalOpen(true);
  };

  // Open Modal for Editing Existing PO & Order Acceptance
  const handleOpenEditModal = (po: CustomerPo) => {
    setEditingPoId(po._id || po.id || null);
    setFormError('');
    setPoNumber(po.poNumber || po.customerPoNumber || '');
    setPoDate(po.poDate ? new Date(po.poDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setOrderAcceptanceNumber(po.orderAcceptanceNumber || '');
    setOrderAcceptanceDate(
      po.orderAcceptanceDate
        ? new Date(po.orderAcceptanceDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    );
    setDeliveryCommitmentDate(
      po.deliveryCommitmentDate ? new Date(po.deliveryCommitmentDate).toISOString().split('T')[0] : ''
    );

    let resolvedCustomerId = po.customerId || '';
    if (!resolvedCustomerId && po.companyName) {
      const match = customerMasterList.find(
        (c) => c.companyName?.toLowerCase() === po.companyName?.toLowerCase()
      );
      if (match) resolvedCustomerId = match._id || match.id || '';
    }
    setSelectedCustomerId(resolvedCustomerId);
    setCustomerSearchQuery('');
    setIsCustomerDropdownOpen(false);

    setCompanyName(po.companyName || '');
    setCustomerName(po.customerName || '');
    setContactEmail(po.contactEmail || '');
    setContactPhone(po.contactPhone || '');
    setBillingAddress(po.billingAddress || '');
    setShippingAddress(po.shippingAddress || po.billingAddress || '');
    setGstin(po.gstin || '');

    if (po.items && po.items.length > 0) {
      setLineItems(
        po.items.map((it, idx) => ({
          id: it._id || it.id || `edit-item-${idx}`,
          slNo: it.slNo || idx + 1,
          itemCode: it.itemCode || `ITEM-${idx + 1}`,
          modelCode: it.modelCode || '',
          description: it.description || '',
          specifications: it.specifications || '',
          hsnCode: it.hsnCode || '8479',
          qtyType: (it.qtyType as PoItemQtyType) || 'NUMERIC',
          quantity: Number(it.quantity ?? 1),
          qtyLabel: it.qtyLabel || (it.qtyType === 'EXTRA' ? 'Extra' : String(it.quantity ?? 1)),
          uom: it.uom !== undefined ? it.uom : it.qtyType === 'EXTRA' ? '' : 'No.',
          unitPrice: Number(it.unitPrice?.amount ?? it.unitPrice ?? 0),
          taxRate: Number(it.taxRate !== undefined ? it.taxRate : 18),
          taxAmount: Number(it.taxAmount?.amount ?? it.taxAmount ?? 0),
          totalAmount: Number(it.totalAmount?.amount ?? it.totalAmount ?? it.lineTotal?.amount ?? it.lineTotal ?? 0)
        }))
      );
    }

    setIsLumpSumTotal(Boolean(po.isLumpSumTotal));
    setLumpSumSubtotal(Number(po.subtotalAmount?.amount ?? 0));
    setLumpSumTax(Number(po.totalTaxAmount?.amount ?? 0));
    setLumpSumGrandTotal(Number(po.totalAmount?.amount ?? 0));

    // Commercial pricing terms parser
    const rawTax = po.termsAndConditions?.tax || '';
    const isIncl = /inclusive|included/i.test(rawTax);
    setIsGstIncluded(isIncl);
    const taxMatch = rawTax.match(/(\d+)/);
    setTaxRate(taxMatch ? Number(taxMatch[1]) : 18);

    const cleanGst = po.gstin || '';
    if (cleanGst.startsWith('29') || /karnataka/i.test(po.billingAddress || '')) {
      setGstCategory('INTRA_STATE');
    } else if (cleanGst.length >= 2 || /igst/i.test(rawTax)) {
      setGstCategory('INTER_STATE');
    } else {
      setGstCategory('INTRA_STATE');
    }

    const rawPackaging = po.termsAndConditions?.packaging || '';
    if (/%/i.test(rawPackaging)) {
      setPackingType('PERCENT');
      const valMatch = rawPackaging.match(/([\d.]+)/);
      setPackingValue(valMatch ? Number(valMatch[1]) : 2);
    } else if (/\d+/i.test(rawPackaging) && !/inclusive/i.test(rawPackaging)) {
      setPackingType('FIXED');
      const valMatch = rawPackaging.replace(/[^\d.]/g, '');
      setPackingValue(valMatch ? Number(valMatch) : 0);
    } else {
      setPackingType('INCLUDED');
      setPackingValue(0);
    }
    setIsPackingGstApplicable(true);

    const rawFreight = po.termsAndConditions?.freight || '';
    if (/inclusive/i.test(rawFreight)) {
      setTransportationType('INCLUDED');
      setTransportationValue(0);
    } else if (/\d+/i.test(rawFreight) && !/buyer/i.test(rawFreight)) {
      setTransportationType('FIXED');
      const valMatch = rawFreight.replace(/[^\d.]/g, '');
      setTransportationValue(valMatch ? Number(valMatch) : 0);
    } else {
      setTransportationType('BUYER_ACTUALS');
      setTransportationValue(0);
    }
    setIsTransportationGstApplicable(true);

    setTechnicalSpecifications(po.technicalSpecifications || '');
    setTermsAndConditions({
      ...DEFAULT_OA_TERMS,
      ...(po.termsAndConditions || {})
    });
    setBankDetails({
      ...DEFAULT_OA_BANK,
      ...(po.bankDetails || {})
    });
    setSignatory({
      ...DEFAULT_OA_SIGNATORY,
      ...(po.signatory || {})
    });

    setSelectedPdfFile(null);
    setPdfPreviewUrl(po.presignedDownloadUrl || po.pdfUrl || '');
    setPastedPdfUrl(po.pdfUrl || '');
    setSelectedPhotoFiles([]);
    setPhotos(po.photos || []);
    setNotes(po.notes || '');
    setIsFormModalOpen(true);
  };

  // Auto-populate Customer from Customer Master
  const handleSelectCustomerFromMaster = (cId: string) => {
    setSelectedCustomerId(cId);
    if (!cId) {
      setCompanyName('');
      setCustomerName('');
      setContactEmail('');
      setContactPhone('');
      setBillingAddress('');
      setShippingAddress('');
      setGstin('');
      return;
    }
    const cust = customerMasterList.find((c) => c._id === cId || c.id === cId);
    if (cust) {
      setCompanyName(cust.companyName);
      setCustomerName(cust.primaryContact?.name || cust.companyName);
      setContactEmail(cust.primaryContact?.email || '');
      setContactPhone(cust.primaryContact?.mobile || cust.primaryContact?.phone || '');
      const formattedBilling = cust.billingAddress
        ? [
            cust.billingAddress.addressLine1,
            cust.billingAddress.addressLine2,
            cust.billingAddress.city,
            cust.billingAddress.state ? `${cust.billingAddress.state} - ${cust.billingAddress.pincode || ''}` : ''
          ]
            .filter(Boolean)
            .join(', ')
        : '';
      setBillingAddress(formattedBilling);
      setShippingAddress(formattedBilling);
      const cleanGst = cust.gstin || cust.pan || '';
      setGstin(cleanGst);
      if (cleanGst.startsWith('29') || /karnataka/i.test(formattedBilling)) {
        setGstCategory('INTRA_STATE');
      } else if (cleanGst.length >= 2) {
        setGstCategory('INTER_STATE');
      }
      if (cust.paymentTerms) {
        setTermsAndConditions((prev) => ({
          ...prev,
          paymentTerms: cust.paymentTerms || prev.paymentTerms
        }));
      }
    }
  };

  // Select Machine from Product Catalog for a Line Item
  const handleSelectProductForLineItem = (itemId: string, modelCode: string) => {
    const machine = machineCatalog.find((m) => m.modelCode === modelCode);
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (!machine) {
          return { ...item, modelCode: '' };
        }
        const unitP = Number(machine.basePriceINR || machine.price || 0);
        const q = item.qtyType === 'NUMERIC' ? Math.max(1, Number(item.quantity) || 1) : 0;
        const baseP = Math.round(q * unitP);
        const tRate = item.taxRate !== undefined ? item.taxRate : 18;
        const tAmt = Math.round((baseP * tRate) / 100);
        const specPoints = (machine.technicalSpecifications || [])
          .map((s, idx) => `${String.fromCharCode(97 + idx)}. ${s.parameter}: ${s.value}`)
          .join('\n');

        return {
          ...item,
          modelCode: machine.modelCode,
          description: `Coil Winding Machine Model : ${machine.modelCode} (${machine.modelName})`,
          specifications: specPoints ? `With:\n${specPoints}` : item.specifications,
          hsnCode: item.hsnCode || '8479',
          unitPrice: unitP,
          taxAmount: tAmt,
          totalAmount: baseP + tAmt
        };
      })
    );
  };

  const handleLineItemChange = (itemId: string, field: keyof PoItemFormState, val: any) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, [field]: val };

        if (field === 'qtyType') {
          if (val === 'EXTRA') {
            updated.qtyLabel = 'Extra';
            updated.uom = '';
            updated.quantity = 0;
            updated.unitPrice = 0;
            updated.taxAmount = 0;
            updated.totalAmount = 0;
          } else if (val === 'INCLUDED') {
            updated.qtyLabel = 'Included';
            updated.uom = 'No.';
            updated.unitPrice = 0;
            updated.taxAmount = 0;
            updated.totalAmount = 0;
          } else {
            updated.qtyLabel = '1';
            updated.quantity = 1;
            updated.uom = updated.uom || 'No.';
          }
        }

        if (updated.qtyType === 'NUMERIC') {
          const q = field === 'quantity' ? Math.max(1, Number(val) || 1) : Math.max(1, Number(updated.quantity) || 1);
          const uPrice = field === 'unitPrice' ? Math.max(0, Number(val) || 0) : Math.max(0, Number(updated.unitPrice) || 0);
          const tRate = field === 'taxRate' ? Math.max(0, Number(val) || 0) : Number(updated.taxRate ?? 18);
          const baseP = Math.round(q * uPrice);
          const tAmt = Math.round((baseP * tRate) / 100);
          updated.quantity = q;
          updated.qtyLabel = String(q);
          updated.unitPrice = uPrice;
          updated.taxRate = tRate;
          updated.taxAmount = tAmt;
          updated.totalAmount = field === 'totalAmount' ? Number(val) || 0 : baseP + tAmt;
        }

        return updated;
      })
    );
  };

  const handleAddLineItem = (qtyType: PoItemQtyType = 'NUMERIC') => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        slNo: prev.length + 1,
        modelCode: '',
        description: qtyType === 'EXTRA' ? 'Wire Tensioner / Mandrel' : '',
        specifications: '',
        hsnCode: '8479',
        qtyType,
        quantity: qtyType === 'EXTRA' ? 0 : 1,
        qtyLabel: qtyType === 'EXTRA' ? 'Extra' : qtyType === 'INCLUDED' ? 'Included' : '1',
        uom: qtyType === 'EXTRA' ? '' : 'No.',
        unitPrice: 0,
        taxRate: 18,
        taxAmount: 0,
        totalAmount: 0
      }
    ]);
  };

  const handleRemoveLineItem = (itemId: string) => {
    if (lineItems.length === 1) {
      showToast('At least one line item is required in the Order Acceptance.', 'info');
      return;
    }
    setLineItems((prev) =>
      prev
        .filter((it) => it.id !== itemId)
        .map((it, idx) => ({
          ...it,
          slNo: idx + 1
        }))
    );
  };

  // File to Base64 Data URL helper for local fallback
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Direct File Download Trigger
  const handleDownloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Optional File Handlers
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPdfFile(file);
      setPdfPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handlePhotoFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setSelectedPhotoFiles((prev) => [...prev, ...newFiles]);
      const newUrls = newFiles.map((f) => URL.createObjectURL(f));
      setPhotos((prev) => [...prev, ...newUrls]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setSelectedPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Save Customer PO & Order Acceptance
  const handleSavePoAndOa = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!poNumber.trim()) {
      setFormError('Please enter the Purchase Order Number.');
      return;
    }
    if (!selectedCustomerId || !companyName.trim()) {
      setFormError('Please select a Customer from Customer Master.');
      return;
    }
    if (lineItems.some((it) => !it.description.trim())) {
      setFormError('Please provide a Description & Part ID for every line item.');
      return;
    }

    try {
      let documentKey = '';
      let finalPdfUrl = pastedPdfUrl.trim() || (pdfPreviewUrl.startsWith('blob:') ? '' : pdfPreviewUrl);

      if (selectedPdfFile) {
        setIsUploadingS3(true);
        const fileExt = selectedPdfFile.name.split('.').pop() || 'pdf';
        const cleanPoNum = poNumber.toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
        const candidateKey = `crm/customer-pos/${cleanPoNum}/${Date.now()}_po.${fileExt}`;
        const base64Data = await fileToDataUrl(selectedPdfFile);

        try {
          const uploadRes = await uploadDirectToS3({
            key: candidateKey,
            contentType: selectedPdfFile.type || 'application/pdf',
            base64Data
          }).unwrap();

          if (uploadRes?.success && uploadRes.key) {
            documentKey = uploadRes.key;
            finalPdfUrl = uploadRes.url || base64Data;
          } else {
            documentKey = '';
            finalPdfUrl = base64Data;
          }
        } catch {
          documentKey = '';
          finalPdfUrl = base64Data;
        }
        setIsUploadingS3(false);
      }

      // Process and upload attached photos
      let finalPhotos: string[] = photos.filter((p) => !p.startsWith('blob:'));
      if (selectedPhotoFiles.length > 0) {
        setIsUploadingS3(true);
        const cleanPoNum = poNumber.toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
        for (let i = 0; i < selectedPhotoFiles.length; i++) {
          const pFile = selectedPhotoFiles[i];
          const fileExt = pFile.name.split('.').pop() || 'jpg';
          const photoKey = `crm/customer-pos/${cleanPoNum}/photos/${Date.now()}_${i}.${fileExt}`;
          const base64Data = await fileToDataUrl(pFile);
          let savedUrl = '';
          try {
            const uploadRes = await uploadDirectToS3({
              key: photoKey,
              contentType: pFile.type || 'image/jpeg',
              base64Data
            }).unwrap();

            if (uploadRes?.success && uploadRes.url) {
              savedUrl = uploadRes.url;
            } else {
              savedUrl = base64Data;
            }
          } catch {
            savedUrl = base64Data;
          }
          if (savedUrl) {
            finalPhotos.push(savedUrl);
          }
        }
        setIsUploadingS3(false);
      }

      // Automatically map Company Billing Info, Bank Details & Signatory from Master
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

      const taxLabel = isGstIncluded
        ? gstCategory === 'INTRA_STATE'
          ? `GST - ${taxRate}% (CGST ${(taxRate / 2).toFixed(1).replace(/\.0$/, '')}% + SGST ${(taxRate / 2).toFixed(1).replace(/\.0$/, '')}%) (Inclusive)`
          : `IGST - ${taxRate}% (Inclusive)`
        : gstCategory === 'INTRA_STATE'
        ? `GST - ${taxRate}% (CGST ${(taxRate / 2).toFixed(1).replace(/\.0$/, '')}% + SGST ${(taxRate / 2).toFixed(1).replace(/\.0$/, '')}%) Extra`
        : `IGST - ${taxRate}% Extra`;

      const mappedTermsAndConditions: OrderAcceptanceTerms = {
        ...DEFAULT_OA_TERMS,
        ...(termsAndConditions || {}),
        tax: taxLabel,
        packaging:
          packingType === 'INCLUDED'
            ? 'Inclusive'
            : packingType === 'PERCENT'
            ? `${packingValue}% Extra`
            : `₹ ${packingValue} Extra`,
        freight:
          transportationType === 'BUYER_ACTUALS'
            ? 'To buyer / At Actuals'
            : transportationType === 'INCLUDED'
            ? 'Inclusive'
            : `₹ ${transportationValue} (Prepaid & Added)`,
        paymentTerms: termsAndConditions.paymentTerms || DEFAULT_OA_TERMS.paymentTerms
      };

      const payload: Partial<CustomerPo> = {
        poNumber: poNumber.toUpperCase().trim(),
        poDate,
        orderAcceptanceNumber:
          editingPoId && orderAcceptanceNumber.trim() ? orderAcceptanceNumber.toUpperCase().trim() : undefined,
        orderAcceptanceDate: editingPoId && orderAcceptanceDate ? orderAcceptanceDate : undefined,
        deliveryCommitmentDate: deliveryCommitmentDate || undefined,
        status: editingPoId ? undefined : 'RECEIVED',
        customerId: selectedCustomerId,
        companyName: companyName.trim(),
        customerName: (customerName || companyName).trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        billingAddress: billingAddress.trim(),
        shippingAddress: (shippingAddress || billingAddress).trim(),
        gstin: gstin.trim().toUpperCase(),
        items: lineItems.map((it, idx) => ({
          slNo: idx + 1,
          itemCode: it.itemCode || `ITEM-${idx + 1}`,
          modelCode: it.modelCode,
          description: it.description,
          specifications: it.specifications,
          hsnCode: it.hsnCode || '8479',
          qtyType: it.qtyType,
          quantity: it.qtyType === 'EXTRA' ? 0 : Number(it.quantity) || 1,
          qtyLabel: it.qtyType === 'EXTRA' ? 'Extra' : it.qtyType === 'INCLUDED' ? 'Included' : String(it.quantity || 1),
          uom: it.qtyType === 'EXTRA' ? '' : it.uom || 'No.',
          unitPrice: Number(it.unitPrice) || 0,
          taxRate: Number(it.taxRate ?? 18),
          taxAmount: Number(it.taxAmount) || 0,
          totalAmount: Number(it.totalAmount) || 0
        })),
        currency: 'INR',
        exchangeRate: 1.0,
        isLumpSumTotal,
        subtotalAmount: {
          currency: 'INR',
          amount: computedTotals.subtotal,
          baseAmountINR: computedTotals.subtotal
        },
        totalTaxAmount: {
          currency: 'INR',
          amount: computedTotals.tax,
          baseAmountINR: computedTotals.tax
        },
        totalAmount: {
          currency: 'INR',
          amount: computedTotals.grandTotal,
          baseAmountINR: computedTotals.grandTotal
        },
        technicalSpecifications: technicalSpecifications || '',
        termsAndConditions: mappedTermsAndConditions,
        bankDetails: mappedBankDetails,
        signatory: mappedSignatory,
        paymentTerms: mappedTermsAndConditions.paymentTerms,
        s3DocumentKey: documentKey || undefined,
        pdfUrl: finalPdfUrl,
        photos: finalPhotos.filter(Boolean),
        notes
      };

      if (editingPoId) {
        const res = await updateCustomerPo({ id: editingPoId, ...payload }).unwrap();
        setIsFormModalOpen(false);
        showToast(res.message || 'Great! Customer PO and Order Acceptance updated.', 'success');
        if (selectedPoForOa && (selectedPoForOa._id === editingPoId || selectedPoForOa.id === editingPoId)) {
          setSelectedPoForOa(res.customerPo);
        }
      } else {
        await createCustomerPo(payload).unwrap();
        setIsFormModalOpen(false);
        showToast('All set! Customer Purchase Order saved successfully.', 'success');
      }
      refetch();
    } catch (err: any) {
      setIsUploadingS3(false);
      setFormError(err.data?.message || err.message || 'We could not save this Customer PO right now.');
    }
  };

  // Send / Update Order Acceptance Status
  const handleUpdateOaStatus = async (
    po: CustomerPo,
    nextStatus: 'DRAFT' | 'OA_SENT' | 'OA_ACKNOWLEDGED',
    emailTarget?: string
  ) => {
    try {
      const id = po._id || po.id || '';
      const res = await updateOaStatus({
        id,
        oaStatus: nextStatus,
        oaSentToEmail: emailTarget || po.contactEmail || ''
      }).unwrap();
      showToast(res.message, 'success');
      setSelectedPoForOa(res.customerPo);
      setIsSendOaBoxOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || 'We could not update the Order Acceptance status right now.', 'error');
    }
  };

  // Confirm Delete Customer PO
  const handleConfirmDeletePo = async () => {
    if (!poToDelete) return;
    try {
      const id = poToDelete._id || poToDelete.id || '';
      const res = await deleteCustomerPo(id).unwrap();
      showToast(res.message || 'Customer PO deleted.', 'success');
      setPoToDelete(null);
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || 'We could not delete this Customer PO right now.', 'error');
    }
  };

  // Convert PO to Project Setup
  const handleExecuteConvert = async (poId: string) => {
    try {
      const res: any = await convertCustomerPoToProject({ id: poId }).unwrap();
      setConvertSuccess({
        poNumber: convertTargetPo?.poNumber,
        projectId: res.projectId,
        workOrderNumber: res.workOrderNumber
      });
      showToast(`All set! PO converted to Project ${res.projectId}.`, 'success');
      setConvertTargetPo(null);
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || 'We could not convert this PO right now.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PO No., OA No., Company, Address, GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-orange-500 transition-all font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Safety Orange Reset Filters Button */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold transition-colors cursor-pointer"
              title="Reset all active filters and search"
            >
              <RotateCcw size={13} />
              <span>Reset Filters</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>New Customer PO</span>
          </button>
        </div>
      </div>

      {/* 2. Project Conversion Banner */}
      {convertSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900">
                Customer PO {convertSuccess.poNumber} converted to Project Setup:
              </span>{' '}
              <span className="font-mono font-black text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                {convertSuccess.projectId}
              </span>{' '}
              <span className="text-emerald-700 font-mono">({convertSuccess.workOrderNumber})</span>
            </div>
          </div>
          <Link
            href="/project-setup/projects"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
          >
            <span>Open Project Setup</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* 3. Customer PO Ledger Table with Excel Column Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="overflow-x-auto min-h-[480px] pb-36">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">
                  <ExcelColumnFilter
                    title="PO No. & Date"
                    columnKey="poNumber"
                    distinctValues={distinctPoNumberValues}
                    selectedValues={excelFilters.poNumber}
                    onFilterChange={(vals) => setExcelFilters((prev) => ({ ...prev, poNumber: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-2.5 px-3">
                  <ExcelColumnFilter
                    title="Order Acceptance (OA)"
                    columnKey="orderAcceptanceNumber"
                    distinctValues={distinctOaValues}
                    selectedValues={excelFilters.orderAcceptanceNumber}
                    onFilterChange={(vals) => setExcelFilters((prev) => ({ ...prev, orderAcceptanceNumber: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-2.5 px-3">
                  <ExcelColumnFilter
                    title="Customer"
                    columnKey="companyName"
                    distinctValues={distinctCompanyValues}
                    selectedValues={excelFilters.companyName}
                    onFilterChange={(vals) => setExcelFilters((prev) => ({ ...prev, companyName: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-2.5 px-3">
                  <ExcelColumnFilter
                    title="Machines & Items"
                    columnKey="items"
                    distinctValues={distinctItemValues}
                    selectedValues={excelFilters.items}
                    onFilterChange={(vals) => setExcelFilters((prev) => ({ ...prev, items: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-2.5 px-3 text-right">
                  <ExcelColumnFilter
                    title="Total Amount"
                    columnKey="totalAmount"
                    distinctValues={distinctAmountValues}
                    selectedValues={excelFilters.totalAmount}
                    onFilterChange={(vals) => setExcelFilters((prev) => ({ ...prev, totalAmount: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                    align="right"
                  />
                </th>
                <th className="py-2.5 px-3">
                  <ExcelColumnFilter
                    title="PO Status"
                    columnKey="status"
                    distinctValues={distinctStatusValues}
                    selectedValues={excelFilters.status}
                    onFilterChange={(vals) => setExcelFilters((prev) => ({ ...prev, status: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                    align="right"
                  />
                </th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 size={22} className="animate-spin mx-auto mb-2 text-orange-500" />
                    <span>Loading Customer Purchase Orders...</span>
                  </td>
                </tr>
              ) : customerPos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No Customer POs recorded yet. Click &quot;New Customer PO&quot; to begin.
                  </td>
                </tr>
              ) : filteredAndSortedCustomerPos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Filter size={20} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No matching Customer POs found for the active filters.</p>
                    <button
                      type="button"
                      onClick={handleResetAllFilters}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 cursor-pointer shadow-xs"
                    >
                      <RotateCcw size={12} />
                      <span>Reset All Filters</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredAndSortedCustomerPos.map((po) => {
                  const isConverted =
                    po.status === 'WORK_ORDER_CREATED' ||
                    po.status === 'PROJECT_CONVERTED' ||
                    Boolean(po.convertedProjectId);
                  const items = po.items || [];
                  const extraCount = items.filter((i) => i.qtyType === 'EXTRA').length;
                  const grandTotalVal =
                    po.totalAmount?.baseAmountINR ?? po.totalAmount?.amount ?? po.totalAmountINR ?? 0;
                  const currentBadge = getStatusBadge(po.status);

                  return (
                    <tr key={po._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* PO Number & Date - Clickable Preview Dossier Link */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setPreviewingCustomerPo(po)}
                          className="font-mono font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer flex items-center gap-1.5 text-left group"
                          title="Click to view full PO preview dossier"
                        >
                          <span>{po.poNumber}</span>
                          <ExternalLink size={11} className="opacity-60 group-hover:opacity-100 shrink-0" />
                        </button>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          PO Date: {formatDateDDMMYYYY(po.poDate)}
                        </div>
                      </td>

                      {/* Order Acceptance No & Date - Opens OA Form */}
                      <td className="py-3 px-3">
                        {po.orderAcceptanceNumber ? (
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenGenerateOa(po)}
                              className="font-mono font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer flex items-center gap-1 group text-left"
                              title="Click to open Order Acceptance Form"
                            >
                              <span>{po.orderAcceptanceNumber}</span>
                              <FileText size={11} className="opacity-60 group-hover:opacity-100 shrink-0" />
                            </button>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              OA Date: {formatDateDDMMYYYY(po.orderAcceptanceDate || po.poDate)}
                            </div>
                            {po.deliveryCommitmentDate && (
                              <div className="text-[10px] text-orange-700 font-semibold mt-0.5">
                                Delivery: {formatDateDDMMYYYY(po.deliveryCommitmentDate)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenGenerateOa(po)}
                            className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px] font-mono font-bold border border-orange-200 transition-colors cursor-pointer"
                            title="Open OA Form to enter committed date"
                          >
                            + Create OA
                          </button>
                        )}
                      </td>

                      {/* Customer (Only Company Name Shown in Table Row) */}
                      <td className="py-3 px-3 max-w-[200px]">
                        <span className="font-bold text-slate-900 truncate block" title={po.companyName}>
                          {po.companyName}
                        </span>
                      </td>

                      {/* Line Items Summary */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold">
                            <PackageCheck size={11} className="text-orange-500" />
                            <span>{items.length} Rows</span>
                          </span>
                          {extraCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                              +{extraCount} Extra
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate max-w-[200px] mt-0.5">
                          {items[0]?.description || 'Machine Unit'}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-3 font-mono font-extrabold text-slate-900 text-right">
                        {formatINR(grandTotalVal)}
                      </td>

                      {/* PO Status Dropdown */}
                      <td className="py-3 px-3">
                        <div className="relative inline-block text-left">
                          <select
                            value={po.status || 'RECEIVED'}
                            onChange={(e) => handleUpdateStatus(po, e.target.value as CustomerPoStatus)}
                            className={`appearance-none text-[11px] font-bold px-2.5 py-1.5 pr-6 rounded-xl border cursor-pointer focus:outline-hidden transition-all shadow-2xs ${currentBadge.badgeClass}`}
                          >
                            {CUSTOMER_PO_LIFECYCLE_STAGES.map((st) => (
                              <option
                                key={st.value}
                                value={st.value}
                                className="bg-white text-slate-900 font-semibold py-1"
                              >
                                {st.label}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 text-slate-500">
                            <ChevronDown size={11} />
                          </div>
                        </div>
                        {po.convertedProjectId && (
                          <div className="text-[10px] font-mono text-emerald-700 font-bold mt-1">
                            {po.convertedProjectId}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Dossier Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewingCustomerPo(po)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                            title="Preview Full PO Dossier"
                          >
                            <Eye size={14} />
                          </button>

                          {/* OA Form Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenGenerateOa(po)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                              !po.orderAcceptanceNumber || po.status === 'RECEIVED'
                                ? 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-xs'
                                : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
                            }`}
                            title={!po.orderAcceptanceNumber ? 'Open OA Form to commit delivery date' : 'Open OA Form'}
                          >
                            <FileText size={12} />
                            <span>{!po.orderAcceptanceNumber ? 'Create OA' : 'OA Form'}</span>
                          </button>

                          {/* Time Lock Countdown or Locked Indicator */}
                          {(() => {
                            const lockInfo = getPoTimeLockInfo(po);
                            return (
                              <div className="flex items-center gap-1.5">
                                {!lockInfo.isLocked ? (
                                  <>
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-bold whitespace-nowrap"
                                      title={`Time remaining to edit or delete this PO (${lockInfo.limitMinutes}m limit configured in Master Policy)`}
                                    >
                                      <Clock size={11} className="text-amber-600 animate-pulse shrink-0" />
                                      <span>{lockInfo.countdownLabel}</span>
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(po)}
                                      className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                      title="Edit PO"
                                    >
                                      <Edit size={14} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setPoToDelete(po)}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Delete PO"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-semibold whitespace-nowrap"
                                    title={
                                      lockInfo.isStageLocked
                                        ? 'PO is converted to project and permanently locked'
                                        : `Edit & delete window expired (${lockInfo.limitMinutes}m limit reached as per CRM Master Policy)`
                                    }
                                  >
                                    <Lock size={10} className="text-slate-400 shrink-0" />
                                    <span>Locked</span>
                                  </span>
                                )}
                              </div>
                            );
                          })()}
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

      {/* ===================================================================== */}
      {/* 3B. EXPANSIVE MODAL: CUSTOMER PO PREVIEW DOSSIER                      */}
      {/* ===================================================================== */}
      {previewingCustomerPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                      Customer PO Dossier
                    </h3>
                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
                      {previewingCustomerPo.poNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                        getStatusBadge(previewingCustomerPo.status).badgeClass
                      }`}
                    >
                      {getStatusBadge(previewingCustomerPo.status).label}
                    </span>

                    {/* Master Time Lock Countdown in Dossier Header */}
                    {(() => {
                      const lock = getPoTimeLockInfo(previewingCustomerPo);
                      return !lock.isLocked ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-bold"
                          title={`Time window to edit or delete (${lock.limitMinutes}m limit from Master Policy)`}
                        >
                          <Clock size={11} className="text-amber-600 animate-pulse" />
                          <span>Edit/Delete: {lock.countdownLabel} left</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-semibold"
                          title={
                            lock.isStageLocked
                              ? 'PO is converted to project and permanently locked'
                              : `Edit & delete window expired (${lock.limitMinutes}m limit reached as per CRM Master Policy)`
                          }
                        >
                          <Lock size={10} className="text-slate-400" />
                          <span>Locked</span>
                        </span>
                      );
                    })()}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Complete records for {previewingCustomerPo.companyName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingCustomerPo(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Customer Master Profile */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-orange-500" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Customer Profile &amp; Contact Details
                    </h4>
                  </div>
                  {previewingCustomerPo.customerId && (
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">
                      Ref ID: {previewingCustomerPo.customerId}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Company Name
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                      {previewingCustomerPo.companyName}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Primary Contact Person
                    </span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {previewingCustomerPo.customerName || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      GSTIN / Tax ID
                    </span>
                    <span className="font-mono font-bold text-slate-900 block mt-0.5">
                      {previewingCustomerPo.gstin || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Contact Phone
                    </span>
                    <span className="font-medium text-slate-700 block mt-0.5">
                      {previewingCustomerPo.contactPhone || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Contact Email
                    </span>
                    <span className="font-medium text-slate-700 block mt-0.5">
                      {previewingCustomerPo.contactEmail || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Committed Delivery
                    </span>
                    <span className="font-semibold text-orange-600 block mt-0.5">
                      {previewingCustomerPo.deliveryCommitmentDate
                        ? formatDateDDMMYYYY(previewingCustomerPo.deliveryCommitmentDate)
                        : 'Pending OA Generation'}
                    </span>
                  </div>

                  <div className="md:col-span-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Billing Address
                    </span>
                    <p className="text-slate-600 font-medium mt-0.5 leading-relaxed whitespace-pre-line">
                      {previewingCustomerPo.billingAddress || '—'}
                    </p>
                  </div>

                  <div className="md:col-span-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Shipping / Delivery Address
                    </span>
                    <p className="text-slate-600 font-medium mt-0.5 leading-relaxed whitespace-pre-line">
                      {previewingCustomerPo.shippingAddress || previewingCustomerPo.billingAddress || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Order & Milestone Reference Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    PO Date
                  </span>
                  <span className="text-sm font-bold text-slate-900 block mt-1">
                    {formatDateDDMMYYYY(previewingCustomerPo.poDate)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Order Acceptance (OA)
                  </span>
                  {previewingCustomerPo.orderAcceptanceNumber ? (
                    <span className="text-sm font-mono font-bold text-orange-600 block mt-1">
                      {previewingCustomerPo.orderAcceptanceNumber}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 block mt-1">
                      Pending Generation
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Work Order / Project ID
                  </span>
                  {previewingCustomerPo.convertedProjectId ? (
                    <span className="text-sm font-mono font-bold text-emerald-700 block mt-1">
                      {previewingCustomerPo.convertedProjectId}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 block mt-1">
                      Not Converted Yet
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Contract Value
                  </span>
                  <span className="text-sm font-mono font-extrabold text-slate-900 block mt-1">
                    {formatINR(
                      previewingCustomerPo.totalAmount?.baseAmountINR ??
                        previewingCustomerPo.totalAmount?.amount ??
                        0
                    )}
                  </span>
                </div>
              </div>

              {/* Section 3: Machine & Line Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PackageCheck size={16} className="text-orange-500" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Ordered Equipment &amp; Accessories ({previewingCustomerPo.items?.length || 0} Items)
                    </h4>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-4">Item &amp; Description</th>
                        <th className="py-2.5 px-3 text-center w-20">Qty</th>
                        <th className="py-2.5 px-3 text-right w-28">Unit Price</th>
                        <th className="py-2.5 px-3 text-center w-20">GST %</th>
                        <th className="py-2.5 px-4 text-right w-32">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(previewingCustomerPo.items || []).map((it, idx) => {
                        const isExtra = it.qtyType === 'EXTRA';
                        const totalVal = it.totalAmount?.amount ?? it.totalAmount ?? 0;
                        const unitVal = it.unitPrice?.amount ?? it.unitPrice ?? 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 text-center font-bold text-slate-400">
                              {it.slNo || idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">
                                  {it.modelCode || it.description}
                                </span>
                                {isExtra && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                    Extra / Tooling
                                  </span>
                                )}
                              </div>
                              {it.specifications && (
                                <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-line leading-relaxed">
                                  {it.specifications}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-800">
                              {isExtra ? 'Extra' : `${it.quantity || 1} ${it.uom || 'No.'}`}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-700">
                              {formatINR(unitVal)}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-slate-600">
                              {it.taxRate ?? 18}%
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              {formatINR(totalVal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary */}
                <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-200 flex flex-col items-end gap-1.5 text-xs">
                  <div className="flex items-center justify-between w-64 text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatINR(previewingCustomerPo.subtotalAmount?.amount ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between w-64 text-slate-600">
                    <span>Total GST:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatINR(previewingCustomerPo.totalTaxAmount?.amount ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between w-64 border-t border-slate-300 pt-1.5 text-slate-900 font-bold">
                    <span>Grand Total:</span>
                    <span className="font-mono font-extrabold text-orange-600 text-sm">
                      {formatINR(
                        previewingCustomerPo.totalAmount?.baseAmountINR ??
                          previewingCustomerPo.totalAmount?.amount ??
                          0
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Attached Files & Notes */}
              {(previewingCustomerPo.pdfUrl ||
                previewingCustomerPo.presignedDownloadUrl ||
                (previewingCustomerPo.photos && previewingCustomerPo.photos.length > 0) ||
                previewingCustomerPo.notes) && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Official PO Document (PDF) Card */}
                    {(() => {
                      const docUrl = (previewingCustomerPo.presignedDownloadUrl || previewingCustomerPo.pdfUrl || '').trim();
                      if (!docUrl || docUrl.startsWith('blob:')) return null;
                      return (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                <FileText size={14} />
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Official PO Document (PDF)
                              </span>
                            </div>
                            <p className="text-slate-600 text-xs mb-3 font-medium">
                              Customer purchase order contract copy archived for engineering and billing records.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={() =>
                                setMediaViewerModal({
                                  isOpen: true,
                                  type: 'pdf',
                                  url: docUrl,
                                  title: `Purchase Order - ${previewingCustomerPo.poNumber}`
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold transition-all shadow-2xs cursor-pointer"
                            >
                              <Eye size={14} className="text-orange-500" />
                              <span>Preview Document</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadFile(
                                  docUrl,
                                  `Customer_PO_${previewingCustomerPo.poNumber}.pdf`
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold transition-all shadow-2xs cursor-pointer"
                            >
                              <Download size={14} className="text-slate-500" />
                              <span>Download PDF</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Special Instructions / Notes */}
                    {previewingCustomerPo.notes && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Special Instructions / Notes
                        </span>
                        <p className="text-slate-700 whitespace-pre-line leading-relaxed font-medium">
                          {previewingCustomerPo.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Attached Photos Gallery */}
                  {previewingCustomerPo.photos && previewingCustomerPo.photos.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                            <ImageIcon size={14} />
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Attached PO & Machine Photos ({previewingCustomerPo.photos.length})
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">Click photo to preview or download</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {previewingCustomerPo.photos.map((photoUrl, pIdx) => (
                          <div
                            key={pIdx}
                            className="group relative rounded-xl overflow-hidden border border-slate-200 bg-white aspect-square shadow-2xs"
                          >
                            <img
                              src={photoUrl}
                              alt={`PO Attachment ${pIdx + 1}`}
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            {/* Hover Action Overlay */}
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setMediaViewerModal({
                                    isOpen: true,
                                    type: 'image',
                                    url: photoUrl,
                                    title: `PO ${previewingCustomerPo.poNumber} - Photo ${pIdx + 1}`,
                                    galleryImages: previewingCustomerPo.photos,
                                    currentGalleryIndex: pIdx
                                  })
                                }
                                className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 transition-colors cursor-pointer shadow-xs"
                                title="Preview Photo"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadFile(
                                    photoUrl,
                                    `Customer_PO_${previewingCustomerPo.poNumber}_Photo_${pIdx + 1}.jpg`
                                  )
                                }
                                className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 transition-colors cursor-pointer shadow-xs"
                                title="Download Photo"
                              >
                                <Download size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section 5: Universal Audit Tracking */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-slate-400" />
                  <span>
                    Created by:{' '}
                    <strong className="text-slate-700">
                      {previewingCustomerPo.createdByName || previewingCustomerPo.createdBy?.name || 'System'}
                    </strong>{' '}
                    on{' '}
                    {previewingCustomerPo.createdAt
                      ? new Date(previewingCustomerPo.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })
                      : '—'}
                  </span>
                </div>
                {previewingCustomerPo.updatedByName && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    <span>
                      Updated by:{' '}
                      <strong className="text-slate-700">{previewingCustomerPo.updatedByName}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setPreviewingCustomerPo(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Close Dossier
              </button>

              <div className="flex items-center gap-2">
                {!previewingCustomerPo.orderAcceptanceNumber || previewingCustomerPo.status === 'RECEIVED' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const po = previewingCustomerPo;
                      setPreviewingCustomerPo(null);
                      handleOpenGenerateOa(po);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <FileText size={14} />
                    <span>Generate Order Acceptance</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const po = previewingCustomerPo;
                      setPreviewingCustomerPo(null);
                      handleOpenGenerateOa(po);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <FileText size={14} />
                    <span>Open OA Form</span>
                  </button>
                )}

                {!getPoTimeLockInfo(previewingCustomerPo).isLocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      const po = previewingCustomerPo;
                      setPreviewingCustomerPo(null);
                      handleOpenEditModal(po);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Edit size={14} />
                    <span>Edit PO</span>
                  </button>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 font-semibold text-xs cursor-not-allowed"
                    title="Edit window has expired as per Master Policy"
                  >
                    <Lock size={13} />
                    <span>Edit Locked</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. EXPANSIVE MODAL: ADD / EDIT CUSTOMER PO & ORDER ACCEPTANCE         */}
      {/* ===================================================================== */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Top Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                  {editingPoId ? 'Edit Customer Purchase Order' : 'New Customer Purchase Order'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSavePoAndOa} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5">
                  <AlertOctagon size={16} className="text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* SECTION 1: CUSTOMER FROM MASTER & PO REFERENCE */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-orange-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      1. Customer Selection &amp; PO Reference
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Sourced from Customer Master
                  </span>
                </div>

                {/* Top Grid: PO No, PO Date, Target Delivery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Purchase Order No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="60/SAWIPL/PO/25-26"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Purchase Order Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Target Delivery Date
                    </label>
                    <input
                      type="date"
                      value={deliveryCommitmentDate}
                      onChange={(e) => setDeliveryCommitmentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Customer Selection from Master: Searchable Combobox or Selected Summary Card */}
                {selectedCustomerId && companyName ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
                          <Building2 size={20} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 border border-orange-200">
                              {selectedCustomer?.customerCode || 'CUSTOMER'}
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-900">{companyName}</h4>
                          </div>
                          <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-slate-600">
                            {customerName && (
                              <span className="flex items-center gap-1 font-medium">
                                <span className="text-slate-400">Contact:</span> {customerName}
                              </span>
                            )}
                            {contactPhone && (
                              <span className="flex items-center gap-1 font-medium">
                                <span className="text-slate-400">Phone:</span> {contactPhone}
                              </span>
                            )}
                            {contactEmail && (
                              <span className="flex items-center gap-1 font-medium">
                                <span className="text-slate-400">Email:</span> {contactEmail}
                              </span>
                            )}
                            {gstin && (
                              <span className="flex items-center gap-1 font-mono font-bold text-slate-800">
                                <span className="text-slate-400 font-sans font-normal">GSTIN:</span> {gstin}
                              </span>
                            )}
                          </div>
                          {billingAddress && (
                            <p className="text-xs text-slate-500 line-clamp-2 pt-0.5">
                              <span className="font-semibold text-slate-600">Address:</span> {billingAddress}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId('');
                          setCompanyName('');
                          setCustomerName('');
                          setContactEmail('');
                          setContactPhone('');
                          setBillingAddress('');
                          setShippingAddress('');
                          setGstin('');
                          setCustomerSearchQuery('');
                          setIsCustomerDropdownOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-600 hover:text-orange-600 text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        <Edit size={13} />
                        <span>Change</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Customer from Master *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search size={15} />
                      </div>
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setIsCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        placeholder="Search customer by code, company name, contact person, city, or GSTIN..."
                        className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500 shadow-2xs"
                      />
                      {customerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCustomerSearchQuery('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Dropdown Popover */}
                    {isCustomerDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setIsCustomerDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-30 divide-y divide-slate-100">
                          {filteredCustomerMasterList.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500">
                              No matching customers found in Customer Master.
                            </div>
                          ) : (
                            filteredCustomerMasterList.map((c) => (
                              <button
                                key={c._id || c.id}
                                type="button"
                                onClick={() => {
                                  handleSelectCustomerFromMaster(c._id || c.id || '');
                                  setIsCustomerDropdownOpen(false);
                                  setCustomerSearchQuery('');
                                }}
                                className="w-full text-left p-3 hover:bg-orange-50/60 transition-colors flex items-start justify-between gap-3 cursor-pointer group"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 group-hover:bg-orange-100 group-hover:text-orange-700">
                                      {c.customerCode}
                                    </span>
                                    <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600">
                                      {c.companyName}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                                    {c.primaryContact?.name && (
                                      <span>Contact: {c.primaryContact.name}</span>
                                    )}
                                    {c.billingAddress?.city && (
                                      <span>City: {c.billingAddress.city}</span>
                                    )}
                                    {c.gstin && (
                                      <span className="font-mono">GSTIN: {c.gstin}</span>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight size={14} className="text-slate-300 group-hover:text-orange-500 shrink-0 mt-1" />
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 2: ORDER ACCEPTANCE LINE ITEMS TABLE (MACHINES, PARTS & "EXTRA" ACCESSORIES) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-orange-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      2. Machines, Sub-Specifications &amp; Extra Accessories
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddLineItem('NUMERIC')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Machine / Item</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddLineItem('EXTRA')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add &quot;Extra&quot; Accessory</span>
                    </button>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 w-12 text-center">Sl. No.</th>
                        <th className="py-2.5 px-3 w-[260px] min-w-[240px] max-w-[280px]">
                          Description &amp; Part ID
                        </th>
                        <th className="py-2.5 px-3 w-28 text-center">HSN</th>
                        <th className="py-2.5 px-3 w-32">Qty Mode</th>
                        <th className="py-2.5 px-3 w-24 text-center">Qty</th>
                        <th className="py-2.5 px-3 w-24 text-center">UOM</th>
                        <th className="py-2.5 px-3 w-36 text-right">Unit Price (₹)</th>
                        <th className="py-2.5 px-3 w-40 text-right">Total Amount (₹)</th>
                        <th className="py-2.5 px-2 w-10 text-center">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 align-top">
                      {lineItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                            {idx + 1}
                          </td>

                          {/* Description & Multi-line "With: a, b, c, d" Specifications */}
                          <td className="py-2.5 px-3 w-[260px] min-w-[240px] max-w-[280px] space-y-2">
                            {machineCatalog.length > 0 && item.qtyType === 'NUMERIC' && (
                              <select
                                value={item.modelCode}
                                onChange={(e) => handleSelectProductForLineItem(item.id, e.target.value)}
                                className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:border-orange-500 cursor-pointer"
                              >
                                <option value="">-- Pick from Machine Catalog or Type Below --</option>
                                {machineCatalog.map((m) => (
                                  <option key={m.modelCode} value={m.modelCode}>
                                    {m.modelCode} — {m.modelName}
                                  </option>
                                ))}
                              </select>
                            )}

                            <input
                              type="text"
                              required
                              placeholder="e.g. Coil Winding Machine Model : MHT - 1300"
                              value={item.description}
                              onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:border-orange-500"
                            />

                            <textarea
                              rows={2}
                              placeholder="Optional sub-specifications (e.g. With: a. Controller... b. Ball screw...)"
                              value={item.specifications}
                              onChange={(e) =>
                                handleLineItemChange(item.id, 'specifications', e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 focus:outline-hidden focus:bg-white focus:border-orange-500"
                            />
                          </td>

                          {/* HSN */}
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              placeholder="8479"
                              value={item.hsnCode}
                              onChange={(e) => handleLineItemChange(item.id, 'hsnCode', e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 text-center"
                            />
                          </td>

                          {/* Qty Type (Standard vs Extra vs Included) */}
                          <td className="py-2.5 px-3">
                            <select
                              value={item.qtyType}
                              onChange={(e) =>
                                handleLineItemChange(item.id, 'qtyType', e.target.value as PoItemQtyType)
                              }
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
                            >
                              <option value="NUMERIC">Numeric Qty</option>
                              <option value="EXTRA">Extra</option>
                              <option value="INCLUDED">Included</option>
                            </select>
                          </td>

                          {/* Qty */}
                          <td className="py-2.5 px-3 text-center">
                            {item.qtyType === 'NUMERIC' ? (
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleLineItemChange(item.id, 'quantity', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 text-center"
                              />
                            ) : (
                              <span className="inline-block px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                                {item.qtyType === 'EXTRA' ? 'Extra' : 'Included'}
                              </span>
                            )}
                          </td>

                          {/* UOM */}
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              placeholder={item.qtyType === 'EXTRA' ? '—' : 'No.'}
                              value={item.uom}
                              onChange={(e) => handleLineItemChange(item.id, 'uom', e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 text-center"
                            />
                          </td>

                          {/* Unit Price */}
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min={0}
                              disabled={item.qtyType !== 'NUMERIC'}
                              value={item.unitPrice}
                              onChange={(e) => handleLineItemChange(item.id, 'unitPrice', e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-900 text-right disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>

                          {/* Total Amount */}
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min={0}
                              disabled={item.qtyType !== 'NUMERIC'}
                              value={item.totalAmount}
                              onChange={(e) => handleLineItemChange(item.id, 'totalAmount', e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-orange-700 text-right disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>

                          {/* Remove */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* =============================================================== */}
                {/* SIMPLIFIED COMMERCIAL PRICING & TAXATION SETUP                   */}
                {/* =============================================================== */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-700 border border-orange-300/40 flex items-center justify-center shrink-0">
                        <IndianRupee size={15} />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 tracking-tight block">
                          Commercial Terms &amp; Taxes
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Configure packing, transportation, and GST breakdown
                        </span>
                      </div>
                    </div>

                    {/* Lump-Sum Override Trigger */}
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isLumpSumTotal}
                        onChange={(e) => {
                          setIsLumpSumTotal(e.target.checked);
                          if (e.target.checked && lumpSumGrandTotal === 0) {
                            setLumpSumSubtotal(computedTotals.taxableAmount || computedTotals.subtotal);
                            setLumpSumTax(computedTotals.tax);
                            setLumpSumGrandTotal(computedTotals.grandTotal);
                          }
                        }}
                        className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span>Manual Lump-Sum Override</span>
                    </label>
                  </div>

                  {isLumpSumTotal ? (
                    /* Manual Lump-Sum Override Inputs */
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Subtotal (₹)
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={lumpSumSubtotal}
                          onChange={(e) => {
                            const sub = Number(e.target.value) || 0;
                            const tax = Math.round((sub * Number(taxRate || 18)) / 100);
                            setLumpSumSubtotal(sub);
                            setLumpSumTax(tax);
                            setLumpSumGrandTotal(sub + tax);
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          GST Tax (₹)
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={lumpSumTax}
                          onChange={(e) => {
                            const tax = Number(e.target.value) || 0;
                            setLumpSumTax(tax);
                            setLumpSumGrandTotal(lumpSumSubtotal + tax);
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-orange-800 uppercase block mb-1">
                          Grand Total (₹)
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={lumpSumGrandTotal}
                          onChange={(e) => setLumpSumGrandTotal(Number(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 bg-white border border-orange-300 rounded-xl text-xs font-mono font-black text-orange-700 focus:outline-hidden focus:border-orange-500"
                        />
                      </div>
                    </div>
                  ) : (
                    /* 3 Simple Setup Cards */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                      {/* CARD 1: PACKING */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-2xs">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800">1. Packing &amp; Forwarding</span>
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {packingType === 'INCLUDED' ? 'Inclusive' : formatINR(computedTotals.packingAmount)}
                            </span>
                          </div>

                          {/* Packing Dropdown */}
                          <select
                            value={packingType}
                            onChange={(e) => {
                              const val = e.target.value as 'INCLUDED' | 'FIXED' | 'PERCENT';
                              setPackingType(val);
                              if (val === 'INCLUDED') setPackingValue(0);
                              else if (val === 'PERCENT' && !packingValue) setPackingValue(2);
                              else if (val === 'FIXED' && !packingValue) setPackingValue(5000);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-orange-500 cursor-pointer"
                          >
                            <option value="INCLUDED">Inclusive (In Machine Price)</option>
                            <option value="FIXED">Extra Charges (Fixed ₹)</option>
                            <option value="PERCENT">Extra Rate (% of Items)</option>
                          </select>

                          {/* Extra Charges Input */}
                          {packingType !== 'INCLUDED' && (
                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-slate-500 font-medium">
                                {packingType === 'PERCENT' ? 'Packing Rate (%):' : 'Packing Charges:'}
                              </span>
                              <div className="flex items-center gap-1">
                                {packingType === 'FIXED' && <span className="text-xs text-slate-500 font-bold">₹</span>}
                                <input
                                  type="number"
                                  min={0}
                                  step={packingType === 'PERCENT' ? '0.5' : '100'}
                                  value={packingValue}
                                  onChange={(e) => setPackingValue(Number(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-right focus:outline-hidden focus:border-orange-500"
                                />
                                {packingType === 'PERCENT' && <span className="text-xs text-slate-500 font-bold">%</span>}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Small Toggle Button: Add GST or No GST */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 font-medium">GST on Packing?</span>
                          <button
                            type="button"
                            onClick={() => setIsPackingGstApplicable((prev) => !prev)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              isPackingGstApplicable
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            <span>{isPackingGstApplicable ? '✓ Add GST' : 'No GST (Exempt)'}</span>
                          </button>
                        </div>
                      </div>

                      {/* CARD 2: TRANSPORTATION */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-2xs">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800">2. Transportation / Freight</span>
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {transportationType === 'BUYER_ACTUALS'
                                ? 'To Buyer'
                                : transportationType === 'INCLUDED'
                                ? 'Inclusive'
                                : formatINR(computedTotals.transportationAmount)}
                            </span>
                          </div>

                          {/* Transportation Dropdown */}
                          <select
                            value={transportationType}
                            onChange={(e) => {
                              const val = e.target.value as 'BUYER_ACTUALS' | 'INCLUDED' | 'FIXED';
                              setTransportationType(val);
                              if (val !== 'FIXED') setTransportationValue(0);
                              else if (!transportationValue) setTransportationValue(10000);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-orange-500 cursor-pointer"
                          >
                            <option value="BUYER_ACTUALS">To Buyer / At Actuals (Ex-Works)</option>
                            <option value="INCLUDED">Inclusive (Borne by Machine House)</option>
                            <option value="FIXED">Prepaid &amp; Added to PO (Fixed ₹)</option>
                          </select>

                          {/* Extra Charges Input */}
                          {transportationType === 'FIXED' && (
                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-slate-500 font-medium">Freight Amount:</span>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-500 font-bold">₹</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={transportationValue}
                                  onChange={(e) => setTransportationValue(Number(e.target.value) || 0)}
                                  className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-right focus:outline-hidden focus:border-orange-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Small Toggle Button: Add GST or No GST */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 font-medium">GST on Freight?</span>
                          <button
                            type="button"
                            onClick={() => setIsTransportationGstApplicable((prev) => !prev)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              isTransportationGstApplicable
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            <span>{isTransportationGstApplicable ? '✓ Add GST' : 'No GST (Exempt)'}</span>
                          </button>
                        </div>
                      </div>

                      {/* CARD 3: GST (INTRA-STATE vs INTER-STATE) */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-2xs">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800">3. GST &amp; State Tax Mode</span>
                            <span className="text-[10px] font-mono font-bold text-orange-700 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200">
                              {gstCategory === 'INTRA_STATE' ? 'CGST + SGST' : 'IGST'}
                            </span>
                          </div>

                          {/* Intra-State vs Inter-State Segmented Pill Buttons */}
                          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1 mb-2.5">
                            <button
                              type="button"
                              onClick={() => setGstCategory('INTRA_STATE')}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                                gstCategory === 'INTRA_STATE'
                                  ? 'bg-orange-500 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                              }`}
                            >
                              Intra-State
                            </button>
                            <button
                              type="button"
                              onClick={() => setGstCategory('INTER_STATE')}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                                gstCategory === 'INTER_STATE'
                                  ? 'bg-orange-500 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                              }`}
                            >
                              Inter-State
                            </button>
                          </div>

                          {/* GST Rate & Inclusive/Extra in 1 row */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                GST Rate
                              </span>
                              <select
                                value={taxRate}
                                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-orange-500 cursor-pointer"
                              >
                                <option value={18}>18% (Standard)</option>
                                <option value={12}>12%</option>
                                <option value={5}>5%</option>
                                <option value={28}>28%</option>
                                <option value={0}>0% (Zero)</option>
                              </select>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                Calculation
                              </span>
                              <select
                                value={isGstIncluded ? 'INCLUDED' : 'EXTRA'}
                                onChange={(e) => setIsGstIncluded(e.target.value === 'INCLUDED')}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-orange-500 cursor-pointer"
                              >
                                <option value="EXTRA">GST Extra (+)</option>
                                <option value="INCLUDED">GST Included</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-medium">
                          {gstCategory === 'INTRA_STATE' ? (
                            <span>
                              Split: CGST ({(taxRate / 2).toFixed(1).replace(/\.0$/, '')}%) + SGST ({(taxRate / 2).toFixed(1).replace(/\.0$/, '')}%)
                            </span>
                          ) : (
                            <span>Single Tax: IGST ({taxRate}%)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Clean, Simple Summary Slip */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Items Subtotal</span>
                        <span className="font-mono font-bold text-slate-900 block mt-0.5">
                          {formatINR(computedTotals.itemsSubtotal)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Packing Charges</span>
                        <span className="font-mono font-bold text-slate-700 block mt-0.5">
                          {packingType === 'INCLUDED' ? 'Inclusive' : formatINR(computedTotals.packingAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Transportation</span>
                        <span className="font-mono font-bold text-slate-700 block mt-0.5">
                          {transportationType === 'BUYER_ACTUALS'
                            ? 'To Buyer'
                            : transportationType === 'INCLUDED'
                            ? 'Inclusive'
                            : formatINR(computedTotals.transportationAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Taxable Total</span>
                        <span className="font-mono font-bold text-slate-900 block mt-0.5">
                          {formatINR(computedTotals.taxableAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-0.5">
                      {/* Taxes Breakdown */}
                      <div className="flex items-center gap-4 flex-wrap text-xs">
                        <span className="text-[11px] font-bold text-slate-600">Tax Breakdown:</span>
                        {gstCategory === 'INTRA_STATE' ? (
                          <>
                            <div className="bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              <span className="text-amber-800 font-medium">CGST ({(taxRate / 2).toFixed(1).replace(/\.0$/, '')}%): </span>
                              <span className="font-mono font-bold text-amber-950">{formatINR(computedTotals.cgstAmount)}</span>
                            </div>
                            <div className="bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              <span className="text-amber-800 font-medium">SGST ({(taxRate / 2).toFixed(1).replace(/\.0$/, '')}%): </span>
                              <span className="font-mono font-bold text-amber-950">{formatINR(computedTotals.sgstAmount)}</span>
                            </div>
                          </>
                        ) : (
                          <div className="bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            <span className="text-amber-800 font-medium">IGST ({taxRate}%): </span>
                            <span className="font-mono font-bold text-amber-950">{formatINR(computedTotals.igstAmount)}</span>
                          </div>
                        )}
                        <span className="text-slate-500 font-mono text-[11px]">
                          (Total Tax: {formatINR(computedTotals.tax)})
                        </span>
                      </div>

                      {/* Full Grand Total Card */}
                      <div className="flex items-center gap-2.5 self-end sm:self-auto">
                        <span className="text-xs font-extrabold text-orange-950 uppercase">Full Total:</span>
                        <div className="px-3.5 py-1.5 rounded-xl bg-orange-500 text-white font-mono font-black text-sm sm:text-base shadow-xs">
                          {formatINR(computedTotals.grandTotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer PO Dual Attachments: PDF Document & Photos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. PDF Document Upload & Controls Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Customer PO Document (PDF)
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Official client purchase order copy
                          </span>
                        </div>
                      </div>
                      {(selectedPdfFile || pdfPreviewUrl) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          PDF Attached
                        </span>
                      )}
                    </div>

                    {selectedPdfFile || pdfPreviewUrl ? (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold shrink-0 font-mono">
                            PDF
                          </span>
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {selectedPdfFile ? selectedPdfFile.name : 'Attached_Customer_PO.pdf'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setMediaViewerModal({
                                isOpen: true,
                                type: 'pdf',
                                url: pdfPreviewUrl || (selectedPdfFile ? URL.createObjectURL(selectedPdfFile) : ''),
                                title: selectedPdfFile?.name || `PO Document - ${poNumber || 'New PO'}`
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer border border-slate-200"
                            title="Preview PDF"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadFile(
                                pdfPreviewUrl || (selectedPdfFile ? URL.createObjectURL(selectedPdfFile) : ''),
                                selectedPdfFile?.name || `Customer_PO_${poNumber || 'Document'}.pdf`
                              )
                            }
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPdfFile(null);
                              setPdfPreviewUrl('');
                              setPastedPdfUrl('');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer border border-slate-200"
                            title="Remove PDF"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-white/50 text-center mb-3">
                        <span className="text-xs text-slate-500 font-medium block">
                          No PDF attached yet. Upload the official PO copy.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-end">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-white text-slate-700 hover:text-orange-600 text-xs font-bold transition-colors cursor-pointer shadow-2xs">
                      <Upload size={14} />
                      <span>{selectedPdfFile || pdfPreviewUrl ? 'Change PDF' : 'Upload PO PDF'}</span>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handlePdfFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* 2. Photo Attachments Gallery Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                          <ImageIcon size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            PO & Machine Photos (Images)
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Component, site or machine specification photos
                          </span>
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-600 text-xs font-bold transition-colors cursor-pointer shadow-2xs">
                        <Upload size={13} />
                        <span>Add Photos</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoFilesChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {photos.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-40 overflow-y-auto p-1 bg-white border border-slate-200 rounded-xl">
                        {photos.map((pUrl, idx) => (
                          <div
                            key={idx}
                            className="group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-square"
                          >
                            <img
                              src={pUrl}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover transition-transform duration-150 group-hover:scale-105"
                            />
                            {/* Hover Controls */}
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setMediaViewerModal({
                                    isOpen: true,
                                    type: 'image',
                                    url: pUrl,
                                    title: `PO Attachment Photo ${idx + 1}`,
                                    galleryImages: photos,
                                    currentGalleryIndex: idx
                                  })
                                }
                                className="p-1 rounded bg-white/90 hover:bg-white text-slate-900 transition-colors cursor-pointer shadow-xs"
                                title="Preview Photo"
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadFile(pUrl, `PO_${poNumber || 'Attachment'}_Photo_${idx + 1}.jpg`)
                                }
                                className="p-1 rounded bg-white/90 hover:bg-white text-slate-900 transition-colors cursor-pointer shadow-xs"
                                title="Download Photo"
                              >
                                <Download size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                className="p-1 rounded bg-white/90 hover:bg-red-50 text-red-600 transition-colors cursor-pointer shadow-xs"
                                title="Delete Photo"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-white/50 text-center mb-3">
                        <span className="text-xs text-slate-500 font-medium block">
                          No photos attached. Click 'Add Photos' to upload images (JPG, PNG, WebP).
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{photos.length} photo(s) selected</span>
                    {photos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotos([]);
                          setSelectedPhotoFiles([]);
                        }}
                        className="text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                      >
                        Clear All Photos
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-600 font-medium">
                  Contract Total:{' '}
                  <span className="font-mono font-black text-slate-900">
                    {formatINR(computedTotals.grandTotal)}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingPo || isUpdatingPo || isUploadingS3}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isCreatingPo || isUpdatingPo || isUploadingS3 ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Saving Purchase Order...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>{editingPoId ? 'Update Purchase Order' : 'Save Purchase Order'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4B. DEDICATED MODAL: GENERATE ORDER ACCEPTANCE                        */}
      {/* ===================================================================== */}
      {generateOaTargetPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                      Generate Order Acceptance
                    </h3>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
                      {generateOaTargetPo.poNumber}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Accept PO &amp; commit delivery schedule for {generateOaTargetPo.companyName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGenerateOaTargetPo(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmGenerateOa} className="p-6 space-y-4 overflow-y-auto">
              {genOaError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertOctagon size={16} className="text-red-600 shrink-0" />
                  <span>{genOaError}</span>
                </div>
              )}

              {/* PO Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{generateOaTargetPo.companyName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">PO Number &amp; Date:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {generateOaTargetPo.poNumber}{' '}
                    <span className="text-slate-500 font-normal">
                      ({formatDateDDMMYYYY(generateOaTargetPo.poDate)})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-slate-500">Contract Total:</span>
                  <span className="font-mono font-extrabold text-orange-600 text-sm">
                    {formatINR(
                      generateOaTargetPo.totalAmount?.baseAmountINR ??
                        generateOaTargetPo.totalAmount?.amount ??
                        0
                    )}
                  </span>
                </div>
              </div>

              {/* Delivery Commitment & OA Number Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center gap-1">
                    <span>Committed Delivery Date *</span>
                    <span className="text-orange-600 font-normal text-[11px]">(Required)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={genOaCommitDate}
                    onChange={(e) => setGenOaCommitDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-orange-400 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-orange-600 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Order Acceptance Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={genOaDate}
                    onChange={(e) => setGenOaDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-orange-500 shadow-2xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Order Acceptance (OA) Number *
                    </label>
                    <button
                      type="button"
                      onClick={() => setGenOaNumber(computeAutoOaNumber(generateOaTargetPo))}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                      title="Regenerate OA number using Master Prefix + DDMM + last 4 digits of PO"
                    >
                      <RotateCcw size={11} />
                      <span>Auto-Generate (8-digit)</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={genOaNumber}
                    onChange={(e) => setGenOaNumber(e.target.value)}
                    placeholder="e.g. OA-0811-1048"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-orange-500 shadow-2xs uppercase"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Format: Master Prefix + 4-digit date (DDMM) + last 4 digits of PO number.
                  </p>
                </div>
              </div>

              {/* Accepted Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <PackageCheck size={14} className="text-orange-500" />
                    <span>Accepted Line Items ({(generateOaTargetPo.items || []).length})</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-700">
                    Total:{' '}
                    {formatINR(
                      generateOaTargetPo.totalAmount?.baseAmountINR ??
                        generateOaTargetPo.totalAmount?.amount ??
                        0
                    )}
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <th className="py-2 px-2.5 text-center w-10">#</th>
                        <th className="py-2 px-3">Description &amp; Specifications</th>
                        <th className="py-2 px-2.5 text-center w-20">Qty</th>
                        <th className="py-2 px-3 text-right w-28">Unit Price</th>
                        <th className="py-2 px-3 text-right w-32">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(generateOaTargetPo.items || []).map((it, idx) => {
                        const isExtra = it.qtyType === 'EXTRA';
                        const rowAmt = Number(
                          it.totalAmount?.amount ?? it.totalAmount ?? it.lineTotal?.amount ?? it.lineTotal ?? 0
                        );
                        const unitAmt = Number(it.unitPrice?.amount ?? it.unitPrice ?? 0);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-2.5 text-center font-bold text-slate-400">
                              {it.slNo || idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-900 block">
                                {it.modelCode || it.description}
                              </span>
                              {it.specifications && (
                                <span className="text-[10px] text-slate-500 truncate block max-w-sm">
                                  {it.specifications}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-center font-semibold text-slate-800">
                              {isExtra ? 'Extra' : `${it.quantity || 1} ${it.uom || 'No.'}`}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {formatINR(unitAmt)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatINR(rowAmt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Optional Note / Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Optional Note / Dispatch Remarks</span>
                  <span className="text-[10px] font-normal text-slate-400">Printed on official OA document</span>
                </label>
                <textarea
                  rows={2}
                  value={genOaNotes}
                  onChange={(e) => setGenOaNotes(e.target.value)}
                  placeholder="e.g. Surface transport dispatch, trial inspection 3 days prior to dispatch, special tooling packed in wooden box..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-orange-500 shadow-2xs resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setGenerateOaTargetPo(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isGeneratingOa}
                    onClick={() => handleConfirmGenerateOa(undefined, false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Save OA</span>
                  </button>

                  <button
                    type="button"
                    disabled={isGeneratingOa}
                    onClick={() => handleConfirmGenerateOa(undefined, true)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingOa ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Printer size={14} />
                        <span>Generate PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. OFFICIAL 2-PAGE "ORDER ACCEPTANCE" PREVIEW, PRINT & SEND MODAL     */}
      {/* ===================================================================== */}
      {selectedPoForOa && (
        <div className="oa-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
          <div className="oa-modal-card w-full max-w-6xl xl:max-w-7xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-h-none print:overflow-visible print:w-full">
            {/* Crisp White Header with Amber Top Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Order Acceptance: {selectedPoForOa.orderAcceptanceNumber || selectedPoForOa.poNumber}
                  </h3>
                  {selectedPoForOa.oaStatus === 'OA_ACKNOWLEDGED' ? (
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      OA Acknowledged
                    </span>
                  ) : selectedPoForOa.oaStatus === 'OA_SENT' ? (
                    <span className="px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold">
                      OA Sent {selectedPoForOa.oaSentToEmail ? `(${selectedPoForOa.oaSentToEmail})` : ''}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                      Draft OA
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Send OA, Mark Acknowledged, Print/PDF, Edit, Close */}
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsSendOaBoxOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <Send size={13} className="text-orange-600" />
                  <span>Send Order Acceptance</span>
                </button>

                {selectedPoForOa.oaStatus !== 'OA_ACKNOWLEDGED' && (
                  <button
                    type="button"
                    disabled={isUpdatingOaStatus}
                    onClick={() => handleUpdateOaStatus(selectedPoForOa, 'OA_ACKNOWLEDGED')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <CheckCheck size={14} />
                    <span>Mark Acknowledged</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handlePrintOrderAcceptance(selectedPoForOa)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print / Save PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = selectedPoForOa;
                    setSelectedPoForOa(null);
                    handleOpenEditModal(target);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Edit size={13} />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPoForOa(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Expandable Send Order Acceptance Bar */}
            {isSendOaBoxOpen && (
              <div className="px-6 py-3 bg-orange-50/90 border-b border-orange-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                  <Mail size={15} className="text-orange-600 shrink-0" />
                  <input
                    type="email"
                    value={sendOaEmailInput}
                    onChange={(e) => setSendOaEmailInput(e.target.value)}
                    placeholder="Customer email address for Order Acceptance..."
                    className="flex-1 max-w-md px-3 py-1.5 bg-white border border-orange-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {sendOaEmailInput && (
                    <a
                      href={`mailto:${sendOaEmailInput}?subject=${encodeURIComponent(
                        `Order Acceptance ${selectedPoForOa.orderAcceptanceNumber || ''} against PO ${selectedPoForOa.poNumber} — Machine House Technologies`
                      )}&body=${encodeURIComponent(
                        `Dear ${selectedPoForOa.customerName || selectedPoForOa.companyName},\n\nGreetings from Machine House - Winding Technologies!\n\nWe thank you for your valued Purchase Order No. ${selectedPoForOa.poNumber} dated ${formatDateDDMMYYYY(
                          selectedPoForOa.poDate
                        )}.\nPlease find attached our official Order Acceptance (${
                          selectedPoForOa.orderAcceptanceNumber || ''
                        }) dated ${formatDateDDMMYYYY(
                          selectedPoForOa.orderAcceptanceDate || selectedPoForOa.poDate
                        )}.\n\nFor Machine House Technologies\n${
                          selectedPoForOa.signatory?.signatoryName || 'Roshan M P'
                        }\n${selectedPoForOa.signatory?.signatoryPhone || '9845444962'}`
                      )}`}
                      onClick={() => handleUpdateOaStatus(selectedPoForOa, 'OA_SENT', sendOaEmailInput)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-orange-700 border border-orange-300 text-xs font-bold transition-colors"
                    >
                      <Mail size={13} />
                      <span>Open Email &amp; Mark Sent</span>
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={isUpdatingOaStatus}
                    onClick={() => handleUpdateOaStatus(selectedPoForOa, 'OA_SENT', sendOaEmailInput)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Confirm &amp; Mark OA Sent</span>
                  </button>
                </div>
              </div>
            )}

            {/* Scrollable 2-Page Official Machine House Order Acceptance Sheet */}
            <div
              id="oa-printable-document"
              className="oa-modal-body flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 space-y-8 print:p-0 print:bg-white print:space-y-0 print:overflow-visible"
            >
              {/* =============================================================== */}
              {/* PAGE 1: ORDER ACCEPTANCE HEADER, BILLING & LINE ITEMS TABLE     */}
              {/* =============================================================== */}
              <div
                className="oa-print-page oa-page-break max-w-4xl mx-auto bg-white border border-slate-400 rounded-xl shadow-md overflow-hidden flex flex-col justify-between min-h-[820px] print:shadow-none print:rounded-none print:border-slate-500 print:w-full print:max-w-none"
              >
                <div>
                  {/* Brand Nameplate Row */}
                  <div className="p-4 sm:px-6 flex items-center justify-between border-b border-slate-200">
                    <img
                      src="/branding/mh_logo_plate.png"
                      alt="Machine House Winding Technologies"
                      className="h-14 object-contain"
                    />
                  </div>

                  {/* Orange Banner: ORDER ACCEPTANCE */}
                  <div
                    className="bg-orange-400 border-y border-slate-500 py-1.5 text-center"
                    style={{
                      backgroundColor: '#fb923c',
                      color: '#020617',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <h2 className="text-sm sm:text-base font-extrabold tracking-widest text-slate-950 uppercase">
                      ORDER ACCEPTANCE
                    </h2>
                  </div>

                  {/* Billing & Shipment To Box + Purchase Order Reference Box */}
                  <div className="p-4 sm:px-6 grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Left: Billing & Shipment To */}
                    <div
                      className="md:col-span-7 bg-orange-400 border border-slate-500 p-3.5 text-xs text-slate-950 space-y-1"
                      style={{
                        backgroundColor: '#fb923c',
                        color: '#020617',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      <div className="font-extrabold">Billing &amp; Shipment To:</div>
                      <div className="font-extrabold text-sm">{selectedPoForOa.companyName}</div>
                      <div className="whitespace-pre-line font-medium leading-relaxed">
                        {selectedPoForOa.billingAddress || '—'}
                      </div>
                      {selectedPoForOa.gstin && (
                        <div className="pt-1 font-mono font-bold text-[11px]">
                          GSTIN: {selectedPoForOa.gstin}
                        </div>
                      )}
                    </div>

                    {/* Right: OA No, OA Date, PO No, PO Date, Committed Delivery Date */}
                    <div
                      className="md:col-span-5 bg-orange-400 border border-slate-500 p-3.5 text-xs text-slate-950 space-y-1.5 flex flex-col justify-center"
                      style={{
                        backgroundColor: '#fb923c',
                        color: '#020617',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      <div className="font-extrabold flex items-center justify-between">
                        <span>OA Ref No.:</span>
                        <span className="font-mono text-sm underline font-black">{selectedPoForOa.orderAcceptanceNumber || '—'}</span>
                      </div>
                      <div className="font-extrabold flex items-center justify-between">
                        <span>OA Date:</span>
                        <span className="font-mono">
                          {formatDateDDMMYYYY(selectedPoForOa.orderAcceptanceDate || selectedPoForOa.poDate)}
                        </span>
                      </div>
                      <div className="font-extrabold flex items-center justify-between border-t border-slate-600/40 pt-1">
                        <span>Purchase Order No.:</span>
                        <span className="font-mono">{selectedPoForOa.poNumber}</span>
                      </div>
                      <div className="font-extrabold flex items-center justify-between">
                        <span>Purchase Order Date:</span>
                        <span className="font-mono">{formatDateDDMMYYYY(selectedPoForOa.poDate)}</span>
                      </div>
                      <div className="font-extrabold text-slate-950 bg-white px-2 py-1 rounded border border-slate-600 mt-0.5 flex items-center justify-between">
                        <span>Committed Delivery:</span>
                        <span className="font-mono font-black text-orange-900">
                          {selectedPoForOa.deliveryCommitmentDate
                            ? formatDateDDMMYYYY(selectedPoForOa.deliveryCommitmentDate)
                            : 'To be scheduled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="px-4 sm:px-6 pb-4">
                    <table className="w-full border-collapse border border-slate-500 text-xs text-slate-900">
                      <thead>
                        <tr
                          className="bg-slate-50 font-extrabold text-center border-b border-slate-500"
                          style={{
                            backgroundColor: '#f8fafc',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact'
                          }}
                        >
                          <th className="border border-slate-500 py-2 px-2 w-14">Sl. No.</th>
                          <th className="border border-slate-500 py-2 px-3 text-center">
                            Description &amp; Part ID
                          </th>
                          <th className="border border-slate-500 py-2 px-2 w-20">HSN</th>
                          <th className="border border-slate-500 py-2 px-2 w-20">Qty</th>
                          <th className="border border-slate-500 py-2 px-2 w-20">UOM</th>
                          <th className="border border-slate-500 py-2 px-3 w-36">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedPoForOa.items || []).map((it, idx) => {
                          const isExtra =
                            it.qtyType === 'EXTRA' || String(it.qtyLabel).toUpperCase() === 'EXTRA';
                          const rowAmt = Number(
                            it.totalAmount?.amount ?? it.totalAmount ?? it.lineTotal?.amount ?? it.lineTotal ?? 0
                          );
                          return (
                            <tr key={idx} className="border-b border-slate-400 align-top">
                              <td className="border-x border-slate-500 py-2 px-2 text-center font-bold">
                                {it.slNo || idx + 1}
                              </td>
                              <td className="border-x border-slate-500 py-2 px-3">
                                <div className="font-extrabold text-slate-950">{it.description}</div>
                                {it.specifications && (
                                  <div className="mt-1.5 whitespace-pre-line text-[11px] text-slate-800 leading-relaxed pl-1">
                                    {it.specifications}
                                  </div>
                                )}
                              </td>
                              <td className="border-x border-slate-500 py-2 px-2 text-center font-mono">
                                {isExtra ? '' : it.hsnCode || '8479'}
                              </td>
                              <td className="border-x border-slate-500 py-2 px-2 text-center font-semibold">
                                {isExtra ? 'Extra' : it.qtyLabel || it.quantity || 1}
                              </td>
                              <td className="border-x border-slate-500 py-2 px-2 text-center">
                                {isExtra ? '' : it.uom || 'No.'}
                              </td>
                              <td className="border-x border-slate-500 py-2 px-3 text-right font-mono font-semibold">
                                {isExtra ? '' : formatINR(rowAmt)}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Total Row */}
                        <tr
                          className="border-t-2 border-slate-600 font-extrabold bg-slate-50"
                          style={{
                            backgroundColor: '#f8fafc',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact'
                          }}
                        >
                          <td colSpan={5} className="border border-slate-500 py-2 px-4 text-right">
                            Total
                          </td>
                          <td className="border border-slate-500 py-2 px-3 text-right font-mono text-slate-950">
                            {formatINR(
                              selectedPoForOa.totalAmount?.baseAmountINR ??
                                selectedPoForOa.totalAmount?.amount ??
                                selectedPoForOa.totalAmountINR ??
                                0
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Optional Note / Remarks on Official Document */}
                  {selectedPoForOa.notes && (
                    <div
                      className="mx-4 sm:mx-6 mb-4 p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-slate-900"
                      style={{
                        backgroundColor: '#fffbeb',
                        borderColor: '#fcd34d',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      <div className="font-extrabold text-amber-950 mb-0.5 flex items-center gap-1.5">
                        <FileText size={13} className="text-orange-600" />
                        <span>Order Acceptance Remarks / Instructions:</span>
                      </div>
                      <div className="whitespace-pre-line text-slate-800 leading-relaxed font-medium pl-4">
                        {selectedPoForOa.notes}
                      </div>
                    </div>
                  )}
                </div>

                {/* Page 1 Corporate Orange Footer */}
                <div
                  className="oa-print-footer bg-orange-400 border-t border-slate-500 px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-semibold text-slate-950"
                  style={{
                    backgroundColor: '#fb923c',
                    color: '#020617',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  <div className="whitespace-pre-line">
                    {selectedPoForOa.signatory?.companyAddress || DEFAULT_OA_SIGNATORY.companyAddress}
                  </div>
                  <div className="text-left sm:text-right space-y-0.5 shrink-0">
                    <div>{selectedPoForOa.signatory?.companyPhone || DEFAULT_OA_SIGNATORY.companyPhone}</div>
                    <div className="underline">
                      {selectedPoForOa.signatory?.companyEmail || DEFAULT_OA_SIGNATORY.companyEmail}
                    </div>
                    <div className="underline">
                      {selectedPoForOa.signatory?.companyWebsite || DEFAULT_OA_SIGNATORY.companyWebsite}
                    </div>
                  </div>
                </div>
              </div>

              {/* =============================================================== */}
              {/* PAGE 2: TECHNICAL SPECIFICATION, TERMS & CONDITIONS & BANK      */}
              {/* =============================================================== */}
              <div
                className="oa-print-page max-w-4xl mx-auto bg-white border border-slate-400 rounded-xl shadow-md overflow-hidden flex flex-col justify-between min-h-[820px] print:shadow-none print:rounded-none print:border-slate-500 print:w-full print:max-w-none"
              >
                <div>
                  {/* Brand Nameplate Row */}
                  <div className="p-4 sm:px-6 flex items-center justify-between border-b border-slate-200">
                    <img
                      src="/branding/mh_logo_plate.png"
                      alt="Machine House Winding Technologies"
                      className="h-14 object-contain"
                    />
                  </div>

                  {/* Orange Banner: TECHNICAL SPECIFICATION */}
                  <div
                    className="bg-orange-400 border-y border-slate-500 px-6 py-1.5"
                    style={{
                      backgroundColor: '#fb923c',
                      color: '#020617',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <h3 className="text-xs sm:text-sm font-extrabold tracking-wider text-slate-950 uppercase">
                      TECHNICAL SPECIFICATION
                    </h3>
                  </div>

                  <div className="px-6 py-3 text-xs text-slate-800 whitespace-pre-line min-h-[36px]">
                    {selectedPoForOa.technicalSpecifications ||
                      'As per machine configuration and technical specification listed above.'}
                  </div>

                  {/* Orange Banner: TERMS & CONDITION */}
                  <div
                    className="bg-orange-400 border-y border-slate-500 px-6 py-1.5"
                    style={{
                      backgroundColor: '#fb923c',
                      color: '#020617',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <h3 className="text-xs sm:text-sm font-extrabold tracking-wider text-slate-950 uppercase">
                      TERMS &amp; CONDITION
                    </h3>
                  </div>

                  {/* Terms & Conditions 1-11 Table */}
                  <div className="px-6 py-4">
                    <table className="w-full text-xs text-slate-900 border-collapse">
                      <tbody className="divide-y divide-slate-200">
                        {[
                          {
                            no: 1,
                            label: 'Price Basis',
                            val:
                              selectedPoForOa.termsAndConditions?.priceBasis ||
                              DEFAULT_OA_TERMS.priceBasis
                          },
                          {
                            no: 2,
                            label: 'TAX',
                            val: selectedPoForOa.termsAndConditions?.tax || DEFAULT_OA_TERMS.tax
                          },
                          {
                            no: 3,
                            label: 'Delivery',
                            val:
                              selectedPoForOa.termsAndConditions?.delivery || DEFAULT_OA_TERMS.delivery
                          },
                          {
                            no: 4,
                            label: 'Payment Terms',
                            val:
                              selectedPoForOa.termsAndConditions?.paymentTerms ||
                              selectedPoForOa.paymentTerms ||
                              DEFAULT_OA_TERMS.paymentTerms
                          },
                          {
                            no: 5,
                            label: 'Installation & Commissioning',
                            val:
                              selectedPoForOa.termsAndConditions?.installationAndCommissioning ||
                              DEFAULT_OA_TERMS.installationAndCommissioning
                          },
                          {
                            no: 6,
                            label: 'Freight',
                            val:
                              selectedPoForOa.termsAndConditions?.freight || DEFAULT_OA_TERMS.freight
                          },
                          {
                            no: 7,
                            label: 'Packaging',
                            val:
                              selectedPoForOa.termsAndConditions?.packaging ||
                              DEFAULT_OA_TERMS.packaging
                          },
                          {
                            no: 8,
                            label: 'Insurance',
                            val:
                              selectedPoForOa.termsAndConditions?.insurance ||
                              DEFAULT_OA_TERMS.insurance
                          },
                          {
                            no: 9,
                            label: 'Validity',
                            val:
                              selectedPoForOa.termsAndConditions?.validity || DEFAULT_OA_TERMS.validity
                          },
                          {
                            no: 10,
                            label: 'Warranty',
                            val:
                              selectedPoForOa.termsAndConditions?.warranty || DEFAULT_OA_TERMS.warranty
                          },
                          {
                            no: 11,
                            label: 'Mode of Payment',
                            val:
                              selectedPoForOa.termsAndConditions?.modeOfPayment ||
                              DEFAULT_OA_TERMS.modeOfPayment
                          }
                        ].map((row) => (
                          <tr key={row.no}>
                            <td className="py-1.5 pr-3 w-8 text-right font-semibold text-slate-600">
                              {row.no}
                            </td>
                            <td className="py-1.5 px-3 w-56 font-semibold text-slate-900 border-r border-slate-300">
                              {row.label}
                            </td>
                            <td className="py-1.5 pl-4 whitespace-pre-line text-slate-900 font-medium">
                              {row.val}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Bank Details Table */}
                    <div className="mt-6 pl-11">
                      <div className="font-extrabold text-xs text-slate-950 mb-1.5">Bank Details</div>
                      <table className="w-full max-w-lg text-xs text-slate-900 border-collapse">
                        <tbody>
                          <tr>
                            <td className="py-1 w-48 font-bold">Account Name</td>
                            <td className="py-1 font-extrabold">
                              {selectedPoForOa.bankDetails?.accountName ||
                                DEFAULT_OA_BANK.accountName}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 font-bold">Bank Name</td>
                            <td className="py-1 font-extrabold">
                              {selectedPoForOa.bankDetails?.bankName || DEFAULT_OA_BANK.bankName}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 font-bold">Branch</td>
                            <td className="py-1 font-extrabold">
                              {selectedPoForOa.bankDetails?.branch || DEFAULT_OA_BANK.branch}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 font-bold">Account No.</td>
                            <td className="py-1 font-mono font-extrabold">
                              {selectedPoForOa.bankDetails?.accountNo || DEFAULT_OA_BANK.accountNo}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 font-bold">IFSC Code</td>
                            <td className="py-1 font-mono font-extrabold">
                              {selectedPoForOa.bankDetails?.ifscCode || DEFAULT_OA_BANK.ifscCode}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 font-bold">GST No.</td>
                            <td className="py-1 font-mono font-extrabold">
                              {selectedPoForOa.bankDetails?.gstNo || DEFAULT_OA_BANK.gstNo}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Authorized Signatory Block */}
                    <div className="mt-6 pl-4 space-y-4 text-xs text-slate-900">
                      <div>
                        <div>For</div>
                        <div className="font-bold">
                          {selectedPoForOa.signatory?.forCompany || DEFAULT_OA_SIGNATORY.forCompany}
                        </div>
                      </div>
                      <div className="pt-2">
                        <div className="font-bold">
                          {selectedPoForOa.signatory?.signatoryName ||
                            DEFAULT_OA_SIGNATORY.signatoryName}
                        </div>
                        <div className="font-mono">
                          {selectedPoForOa.signatory?.signatoryPhone ||
                            DEFAULT_OA_SIGNATORY.signatoryPhone}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Page 2 Corporate Orange Footer */}
                <div
                  className="oa-print-footer bg-orange-400 border-t border-slate-500 px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-semibold text-slate-950"
                  style={{
                    backgroundColor: '#fb923c',
                    color: '#020617',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  <div className="whitespace-pre-line">
                    {selectedPoForOa.signatory?.companyAddress || DEFAULT_OA_SIGNATORY.companyAddress}
                  </div>
                  <div className="text-left sm:text-right space-y-0.5 shrink-0">
                    <div>{selectedPoForOa.signatory?.companyPhone || DEFAULT_OA_SIGNATORY.companyPhone}</div>
                    <div className="underline">
                      {selectedPoForOa.signatory?.companyEmail || DEFAULT_OA_SIGNATORY.companyEmail}
                    </div>
                    <div className="underline">
                      {selectedPoForOa.signatory?.companyWebsite || DEFAULT_OA_SIGNATORY.companyWebsite}
                    </div>
                  </div>
                </div>
              </div>

              {/* Record Audit & Activity Trail (Created By & Last Updated By) */}
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Created By
                      </span>
                      <span className="text-xs font-bold text-slate-900 block mt-0.5">
                        {selectedPoForOa.createdBy?.name || selectedPoForOa.createdByName || 'System'}
                      </span>
                      {selectedPoForOa.createdBy?.email && (
                        <span className="text-[11px] text-slate-500 block">
                          {selectedPoForOa.createdBy.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Created At
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                      {selectedPoForOa.createdAt
                        ? new Date(selectedPoForOa.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Last Updated By
                      </span>
                      <span className="text-xs font-bold text-slate-900 block mt-0.5">
                        {selectedPoForOa.updatedBy?.name ||
                          selectedPoForOa.updatedByName ||
                          selectedPoForOa.createdBy?.name ||
                          selectedPoForOa.createdByName ||
                          'System'}
                      </span>
                      {(selectedPoForOa.updatedBy?.email || selectedPoForOa.createdBy?.email) && (
                        <span className="text-[11px] text-slate-500 block">
                          {selectedPoForOa.updatedBy?.email || selectedPoForOa.createdBy?.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Last Updated At
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                      {selectedPoForOa.updatedAt
                        ? new Date(selectedPoForOa.updatedAt).toLocaleString('en-IN', {
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
      )}

      {/* Convert PO to Project Confirmation Modal */}
      {convertTargetPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Convert PO to Project Setup</h3>
              </div>
              <button
                type="button"
                onClick={() => setConvertTargetPo(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                <div>
                  <span className="text-slate-500">Purchase Order:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{convertTargetPo.poNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500">Customer:</span>{' '}
                  <span className="font-bold text-slate-900">{convertTargetPo.companyName}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConvertTargetPo(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteConvert(convertTargetPo._id)}
                  disabled={isConverting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>{isConverting ? 'Minting Project...' : 'Yes, Convert to Project'}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Wide Media Viewer Modal (PDF Documents & Photos) */}
      {mediaViewerModal && mediaViewerModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden my-auto">
            {/* Crisp White Header with Amber Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  {mediaViewerModal.type === 'pdf' ? <FileText size={18} /> : <ImageIcon size={18} />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900 truncate">
                    {mediaViewerModal.title}
                  </h3>
                  {mediaViewerModal.galleryImages && mediaViewerModal.galleryImages.length > 1 && (
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      Image {(mediaViewerModal.currentGalleryIndex ?? 0) + 1} of{' '}
                      {mediaViewerModal.galleryImages.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadFile(
                      mediaViewerModal.url,
                      mediaViewerModal.type === 'pdf'
                        ? `${mediaViewerModal.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
                        : `${mediaViewerModal.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  title="Download File"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaViewerModal(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden p-4 sm:p-6 bg-slate-100/60 flex flex-col items-center justify-center">
              {mediaViewerModal.type === 'pdf' ? (
                <iframe
                  src={mediaViewerModal.url}
                  title={mediaViewerModal.title}
                  className="w-full h-[76vh] rounded-xl border border-slate-200 bg-white shadow-xs"
                />
              ) : (
                <div className="relative w-full h-[74vh] flex items-center justify-center">
                  <img
                    src={mediaViewerModal.url}
                    alt={mediaViewerModal.title}
                    className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg bg-white border border-slate-200"
                  />

                  {/* Left / Right Chevrons if multi-photo gallery */}
                  {mediaViewerModal.galleryImages && mediaViewerModal.galleryImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const idx =
                            ((mediaViewerModal.currentGalleryIndex ?? 0) -
                              1 +
                              mediaViewerModal.galleryImages!.length) %
                            mediaViewerModal.galleryImages!.length;
                          setMediaViewerModal({
                            ...mediaViewerModal,
                            currentGalleryIndex: idx,
                            url: mediaViewerModal.galleryImages![idx],
                            title: `PO Attachment Photo ${idx + 1}`
                          });
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-white/90 hover:bg-white text-slate-800 border border-slate-200 shadow-lg transition-all cursor-pointer hover:scale-105"
                        title="Previous photo"
                      >
                        <ChevronLeft size={22} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const idx =
                            ((mediaViewerModal.currentGalleryIndex ?? 0) + 1) %
                            mediaViewerModal.galleryImages!.length;
                          setMediaViewerModal({
                            ...mediaViewerModal,
                            currentGalleryIndex: idx,
                            url: mediaViewerModal.galleryImages![idx],
                            title: `PO Attachment Photo ${idx + 1}`
                          });
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-white/90 hover:bg-white text-slate-800 border border-slate-200 shadow-lg transition-all cursor-pointer hover:scale-105"
                        title="Next photo"
                      >
                        <ChevronRight size={22} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Gallery Thumbnail Strip for Photos */}
            {mediaViewerModal.type === 'image' &&
              mediaViewerModal.galleryImages &&
              mediaViewerModal.galleryImages.length > 1 && (
                <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-center gap-2 overflow-x-auto shrink-0">
                  {mediaViewerModal.galleryImages.map((imgUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setMediaViewerModal({
                          ...mediaViewerModal,
                          currentGalleryIndex: i,
                          url: imgUrl,
                          title: `PO Attachment Photo ${i + 1}`
                        })
                      }
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        mediaViewerModal.currentGalleryIndex === i
                          ? 'border-orange-500 ring-2 ring-orange-500/30 scale-105'
                          : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}

      {/* Delete Customer PO Friendly Confirmation Modal */}
      <ConfirmModal
        isOpen={!!poToDelete}
        onClose={() => setPoToDelete(null)}
        onConfirm={handleConfirmDeletePo}
        title="Delete Customer PO?"
        message={`Delete Purchase Order "${poToDelete?.poNumber}" (${poToDelete?.companyName})? Once removed, you won't be able to recover this record.`}
        confirmText="Yes, delete"
        cancelText="Keep it"
        variant="danger"
        isLoading={isDeletingPo}
      />

      {/* Floating Toast */}
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
