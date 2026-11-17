'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';
import { useGetStoreConfigQuery, useUpdateStoreConfigMutation } from '../api/storeApi';

const EDIT_WINDOW_OPTIONS = [
  { value: 12, label: '12 Hours (Fast turnaround)' },
  { value: 24, label: '24 Hours (1 Day)' },
  { value: 48, label: '48 Hours (2 Days — Recommended)' },
  { value: 72, label: '72 Hours (3 Days)' },
  { value: 168, label: '7 Days (1 Week)' },
  { value: 0, label: 'Unlimited (Always Allow Edit)' }
];

const DELETE_WINDOW_OPTIONS = [
  { value: 6, label: '6 Hours (Tight Gate)' },
  { value: 12, label: '12 Hours' },
  { value: 24, label: '24 Hours (1 Day — Recommended)' },
  { value: 48, label: '48 Hours (2 Days)' },
  { value: 72, label: '72 Hours (3 Days)' },
  { value: -1, label: 'Strict Lock (Disallow Deletions)' }
];

export function StoreTimePolicySection() {
  const { data: configData, isLoading } = useGetStoreConfigQuery({});
  const [updateConfig, { isLoading: isUpdating }] = useUpdateStoreConfigMutation();

  const [allowGrnEdit, setAllowGrnEdit] = useState(true);
  const [allowGrnDelete, setAllowGrnDelete] = useState(true);
  const [grnEditWindowHours, setGrnEditWindowHours] = useState(48);
  const [grnDeleteWindowHours, setGrnDeleteWindowHours] = useState(24);

  // Material Issue Time Policies
  const [allowIssueEdit, setAllowIssueEdit] = useState(true);
  const [allowIssueDelete, setAllowIssueDelete] = useState(true);
  const [issueEditWindowHours, setIssueEditWindowHours] = useState(48);
  const [issueDeleteWindowHours, setIssueDeleteWindowHours] = useState(24);

  const [allowAdminOverride, setAllowAdminOverride] = useState(true);
  const [preventNegativeStockOnReversal, setPreventNegativeStockOnReversal] = useState(true);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (configData?.timePolicy) {
      const tp = configData.timePolicy;
      if (tp.allowGrnEdit !== undefined) setAllowGrnEdit(Boolean(tp.allowGrnEdit));
      if (tp.allowGrnDelete !== undefined) setAllowGrnDelete(Boolean(tp.allowGrnDelete));
      if (tp.grnEditWindowHours !== undefined) setGrnEditWindowHours(Number(tp.grnEditWindowHours));
      if (tp.grnDeleteWindowHours !== undefined) setGrnDeleteWindowHours(Number(tp.grnDeleteWindowHours));

      if (tp.allowIssueEdit !== undefined) setAllowIssueEdit(Boolean(tp.allowIssueEdit));
      if (tp.allowIssueDelete !== undefined) setAllowIssueDelete(Boolean(tp.allowIssueDelete));
      if (tp.issueEditWindowHours !== undefined) setIssueEditWindowHours(Number(tp.issueEditWindowHours));
      if (tp.issueDeleteWindowHours !== undefined) setIssueDeleteWindowHours(Number(tp.issueDeleteWindowHours));

      if (tp.allowAdminOverride !== undefined) setAllowAdminOverride(Boolean(tp.allowAdminOverride));
      if (tp.preventNegativeStockOnReversal !== undefined)
        setPreventNegativeStockOnReversal(Boolean(tp.preventNegativeStockOnReversal));
    }
  }, [configData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateConfig({
        timePolicy: {
          allowGrnEdit,
          allowGrnDelete: grnDeleteWindowHours !== -1 && allowGrnDelete,
          grnEditWindowHours: Number(grnEditWindowHours),
          grnDeleteWindowHours: Number(grnDeleteWindowHours),

          allowIssueEdit,
          allowIssueDelete: issueDeleteWindowHours !== -1 && allowIssueDelete,
          issueEditWindowHours: Number(issueEditWindowHours),
          issueDeleteWindowHours: Number(issueDeleteWindowHours),

          allowAdminOverride,
          preventNegativeStockOnReversal
        }
      }).unwrap();

      showToast('All set! Store time policy settings updated successfully.');
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not save time policy right now. Please try again.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
        Loading time policy configuration...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Crisp White Header with Amber Accent Stripe (AGENTS.md mandate) */}
        <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                Store GRN Time Policy &amp; Stock Reversal Rules
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Configure allowable edit/deletion time windows and inventory integrity constraints
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Active Policy</span>
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Section: Edit Window */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>GRN Edit Allowable Window</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Permitted duration after inward creation during which line items, rates, and taxes can be modified
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-slate-700">Allow GRN Edits</span>
                <input
                  type="checkbox"
                  checked={allowGrnEdit}
                  onChange={(e) => setAllowGrnEdit(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Edit Time Window (Hours)
                </label>
                <select
                  disabled={!allowGrnEdit}
                  value={grnEditWindowHours}
                  onChange={(e) => setGrnEditWindowHours(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 transition-all cursor-pointer"
                >
                  {EDIT_WINDOW_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-[11px] text-slate-600">
                  {allowGrnEdit
                    ? grnEditWindowHours > 0
                      ? `GRNs can be edited within ${grnEditWindowHours} hours of creation. Stock and PO balances re-calculate automatically.`
                      : 'GRNs can be edited at any time. Automatic stock differential adjustment active.'
                    : 'Editing is completely locked for all GRN records.'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Deletion Window */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>GRN Deletion &amp; Stock Reversal Window</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Permitted duration to completely cancel a GRN, decrement received stock, and restore PO balances
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-slate-700">Allow Deletions</span>
                <input
                  type="checkbox"
                  checked={allowGrnDelete && grnDeleteWindowHours !== -1}
                  onChange={(e) => {
                    setAllowGrnDelete(e.target.checked);
                    if (!e.target.checked) setGrnDeleteWindowHours(-1);
                    else if (grnDeleteWindowHours === -1) setGrnDeleteWindowHours(24);
                  }}
                  className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Delete Time Window (Hours)
                </label>
                <select
                  disabled={!allowGrnDelete || grnDeleteWindowHours === -1}
                  value={grnDeleteWindowHours}
                  onChange={(e) => setGrnDeleteWindowHours(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 transition-all cursor-pointer"
                >
                  {DELETE_WINDOW_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-[11px] text-slate-600">
                  {grnDeleteWindowHours !== -1 && allowGrnDelete
                    ? `Deletion permitted within ${grnDeleteWindowHours} hours. Inwarded stock is safely decremented and PO balance is restored.`
                    : 'Strict Lock: GRN deletion is prohibited. Records can only be adjusted via manual returns.'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Material Issue Editing Window */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>Material Issue (MR) Editing Window</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Allowed time window after issuing material to edit quantities or swap items with automatic stock re-balancing
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-slate-700">Allow Issue Edits</span>
                <input
                  type="checkbox"
                  checked={allowIssueEdit}
                  onChange={(e) => setAllowIssueEdit(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Issue Edit Time Window (Hours)
                </label>
                <select
                  disabled={!allowIssueEdit}
                  value={issueEditWindowHours}
                  onChange={(e) => setIssueEditWindowHours(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 transition-all cursor-pointer"
                >
                  {EDIT_WINDOW_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-[11px] text-slate-600">
                  {allowIssueEdit
                    ? issueEditWindowHours > 0
                      ? `Material Issues can be edited within ${issueEditWindowHours} hours of issuance. Stock differences are re-balanced safely.`
                      : 'Material Issues can be edited at any time. Differential stock recalculation active.'
                    : 'Editing is completely locked for all issued material requests.'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Material Issue Deletion & Stock Rollback Window */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                  <span>Material Issue Deletion &amp; Stock Rollback Window</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Permitted duration to delete a material issue, rolling floor WIP stock back into Available Store Stock
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-slate-700">Allow Deletions &amp; Rollback</span>
                <input
                  type="checkbox"
                  checked={allowIssueDelete && issueDeleteWindowHours !== -1}
                  onChange={(e) => {
                    setAllowIssueDelete(e.target.checked);
                    if (!e.target.checked) setIssueDeleteWindowHours(-1);
                    else if (issueDeleteWindowHours === -1) setIssueDeleteWindowHours(24);
                  }}
                  className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Issue Deletion Time Window (Hours)
                </label>
                <select
                  disabled={!allowIssueDelete || issueDeleteWindowHours === -1}
                  value={issueDeleteWindowHours}
                  onChange={(e) => setIssueDeleteWindowHours(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 transition-all cursor-pointer"
                >
                  {DELETE_WINDOW_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-[11px] text-slate-600">
                  {issueDeleteWindowHours !== -1 && allowIssueDelete
                    ? `Deletion permitted within ${issueDeleteWindowHours} hours. Issued items are returned to Available Stock (Bucket 4 → Bucket 3).`
                    : 'Strict Lock: Material Issue deletion is prohibited to safeguard shopfloor WIP accounting.'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Safeguard Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Negative Stock Prevention Guard */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">Prevent Negative Stock</span>
                </div>
                <input
                  type="checkbox"
                  checked={preventNegativeStockOnReversal}
                  onChange={(e) => setPreventNegativeStockOnReversal(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Blocks GRN deletion or reduction if current stock on hand is less than the quantity being reversed (e.g. material already issued to Production via MR).
              </p>
            </div>

            {/* Admin Override Toggle */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold text-slate-900">Administrator Override</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowAdminOverride}
                  onChange={(e) => setAllowAdminOverride(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Permits Super Admins to edit or delete GRN records even after the configured time window has elapsed, with mandatory audit tracking.
              </p>
            </div>
          </div>

          {/* Save Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Changes apply instantly across all Store GRN records and ledger operations.
            </span>
            <button
              type="submit"
              disabled={isUpdating}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 rounded-xl shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Save size={15} />
              <span>{isUpdating ? 'Saving Policy...' : 'Save Time Policy'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StoreTimePolicySection;

