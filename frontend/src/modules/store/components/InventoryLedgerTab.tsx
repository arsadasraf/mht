'use client';

import React from 'react';
import { PackageSearch, Boxes, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useGetInventoryQuery } from '../api/storeApi';

export default function InventoryLedgerTab() {
  const { data, isLoading } = useGetInventoryQuery({});
  const items = data?.items || [];

  return (
    <div className="space-y-4">
      {/* 4-Bucket Summary Cards (Replaces verbose narrative banner) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
          <div className="text-[10px] font-semibold text-slate-500 uppercase">Bucket 1: Ordered</div>
          <div className="text-base font-bold text-sky-600 mt-0.5">Active POs</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
          <div className="text-[10px] font-semibold text-slate-500 uppercase">Bucket 2: In-QC</div>
          <div className="text-base font-bold text-amber-600 mt-0.5">Quarantine Holding</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
          <div className="text-[10px] font-semibold text-slate-500 uppercase">Bucket 3: Accepted</div>
          <div className="text-base font-bold text-emerald-600 mt-0.5">Cleared in Store</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
          <div className="text-[10px] font-semibold text-slate-500 uppercase">Bucket 4: Issued</div>
          <div className="text-base font-bold text-orange-600 mt-0.5">On Assembly Floor</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Part Code</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Bin Location</th>
                <th className="py-3 px-4">Ordered</th>
                <th className="py-3 px-4">In-QC</th>
                <th className="py-3 px-4">Accepted</th>
                <th className="py-3 px-4">Hard Reserved</th>
                <th className="py-3 px-4 text-right">Floor Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    Loading 4-Bucket Ledgers...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    No inventory items recorded in store.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {item.itemCode}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {item.itemName}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {item.category?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {item.binLocation || 'A-01'}
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-700">
                      {item.orderedQty?.baseQty || 0} {item.baseUom}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-700">
                      {item.inQcQty?.baseQty || 0} {item.baseUom}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      {item.acceptedQty?.baseQty || 0} {item.baseUom}
                    </td>
                    <td className="py-3 px-4 font-mono text-orange-600 font-semibold">
                      {item.reservedQty?.baseQty || 0} {item.baseUom}
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-slate-600">
                      {item.issuedQty?.baseQty || 0} {item.baseUom}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
