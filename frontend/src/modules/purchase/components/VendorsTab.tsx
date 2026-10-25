'use client';

import React from 'react';
import { Building2, Star, Mail, Phone } from 'lucide-react';
import { useGetVendorsQuery } from '../api/purchaseApi';

export default function VendorsTab() {
  const { data, isLoading } = useGetVendorsQuery({});
  const vendors = data?.vendors || [];

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {vendors.length} Approved Suppliers
        </span>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {isLoading ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            Loading Approved Suppliers Directory...
          </div>
        ) : vendors.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            No vendors registered in database.
          </div>
        ) : (
          vendors.map((v) => (
            <div
              key={v._id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-orange-600">
                    {v.vendorCode}
                  </span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                    <Star size={11} className="fill-amber-500 text-amber-500" />
                    <span>{v.rating}</span>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-slate-900 mb-1">{v.name}</h3>
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  {v.category.replace(/_/g, ' ')}
                </span>

                <div className="space-y-1 mt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Mail size={12} className="text-slate-400" />
                    <span className="truncate">{v.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-400" />
                    <span>{v.phone}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>GST: <strong className="font-mono text-slate-700">{v.gstin || '—'}</strong></span>
                <span>Terms: <strong className="text-slate-700">{v.paymentTermsDays}d</strong></span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
