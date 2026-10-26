'use client';

import React, { useState } from 'react';
import {
  Building2,
  Users,
  Search,
  Plus,
  X,
  CheckCircle2,
  FileText,
  CreditCard,
  ShieldCheck,
  Star,
  Phone,
  Mail
} from 'lucide-react';
import { useGetVendorsQuery } from '../api/purchaseApi';

export default function PurchaseMastersTab() {
  const [activeSubTab, setActiveSubTab] = useState<'vendors' | 'company'>('vendors');
  const { data: vendorData, isLoading } = useGetVendorsQuery({});
  const vendors = vendorData?.vendors || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);

  // Vendor form state
  const [vendorFormData, setVendorFormData] = useState({
    name: '',
    category: 'ELECTRICAL_COMPONENTS',
    contactPerson: '',
    email: '',
    phone: '',
    gstin: '',
    paymentTermsDays: 30
  });

  // Company Profile State (Plant / Purchasing Entity)
  const [companyProfile, setCompanyProfile] = useState({
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
    standardPoTerms: [
      'Material must conform strictly to the approved engineering CAD drawing and technical specifications.',
      'Delivery destination: FOR Destination Machine House Unit 1 Chakan unless otherwise stated.',
      'Inspection: Goods are subject to Incoming QC inspection at our factory premises before formal acceptance.',
      'Rejection: Rejected materials will be held in Quarantine and must be replaced within 7 working days.',
      'Payment terms: 30 days from date of QC Acceptance and 3-way invoice matching.',
      'Warranty: Minimum 12 months comprehensive replacement warranty against manufacturing defects.'
    ]
  });

  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const handleSaveCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  const filteredVendors = vendors.filter(
    (v: any) =>
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendorCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Sub-Tab Switcher (Button-Type Segmented Pill Tabs) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setActiveSubTab('vendors')}
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
            activeSubTab === 'vendors'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Building2 size={14} />
          <span>Vendor Master</span>
        </button>

        <button
          onClick={() => setActiveSubTab('company')}
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
            activeSubTab === 'company'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ShieldCheck size={14} />
          <span>Company Profile & PO Terms</span>
        </button>
      </div>

      {/* SUB-TAB 1: VENDOR MASTER */}
      {activeSubTab === 'vendors' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <button
              onClick={() => setIsVendorModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-xs shadow-orange-500/20 transition-all"
            >
              <Plus size={15} /> Add New Vendor
            </button>
          </div>

          {/* Vendors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {isLoading ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-400">
                Loading...
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-400">
                No vendors found.
              </div>
            ) : (
              filteredVendors.map((vendor: any) => (
                <div
                  key={vendor._id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                          {vendor.vendorCode}
                        </span>
                        <h3 className="text-sm font-extrabold text-slate-900 mt-1.5">{vendor.name}</h3>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 shrink-0">
                        <Star size={12} className="fill-amber-400 text-amber-500" />
                        <span>{vendor.rating || 4.5}</span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                        {vendor.category?.replace(/_/g, ' ')}
                      </div>
                      {vendor.contactPerson && (
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Users size={12} className="text-slate-400 shrink-0" />
                          <span>{vendor.contactPerson}</span>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400 shrink-0" />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{vendor.email}</span>
                        </div>
                      )}
                      {vendor.gstin && (
                        <div className="font-mono text-[11px] text-slate-500 mt-1">
                          GSTIN: <span className="font-semibold text-slate-800">{vendor.gstin}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Terms: {vendor.paymentTermsDays || 30}d
                    </span>
                    <button
                      onClick={() => setSelectedVendor(vendor)}
                      className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: COMPANY PROFILE */}
      {activeSubTab === 'company' && (
        <form onSubmit={handleSaveCompanyProfile} className="space-y-4">
          {isSavedNotice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} /> Changes updated.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Legal Entity & Tax Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 size={16} className="text-orange-600" /> Purchasing Legal Entity
                </h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Legal Name</label>
                <input
                  type="text"
                  value={companyProfile.legalEntityName}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, legalEntityName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={companyProfile.gstin}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, gstin: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PAN</label>
                  <input
                    type="text"
                    value={companyProfile.pan}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, pan: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Registered Office Address</label>
                <textarea
                  rows={2}
                  value={companyProfile.registeredOffice}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, registeredOffice: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Plant / Delivery Address
                </label>
                <textarea
                  rows={2}
                  value={companyProfile.unit1Plant}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, unit1Plant: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* Bank Details & Authorized Signatory */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <CreditCard size={16} className="text-orange-600" /> Banking & PO Authorization
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={companyProfile.bankName}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, bankName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Branch</label>
                  <input
                    type="text"
                    value={companyProfile.bankBranch}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, bankBranch: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">A/C Number</label>
                  <input
                    type="text"
                    value={companyProfile.accountNumber}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={companyProfile.ifscCode}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, ifscCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Authorized Signatory</label>
                  <input
                    type="text"
                    value={companyProfile.authorizedSignatory}
                    onChange={(e) =>
                      setCompanyProfile({ ...companyProfile, authorizedSignatory: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={companyProfile.signatoryDesignation}
                    onChange={(e) =>
                      setCompanyProfile({ ...companyProfile, signatoryDesignation: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Standard PO Terms & Conditions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FileText size={16} className="text-orange-600" /> Standard Purchase Order Clauses
              </h3>
            </div>

            <div className="space-y-2">
              {companyProfile.standardPoTerms.map((clause, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs text-slate-700"
                >
                  <span className="font-bold text-orange-600 shrink-0">{idx + 1}.</span>
                  <span className="flex-1">{clause}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 shadow-xs shadow-orange-500/20 transition-all"
            >
              Save Profile & Terms
            </button>
          </div>
        </form>
      )}

      {/* Vendor Details Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">{selectedVendor.name}</h3>
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-500 block mb-0.5">Vendor Code</span>
                <span className="font-mono font-semibold text-orange-600">{selectedVendor.vendorCode}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block mb-0.5">Category</span>
                <span className="text-slate-800">{selectedVendor.category?.replace(/_/g, ' ')}</span>
              </div>
              {selectedVendor.contactPerson && (
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Contact Person</span>
                  <span className="text-slate-800">{selectedVendor.contactPerson}</span>
                </div>
              )}
              {selectedVendor.email && (
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Email</span>
                  <span className="text-slate-800">{selectedVendor.email}</span>
                </div>
              )}
              {selectedVendor.phone && (
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Phone</span>
                  <span className="text-slate-800">{selectedVendor.phone}</span>
                </div>
              )}
              {selectedVendor.gstin && (
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">GSTIN</span>
                  <span className="font-mono text-slate-800">{selectedVendor.gstin}</span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">Add New Vendor</h3>
              </div>
              <button
                onClick={() => setIsVendorModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsVendorModalOpen(false);
              }}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vendor Name</label>
                <input
                  type="text"
                  placeholder="Vendor name"
                  value={vendorFormData.name}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={vendorFormData.category}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                >
                  <option value="ELECTRICAL_COMPONENTS">Electrical Components</option>
                  <option value="FASTENERS_BEARINGS">Fasteners & Bearings</option>
                  <option value="PNEUMATICS_HYDRAULICS">Pneumatics & Hydraulics</option>
                  <option value="MACHINED_PARTS">Machined Parts</option>
                  <option value="RAW_MATERIAL">Raw Material</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={vendorFormData.email}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="Phone"
                    value={vendorFormData.phone}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="GSTIN"
                    value={vendorFormData.gstin}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, gstin: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Terms (Days)</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={vendorFormData.paymentTermsDays}
                    onChange={(e) =>
                      setVendorFormData({ ...vendorFormData, paymentTermsDays: parseInt(e.target.value, 10) || 30 })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 shadow-xs"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
