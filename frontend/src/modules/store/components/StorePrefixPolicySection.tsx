'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Hash,
  Clock,
  User,
  Sparkles
} from 'lucide-react';
import { useGetStoreConfigQuery, useUpdateStoreConfigMutation } from '../api/storeApi';

export function StorePrefixPolicySection() {
  const { data: configData, isLoading } = useGetStoreConfigQuery({});
  const [updateConfig, { isLoading: isUpdating }] = useUpdateStoreConfigMutation();

  const [grnPrefix, setGrnPrefix] = useState('GRN');
  const [mrPrefix, setMrPrefix] = useState('MR');
  const [dcPrefix, setDcPrefix] = useState('DC');
  const [padLength, setPadLength] = useState(4);
  const [includeYear, setIncludeYear] = useState(true);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (configData?.prefixLockPolicy) {
      const p = configData.prefixLockPolicy;
      if (p.grnPrefix) setGrnPrefix(p.grnPrefix);
      if (p.mrPrefix) setMrPrefix(p.mrPrefix);
      if (p.dcPrefix) setDcPrefix(p.dcPrefix);
      if (p.padLength) setPadLength(Number(p.padLength));
      if (p.includeYear !== undefined) setIncludeYear(Boolean(p.includeYear));
    }
  }, [configData]);

  const currentYear = new Date().getFullYear();

  const previewGrn = useMemo(() => {
    const pfx = (grnPrefix.trim() || 'GRN').toUpperCase();
    const yr = includeYear ? `${currentYear}-` : '';
    const num = '1'.padStart(padLength, '0');
    return `${pfx}-${yr}${num}`;
  }, [grnPrefix, includeYear, currentYear, padLength]);

  const previewMr = useMemo(() => {
    const pfx = (mrPrefix.trim() || 'MR').toUpperCase();
    const yr = includeYear ? `${currentYear}-` : '';
    const num = '1'.padStart(padLength, '0');
    return `${pfx}-${yr}${num}`;
  }, [mrPrefix, includeYear, currentYear, padLength]);

  const previewDc = useMemo(() => {
    const pfx = (dcPrefix.trim() || 'DC').toUpperCase();
    const yr = includeYear ? `${currentYear}-` : '';
    const num = '1'.padStart(padLength, '0');
    return `${pfx}-${yr}${num}`;
  }, [dcPrefix, includeYear, currentYear, padLength]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateConfig({
        prefixLockPolicy: {
          grnPrefix: grnPrefix.trim().toUpperCase() || 'GRN',
          mrPrefix: mrPrefix.trim().toUpperCase() || 'MR',
          dcPrefix: dcPrefix.trim().toUpperCase() || 'DC',
          padLength: Number(padLength) || 4,
          includeYear: Boolean(includeYear)
        }
      }).unwrap();

      showToast('All set! Store prefix policy and auto-numbering saved successfully.');
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not save prefix policy right now. Please try again.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
        Loading prefix policy...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Crisp White Header with Amber Accent Stripe */}
        <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                Store Prefix &amp; Sequence Policy
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Configure auto-incremental prefix codes for GRN, Material Requests, and Delivery Challans
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Live Preview Cards */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>Live Auto-Sequence Previews</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-3.5 bg-orange-50/60 rounded-xl border border-orange-200">
                <span className="text-[10px] font-bold text-orange-700 uppercase">Goods Receipt Note (GRN)</span>
                <p className="text-sm font-mono font-extrabold text-orange-950 mt-1">{previewGrn}</p>
              </div>

              <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-200">
                <span className="text-[10px] font-bold text-sky-700 uppercase">Material Request (MR)</span>
                <p className="text-sm font-mono font-extrabold text-sky-950 mt-1">{previewMr}</p>
              </div>

              <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200">
                <span className="text-[10px] font-bold text-purple-700 uppercase">Delivery Challan (DC)</span>
                <p className="text-sm font-mono font-extrabold text-purple-950 mt-1">{previewDc}</p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GRN Sequence Prefix <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={grnPrefix}
                onChange={(e) => setGrnPrefix(e.target.value.toUpperCase())}
                placeholder="GRN"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Used on all inward GRN vouchers</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Material Request (MR) Prefix <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={mrPrefix}
                onChange={(e) => setMrPrefix(e.target.value.toUpperCase())}
                placeholder="MR"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Used for production store requisitions</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Delivery Challan (DC) Prefix <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dcPrefix}
                onChange={(e) => setDcPrefix(e.target.value.toUpperCase())}
                placeholder="DC"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Used for outward material challans</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Numeric Sequence Padding
              </label>
              <select
                value={padLength}
                onChange={(e) => setPadLength(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer"
              >
                <option value={3}>3 Digits (e.g. 001)</option>
                <option value={4}>4 Digits (e.g. 0001)</option>
                <option value={5}>5 Digits (e.g. 00001)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Year Suffix Option
              </label>
              <label className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all cursor-pointer mt-0.5">
                <input
                  type="checkbox"
                  checked={includeYear}
                  onChange={(e) => setIncludeYear(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded-sm focus:ring-orange-500"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Include Current Year (e.g. {currentYear}-)
                </span>
              </label>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 rounded-xl shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isUpdating ? 'Saving...' : 'Save Prefix Policy'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-2xl animate-in slide-in-from-bottom-5">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
export default StorePrefixPolicySection;

