'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import {
  IndianRupee,
  ShoppingBag,
  Search,
  Plus,
  RotateCcw,
  Eye,
  X,
  Building2,
  Calendar,
  Truck,
  Package,
  FileText,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  ExternalLink,
  Lock,
  Trash2,
  ShieldCheck,
  PackageCheck,
  History,
  Check,
  ChevronDown,
  Printer,
  Download,
  BarChart3,
  Edit2
} from 'lucide-react';
import {
  useGetPurchaseOrdersQuery,
  useApprovePurchaseOrderMutation,
  useUpdatePurchaseOrderStatusMutation,
  useAddPurchaseOrderCommentMutation,
  useDeletePurchaseOrderMutation,
  useGetVendorsQuery
} from '../api/purchaseApi';
import ExcelColumnFilter from '../../../components/ui/ExcelColumnFilter';
import OutwardPurchaseOrderModal from './OutwardPurchaseOrderModal';

export default function PurchaseOrdersTab() {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const currentUser = useAppSelector((state) => (state.auth as any)?.user);

  // Queries
  const { data, isLoading, refetch } = useGetPurchaseOrdersQuery({});
  const { data: vendorData } = useGetVendorsQuery({});

  // Mutations
  const [approvePurchaseOrder, { isLoading: isApproving }] = useApprovePurchaseOrderMutation();
  const [updatePurchaseOrderStatus, { isLoading: isUpdatingStatus }] = useUpdatePurchaseOrderStatusMutation();
  const [addPurchaseOrderComment, { isLoading: isAddingComment }] = useAddPurchaseOrderCommentMutation();
  const [deletePurchaseOrder, { isLoading: isDeletingPo }] = useDeletePurchaseOrderMutation();

  // Master Policy
  const masterPolicy = vendorData?.prefixLockPolicy || {
    poPrefix: 'PO',
    approverUserIds: [],
    approverUsers: [],
    requireApprovalBeforePoRelease: true,
    editTimeLimitMode: 'UNLIMITED',
    editTimeLimitHours: 0,
    deleteTimeLimitMode: 'UNLIMITED',
    deleteTimeLimitHours: 0
  };

  // Master Company Profile with complete details and branding from Purchase Masters
  const companyProfile = useMemo(() => {
    return {
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
      logoUrl: '/branding/mh_logo_plate.png',
      iconUrl: '/branding/mh_icon.png',
      standardPoTerms: [
        '1. Materials must be supplied strictly as per the specifications, drawings, and make mentioned in this Outward PO.',
        '2. Test certificates (MTR / Mill TC / Guarantee Certificate) must accompany every consignment.',
        '3. Materials are subject to physical count, store verification, and Incoming Quality Control (IQC) inspection at our plant.',
        '4. Any rejected or non-conforming goods will be quarantined and returned at vendor cost and risk within 15 days.',
        '5. Invoices must clearly cite our Outward PO Number, HSN/SAC codes, and vehicle registration numbers.',
        '6. Payment terms shall apply from the date of final store acceptance (GRN sign-off), not invoice date.'
      ],
      ...(vendorData?.companyProfile || {})
    };
  }, [vendorData]);

  const vendors = useMemo(() => vendorData?.vendors || [], [vendorData]);

  // Live Timer for Countdown
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [showMetrics, setShowMetrics] = useState(false);

  // Column Filters State
  const [columnFilters, setColumnFilters] = useState<{
    poNumber: string[] | null;
    projectId: string[] | null;
    vendorName: string[] | null;
    status: string[] | null;
    itemNames: string[] | null;
  }>({
    poNumber: null,
    projectId: null,
    vendorName: null,
    status: null,
    itemNames: null
  });

  // Sorting State
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPoForPreview, setSelectedPoForPreview] = useState<any | null>(null);

  // Follow-up comment state
  const [newCommentText, setNewCommentText] = useState('');

  // Delete confirmation modal state
  const [poToDelete, setPoToDelete] = useState<any | null>(null);

  // Print / PDF Sheet Modal State

  // Edit Outward PO Modal State
  const [poToEdit, setPoToEdit] = useState<any | null>(null);

  const numberToIndianWords = (amount: number): string => {
    if (!amount || isNaN(amount)) return 'Zero Rupees Only';
    let num = Math.round(amount);
    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      let str = '';
      if (n > 19) {
        str += b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
      } else {
        str += a[n];
      }
      return str;
    };

    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundred = Math.floor(num / 100);
    const rest = num % 100;

    let out = '';
    if (crore) out += inWords(crore) + ' Crore ';
    if (lakh) out += inWords(lakh) + ' Lakh ';
    if (thousand) out += inWords(thousand) + ' Thousand ';
    if (hundred) out += inWords(hundred) + ' Hundred ';
    if (rest) out += (out ? 'and ' : '') + inWords(rest) + ' ';

    return (out.trim() || 'Zero') + ' Rupees Only';
  };
  const handleDirectDownloadPoPdf = (po: any) => {
    if (!po) return;
    const printVendor =
      vendors.find((v: any) => v.id === po.vendorId || v.name === po.vendorName) || {};
    const printTotal = po.totalAmount || {};
    const grandTotal =
      printTotal.grandTotal || printTotal.baseAmountINR || printTotal.amount || 0;
    const itemsSubtotal =
      printTotal.itemsSubtotal || printTotal.baseAmountINR || printTotal.amount || 0;
    const freight = Number(printTotal.freightAmount || 0);
    const packaging = Number(printTotal.packagingAmount || 0);
    const cgst = Number(printTotal.cgstAmount || 0);
    const sgst = Number(printTotal.sgstAmount || 0);
    const igst = Number(printTotal.igstAmount || 0);
    const roundOff = Number(printTotal.roundOffAmount || 0);
    const gstRate = Number(printTotal.gstRate || 18);
    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;
    const igstRate = gstRate;
    const items = Array.isArray(po.items) ? po.items : [];
    const terms: string[] =
      Array.isArray(companyProfile.standardPoTerms) && companyProfile.standardPoTerms.length > 0
        ? companyProfile.standardPoTerms
        : [
            '1. Materials must be supplied strictly as per the specifications, drawings, and make mentioned in this Outward PO.',
            '2. Test certificates (MTR / Mill TC / Guarantee Certificate) must accompany every consignment.',
            '3. Materials are subject to physical count, store verification, and Incoming Quality Control (IQC) inspection at our plant.',
            '4. Any rejected or non-conforming goods will be quarantined and returned at vendor cost and risk within 15 days.',
            '5. Invoices must clearly cite our Outward PO Number, HSN/SAC codes, and vehicle registration numbers.',
            '6. Payment terms shall apply from the date of final store acceptance (GRN sign-off), not invoice date.'
          ];

    const itemsRowsHtml = items
      .map((item: any, idx: number) => {
        const qty = item.quantity?.baseQty ?? item.quantity ?? 1;
        const rate = item.unitPrice?.baseAmountINR ?? item.unitPrice?.amount ?? item.rate ?? 0;
        const total = item.lineTotal?.baseAmountINR ?? item.lineTotal?.amount ?? qty * rate;
        const itemTax = item.taxRatePercent ?? item.taxRate ?? item.gstRate ?? gstRate;
        return `
          <tr style="border-bottom: 1px solid #cbd5e1; vertical-align: top;">
            <td style="padding: 6px 7px; text-align: center; font-family: monospace; color: #475569; border-right: 1px solid #0f172a;">${idx + 1}</td>
            <td style="padding: 6px 7px; font-family: monospace; font-weight: bold; border-right: 1px solid #0f172a;">${item.itemCode || '—'}</td>
            <td style="padding: 6px 7px; border-right: 1px solid #0f172a;">
              <div style="font-weight: bold; color: #0f172a;">${item.itemName || item.name || 'Item'}</div>
              ${item.description ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">${item.description}</div>` : ''}
            </td>
            <td style="padding: 6px 7px; text-align: center; font-family: monospace; border-right: 1px solid #0f172a;">${item.hsnCode || '—'}</td>
            <td style="padding: 6px 7px; text-align: center; font-weight: 600; border-right: 1px solid #0f172a;">${item.quantity?.baseUom || item.uom || 'Nos'}</td>
            <td style="padding: 6px 7px; text-align: right; font-family: monospace; font-weight: bold; border-right: 1px solid #0f172a;">${qty}</td>
            <td style="padding: 6px 7px; text-align: right; font-family: monospace; border-right: 1px solid #0f172a;">${formatIndianCurrency(rate).replace('₹', '')}</td>
            <td style="padding: 6px 7px; text-align: center; font-family: monospace; font-weight: 600; border-right: 1px solid #0f172a;">${itemTax}%</td>
            <td style="padding: 6px 7px; text-align: right; font-family: monospace; font-weight: bold;">${formatIndianCurrency(total).replace('₹', '')}</td>
          </tr>
        `;
      })
      .join('');

    const termsHtml = terms.map((t: string) => `<div style="margin-bottom: 2px;">${t}</div>`).join('');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>PO_${po?.poNumber || 'Document'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 7mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              font-size: 11px;
              line-height: 1.35;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            table { border-collapse: collapse; width: 100%; }
          </style>
        </head>
        <body>
          <div style="width: 100%; max-width: 198mm; margin: 0 auto; border: 1.5px solid #0f172a; padding: 18px; min-height: 1020px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <!-- 1. Official Corporate Letterhead -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #0f172a;">
                <div>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${companyProfile.logoUrl || '/branding/mh_logo_plate.png'}" alt="Machine House" style="height: 48px; width: auto; object-fit: contain;" />
                    <img src="${companyProfile.iconUrl || '/branding/mh_icon.png'}" alt="MH Icon" style="height: 38px; width: 38px; object-fit: contain;" />
                  </div>
                  <div style="font-size: 11px; font-weight: bold; color: #ea580c; font-style: italic; margin-top: 6px;">
                    ${companyProfile.tagline || 'House of Innovations.....'}
                  </div>
                </div>
                <div style="text-align: right; font-size: 10px; color: #334155; max-width: 380px;">
                  <div style="font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase;">
                    ${companyProfile.legalEntityName || 'Machine House - Winding Technologies Pvt Ltd'}
                  </div>
                  <div style="margin-top: 2px;">${companyProfile.registeredOffice || ''}</div>
                  <div><strong>Plant:</strong> ${companyProfile.unit1Plant || ''}</div>
                  <div style="font-family: monospace; margin-top: 2px;">
                    <span>CIN: ${companyProfile.cin || '—'}</span> • <span>PAN: ${companyProfile.pan || '—'}</span>
                  </div>
                  <div style="font-family: monospace; font-weight: bold; color: #0f172a;">
                    GSTIN: ${companyProfile.gstin || '—'}
                  </div>
                  <div style="color: #475569;">
                    Email: ${companyProfile.purchaseEmail || companyProfile.billingEmail || '—'} • Phone: ${companyProfile.phone || '—'}
                  </div>
                </div>
              </div>

              <!-- 2. Full-Width Orange "OUTWARD PURCHASE ORDER" Banner -->
              <div style="background-color: #FF6A00; color: #ffffff; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #0f172a; border-bottom: 1px solid #0f172a; margin-top: 10px; margin-bottom: 12px;">
                <div style="font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
                  OUTWARD PURCHASE ORDER
                </div>
                <div style="font-family: monospace; font-weight: bold; font-size: 12px;">
                  PO NO: ${po.poNumber}
                </div>
              </div>

              <!-- 3. Particulars Grid -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                <!-- Vendor Box -->
                <div style="border: 1px solid #0f172a; padding: 10px; background: #ffffff;">
                  <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px;">
                    Supplier / Vendor Details
                  </div>
                  <div style="font-size: 12px; font-weight: bold; color: #0f172a;">
                    ${po.vendorName || printVendor.name || 'Vendor'}
                  </div>
                  ${po.vendorCode || printVendor.vendorCode ? `<div style="font-family: monospace; font-size: 10px; color: #475569;">Vendor Code: ${po.vendorCode || printVendor.vendorCode}</div>` : ''}
                  <div style="color: #334155; margin: 3px 0;">${printVendor.address || 'Pune, Maharashtra'}</div>
                  <div><strong>Contact:</strong> ${printVendor.contactPerson || 'Sales Team'}</div>
                  <div><strong>Phone:</strong> ${printVendor.phone || '—'} • <strong>Email:</strong> ${printVendor.email || '—'}</div>
                  <div style="font-family: monospace; margin-top: 3px;"><strong>GSTIN:</strong> ${printVendor.gstin || 'Unregistered / Exempt'}</div>
                </div>

                <!-- PO Particulars Box -->
                <div style="border: 1px solid #0f172a; padding: 10px; background: #ffffff;">
                  <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px;">
                    Order &amp; Delivery Particulars
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span style="color: #475569;">PO Number:</span>
                    <span style="font-family: monospace; font-weight: bold;">${po.poNumber}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span style="color: #475569;">PO Date:</span>
                    <span style="font-family: monospace;">${formatDate(printTotal.poDate || po.createdAt)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span style="color: #475569;">Work Order Ref:</span>
                    <span style="font-family: monospace; font-weight: bold; color: #c2410c;">${po.projectId || 'GENERAL-STOCK'}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span style="color: #475569;">Dispatch Mode:</span>
                    <span>${printTotal.freightTransportMode || 'Road Freight'}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #475569;">Payment Terms:</span>
                    <span style="font-weight: 600;">${printTotal.paymentTerms || '30 Days Net'}</span>
                  </div>
                </div>
              </div>

              <!-- 4. Line Items Table -->
              <div style="border: 1px solid #0f172a; margin-bottom: 12px;">
                <table>
                  <thead>
                    <tr style="background: #f1f5f9; border-bottom: 1px solid #0f172a; font-size: 10px; text-transform: uppercase; font-weight: bold;">
                      <th style="padding: 6px 4px; width: 28px; text-align: center; border-right: 1px solid #0f172a;">#</th>
                      <th style="padding: 6px; width: 100px; border-right: 1px solid #0f172a;">Item Code</th>
                      <th style="padding: 6px; border-right: 1px solid #0f172a;">Material Description</th>
                      <th style="padding: 6px; width: 75px; text-align: center; border-right: 1px solid #0f172a;">HSN/SAC</th>
                      <th style="padding: 6px; width: 50px; text-align: center; border-right: 1px solid #0f172a;">UOM</th>
                      <th style="padding: 6px; width: 55px; text-align: right; border-right: 1px solid #0f172a;">Qty</th>
                      <th style="padding: 6px; width: 80px; text-align: right; border-right: 1px solid #0f172a;">Rate (₹)</th>
                      <th style="padding: 6px; width: 52px; text-align: center; border-right: 1px solid #0f172a;">GST %</th>
                      <th style="padding: 6px; width: 90px; text-align: right;">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsRowsHtml}
                  </tbody>
                </table>
              </div>

              <!-- 5. Commercial Breakdown & Bank Details -->
              <div style="display: grid; grid-template-columns: 7fr 5fr; gap: 12px; margin-bottom: 12px;">
                <div>
                  <div style="border: 1px solid #0f172a; padding: 8px; background: #f8fafc; margin-bottom: 8px;">
                    <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569;">Amount Chargeable in Words:</div>
                    <div style="font-weight: bold; font-style: italic; color: #0f172a; margin-top: 3px;">${numberToIndianWords(grandTotal)}</div>
                  </div>
                  <div style="border: 1px solid #0f172a; padding: 8px; font-size: 10px;">
                    <div style="font-weight: 800; text-transform: uppercase; color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 4px;">Company Bank Remittance Details</div>
                    <div><strong>Bank Name:</strong> ${companyProfile.bankName || '—'} • <strong>Branch:</strong> ${companyProfile.bankBranch || '—'}</div>
                    <div style="font-family: monospace;"><strong>Account Number:</strong> ${companyProfile.accountNumber || '—'} • <strong>IFSC:</strong> ${companyProfile.ifscCode || '—'}</div>
                  </div>
                  ${po.notes ? `<div style="border: 1px solid #0f172a; padding: 8px; font-size: 10px; margin-top: 8px;"><strong>Remarks / Notes:</strong> ${po.notes}</div>` : ''}
                </div>

                <div style="border: 1px solid #0f172a;">
                  <div style="display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #475569;">Items Subtotal:</span>
                    <span style="font-family: monospace; font-weight: 600;">${formatIndianCurrency(itemsSubtotal)}</span>
                  </div>
                  ${freight > 0 ? `<div style="display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #e2e8f0;"><span style="color: #475569;">Freight / Transport:</span><span style="font-family: monospace;">${formatIndianCurrency(freight)}</span></div>` : ''}
                  ${packaging > 0 ? `<div style="display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #e2e8f0;"><span style="color: #475569;">Packaging Charges:</span><span style="font-family: monospace;">${formatIndianCurrency(packaging)}</span></div>` : ''}
                  ${cgst > 0 ? `<div style="display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #e2e8f0;"><span style="color: #475569;">CGST (${cgstRate}%):</span><span style="font-family: monospace;">${formatIndianCurrency(cgst)}</span></div>` : ''}
                  ${sgst > 0 ? `<div style="display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #e2e8f0;"><span style="color: #475569;">SGST (${sgstRate}%):</span><span style="font-family: monospace;">${formatIndianCurrency(sgst)}</span></div>` : ''}
                  ${igst > 0 ? `<div style="display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #e2e8f0;"><span style="color: #475569;">IGST (${igstRate}%):</span><span style="font-family: monospace;">${formatIndianCurrency(igst)}</span></div>` : ''}
                  ${roundOff !== 0 ? `<div style="display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;"><span>Round Off:</span><span style="font-family: monospace;">${formatIndianCurrency(roundOff)}</span></div>` : ''}
                  <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #f1f5f9; border-top: 2px solid #0f172a;">
                    <span style="font-weight: 900; text-transform: uppercase;">Grand Total:</span>
                    <span style="font-family: monospace; font-weight: 900; font-size: 13px;">${formatIndianCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <!-- 6. Standard Purchase Terms & Conditions -->
              <div style="border: 1px solid #0f172a; padding: 8px; background: #f8fafc; font-size: 9.5px; color: #334155; margin-bottom: 12px;">
                <div style="font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 4px;">Standard Terms &amp; Conditions:</div>
                ${termsHtml}
              </div>
            </div>

            <!-- 7. Official Signatory & Seal Blocks -->
            <div style="border-top: 2px solid #0f172a; padding-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 11px;">
              <div>
                <div style="font-weight: 800; text-transform: uppercase; color: #475569; font-size: 10px;">Vendor Acknowledgment &amp; Acceptance</div>
                <div style="margin-top: 36px; border-top: 1px dashed #94a3b8; padding-top: 4px;">
                  <div style="font-weight: bold;">Authorized Signatory &amp; Stamp</div>
                  <div style="font-size: 10px; color: #64748b;">Date: ________________________</div>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 900; text-transform: uppercase;">For ${companyProfile.legalEntityName || 'Machine House - Winding Technologies Pvt Ltd'}</div>
                <div style="display: inline-block; margin-top: 8px; padding: 6px 12px; border: 2px dashed #ea580c; border-radius: 8px; background: #fff7ed; text-align: left;">
                  <div style="font-size: 9px; font-weight: 900; color: #c2410c; text-transform: uppercase; letter-spacing: 0.05em;">✓ DIGITALLY APPROVED OUTWARD PO</div>
                  <div style="font-size: 9px; color: #7c2d12;">Authorized: ${companyProfile.authorizedSignatory || 'Plant Head'} • ${formatDate(po.approvedAt || po.createdAt)}</div>
                </div>
                <div style="margin-top: 16px; border-top: 1px dashed #94a3b8; padding-top: 4px;">
                  <div style="font-weight: bold;">${companyProfile.authorizedSignatory || 'Authorized Officer'}</div>
                  <div style="font-size: 10px; color: #64748b;">${companyProfile.signatoryDesignation || 'Managing Director & Plant Head'}</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(fullHtml);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 350);
  };

  const pos = useMemo(() => data?.purchaseOrders || [], [data]);

  // Keep selected preview PO in sync when data changes
  useEffect(() => {
    if (selectedPoForPreview) {
      const refreshed = pos.find(
        (p: any) => (p.id || p._id) === (selectedPoForPreview.id || selectedPoForPreview._id)
      );
      if (refreshed) {
        setSelectedPoForPreview(refreshed);
      }
    }
  }, [pos]);

  const formatIndianCurrency = (amountINR: number) => {
    if (!amountINR && amountINR !== 0) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountINR);
  };

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return String(dateStr);
    }
  };

  const formatDateTime = (dateStr?: string | Date) => {
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
      return String(dateStr);
    }
  };

  const formatRemainingCountdown = (remainingMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return days > 0 ? `${days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
  };

  // Time Window Check for Outward PO Edit & Delete
  const checkPoTimeWindow = (po: any, actionType: 'EDIT' | 'DELETE') => {
    const isEdit = actionType === 'EDIT';
    const shortAction = isEdit ? 'Edit' : 'Del';
    const mode = String(
      (isEdit ? masterPolicy.editTimeLimitMode : masterPolicy.deleteTimeLimitMode) || 'UNLIMITED'
    ).toUpperCase();

    if (mode === 'UNLIMITED') {
      return {
        allowed: true,
        mode: 'UNLIMITED',
        countdownText: 'Unlimited',
        shortCountdown: '∞',
        badgeText: `${shortAction}: ∞`,
        message: ''
      };
    }

    const limitHours = Number(
      isEdit ? masterPolicy.editTimeLimitHours ?? 0 : masterPolicy.deleteTimeLimitHours ?? 0
    );
    const label = isEdit ? 'editing' : 'deleting';

    if (isNaN(limitHours) || limitHours <= 0) {
      return {
        allowed: false,
        mode: 'LIMITED',
        countdownText: 'Locked (0h)',
        shortCountdown: 'Locked',
        badgeText: `${shortAction}: Locked`,
        message: `Just a heads up: ${label} Outward POs is locked (0 hours limit) in Purchase Masters > Approval & Time Policy.`
      };
    }

    const createdMs = po?.createdAt ? new Date(po.createdAt).getTime() : nowMs;
    const deadlineMs = createdMs + limitHours * 3600 * 1000;
    const remainingMs = deadlineMs - nowMs;

    if (remainingMs <= 0) {
      return {
        allowed: false,
        mode: 'LIMITED',
        countdownText: '00:00:00 (Expired)',
        shortCountdown: 'Expired',
        badgeText: `${shortAction}: Expired`,
        message: `Just a heads up: the ${limitHours}-hour time window for ${label} Outward PO "${po.poNumber}" has expired.`
      };
    }

    const formatted = formatRemainingCountdown(remainingMs);
    return {
      allowed: true,
      mode: 'LIMITED',
      countdownText: formatted,
      shortCountdown: formatted,
      badgeText: `${shortAction}: ${formatted}`,
      message: ''
    };
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'ISSUED':
        return {
          raw: 'APPROVED',
          label: 'APPROVED',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'PARTIALLY_RECEIVED':
        return {
          raw: 'PARTIALLY_RECEIVED',
          label: 'PARTIALLY RECEIVED',
          classes: 'bg-sky-50 text-sky-700 border-sky-200'
        };
      case 'FULL_RECEIVED':
        return {
          raw: 'FULL_RECEIVED',
          label: 'FULL RECEIVED',
          classes: 'bg-purple-50 text-purple-700 border-purple-200'
        };
      case 'CREATED':
      case 'PENDING_APPROVAL':
      case 'DRAFT':
      default:
        return {
          raw: 'CREATED',
          label: 'CREATED',
          classes: 'bg-amber-50 text-amber-700 border-amber-200'
        };
    }
  };

  // Approve PO Handler
  const handleApprovePo = async (po: any) => {
    const approverIds: string[] = Array.isArray(masterPolicy.approverUserIds)
      ? masterPolicy.approverUserIds.filter(Boolean)
      : [];
    const currentUserId = currentUser?.id || currentUser?._id;

    if (approverIds.length > 0 && currentUserId && !approverIds.includes(currentUserId)) {
      const names = Array.isArray(masterPolicy.approverUsers)
        ? masterPolicy.approverUsers.map((u: any) => u.name).filter(Boolean).join(', ')
        : 'assigned approvers';
      dispatch(
        addToast({
          type: 'warning',
          message: `Only assigned approvers (${names}) can approve this Outward PO.`
        })
      );
      return;
    }

    try {
      const res: any = await approvePurchaseOrder({ id: po.id || po._id }).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: res?.message || `All set! Outward PO ${po.poNumber} approved successfully.`
        })
      );
      refetch();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || err?.message || 'We could not approve this Outward PO right now.'
        })
      );
    }
  };

  // Status Change Handler
  const handleUpdateStatus = async (po: any, nextStatus: string) => {
    try {
      const res: any = await updatePurchaseOrderStatus({ id: po.id || po._id, status: nextStatus }).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: res?.message || `All set! PO status updated to ${nextStatus.replace('_', ' ')}.`
        })
      );
      refetch();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || err?.message || 'We could not update the PO status right now.'
        })
      );
    }
  };

  // Follow-up Comment Handler
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoForPreview || !newCommentText.trim()) return;

    try {
      const poId = selectedPoForPreview.id || selectedPoForPreview._id;
      const res: any = await addPurchaseOrderComment({
        id: poId,
        comment: newCommentText.trim()
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: 'All set! Follow-up comment added.'
        })
      );

      setNewCommentText('');
      refetch();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || 'We could not save the follow-up comment right now.'
        })
      );
    }
  };

  // Delete PO Handler
  const handleConfirmDelete = async () => {
    if (!poToDelete) return;

    try {
      const res: any = await deletePurchaseOrder(poToDelete.id || poToDelete._id).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: res?.message || `All set! Outward PO ${poToDelete.poNumber} removed.`
        })
      );
      if (selectedPoForPreview && (selectedPoForPreview.id === poToDelete.id || selectedPoForPreview._id === poToDelete._id)) {
        setSelectedPoForPreview(null);
      }
      setPoToDelete(null);
      refetch();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || err?.message || 'We could not delete this Outward PO right now.'
        })
      );
    }
  };

  // Distinct Values for Excel Column Filters
  const distinctPoNumbers = useMemo(() => {
    const map = new Map<string, number>();
    pos.forEach((p: any) => {
      if (p.poNumber) map.set(p.poNumber, (map.get(p.poNumber) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [pos]);

  const distinctProjectIds = useMemo(() => {
    const map = new Map<string, number>();
    pos.forEach((p: any) => {
      if (p.projectId) map.set(p.projectId, (map.get(p.projectId) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [pos]);

  const distinctVendorNames = useMemo(() => {
    const map = new Map<string, number>();
    pos.forEach((p: any) => {
      const v = p.vendorName || p.vendorId?.name;
      if (v) map.set(v, (map.get(v) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [pos]);

  const distinctStatuses = useMemo(() => {
    const map = new Map<string, number>();
    pos.forEach((p: any) => {
      const s = getStatusBadge(p.status).label;
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [pos]);

  const distinctItemNames = useMemo(() => {
    const map = new Map<string, number>();
    pos.forEach((p: any) => {
      const firstItem = p.items?.[0]?.itemName || p.items?.[0]?.itemCode || p.items?.[0]?.materialName;
      if (firstItem) map.set(firstItem, (map.get(firstItem) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [pos]);

  // Distinct Years for Year Filter
  const availableYears = useMemo(() => {
    const yearSet = new Set<string>();
    const currentYear = String(new Date().getFullYear());
    yearSet.add(currentYear);
    pos.forEach((p: any) => {
      const dStr = p.totalAmount?.poDate || p.createdAt;
      if (!dStr) return;
      try {
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) {
          yearSet.add(String(d.getFullYear()));
        }
      } catch {
        // ignore
      }
    });

    return Array.from(yearSet)
      .sort((a, b) => Number(b) - Number(a))
      .map((year) => {
        const count = pos.filter((p: any) => {
          const dStr = p.totalAmount?.poDate || p.createdAt || '';
          try {
            const d = new Date(dStr);
            return !isNaN(d.getTime()) && String(d.getFullYear()) === year;
          } catch {
            return dStr.startsWith(year);
          }
        }).length;
        return { year, count };
      });
  }, [pos]);

  // Month Options with live frequency counts (scoped to selectedYear if active)
  const monthOptionsWithCounts = useMemo(() => {
    const ALL_MONTH_NAMES = [
      { value: '01', label: 'January' },
      { value: '02', label: 'February' },
      { value: '03', label: 'March' },
      { value: '04', label: 'April' },
      { value: '05', label: 'May' },
      { value: '06', label: 'June' },
      { value: '07', label: 'July' },
      { value: '08', label: 'August' },
      { value: '09', label: 'September' },
      { value: '10', label: 'October' },
      { value: '11', label: 'November' },
      { value: '12', label: 'December' }
    ];

    return ALL_MONTH_NAMES.map((m) => {
      const count = pos.filter((p: any) => {
        const dStr = p.totalAmount?.poDate || p.createdAt || '';
        try {
          const d = new Date(dStr);
          if (isNaN(d.getTime())) return false;
          if (selectedYear !== 'ALL' && String(d.getFullYear()) !== selectedYear) return false;
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          return mo === m.value;
        } catch {
          return false;
        }
      }).length;
      return { ...m, count };
    });
  }, [pos, selectedYear]);

  // Filtering & Sorting
  const filteredPos = useMemo(() => {
    return pos
      .filter((po: any) => {
        // Year filter
        if (selectedYear !== 'ALL') {
          const dStr = po.totalAmount?.poDate || po.createdAt || '';
          try {
            const d = new Date(dStr);
            if (isNaN(d.getTime()) || String(d.getFullYear()) !== selectedYear) return false;
          } catch {
            if (!dStr.startsWith(selectedYear)) return false;
          }
        }

        // Month filter
        if (selectedMonth !== 'ALL') {
          const dStr = po.totalAmount?.poDate || po.createdAt || '';
          try {
            const d = new Date(dStr);
            if (isNaN(d.getTime())) return false;
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            if (mo !== selectedMonth) return false;
          } catch {
            return false;
          }
        }

        // Global search
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchPo = po.poNumber?.toLowerCase().includes(q);
          const matchVendor = (po.vendorName || po.vendorId?.name)?.toLowerCase().includes(q);
          const matchPrj = po.projectId?.toLowerCase().includes(q);
          const matchNotes = po.notes?.toLowerCase().includes(q);
          const matchItems = po.items?.some((it: any) =>
            (it.itemName || it.itemCode || it.materialName || '').toLowerCase().includes(q)
          );
          if (!matchPo && !matchVendor && !matchPrj && !matchNotes && !matchItems) return false;
        }

        // Column filters
        if (columnFilters.poNumber && !columnFilters.poNumber.includes(po.poNumber)) return false;
        if (columnFilters.projectId && !columnFilters.projectId.includes(po.projectId)) return false;
        const vName = po.vendorName || po.vendorId?.name || '';
        if (columnFilters.vendorName && !columnFilters.vendorName.includes(vName)) return false;
        const sLabel = getStatusBadge(po.status).label;
        if (columnFilters.status && !columnFilters.status.includes(sLabel)) return false;
        if (columnFilters.itemNames && columnFilters.itemNames.length > 0) {
          const firstItem = po.items?.[0]?.itemName || po.items?.[0]?.itemCode || po.items?.[0]?.materialName || '';
          if (!columnFilters.itemNames.includes(firstItem)) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'amount') {
          valA = a.totalAmount?.baseAmountINR || a.totalAmount?.amount || 0;
          valB = b.totalAmount?.baseAmountINR || b.totalAmount?.amount || 0;
        } else if (sortField === 'vendorName') {
          valA = a.vendorName || a.vendorId?.name || '';
          valB = b.vendorName || b.vendorId?.name || '';
        } else if (sortField === 'items' || sortField === 'itemsCount') {
          valA = a.items?.[0]?.itemName || a.items?.[0]?.itemCode || '';
          valB = b.items?.[0]?.itemName || b.items?.[0]?.itemCode || '';
        }

        if (typeof valA === 'string') {
          const comp = valA.localeCompare(valB || '');
          return sortDirection === 'asc' ? comp : -comp;
        }
        if (typeof valA === 'number') {
          return sortDirection === 'asc' ? valA - (valB || 0) : (valB || 0) - valA;
        }
        return 0;
      });
  }, [pos, selectedYear, selectedMonth, searchTerm, columnFilters, sortField, sortDirection]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      searchTerm.trim() ||
      selectedYear !== 'ALL' ||
      selectedMonth !== 'ALL' ||
      columnFilters.poNumber ||
      columnFilters.projectId ||
      columnFilters.vendorName ||
      columnFilters.status ||
      columnFilters.itemNames
    );
  }, [searchTerm, selectedYear, selectedMonth, columnFilters]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedYear('ALL');
    setSelectedMonth('ALL');
    setColumnFilters({
      poNumber: null,
      projectId: null,
      vendorName: null,
      status: null,
      itemNames: null
    });
  };

  return (
    <div className="space-y-4">
      {/* Metrics Row (Hidden by default, dynamic based on active filters) */}
      {showMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Total Outward POs
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {filteredPos.length}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <IndianRupee size={16} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Approved &amp; Active
              </div>
              <div className="text-base font-bold text-emerald-600 mt-0.5">
                {filteredPos.filter((p: any) => ['APPROVED', 'ISSUED', 'PARTIALLY_RECEIVED', 'FULL_RECEIVED'].includes(p.status)).length}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Pending Approval
              </div>
              <div className="text-base font-bold text-amber-600 mt-0.5">
                {filteredPos.filter((p: any) => ['CREATED', 'PENDING_APPROVAL', 'DRAFT'].includes(p.status)).length}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Committed Procurement
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {formatIndianCurrency(
                  filteredPos.reduce((acc: number, po: any) => acc + (po.totalAmount?.baseAmountINR || po.totalAmount?.amount || 0), 0)
                )}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
              <ShoppingBag size={16} />
            </div>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Dedicated In-Line Search Bar & Month-Wise Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-xl">
          {/* Dedicated In-Line Search Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search PO Number, Vendor, Work Order..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Dual Dropdowns: Year and Month Filters */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Year Selector */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-all ${
                selectedYear !== 'ALL'
                  ? 'border-orange-300 bg-orange-50/70 text-orange-950 font-bold'
                  : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
              }`}
            >
              <Calendar size={14} className={selectedYear !== 'ALL' ? 'text-orange-600' : 'text-slate-400'} />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-xs font-semibold focus:outline-hidden cursor-pointer"
                title="Filter by Year"
              >
                <option value="ALL">All Years ({pos.length})</option>
                {availableYears.map((y) => (
                  <option key={y.year} value={y.year}>
                    {y.year} ({y.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-all ${
                selectedMonth !== 'ALL'
                  ? 'border-orange-300 bg-orange-50/70 text-orange-950 font-bold'
                  : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
              }`}
            >
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-semibold focus:outline-hidden cursor-pointer"
                title="Filter by Month"
              >
                <option value="ALL">
                  {selectedYear !== 'ALL' ? `Whole Year ${selectedYear}` : 'Whole Year / All Months'}
                </option>
                {monthOptionsWithCounts.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({m.count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons on Right */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
          {/* Show / Hide Metrics Toggle */}
          <button
            type="button"
            onClick={() => setShowMetrics((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              showMetrics
                ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-2xs font-bold'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={showMetrics ? 'Hide Outward PO Metrics Dashboard' : 'Show Outward PO Metrics Dashboard'}
          >
            <BarChart3 size={14} className={showMetrics ? 'text-orange-600' : 'text-slate-500'} />
            <span>{showMetrics ? 'Hide Metrics' : 'Show Metrics'}</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset Filters</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 transition-all shadow-xs shadow-orange-500/20 cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Outward PO</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4 min-w-[150px]">
                  <ExcelColumnFilter
                    title="PO Number"
                    columnKey="poNumber"
                    distinctValues={distinctPoNumbers}
                    selectedValues={columnFilters.poNumber}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, poNumber: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(f, d) => {
                      setSortField(f);
                      setSortDirection(d);
                    }}
                  />
                </th>
                <th className="py-3 px-4 min-w-[130px]">
                  <ExcelColumnFilter
                    title="Work Order"
                    columnKey="projectId"
                    distinctValues={distinctProjectIds}
                    selectedValues={columnFilters.projectId}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, projectId: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(f, d) => {
                      setSortField(f);
                      setSortDirection(d);
                    }}
                  />
                </th>
                <th className="py-3 px-4 min-w-[180px]">
                  <ExcelColumnFilter
                    title="Vendor / Supplier"
                    columnKey="vendorName"
                    distinctValues={distinctVendorNames}
                    selectedValues={columnFilters.vendorName}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, vendorName: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(f, d) => {
                      setSortField(f);
                      setSortDirection(d);
                    }}
                  />
                </th>
                <th className="py-3 px-4 min-w-[190px]">
                  <ExcelColumnFilter
                    title="Items"
                    columnKey="items"
                    distinctValues={distinctItemNames}
                    selectedValues={columnFilters.itemNames}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, itemNames: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(f, d) => {
                      setSortField(f);
                      setSortDirection(d);
                    }}
                  />
                </th>
                <th className="py-3 px-4 text-right min-w-[130px]">
                  <ExcelColumnFilter
                    title="Total Amount"
                    columnKey="amount"
                    distinctValues={[]}
                    selectedValues={null}
                    onFilterChange={() => {}}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(f, d) => {
                      setSortField(f);
                      setSortDirection(d);
                    }}
                    align="right"
                  />
                </th>
                <th className="py-3 px-4 w-36 text-center">
                  <ExcelColumnFilter
                    title="Status"
                    columnKey="status"
                    distinctValues={distinctStatuses}
                    selectedValues={columnFilters.status}
                    onFilterChange={(vals) => setColumnFilters((prev) => ({ ...prev, status: vals }))}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(f, d) => {
                      setSortField(f);
                      setSortDirection(d);
                    }}
                  />
                </th>
                <th className="py-3 px-4 w-20 text-center">Inwards</th>
                <th className="py-3 px-4 min-w-[180px]">Follow-up Message</th>
                <th className="py-3 px-4 min-w-[220px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading purchase orders...</span>
                  </td>
                </tr>
              ) : filteredPos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <IndianRupee size={28} className="mx-auto text-slate-300 mb-2" />
                    <div className="font-semibold text-slate-600">No purchase orders found.</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Click "Create Outward PO" to generate your first order.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPos.map((po: any, idx: number) => {
                  const total = po.totalAmount?.baseAmountINR || po.totalAmount?.amount || 0;
                  const statusInfo = getStatusBadge(po.status);
                  const isCreatedStatus = ['CREATED', 'PENDING_APPROVAL', 'DRAFT'].includes(po.status);
                  const editCheck = checkPoTimeWindow(po, 'EDIT');
                  const deleteCheck = checkPoTimeWindow(po, 'DELETE');
                  const hasGrn = Array.isArray(po.grnHistory) && po.grnHistory.length > 0;

                  return (
                    <tr key={po.id || po._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-400">
                        {idx + 1}
                      </td>

                      {/* PO Number - Clickable */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedPoForPreview(po)}
                          className="font-mono font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{po.poNumber}</span>
                        </button>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {formatDate(po.totalAmount?.poDate || po.createdAt)}
                        </div>
                      </td>

                      {/* Work Order */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {po.projectId || 'GENERAL-STOCK'}
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {po.vendorName || po.vendorId?.name || '—'}
                        </div>
                        {po.vendorCode && (
                          <div className="text-[11px] font-mono text-slate-400">
                            {po.vendorCode}
                          </div>
                        )}
                      </td>

                      {/* Items Column: First item name with count of items */}
                      <td className="py-3 px-4 max-w-[220px]">
                        {po.items && po.items.length > 0 ? (
                          <div>
                            <div
                              className="font-semibold text-slate-900 truncate"
                              title={po.items[0]?.itemName || po.items[0]?.itemCode || po.items[0]?.materialName}
                            >
                              {po.items[0]?.itemName || po.items[0]?.itemCode || po.items[0]?.materialName || 'Item'}
                            </div>
                            {po.items.length > 1 ? (
                              <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                +{po.items.length - 1} more items
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">1 item</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatIndianCurrency(total)}
                      </td>

                      {/* 4-Stage Status Dropdown (Change Manually or Auto-synced) */}
                      <td className="py-3 px-4 text-center">
                        <div className="relative inline-block">
                          <select
                            value={statusInfo.raw}
                            onChange={(e) => handleUpdateStatus(po, e.target.value)}
                            disabled={isUpdatingStatus}
                            className={`appearance-none cursor-pointer pl-2.5 pr-6 py-0.5 rounded-full text-[11px] font-bold border transition-all focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 shadow-2xs ${statusInfo.classes}`}
                            title="Click to change status manually"
                          >
                            <option value="CREATED" className="bg-white text-amber-700 font-bold">CREATED</option>
                            <option value="APPROVED" className="bg-white text-emerald-700 font-bold">APPROVED</option>
                            <option value="PARTIALLY_RECEIVED" className="bg-white text-sky-700 font-bold">PARTIALLY RECEIVED</option>
                            <option value="FULL_RECEIVED" className="bg-white text-purple-700 font-bold">FULL RECEIVED</option>
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>
                      </td>

                      {/* Inwards / GRN count */}
                      <td className="py-3 px-4 text-center font-mono">
                        {hasGrn ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <PackageCheck size={11} />
                            <span>{po.grnHistory.length} GRN</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0</span>
                        )}
                      </td>

                      {/* Follow-up Message Column */}
                      <td className="py-3 px-4 max-w-[240px]">
                        {(() => {
                          const commentsList = Array.isArray(po.comments)
                            ? po.comments
                            : Array.isArray(po.totalAmount?.comments)
                            ? po.totalAmount.comments
                            : [];
                          const latestComment = commentsList.length > 0 ? commentsList[commentsList.length - 1] : null;

                          if (latestComment) {
                            return (
                              <div className="space-y-0.5">
                                <div
                                  className="text-xs text-slate-800 line-clamp-1 font-medium"
                                  title={latestComment.text || latestComment.comment}
                                >
                                  &ldquo;{latestComment.text || latestComment.comment}&rdquo;
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                  <span className="text-slate-600 font-semibold truncate max-w-[90px]">
                                    {latestComment.authorName || latestComment.userName || 'Followup'}
                                  </span>
                                  <span>•</span>
                                  <span>{formatDate(latestComment.createdAt)}</span>
                                </div>
                              </div>
                            );
                          }

                          if (po.notes || po.remarks) {
                            return (
                              <div className="text-[11px] text-slate-500 line-clamp-1 italic" title={po.notes || po.remarks}>
                                {po.notes || po.remarks}
                              </div>
                            );
                          }

                          return <span className="text-slate-400 text-[11px]">No notes</span>;
                        })()}
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          {/* Direct Download Button (for Approved POs) or Approve Button (for CREATED) */}
                          {!isCreatedStatus ? (
                            <button
                              type="button"
                              onClick={() => handleDirectDownloadPoPdf(po)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-xs shadow-emerald-600/20 cursor-pointer"
                              title="Direct Download / Print Approved Outward PO Sheet"
                            >
                              <Download size={13} />
                              <span>Download</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApprovePo(po)}
                              disabled={isApproving}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                              title="One-Click Approve Outward PO"
                            >
                              <CheckCircle2 size={13} />
                              <span>Approve</span>
                            </button>
                          )}

                          {/* Edit Button: Hidden after lock policy time expires; if time remains, show with live countdown */}
                          {editCheck.allowed && (
                            <button
                              type="button"
                              onClick={() => setPoToEdit(po)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                              title={`Edit Outward PO • Time remaining: ${editCheck.countdownText}`}
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                              {editCheck.mode === 'LIMITED' && (
                                <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-100/90 px-1 py-0.2 rounded-md">
                                  {editCheck.shortCountdown}
                                </span>
                              )}
                            </button>
                          )}

                          {/* Delete Button: Hidden after lock policy time expires or if GRNs exist; if time remains, show with live countdown */}
                          {deleteCheck.allowed && !hasGrn && (
                            <button
                              type="button"
                              onClick={() => setPoToDelete(po)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                              title={`Delete Outward PO • Time remaining: ${deleteCheck.countdownText}`}
                            >
                              <Trash2 size={12} />
                              {deleteCheck.mode === 'LIMITED' && (
                                <span className="font-mono text-[10px] font-bold text-red-700 bg-red-100/90 px-1 py-0.2 rounded-md">
                                  {deleteCheck.shortCountdown}
                                </span>
                              )}
                            </button>
                          )}

                          {/* Preview Dossier */}
                          <button
                            type="button"
                            onClick={() => setSelectedPoForPreview(po)}
                            className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors cursor-pointer"
                            title="View Outward PO Dossier"
                          >
                            <Eye size={15} />
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

      {/* CREATE OUTWARD PO MODAL */}
      <OutwardPurchaseOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialProjectId={activeProjectId}
        existingPos={pos}
      />

      {/* EDIT OUTWARD PO MODAL */}
      {poToEdit && (
        <OutwardPurchaseOrderModal
          isOpen={Boolean(poToEdit)}
          onClose={() => setPoToEdit(null)}
          editingPo={poToEdit}
          existingPos={pos}
          onPoCreated={() => {
            setPoToEdit(null);
            refetch();
          }}
        />
      )}

      {/* PREVIEW OUTWARD PO DOSSIER */}
      {selectedPoForPreview && (() => {
        const previewStatus = getStatusBadge(selectedPoForPreview.status);
        const isCreated = ['CREATED', 'PENDING_APPROVAL', 'DRAFT'].includes(selectedPoForPreview.status);
        const deleteCheck = checkPoTimeWindow(selectedPoForPreview, 'DELETE');
        const editCheck = checkPoTimeWindow(selectedPoForPreview, 'EDIT');
        const hasGrn = Array.isArray(selectedPoForPreview.grnHistory) && selectedPoForPreview.grnHistory.length > 0;
        const commentsList = Array.isArray(selectedPoForPreview.comments)
          ? selectedPoForPreview.comments
          : Array.isArray(selectedPoForPreview.totalAmount?.comments)
          ? selectedPoForPreview.totalAmount.comments
          : [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-[96vw] xl:max-w-[1560px] 2xl:max-w-[1720px] max-h-[95vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* Crisp White Header with Amber Accent Stripe */}
              <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                    <IndianRupee size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                        Outward PO — {selectedPoForPreview.poNumber}
                      </h2>
                      {/* Manual / Automatic Status Dropdown */}
                      <div className="relative inline-block">
                        <select
                          value={previewStatus.raw}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            handleUpdateStatus(selectedPoForPreview, newStatus);
                            setSelectedPoForPreview({ ...selectedPoForPreview, status: newStatus });
                          }}
                          disabled={isUpdatingStatus}
                          className={`appearance-none cursor-pointer pl-3 pr-7 py-1 rounded-full text-xs font-bold border shadow-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 ${previewStatus.classes}`}
                          title="Click to manually change status (also updates automatically via store inwards)"
                        >
                          <option value="CREATED" className="bg-white text-amber-700 font-bold">CREATED (Pending Approval)</option>
                          <option value="APPROVED" className="bg-white text-emerald-700 font-bold">APPROVED</option>
                          <option value="PARTIALLY_RECEIVED" className="bg-white text-sky-700 font-bold">PARTIALLY RECEIVED</option>
                          <option value="FULL_RECEIVED" className="bg-white text-purple-700 font-bold">FULL RECEIVED</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* One-Click Approve Action in Header */}
                  {isCreated && (
                    <button
                      type="button"
                      onClick={() => handleApprovePo(selectedPoForPreview)}
                      disabled={isApproving}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      <span>{isApproving ? 'Approving...' : 'Approve Outward PO'}</span>
                    </button>
                  )}

                  {/* Download / Print Button (ONLY once approved) */}
                  {!isCreated ? (
                    <button
                      type="button"
                      onClick={() => handleDirectDownloadPoPdf(selectedPoForPreview)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                      title="Download / Print Approved Outward PO"
                    >
                      <Printer size={14} />
                      <span>Download / Print PO</span>
                    </button>
                  ) : (
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold border border-slate-200"
                      title="Approval required before Outward PO can be downloaded or printed"
                    >
                      <Lock size={12} />
                      <span>Download Locked (Approval Required)</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedPoForPreview(null)}
                    className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Dossier Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Top Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">PO Number &amp; Date</div>
                    <div className="text-sm font-mono font-extrabold text-orange-600 mt-0.5">
                      {selectedPoForPreview.poNumber}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      <span>PO Date: {formatDate(selectedPoForPreview.totalAmount?.poDate || selectedPoForPreview.createdAt)}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Vendor / Supplier</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                      {selectedPoForPreview.vendorName || selectedPoForPreview.vendorId?.name || '—'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-1">
                      <Building2 size={12} className="text-slate-400" />
                      <span>Code: {selectedPoForPreview.vendorCode || 'VND-0001'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Work Order &amp; Type</div>
                    <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                      {selectedPoForPreview.projectId || 'GENERAL-STOCK'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Package size={12} className="text-slate-400" />
                      <span>Classification: <span className="font-bold text-slate-700">{selectedPoForPreview.totalAmount?.poType || 'BO'}</span></span>
                    </div>
                  </div>
                </div>

                {/* Items Breakdown Table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
                    <span>PO Line Items ({selectedPoForPreview.items?.length || 0})</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100/60 text-slate-600 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-10">#</th>
                          <th className="py-2.5 px-3">Item Code</th>
                          <th className="py-2.5 px-3 min-w-[240px]">Name &amp; Specification</th>
                          <th className="py-2.5 px-3">HSN</th>
                          <th className="py-2.5 px-3 text-center">UOM</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                          <th className="py-2.5 px-3 text-center">Tax %</th>
                          <th className="py-2.5 px-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {(selectedPoForPreview.items || []).map((item: any, idx: number) => {
                          const qty = item.quantity?.baseQty ?? item.quantity ?? 1;
                          const rate = item.unitPrice?.baseAmountINR ?? item.unitPrice?.amount ?? item.rate ?? 0;
                          const total = item.lineTotal?.baseAmountINR ?? item.lineTotal?.amount ?? (qty * rate);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{item.itemCode || '—'}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">{item.itemName || item.name}</div>
                                {item.description && (
                                  <div className="text-[11px] text-slate-500">{item.description}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">{item.hsnCode || '—'}</td>
                              <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                                {item.quantity?.baseUom || item.uom || 'Nos'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{qty}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatIndianCurrency(rate)}</td>
                              <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                                {item.taxRatePercent ?? item.taxRate ?? item.gstRate ?? selectedPoForPreview.totalAmount?.gstRate ?? 18}%
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatIndianCurrency(total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Commercials, Taxes & Terms */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Logistics & Terms */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="text-[11px] font-bold text-slate-700 uppercase pb-1 border-b border-slate-200">
                      Logistics &amp; Terms
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Payment Terms: </span>
                      <span className="font-semibold text-slate-800">{selectedPoForPreview.totalAmount?.paymentTerms || '30 Days Net'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Transport Mode: </span>
                      <span className="font-semibold text-slate-800">{selectedPoForPreview.totalAmount?.freightTransportMode || 'Road Freight'}</span>
                    </div>
                    {selectedPoForPreview.notes && (
                      <div className="pt-1 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                        {selectedPoForPreview.notes}
                      </div>
                    )}
                  </div>

                  {/* Tax Breakdown & Grand Total */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs">
                    <div className="text-[11px] font-bold text-slate-700 uppercase pb-1 border-b border-slate-200">
                      Commercial &amp; Tax Summary
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Items Subtotal:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatIndianCurrency(selectedPoForPreview.totalAmount?.itemsSubtotal || selectedPoForPreview.totalAmount?.baseAmountINR || 0)}
                      </span>
                    </div>
                    {selectedPoForPreview.totalAmount?.freightAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Freight Charges:</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {formatIndianCurrency(selectedPoForPreview.totalAmount.freightAmount)}
                        </span>
                      </div>
                    )}
                    {selectedPoForPreview.totalAmount?.packagingAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Packaging Charges:</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {formatIndianCurrency(selectedPoForPreview.totalAmount.packagingAmount)}
                        </span>
                      </div>
                    )}
                    {selectedPoForPreview.totalAmount?.cgstAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>CGST ({(selectedPoForPreview.totalAmount?.gstRate || 18) / 2}%):</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {formatIndianCurrency(selectedPoForPreview.totalAmount.cgstAmount)}
                        </span>
                      </div>
                    )}
                    {selectedPoForPreview.totalAmount?.sgstAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>SGST ({(selectedPoForPreview.totalAmount?.gstRate || 18) / 2}%):</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {formatIndianCurrency(selectedPoForPreview.totalAmount.sgstAmount)}
                        </span>
                      </div>
                    )}
                    {selectedPoForPreview.totalAmount?.igstAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST ({selectedPoForPreview.totalAmount?.gstRate || 18}%):</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {formatIndianCurrency(selectedPoForPreview.totalAmount.igstAmount)}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                      <span className="font-bold text-slate-900">Grand Total:</span>
                      <span className="text-base font-mono font-extrabold text-orange-600">
                        {formatIndianCurrency(selectedPoForPreview.totalAmount?.grandTotal || selectedPoForPreview.totalAmount?.baseAmountINR || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section: Linked Store Inward / GRN History */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PackageCheck size={16} className="text-emerald-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Store Inward &amp; GRN History ({hasGrn ? selectedPoForPreview.grnHistory.length : 0})
                      </span>
                    </div>
                    {hasGrn && (
                      <Link
                        href={`/store/inventory?grn=${selectedPoForPreview.grnHistory[0]?.grnNumber || ''}`}
                        className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
                      >
                        <span>Open Store Inventory</span>
                        <ExternalLink size={12} />
                      </Link>
                    )}
                  </div>

                  {hasGrn ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100/60 text-slate-600 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">GRN Number</th>
                            <th className="py-2.5 px-3">Inward Date</th>
                            <th className="py-2.5 px-3">Item Received</th>
                            <th className="py-2.5 px-3 text-right">Received Qty</th>
                            <th className="py-2.5 px-3">Invoice / Challan</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {selectedPoForPreview.grnHistory.map((grn: any, gIdx: number) => (
                            <tr key={grn.id || gIdx} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 font-mono font-bold text-orange-600">
                                {grn.grnNumber}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {formatDate(grn.inwardDate || grn.createdAt)}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">{grn.itemName}</div>
                                <div className="text-[11px] font-mono text-slate-400">{grn.itemCode}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                {grn.receivedQty} {grn.uom || 'Nos'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {grn.invoiceNo || grn.challanNo || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {grn.status || 'ACCEPTED'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <Link
                                  href={`/store/inventory?grn=${grn.grnNumber}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700"
                                >
                                  <span>View GRN</span>
                                  <ExternalLink size={11} />
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-5 text-center bg-slate-50/50">
                      <Truck size={24} className="mx-auto text-slate-300 mb-1.5" />
                      <p className="text-xs font-semibold text-slate-600">
                        No Store Inwards / GRN logged yet for this Outward PO
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        When goods arrive at the factory gate and Store creates a Goods Receipt Note (GRN) matching {selectedPoForPreview.poNumber}, inward history will link automatically here.
                      </p>
                    </div>
                  )}
                </div>

                {/* Section: Follow-up Comments & Timeline */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-3 p-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-orange-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Follow-up Comments &amp; Notes ({commentsList.length})
                      </span>
                    </div>
                  </div>

                  {/* Comments Timeline */}
                  {commentsList.length > 0 ? (
                    <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                      {commentsList.map((c: any, cIdx: number) => (
                        <div key={c.id || cIdx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold text-[10px] flex items-center justify-center">
                                {(c.userName || 'U').charAt(0).toUpperCase()}
                              </span>
                              <span>{c.userName || 'User'}</span>
                              {c.userRole && (
                                <span className="font-normal text-slate-400">• {c.userRole}</span>
                              )}
                            </div>
                            <span className="text-slate-400 font-mono text-[10px]">
                              {formatDateTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-slate-700 pl-6.5 text-xs leading-relaxed whitespace-pre-wrap">
                            {c.text || c.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No follow-up comments recorded yet. Add notes below for supplier follow-up, dispatch tracking, or inspection reminders.
                    </p>
                  )}

                  {/* Add Comment Input */}
                  <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add follow-up comment (e.g. Supplier confirmed dispatch by 18 Nov, invoice copy received)..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 bg-slate-50/50"
                    />
                    <button
                      type="submit"
                      disabled={!newCommentText.trim() || isAddingComment}
                      className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all disabled:opacity-40"
                    >
                      <Send size={13} />
                      <span>{isAddingComment ? 'Saving...' : 'Post'}</span>
                    </button>
                  </form>
                </div>

                {/* Complete Audit Trail */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                    <User size={15} className="text-slate-400 mt-0.5" />
                    <div className="text-xs">
                      <div className="font-bold text-slate-700">Created By</div>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {selectedPoForPreview.createdByName || 'System'}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock size={11} />
                        <span>{formatDateTime(selectedPoForPreview.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                    <User size={15} className="text-slate-400 mt-0.5" />
                    <div className="text-xs">
                      <div className="font-bold text-slate-700">Last Updated By</div>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {selectedPoForPreview.updatedByName || selectedPoForPreview.createdByName || 'System'}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock size={11} />
                        <span>{formatDateTime(selectedPoForPreview.updatedAt || selectedPoForPreview.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck size={14} className="text-slate-400" />
                  <span>
                    Approval Policy: {Array.isArray(masterPolicy.approverUserIds) && masterPolicy.approverUserIds.length > 0 ? 'Assigned Sign-Off' : 'Auto-Approved'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Edit Button inside Preview (Respects Policy) */}
                  {editCheck.allowed && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedPoForPreview;
                        setSelectedPoForPreview(null);
                        setPoToEdit(target);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                      title={`Edit Outward PO • Time remaining: ${editCheck.countdownText}`}
                    >
                      <Edit2 size={13} />
                      <span>Edit PO</span>
                      {editCheck.mode === 'LIMITED' && (
                        <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-100/90 px-1 py-0.2 rounded-md">
                          {editCheck.shortCountdown}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Delete Button inside Preview (Respects Policy) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (hasGrn) {
                        dispatch(
                          addToast({
                            type: 'warning',
                            message: 'Cannot delete this Outward PO because Store Inwards / GRN have already been logged.'
                          })
                        );
                        return;
                      }
                      if (!deleteCheck.allowed) {
                        dispatch(
                          addToast({
                            type: 'warning',
                            message: deleteCheck.message
                          })
                        );
                        return;
                      }
                      setPoToDelete(selectedPoForPreview);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      deleteCheck.allowed && !hasGrn
                        ? 'text-red-600 hover:bg-red-50 border border-red-200'
                        : 'text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed'
                    }`}
                    title={
                      hasGrn
                        ? 'Locked: Store Inwards exist'
                        : !deleteCheck.allowed
                        ? deleteCheck.badgeText
                        : 'Delete PO'
                    }
                  >
                    <Trash2 size={13} />
                    <span>Delete Outward PO</span>
                  </button>

                  {/* Download PO Button in Footer if Approved */}
                  {!isCreated && (
                    <button
                      type="button"
                      onClick={() => handleDirectDownloadPoPdf(selectedPoForPreview)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      title="Download / Print Approved Outward PO"
                    >
                      <Printer size={13} />
                      <span>Download / Print PO</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedPoForPreview(null)}
                    className="px-5 py-2 text-xs font-bold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* FRIENDLY MH CONFIRMATION DIALOG FOR DELETE */}
      {poToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-600 border border-red-300/40 flex items-center justify-center shrink-0">
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Delete Outward PO?
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPoToDelete(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Delete Outward PO <strong className="font-mono text-slate-900">{poToDelete.poNumber}</strong>? Once removed, you won&apos;t be able to recover this purchase order.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <div>Vendor: <strong className="text-slate-800">{poToDelete.vendorName || poToDelete.vendorId?.name || '—'}</strong></div>
                <div>Amount: <strong className="font-mono text-slate-800">{formatIndianCurrency(poToDelete.totalAmount?.baseAmountINR || poToDelete.totalAmount?.amount || 0)}</strong></div>
                <div>Items: <strong className="font-mono text-slate-800">{poToDelete.items?.length || 0} line item(s)</strong></div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPoToDelete(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingPo}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 shadow-xs cursor-pointer transition-all disabled:opacity-50"
              >
                {isDeletingPo ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
