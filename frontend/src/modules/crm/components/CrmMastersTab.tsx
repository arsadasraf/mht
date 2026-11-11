'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Save,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  FileText,
  X,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Users,
  Sliders,
  Clock
} from 'lucide-react';
import CustomerMasterSubTab from './CustomerMasterSubTab';
import {
  useGetCrmMastersQuery,
  useUpdateCrmMastersMutation,
  useLazyGetS3PresignedUploadQuery
} from '../api/crmApi';

export default function CrmMastersTab({
  initialSubTab
}: {
  initialSubTab?: 'customers' | 'companyInfo' | 'prefixPolicy';
} = {}) {
  const pathname = usePathname();

  const resolvedSubTab: 'customers' | 'companyInfo' | 'prefixPolicy' =
    initialSubTab ||
    (pathname?.endsWith('/company-info')
      ? 'companyInfo'
      : pathname?.endsWith('/prefix-policy')
      ? 'prefixPolicy'
      : 'customers');

  const activeSubTab = resolvedSubTab;

  const { data, isLoading, refetch } = useGetCrmMastersQuery(undefined, {
    skip: activeSubTab === 'customers'
  });
  const [updateCrmMasters, { isLoading: isSaving }] = useUpdateCrmMastersMutation();
  const [triggerGetUploadUrl] = useLazyGetS3PresignedUploadQuery();

  const [isUploadingLogoS3, setIsUploadingLogoS3] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (msg: string, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Local Editable State
  const [masters, setMasters] = useState<any>({
    prefixLockPolicy: {
      customerPrefix: 'CUST',
      customerStartSeq: 1001,
      enquiryPrefix: 'ENQ',
      enquiryStartSeq: 1001,
      quotationPrefix: 'QT',
      quotationStartSeq: 1001,
      orderAcceptancePrefix: 'OA',
      orderAcceptanceStartSeq: 1001,
      requireNoteOnStageChange: true,
      lockEnquiryOnPoReceived: true,
      lockQuotationOnPoReceived: true,
      lockCustomerPoOnProjectConverted: true,
      poEditDeleteTimeLimitMinutes: 120,
      allowEditSentQuotationWithoutRevision: false
    },
    companyBillingInfo: {
      companyName: 'Machine House - Winding Technologies',
      tagline: 'House of Innovations.....',
      worksAddress: 'No. 3, Muniyappa Building, Hommadevanahalli, Gottigere Post, Bengaluru - 560083, Karnataka, India',
      phone: '+91 8047640100 / +91 9845012345',
      email: 'sales@machinehousetechnologies.in',
      website: 'www.machinehousetechnologies.in',
      gstin: '29AAACM1234F1Z5',
      pan: 'AAACM1234F',
      bankName: 'State Bank of India',
      bankBranch: 'Peenya Industrial Estate Branch, Bengaluru',
      accountNumber: '39482019283',
      ifscCode: 'SBIN0040182',
      swiftCode: 'SBININBB482',
      authorizedSignatory: 'For Machine House Technologies — Authorized Signatory',
      standardTerms: '1. Prices are Ex-Works Bengaluru.\n2. Taxes: GST 18% extra as applicable.\n3. Payment: 30% advance with PO, 60% against proforma invoice before dispatch, 10% after commissioning.\n4. Delivery: 4-8 weeks from date of technically & commercially clear order.\n5. Warranty: 12 months from dispatch.',
      logoIconUrl: '/branding/mh_icon.png',
      logoPlateUrl: '/branding/mh_logo_plate.png',
      pdfHeaderBannerUrl: '/branding/mh_logo_plate.png',
      pdfPhotos: ['/branding/mh_logo_plate.png']
    }
  });

  useEffect(() => {
    if (data?.masters) {
      setMasters({
        prefixLockPolicy: {
          customerPrefix: data.masters.prefixLockPolicy?.customerPrefix || 'CUST',
          customerStartSeq: data.masters.prefixLockPolicy?.customerStartSeq ?? 1001,
          enquiryPrefix: data.masters.prefixLockPolicy?.enquiryPrefix || 'ENQ',
          enquiryStartSeq: data.masters.prefixLockPolicy?.enquiryStartSeq ?? 1001,
          quotationPrefix: data.masters.prefixLockPolicy?.quotationPrefix || 'QT',
          quotationStartSeq: data.masters.prefixLockPolicy?.quotationStartSeq ?? 1001,
          orderAcceptancePrefix: data.masters.prefixLockPolicy?.orderAcceptancePrefix || 'OA',
          orderAcceptanceStartSeq: data.masters.prefixLockPolicy?.orderAcceptanceStartSeq ?? 1001,
          requireNoteOnStageChange: data.masters.prefixLockPolicy?.requireNoteOnStageChange ?? true,
          lockEnquiryOnPoReceived: data.masters.prefixLockPolicy?.lockEnquiryOnPoReceived ?? true,
          lockQuotationOnPoReceived: data.masters.prefixLockPolicy?.lockQuotationOnPoReceived ?? true,
          lockCustomerPoOnProjectConverted: data.masters.prefixLockPolicy?.lockCustomerPoOnProjectConverted ?? true,
          poEditDeleteTimeLimitMinutes: data.masters.prefixLockPolicy?.poEditDeleteTimeLimitMinutes ?? 120,
          allowEditSentQuotationWithoutRevision: data.masters.prefixLockPolicy?.allowEditSentQuotationWithoutRevision ?? false
        },
        companyBillingInfo: {
          companyName: data.masters.companyBillingInfo?.companyName || 'Machine House - Winding Technologies',
          tagline: data.masters.companyBillingInfo?.tagline || 'House of Innovations.....',
          worksAddress: data.masters.companyBillingInfo?.worksAddress || 'No. 3, Muniyappa Building, Hommadevanahalli, Gottigere Post, Bengaluru - 560083, Karnataka, India',
          phone: data.masters.companyBillingInfo?.phone || '+91 8047640100 / +91 9845012345',
          email: data.masters.companyBillingInfo?.email || 'sales@machinehousetechnologies.in',
          website: data.masters.companyBillingInfo?.website || 'www.machinehousetechnologies.in',
          gstin: data.masters.companyBillingInfo?.gstin || '29AAACM1234F1Z5',
          pan: data.masters.companyBillingInfo?.pan || 'AAACM1234F',
          bankName: data.masters.companyBillingInfo?.bankName || 'State Bank of India',
          bankBranch: data.masters.companyBillingInfo?.bankBranch || 'Peenya Industrial Estate Branch, Bengaluru',
          accountNumber: data.masters.companyBillingInfo?.accountNumber || '39482019283',
          ifscCode: data.masters.companyBillingInfo?.ifscCode || 'SBIN0040182',
          swiftCode: data.masters.companyBillingInfo?.swiftCode || 'SBININBB482',
          authorizedSignatory: data.masters.companyBillingInfo?.authorizedSignatory || 'For Machine House Technologies — Authorized Signatory',
          standardTerms: data.masters.companyBillingInfo?.standardTerms || '1. Prices are Ex-Works Bengaluru.\n2. Taxes: GST 18% extra as applicable.\n3. Payment: 30% advance with PO, 60% against proforma invoice before dispatch, 10% after commissioning.\n4. Delivery: 4-8 weeks from date of technically & commercially clear order.\n5. Warranty: 12 months from dispatch.',
          logoIconUrl: data.masters.companyBillingInfo?.logoIconUrl || '/branding/mh_icon.png',
          logoPlateUrl: data.masters.companyBillingInfo?.logoPlateUrl || '/branding/mh_logo_plate.png',
          pdfHeaderBannerUrl: data.masters.companyBillingInfo?.pdfHeaderBannerUrl || '/branding/mh_logo_plate.png',
          pdfPhotos: data.masters.companyBillingInfo?.pdfPhotos?.length ? data.masters.companyBillingInfo.pdfPhotos : ['/branding/mh_logo_plate.png']
        }
      });
    }
  }, [data]);

  const handleSaveCompanyInfo = async () => {
    try {
      await updateCrmMasters({
        companyBillingInfo: masters.companyBillingInfo,
        prefixLockPolicy: masters.prefixLockPolicy
      }).unwrap();
      showToast('All set! Company info and prefix & lock policies saved!');
      refetch();
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to save company settings', 'error');
    }
  };

  const handlePrefixPolicyChange = (field: string, value: any) => {
    setMasters((prev: any) => ({
      ...prev,
      prefixLockPolicy: {
        ...prev.prefixLockPolicy,
        [field]: value
      }
    }));
  };

  const handleCompanyBillingChange = (field: string, value: any) => {
    setMasters((prev: any) => ({
      ...prev,
      companyBillingInfo: {
        ...prev.companyBillingInfo,
        [field]: value
      }
    }));
  };

  // Helper to read file as Data URL with canvas compression
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (typeof window !== 'undefined' && file.type.startsWith('image/')) {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1200;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            } else {
              resolve(result);
            }
          };
          img.onerror = () => resolve(result);
          img.src = result;
        } else {
          resolve(result);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Upload Company Logo / Branding Directly to S3 Bucket
  const handleUploadCompanyLogo = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoPlateUrl' | 'logoIconUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP).', 'error');
      return;
    }

    setIsUploadingLogoS3(field);
    try {
      // 1. Instant high-quality preview
      const dataUrl = await readFileAsDataURL(file);
      setMasters((prev: any) => ({
        ...prev,
        companyBillingInfo: {
          ...prev.companyBillingInfo,
          [field]: dataUrl,
          ...(field === 'logoPlateUrl' ? { pdfHeaderBannerUrl: dataUrl } : {})
        }
      }));

      // 2. Upload to AWS S3 bucket
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const s3Key = `crm/branding/${field}_${Date.now()}_${sanitizedName}`;

      let finalUrl = dataUrl;
      try {
        const res = await triggerGetUploadUrl({
          key: s3Key,
          contentType: file.type || 'image/png'
        }).unwrap();

        if (res?.url && !(res as any).isMock && !res.url.startsWith('/api/')) {
          const putRes = await fetch(res.url, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || 'image/png' },
            body: file
          });
          if (putRes.ok) {
            finalUrl = `https://${res.bucket || 'aws-mht'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-2'}.amazonaws.com/${s3Key}`;
          }
        }
      } catch {
        // Retain dataUrl fallback
      }

      setMasters((prev: any) => ({
        ...prev,
        companyBillingInfo: {
          ...prev.companyBillingInfo,
          [field]: finalUrl,
          ...(field === 'logoPlateUrl' ? { pdfHeaderBannerUrl: finalUrl } : {})
        }
      }));

      showToast(`All set! ${field === 'logoPlateUrl' ? 'Company Logo' : 'Circular Emblem'} uploaded to S3 bucket. Click "Save Company Info" to persist.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload logo to S3.', 'error');
    } finally {
      setIsUploadingLogoS3(null);
      e.target.value = '';
    }
  };

  if (isLoading && activeSubTab !== 'customers') {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">Loading CRM Masters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl text-white text-xs sm:text-sm font-semibold shadow-2xl flex items-center space-x-2.5 animate-in fade-in slide-in-from-bottom-3 ${
            toastType === 'error'
              ? 'bg-red-600'
              : toastType === 'info'
              ? 'bg-slate-900'
              : 'bg-emerald-600'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* URL-Based Sub-Tabs Selector (Mandatory Button-Type Pill Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Link
          href="/crm/masters/customers"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'customers'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
          }`}
        >
          <Users className={`w-4 h-4 ${activeSubTab === 'customers' ? 'text-white' : 'text-slate-500'}`} />
          <span>Customer Master</span>
        </Link>

        <Link
          href="/crm/masters/prefix-policy"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'prefixPolicy'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
          }`}
        >
          <Sliders className={`w-4 h-4 ${activeSubTab === 'prefixPolicy' ? 'text-white' : 'text-slate-500'}`} />
          <span>Prefix & Lock Policy</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeSubTab === 'prefixPolicy' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            Numbering & Locks
          </span>
        </Link>

        <Link
          href="/crm/masters/company-info"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'companyInfo'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeSubTab === 'companyInfo' ? 'text-white' : 'text-slate-500'}`} />
          <span>Company Info</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeSubTab === 'companyInfo' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            Branding &amp; Bank
          </span>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: CUSTOMER MASTER                                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'customers' && <CustomerMasterSubTab />}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: PREFIX & LOCK POLICY                                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'prefixPolicy' && (
        <div className="space-y-5">
          {/* Header Action Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm">
                CRM Document Prefix Settings &amp; Lock Policies
              </span>
            </div>

            <button
              type="button"
              onClick={handleSaveCompanyInfo}
              disabled={isSaving}
              className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Policy...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Prefix &amp; Lock Policy</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Document Numbering Prefixes & Sequences */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Document Numbering Prefixes &amp; Sequences
                </h3>
                <span className="text-[11px] font-mono font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg">
                  Auto-Incrementing
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Customer Code Prefix</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Prefix</label>
                      <input
                        type="text"
                        value={masters.prefixLockPolicy?.customerPrefix || 'CUST'}
                        onChange={(e) => handlePrefixPolicyChange('customerPrefix', e.target.value.toUpperCase())}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Start Seq</label>
                      <input
                        type="number"
                        value={masters.prefixLockPolicy?.customerStartSeq ?? 1001}
                        onChange={(e) => handlePrefixPolicyChange('customerStartSeq', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Sample: <strong className="text-slate-800">{masters.prefixLockPolicy?.customerPrefix || 'CUST'}-{masters.prefixLockPolicy?.customerStartSeq ?? 1001}</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Enquiry / Lead Prefix</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Prefix</label>
                      <input
                        type="text"
                        value={masters.prefixLockPolicy?.enquiryPrefix || 'ENQ'}
                        onChange={(e) => handlePrefixPolicyChange('enquiryPrefix', e.target.value.toUpperCase())}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Start Seq</label>
                      <input
                        type="number"
                        value={masters.prefixLockPolicy?.enquiryStartSeq ?? 1001}
                        onChange={(e) => handlePrefixPolicyChange('enquiryStartSeq', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Sample: <strong className="text-slate-800">{masters.prefixLockPolicy?.enquiryPrefix || 'ENQ'}-{new Date().getFullYear()}-{masters.prefixLockPolicy?.enquiryStartSeq ?? 1001}</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Quotation &amp; Revision Prefix</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Prefix</label>
                      <input
                        type="text"
                        value={masters.prefixLockPolicy?.quotationPrefix || 'QT'}
                        onChange={(e) => handlePrefixPolicyChange('quotationPrefix', e.target.value.toUpperCase())}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Start Seq</label>
                      <input
                        type="number"
                        value={masters.prefixLockPolicy?.quotationStartSeq ?? 1001}
                        onChange={(e) => handlePrefixPolicyChange('quotationStartSeq', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Sample: <strong className="text-slate-800">{masters.prefixLockPolicy?.quotationPrefix || 'QT'}-{new Date().getFullYear()}-{masters.prefixLockPolicy?.quotationStartSeq ?? 1001}-R0</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Order Acceptance (OA) Prefix</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Prefix</label>
                      <input
                        type="text"
                        value={masters.prefixLockPolicy?.orderAcceptancePrefix || 'OA'}
                        onChange={(e) => handlePrefixPolicyChange('orderAcceptancePrefix', e.target.value.toUpperCase())}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Start Seq</label>
                      <input
                        type="number"
                        value={masters.prefixLockPolicy?.orderAcceptanceStartSeq ?? 1001}
                        onChange={(e) => handlePrefixPolicyChange('orderAcceptanceStartSeq', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Sample: <strong className="text-slate-800">{masters.prefixLockPolicy?.orderAcceptancePrefix || 'OA'}-{new Date().getFullYear()}-{masters.prefixLockPolicy?.orderAcceptanceStartSeq ?? 1001}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Transition & Document Lock Policies */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  CRM Stage &amp; Record Lock Policies
                </h3>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: 'requireNoteOnStageChange',
                    title: 'Require Transition Note on Kanban Stage Move',
                    desc: 'Users must record a handover/transition note whenever moving an enquiry between stages.'
                  },
                  {
                    key: 'lockEnquiryOnPoReceived',
                    title: 'Lock Enquiry Core Fields on Customer PO Receipt',
                    desc: 'Locks enquiry items and customer details once a Customer PO is logged against it.'
                  },
                  {
                    key: 'lockQuotationOnPoReceived',
                    title: 'Lock Quotation on Customer PO Receipt',
                    desc: 'Prevents editing or superseding a quotation once accepted by Customer PO.'
                  },
                  {
                    key: 'lockCustomerPoOnProjectConverted',
                    title: 'Lock Customer PO After Project Handover',
                    desc: 'Locks the Customer PO & Order Acceptance once converted into a Master Project ID (PRJ-XXXX).'
                  }
                ].map((policy) => {
                  const checked = Boolean(masters.prefixLockPolicy?.[policy.key]);
                  return (
                    <label
                      key={policy.key}
                      className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{policy.title}</span>
                        <span className="text-[11px] text-slate-500">{policy.desc}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => handlePrefixPolicyChange(policy.key, e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-orange-500 rounded cursor-pointer shrink-0"
                      />
                    </label>
                  );
                })}
              </div>

              {/* Customer PO Edit & Delete Time Window Policy */}
              <div className="mt-4 p-4 rounded-xl bg-orange-50/50 border border-orange-200/70">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Customer PO Edit &amp; Delete Time Window (Minutes)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-orange-700 bg-white px-2 py-0.5 rounded border border-orange-300">
                    {masters.prefixLockPolicy?.poEditDeleteTimeLimitMinutes ?? 120} Minutes (
                    {(
                      (Number(masters.prefixLockPolicy?.poEditDeleteTimeLimitMinutes) || 120) / 60
                    ).toFixed(1)}{' '}
                    hrs)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mb-3">
                  Defines the maximum time window after creation during which a Customer PO can be edited or deleted. Once this timer expires, the PO is permanently locked against changes and deletion.
                </p>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="5"
                    max="10080"
                    step="5"
                    value={masters.prefixLockPolicy?.poEditDeleteTimeLimitMinutes ?? 120}
                    onChange={(e) =>
                      handlePrefixPolicyChange(
                        'poEditDeleteTimeLimitMinutes',
                        Math.max(5, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-32 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-orange-500 shadow-2xs"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: '30m', val: 30 },
                      { label: '1 hour', val: 60 },
                      { label: '2 hours', val: 120 },
                      { label: '4 hours', val: 240 },
                      { label: '12 hours', val: 720 },
                      { label: '24 hours', val: 1440 }
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() =>
                          handlePrefixPolicyChange('poEditDeleteTimeLimitMinutes', preset.val)
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                          (masters.prefixLockPolicy?.poEditDeleteTimeLimitMinutes ?? 120) === preset.val
                            ? 'bg-orange-500 text-white shadow-2xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: COMPANY INFO                                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'companyInfo' && (
        <div className="space-y-4">
          <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-slate-900 text-sm">Company Info</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPdfPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <FileText size={13} className="text-orange-500" />
                <span>Preview Quotation PDF</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCompanyInfo}
                disabled={isSaving}
                className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Info...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Company Info</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {/* Official Company Details for Quotations & Order Acceptance */}
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Official Corporate & Billing Information
                  </h3>
                  <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={masters.companyBillingInfo?.companyName || ''}
                      onChange={(e) => handleCompanyBillingChange('companyName', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tagline / Subtitle
                    </label>
                    <input
                      type="text"
                      value={masters.companyBillingInfo?.tagline || ''}
                      onChange={(e) => handleCompanyBillingChange('tagline', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-orange-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Works & Factory Address *
                    </label>
                    <textarea
                      rows={2}
                      value={masters.companyBillingInfo?.worksAddress || ''}
                      onChange={(e) => handleCompanyBillingChange('worksAddress', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sales Email *
                    </label>
                    <input
                      type="email"
                      value={masters.companyBillingInfo?.email || ''}
                      onChange={(e) => handleCompanyBillingChange('email', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Phone Numbers *
                    </label>
                    <input
                      type="text"
                      value={masters.companyBillingInfo?.phone || ''}
                      onChange={(e) => handleCompanyBillingChange('phone', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Website URL
                    </label>
                    <input
                      type="text"
                      value={masters.companyBillingInfo?.website || ''}
                      onChange={(e) => handleCompanyBillingChange('website', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      GSTIN Number *
                    </label>
                    <input
                      type="text"
                      value={masters.companyBillingInfo?.gstin || ''}
                      onChange={(e) => handleCompanyBillingChange('gstin', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase"
                    />
                  </div>
                </div>

                {/* Bank Details for PO Advances */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-orange-500" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Bank Account Details (Printed on Quotation PDFs for Client Advance)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={masters.companyBillingInfo?.bankName || ''}
                        onChange={(e) => handleCompanyBillingChange('bankName', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
                      <input
                        type="text"
                        value={masters.companyBillingInfo?.bankBranch || ''}
                        onChange={(e) => handleCompanyBillingChange('bankBranch', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={masters.companyBillingInfo?.accountNumber || ''}
                        onChange={(e) => handleCompanyBillingChange('accountNumber', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={masters.companyBillingInfo?.ifscCode || ''}
                        onChange={(e) => handleCompanyBillingChange('ifscCode', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">SWIFT / BIC Code (Export)</label>
                      <input
                        type="text"
                        value={masters.companyBillingInfo?.swiftCode || ''}
                        onChange={(e) => handleCompanyBillingChange('swiftCode', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Signatory Title</label>
                      <input
                        type="text"
                        value={masters.companyBillingInfo?.authorizedSignatory || ''}
                        onChange={(e) => handleCompanyBillingChange('authorizedSignatory', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Standard Terms & Conditions for Quotations */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Quotation Terms &amp; Conditions Template (Feeds all quotation PDFs)
                  </label>
                  <textarea
                    rows={4}
                    value={masters.companyBillingInfo?.standardTerms || ''}
                    onChange={(e) => handleCompanyBillingChange('standardTerms', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-700 leading-relaxed"
                  />
                </div>

                {/* PDF Branding: Logos & Header/Footer Photos (Direct S3 Bucket Upload) */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4 text-orange-500" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Company Logos &amp; PDF Branding Assets (Stored in AWS S3 Bucket)
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      Direct S3 Bucket Sync
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Card 1: Corporate Nameplate Logo */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">Corporate Nameplate Logo</span>
                          <span className="text-[11px] text-slate-500">Header logo on Quotations &amp; Order Acceptance PDFs</span>
                        </div>
                        {masters.companyBillingInfo?.logoPlateUrl?.includes('.amazonaws.com') ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Saved in S3</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <span>Active Logo</span>
                          </span>
                        )}
                      </div>

                      {/* Logo Preview Canvas */}
                      <div className="h-24 rounded-xl bg-white border border-slate-200 p-2.5 flex items-center justify-center relative overflow-hidden shadow-2xs">
                        <img
                          src={masters.companyBillingInfo?.logoPlateUrl || '/branding/mh_logo_plate.png'}
                          alt="Corporate Nameplate Logo"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-colors">
                          {isUploadingLogoS3 === 'logoPlateUrl' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading to S3...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Logo to S3</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            disabled={isUploadingLogoS3 !== null}
                            onChange={(e) => handleUploadCompanyLogo(e, 'logoPlateUrl')}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          S3 / Storage URL (or paste custom link)
                        </label>
                        <input
                          type="text"
                          value={masters.companyBillingInfo?.logoPlateUrl || ''}
                          onChange={(e) => handleCompanyBillingChange('logoPlateUrl', e.target.value)}
                          placeholder="/branding/mh_logo_plate.png or https://s3..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400"
                        />
                      </div>
                    </div>

                    {/* Card 2: Circular Emblem / Icon Logo */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">Circular Emblem / Icon</span>
                          <span className="text-[11px] text-slate-500">Emblem stamped on watermark &amp; circular badges</span>
                        </div>
                        {masters.companyBillingInfo?.logoIconUrl?.includes('.amazonaws.com') ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Saved in S3</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <span>Active Emblem</span>
                          </span>
                        )}
                      </div>

                      {/* Emblem Preview Canvas */}
                      <div className="h-24 rounded-xl bg-white border border-slate-200 p-2.5 flex items-center justify-center relative overflow-hidden shadow-2xs">
                        <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 p-1 flex items-center justify-center">
                          <img
                            src={masters.companyBillingInfo?.logoIconUrl || '/branding/mh_icon.png'}
                            alt="Circular Emblem"
                            className="w-full h-full object-contain rounded-full"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-colors">
                          {isUploadingLogoS3 === 'logoIconUrl' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading to S3...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Emblem to S3</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            disabled={isUploadingLogoS3 !== null}
                            onChange={(e) => handleUploadCompanyLogo(e, 'logoIconUrl')}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          S3 / Storage URL (or paste custom link)
                        </label>
                        <input
                          type="text"
                          value={masters.companyBillingInfo?.logoIconUrl || ''}
                          onChange={(e) => handleCompanyBillingChange('logoIconUrl', e.target.value)}
                          placeholder="/branding/mh_icon.png or https://s3..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PDF Stamp Guidance Card */}
                  <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-orange-50/60 border border-orange-200/80">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-700 border border-orange-300/40 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-[11px] text-slate-600 leading-normal">
                      <strong className="text-slate-900 block font-bold">Dynamic PDF Document Branding</strong>
                      These S3-backed logos are dynamically rendered in full resolution on all customer quotations, multi-version revisions (R0, R1, R2...), and 2-page Order Acceptance (OA) sheets.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUOTATION SPECIMEN PDF MODAL                                              */}
      {/* ========================================================================= */}
      {isPdfPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => setIsPdfPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Ribbon Header */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Quotation Header &amp; PDF Branding Preview
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Rendered live from your saved Company Info, bank accounts, and active S3 logos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPdfPreviewOpen(false)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Quotation Sheet Body */}
            <div className="p-8 space-y-6 bg-white font-sans text-slate-900 max-h-[80vh] overflow-y-auto">
              {/* Quotation Letterhead Header */}
              <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center p-2">
                    <img src={masters.companyBillingInfo?.logoIconUrl || '/branding/mh_icon.png'} alt="Machine House Logo" className="object-contain" />
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase">
                      {masters.companyBillingInfo?.companyName || 'Machine House - Winding Technologies'}
                    </h1>
                    <div className="text-xs font-bold text-orange-600 uppercase tracking-widest mt-1">
                      {masters.companyBillingInfo?.tagline || 'House of Innovations.....'}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-md leading-snug">
                      {masters.companyBillingInfo?.worksAddress}
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-600 space-y-0.5 font-mono">
                  <div><strong>Phone:</strong> {masters.companyBillingInfo?.phone}</div>
                  <div><strong>Email:</strong> {masters.companyBillingInfo?.email}</div>
                  <div><strong>GSTIN:</strong> {masters.companyBillingInfo?.gstin}</div>
                  <div><strong>PAN:</strong> {masters.companyBillingInfo?.pan}</div>
                </div>
              </div>

              {/* Document Title Banner */}
              <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Document Type</span>
                  <span className="text-base font-extrabold text-slate-900">COMMERCIAL &amp; TECHNICAL QUOTATION</span>
                </div>
                <div className="text-right font-mono text-xs">
                  <div><strong>Quote Ref:</strong> QT-2026-SPECIMEN</div>
                  <div><strong>Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>

              {/* Sample Quotation Note */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Machine details, bill of materials, and engineering line items are configured and dynamically populated from confirmed project specifications and the Design &amp; BOM module.
              </div>

              {/* Banking & Remittance Details */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-900 uppercase text-[11px] mb-1">
                    Bank Account Details for Wire Transfer / Advance
                  </h4>
                  <div className="space-y-0.5 text-slate-600">
                    <div><strong>Bank:</strong> {masters.companyBillingInfo?.bankName} ({masters.companyBillingInfo?.bankBranch})</div>
                    <div><strong>A/C No:</strong> <span className="font-mono font-bold">{masters.companyBillingInfo?.accountNumber}</span></div>
                    <div><strong>IFSC Code:</strong> <span className="font-mono font-bold">{masters.companyBillingInfo?.ifscCode}</span></div>
                    <div><strong>SWIFT:</strong> <span className="font-mono font-bold">{masters.companyBillingInfo?.swiftCode}</span></div>
                  </div>
                </div>

                <div className="text-right flex flex-col justify-end items-end">
                  <div className="text-xs font-bold text-slate-700">{masters.companyBillingInfo?.authorizedSignatory}</div>
                  <div className="text-[10px] text-slate-400 mt-4">Authorized Signature &amp; Digital Seal</div>
                </div>
              </div>

              {/* Standard Terms */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-extrabold text-slate-900 uppercase text-[10px] block">Standard Terms &amp; Conditions</span>
                <p className="whitespace-pre-line leading-relaxed">{masters.companyBillingInfo?.standardTerms}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
