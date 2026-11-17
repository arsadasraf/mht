'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MapPin,
  Building2,
  ShieldCheck,
  Hash,
  Clock
} from 'lucide-react';
import VendorMasterSection from '../../purchase/components/VendorMasterSection';
import StoreCompanyProfileSection from './StoreCompanyProfileSection';
import { StoreLocationMasterSection } from './StoreLocationMasterSection';
import StorePrefixPolicySection from './StorePrefixPolicySection';
import StoreTimePolicySection from './StoreTimePolicySection';
import { useGetVendorsQuery } from '../../purchase/api/purchaseApi';
import { useGetStoreLocationsQuery } from '../api/storeApi';

export type MasterSubTab = 'vendors' | 'company' | 'locations' | 'prefix-policy' | 'time-policy';

export default function StoreMasterTab({
  initialSubTab
}: {
  initialSubTab?: MasterSubTab;
} = {}) {
  const pathname = usePathname();
  const { data: vendorData } = useGetVendorsQuery({});
  const { data: locationData } = useGetStoreLocationsQuery({});

  const vendors = vendorData?.vendors || [];
  const locations = locationData?.locations || [];

  const rawSubTab =
    initialSubTab ||
    (pathname?.endsWith('/time-policy')
      ? 'time-policy'
      : pathname?.endsWith('/prefix-policy')
      ? 'prefix-policy'
      : pathname?.endsWith('/company')
      ? 'company'
      : pathname?.endsWith('/locations')
      ? 'locations'
      : 'vendors');

  const activeSubTab: 'vendors' | 'company' | 'locations' | 'prefix-policy' | 'time-policy' =
    rawSubTab === 'time-policy'
      ? 'time-policy'
      : rawSubTab === 'prefix-policy'
      ? 'prefix-policy'
      : rawSubTab === 'locations'
      ? 'locations'
      : rawSubTab === 'company'
      ? 'company'
      : 'vendors';

  return (
    <div className="space-y-4">
      {/* Sub-Tabs Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Modern Button-Type Sub-Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <Link
            href="/store/master/vendors"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'vendors'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 size={14} />
            <span>Vendors</span>
            {vendors.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeSubTab === 'vendors' ? 'bg-white text-orange-600' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {vendors.length}
              </span>
            )}
          </Link>

          <Link
            href="/store/master/company"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'company'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Company Profile</span>
          </Link>

          <Link
            href="/store/master/locations"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'locations'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <MapPin size={14} />
            <span>Location Master</span>
            {locations.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeSubTab === 'locations' ? 'bg-white text-orange-600' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {locations.length}
              </span>
            )}
          </Link>

          <Link
            href="/store/master/prefix-policy"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'prefix-policy'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Hash size={14} />
            <span>Prefix Policy</span>
          </Link>

          <Link
            href="/store/master/time-policy"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'time-policy'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Clock size={14} />
            <span>Time Policy</span>
          </Link>
        </div>
      </div>

      {/* SUB-VIEW 1: VENDOR MASTER (IDENTICAL & SHARED WITH PURCHASE) */}
      {activeSubTab === 'vendors' && <VendorMasterSection />}

      {/* SUB-VIEW 2: STORE COMPANY PROFILE (INDEPENDENT SCHEMA & BACKEND) */}
      {activeSubTab === 'company' && <StoreCompanyProfileSection />}

      {/* SUB-VIEW 3: LOCATION MASTER (STRICT 3-FIELD FORM, RESEARCHED TYPES & AUDIT TRAIL) */}
      {activeSubTab === 'locations' && <StoreLocationMasterSection />}

      {/* SUB-VIEW 4: STORE PREFIX & SEQUENCE POLICY */}
      {activeSubTab === 'prefix-policy' && <StorePrefixPolicySection />}

      {/* SUB-VIEW 5: STORE TIME POLICY & STOCK REVERSAL RULES */}
      {activeSubTab === 'time-policy' && <StoreTimePolicySection />}
    </div>
  );
}
