'use client';

import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { Receipt, ShoppingBag, Search, Plus } from 'lucide-react';
import { useGetPurchaseOrdersQuery } from '../api/purchaseApi';

export default function PurchaseOrdersTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data, isLoading } = useGetPurchaseOrdersQuery({});
  const [searchTerm, setSearchTerm] = useState('');

  const pos = data?.purchaseOrders || [];

  const formatIndianCurrency = (amountINR: number) => {
    if (!amountINR) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amountINR);
  };

  const filteredPos = pos.filter((po: any) =>
    po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.vendorId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.projectId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Purchase Orders
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {pos.length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
            <Receipt size={16} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Committed Procurement
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {formatIndianCurrency(pos.reduce((acc: number, po: any) => acc + (po.totalAmount?.baseAmountINR || 0), 0))}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShoppingBag size={16} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm col-span-2 sm:col-span-1 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Project
            </div>
            <div className="text-base font-mono font-bold text-orange-600 mt-0.5">
              {activeProjectId || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
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
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredPos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                filteredPos.map((po: any) => (
                  <tr key={po._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-orange-600">{po.poNumber}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">{po.projectId || '—'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{po.vendorId?.name || '—'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatIndianCurrency(po.totalAmount?.baseAmountINR || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {po.items?.length || 0}
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
