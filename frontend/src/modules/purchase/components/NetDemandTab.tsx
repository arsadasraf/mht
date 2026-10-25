'use client';

import React from 'react';
import { useAppSelector } from '../../../store/hooks';
import { Calculator, ShoppingCart, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useCalculateNetDemandQuery } from '../api/purchaseApi';

export default function NetDemandTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data, isLoading } = useCalculateNetDemandQuery(activeProjectId || 'PRJ-2026-001');

  const demandList = data?.demandMatrix || [];
  const itemsRequiringProcurement = data?.itemsRequiringProcurement || 0;

  return (
    <div className="space-y-4">
      {/* Compact KPI Row (Replaces verbose formula text banner) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Target Spine
            </div>
            <div className="text-base font-mono font-bold text-orange-600 mt-0.5">
              {activeProjectId}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
            <Calculator size={16} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Sourcing Action Required
            </div>
            <div className="text-base font-bold text-red-600 mt-0.5">
              {itemsRequiringProcurement} Parts Deficit
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle size={16} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm col-span-2 sm:col-span-1 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Store Available
            </div>
            <div className="text-base font-bold text-emerald-600 mt-0.5">
              {demandList.length - itemsRequiringProcurement} Parts Covered
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
        </div>
      </div>

      {/* Net Demand Calculation Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Item Code</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Sub-Assembly</th>
                <th className="py-3 px-4">Gross BOM Demand</th>
                <th className="py-3 px-4">Store Available</th>
                <th className="py-3 px-4">Net Sourcing Demand</th>
                <th className="py-3 px-4 text-right">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    Calculating Net Demand against Store Inventory Ledgers...
                  </td>
                </tr>
              ) : demandList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No purchased components found in BOM for {activeProjectId}.
                  </td>
                </tr>
              ) : (
                demandList.map((item, idx) => {
                  const needsProcurement = item.netDemand > 0;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        needsProcurement ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {item.itemCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{item.itemName}</td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">{item.subAssemblyGroup || '—'}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {item.grossDemand} {item.uom}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-700 font-medium">
                        {item.availableStock} {item.uom}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={needsProcurement ? 'text-orange-600' : 'text-slate-400'}>
                          {item.netDemand} {item.uom}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {needsProcurement ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            PO REQUIRED
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            IN-STOCK CLEARED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
