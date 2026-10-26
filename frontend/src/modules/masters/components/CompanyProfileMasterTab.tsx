'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  CreditCard,
  FileText,
  MapPin,
  CheckCircle2,
  Mail,
  Phone
} from 'lucide-react';
import { useGetMasterDomainQuery, useCreateMasterEntityMutation } from '../api/mastersApi';

export default function CompanyProfileMasterTab() {
  const { data } = useGetMasterDomainQuery('companyProfile');
  const [updateProfile] = useCreateMasterEntityMutation();

  const profile = data?.data || {
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
    signatoryDesignation: 'Managing Director & Plant Head'
  };

  const [formState, setFormState] = useState(profile);
  const [notice, setNotice] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({ domain: 'companyProfile', data: formState });
    setNotice(true);
    setTimeout(() => setNotice(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} /> All set! Company profile and legal entity details updated across the application.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Legal Entity & Registration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 size={16} className="text-orange-600" /> Corporate Entity & Registrations
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Used across Quotations, PO headers, and Invoices</p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-orange-50 text-orange-700 px-2.5 py-1 rounded-lg border border-orange-200">
              CIN: {formState.cin || 'U29253PN2015PTC155421'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Company Legal Name</label>
            <input
              type="text"
              value={formState.legalEntityName}
              onChange={(e) => setFormState({ ...formState, legalEntityName: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={formState.gstin}
                onChange={(e) => setFormState({ ...formState, gstin: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">PAN Number</label>
              <input
                type="text"
                value={formState.pan}
                onChange={(e) => setFormState({ ...formState, pan: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Registered Office</label>
            <textarea
              rows={2}
              value={formState.registeredOffice}
              onChange={(e) => setFormState({ ...formState, registeredOffice: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Unit 1 Manufacturing Plant (Delivery Address)</label>
            <textarea
              rows={2}
              value={formState.unit1Plant}
              onChange={(e) => setFormState({ ...formState, unit1Plant: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>
        </div>

        {/* Banking & Authority */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <CreditCard size={16} className="text-orange-600" /> Banking & Authorized Signatory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Wire payment details and sign-off authority</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={formState.bankName}
                onChange={(e) => setFormState({ ...formState, bankName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Branch</label>
              <input
                type="text"
                value={formState.bankBranch}
                onChange={(e) => setFormState({ ...formState, bankBranch: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bank A/C Number</label>
              <input
                type="text"
                value={formState.accountNumber}
                onChange={(e) => setFormState({ ...formState, accountNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                value={formState.ifscCode}
                onChange={(e) => setFormState({ ...formState, ifscCode: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Authorized Signatory</label>
              <input
                type="text"
                value={formState.authorizedSignatory}
                onChange={(e) => setFormState({ ...formState, authorizedSignatory: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                value={formState.signatoryDesignation}
                onChange={(e) => setFormState({ ...formState, signatoryDesignation: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Primary Contact: {formState.phone}</span>
              <span>Billing: {formState.billingEmail}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          className="px-6 py-2.5 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-xs shadow-orange-500/20 transition-all"
        >
          Save Company Profile
        </button>
      </div>
    </form>
  );
}
