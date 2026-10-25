'use client';

import React from 'react';
import { useAppSelector } from '../../../store/hooks';
import { Receipt, Calendar, Building2, ShoppingBag } from 'lucide-react';
import { useGetPurchaseOrdersQuery } from '../api/purchaseApi';

export default function PurchaseOrdersTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data, isLoading } = useGetPurchaseOrdersQuery({});

  const pos = data?.purchaseOrders || [];

  const formatIndianCurrency = (amountINR) => {
    if (!amountINR) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amountINR);
  };

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
              {pos.length} Active POs
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
              {formatIndianCurrency(pos.reduce((acc, po) => acc + (po.totalAmount?.baseAmountINR || 0), 0))}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShoppingBag size={16} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm col-span-2 sm:col-span-1 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Active Project Spine
            </div>
            <div className="text-base font-mono font-bold text-orange-600 mt-0.5">
              {activeProjectId}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Target Project Spine</th>
                <th className="py-3 px-4">Vendor Details</th>
                <th className="py-3 px-4">Total Amount (Dual Currency)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Line Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    Loading Purchase Orders...
                  </td>
                </tr>
              ) : pos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No active purchase orders found.
                  </td>
                </tr>
              ) : (
                pos.map((po) => (
                  <tr key={po._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-orange-600">
                      {po.poNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {po.projectId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {po.vendorId?.name || 'Approved Supplier'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {po.vendorId?.vendorCode}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-slate-900">
                        {formatIndianCurrency(po.totalAmount?.baseAmountINR)}
                      </div>
                      {po.totalAmount?.currency !== 'INR' && (
                        <div className="text-[10px] text-slate-500">
                          {po.totalAmount.currency} {po.totalAmount.amount} (@ {po.totalAmount.exchangeRate})
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                      {po.items?.length || 0} Lines
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
