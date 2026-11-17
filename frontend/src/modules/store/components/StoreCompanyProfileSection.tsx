'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Save,
  Image as ImageIcon,
  Loader2,
  UploadCloud,
  CheckCircle2,
  FileText,
  MapPin,
  Mail,
  CreditCard,
  Plus,
  Trash2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useGetStoreConfigQuery, useUpdateStoreConfigMutation } from '../api/storeApi';
import { useUploadDirectToS3Mutation } from '../../purchase/api/purchaseApi';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';

export default function StoreCompanyProfileSection() {
  const dispatch = useAppDispatch();
  const { data: storeConfigData, isLoading } = useGetStoreConfigQuery({});
  const [updateStoreConfig, { isLoading: isSaving }] = useUpdateStoreConfigMutation();
  const [uploadDirectToS3] = useUploadDirectToS3Mutation();

  const [companyProfile, setCompanyProfile] = useState<any>({
    legalEntityName: '',
    tagline: '',
    cin: '',
    pan: '',
    gstin: '',
    registeredOffice: '',
    unit1Plant: '',
    billingEmail: '',
    storesEmail: '',
    purchaseEmail: '',
    phone: '',
    bankName: '',
    bankBranch: '',
    accountNumber: '',
    ifscCode: '',
    authorizedSignatory: '',
    signatoryDesignation: '',
    logoUrl: '/branding/mh_logo_plate.png',
    iconUrl: '/branding/mh_icon.png',
    standardDcTerms: []
  });

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (storeConfigData?.companyProfile) {
      setCompanyProfile((prev: any) => ({
        ...prev,
        ...storeConfigData.companyProfile,
        standardDcTerms: Array.isArray(storeConfigData.companyProfile.standardDcTerms)
          ? storeConfigData.companyProfile.standardDcTerms
          : prev.standardDcTerms
      }));
    }
  }, [storeConfigData]);

  const handleUploadBrandingImage = async (file: File, type: 'logo' | 'icon') => {
    try {
      if (type === 'logo') setIsUploadingLogo(true);
      else setIsUploadingIcon(true);

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `store/branding/${type}_${Date.now()}_${cleanName}`;

      const res = await uploadDirectToS3({
        key,
        contentType: file.type || 'image/png',
        base64Data
      }).unwrap();

      const uploadedUrl = res.permanentUrl || res.url || res.s3Url || `/uploads/${key}`;

      setCompanyProfile((prev: any) => ({
        ...prev,
        [type === 'logo' ? 'logoUrl' : 'iconUrl']: uploadedUrl
      }));

      dispatch(
        addToast({
          type: 'success',
          message: `All set! Store ${type === 'logo' ? 'Corporate Logo' : 'Brand Icon'} uploaded.`
        })
      );
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: 'Could not upload branding image. Please try again.'
        })
      );
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      else setIsUploadingIcon(false);
    }
  };

  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateStoreConfig({ companyProfile }).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: 'All set! Store Company Profile & Terms saved successfully.'
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || 'Could not save company profile. Please try again.'
        })
      );
    }
  };

  const handleAddDcTerm = () => {
    setCompanyProfile((prev: any) => ({
      ...prev,
      standardDcTerms: [
        ...(Array.isArray(prev.standardDcTerms) ? prev.standardDcTerms : []),
        `${(prev.standardDcTerms?.length || 0) + 1}. `
      ]
    }));
  };

  const handleUpdateDcTerm = (idx: number, val: string) => {
    setCompanyProfile((prev: any) => {
      const terms = [...(Array.isArray(prev.standardDcTerms) ? prev.standardDcTerms : [])];
      terms[idx] = val;
      return { ...prev, standardDcTerms: terms };
    });
  };

  const handleRemoveDcTerm = (idx: number) => {
    setCompanyProfile((prev: any) => ({
      ...prev,
      standardDcTerms: (Array.isArray(prev.standardDcTerms) ? prev.standardDcTerms : []).filter(
        (_: any, i: number) => i !== idx
      )
    }));
  };

  return (
    <form onSubmit={handleSaveCompanyProfile} className="space-y-5">
      {/* Top Action Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Store Company Profile &amp; Letterhead Master
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Dedicated store entity details, plant locations, and standard Delivery Challan terms.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs shadow-xs shadow-orange-500/20 cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
        >
          <Save size={14} />
          <span>{isSaving ? 'Saving Changes...' : 'Save Company Profile'}</span>
        </button>
      </div>

      {/* 6-Card Industrial Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CARD 1: BRAND IDENTITY & LOGOS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
              <ImageIcon size={15} className="text-orange-600" />
              <span>Brand Identity &amp; Corporate Logos</span>
            </h4>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live in Delivery Challans
            </span>
          </div>

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
                    <span className="text-[10px] font-bold">Uploading...</span>
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
                <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
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
                <span>{isUploadingIcon ? 'Uploading...' : 'Upload Icon'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: LEGAL ENTITY & TAX REGISTRATIONS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
              <FileText size={15} className="text-orange-600" />
              <span>Legal Entity &amp; Statutory Registrations</span>
            </h4>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Registered Legal Entity Name
              </label>
              <input
                type="text"
                value={companyProfile.legalEntityName || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, legalEntityName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-orange-500"
                placeholder="e.g. Machine House - Winding Technologies Pvt Ltd"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Corporate Tagline / Subtitle
              </label>
              <input
                type="text"
                value={companyProfile.tagline || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:bg-white focus:border-orange-500 italic"
                placeholder="e.g. House of Innovations....."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">CIN</label>
                <input
                  type="text"
                  value={companyProfile.cin || ''}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, cin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 uppercase focus:outline-hidden focus:bg-white focus:border-orange-500"
                  placeholder="U29253PN..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">PAN</label>
                <input
                  type="text"
                  value={companyProfile.pan || ''}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, pan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 uppercase focus:outline-hidden focus:bg-white focus:border-orange-500"
                  placeholder="AACCM..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={companyProfile.gstin || ''}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, gstin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-orange-600 uppercase focus:outline-hidden focus:bg-white focus:border-orange-500"
                  placeholder="27AACCM..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: REGISTERED OFFICE & STORE / PLANT LOCATIONS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
              <MapPin size={15} className="text-orange-600" />
              <span>Registered Office &amp; Store / Warehouse Locations</span>
            </h4>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Registered Office Address
              </label>
              <textarea
                rows={2}
                value={companyProfile.registeredOffice || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, registeredOffice: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:bg-white focus:border-orange-500"
                placeholder="Plot No. 44, Electronic Zone, MIDC Bhosari, Pune..."
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Central Store &amp; Main Plant Address (Chakan)
              </label>
              <textarea
                rows={2}
                value={companyProfile.unit1Plant || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, unit1Plant: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:bg-white focus:border-orange-500"
                placeholder="Plot No. 12/B, Industrial Sector 7, Chakan Industrial Area..."
              />
            </div>
          </div>
        </div>

        {/* CARD 4: STORE COMMUNICATIONS & DISPATCH CONTACT */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
              <Mail size={15} className="text-orange-600" />
              <span>Store Communications &amp; Dispatch Contact</span>
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Store Department Email
              </label>
              <input
                type="email"
                value={companyProfile.storesEmail || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, storesEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-hidden focus:bg-white focus:border-orange-500"
                placeholder="stores@machinehouse.in"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Accounts / Billing Email
              </label>
              <input
                type="email"
                value={companyProfile.billingEmail || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, billingEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-hidden focus:bg-white focus:border-orange-500"
                placeholder="accounts@machinehouse.in"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Purchase / Inward Coordination Email
              </label>
              <input
                type="email"
                value={companyProfile.purchaseEmail || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, purchaseEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-hidden focus:bg-white focus:border-orange-500"
                placeholder="purchase@machinehouse.in"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Plant Central Phone
              </label>
              <input
                type="text"
                value={companyProfile.phone || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-hidden focus:bg-white focus:border-orange-500"
                placeholder="+91 20 2712 4490"
              />
            </div>
          </div>
        </div>

        {/* CARD 5: OFFICIAL SIGNATORY & BANK MANDATE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
              <CreditCard size={15} className="text-orange-600" />
              <span>Official Signatory &amp; Bank Mandate</span>
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Authorized Signatory
              </label>
              <input
                type="text"
                value={companyProfile.authorizedSignatory || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, authorizedSignatory: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-hidden focus:bg-white focus:border-orange-500"
                placeholder="Arshad Asraf"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Signatory Designation
              </label>
              <input
                type="text"
                value={companyProfile.signatoryDesignation || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, signatoryDesignation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:bg-white focus:border-orange-500"
                placeholder="Managing Director & Plant Head"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Primary Bank Name
              </label>
              <input
                type="text"
                value={companyProfile.bankName || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, bankName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:bg-white focus:border-orange-500"
                placeholder="HDFC Bank Ltd"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Bank Branch
              </label>
              <input
                type="text"
                value={companyProfile.bankBranch || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, bankBranch: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:bg-white focus:border-orange-500"
                placeholder="Bhosari Industrial Branch, Pune"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Current Account Number
              </label>
              <input
                type="text"
                value={companyProfile.accountNumber || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, accountNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-hidden focus:bg-white focus:border-orange-500"
                placeholder="50200028479218"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={companyProfile.ifscCode || ''}
                onChange={(e) => setCompanyProfile({ ...companyProfile, ifscCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 uppercase focus:outline-hidden focus:bg-white focus:border-orange-500"
                placeholder="HDFC0001824"
              />
            </div>
          </div>
        </div>

        {/* CARD 6: STANDARD DELIVERY CHALLAN & STORE ACCEPTANCE TERMS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
              <ShieldCheck size={15} className="text-orange-600" />
              <span>Standard Delivery Challan &amp; Store Acceptance Terms</span>
            </h4>
            <button
              type="button"
              onClick={handleAddDcTerm}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 transition-colors"
            >
              <Plus size={13} />
              <span>Add Clause</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {Array.isArray(companyProfile.standardDcTerms) && companyProfile.standardDcTerms.length > 0 ? (
              companyProfile.standardDcTerms.map((term: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 group">
                  <textarea
                    rows={2}
                    value={term}
                    onChange={(e) => handleUpdateDcTerm(idx, e.target.value)}
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:bg-white focus:border-orange-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDcTerm(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 mt-1"
                    title="Remove clause"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No store terms configured. Click &quot;Add Clause&quot; to insert standard terms.
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

