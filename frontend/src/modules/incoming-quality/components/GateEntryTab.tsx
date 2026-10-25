'use client';

import React from 'react';
import { ShieldAlert, Truck, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { useGetGateEntriesQuery } from '../api/incomingQualityApi';

export default function GateEntryTab() {
  const { data, isLoading } = useGetGateEntriesQuery({});
  const entries = data?.gateEntries || [];

  return (
    <div className="space-y-4">
      {/* Action Header (Zero narrative banner) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {entries.length} Inward Entries
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Quarantine Holding Active
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Gate Entry #</th>
                <th className="py-3 px-4">Project Spine</th>
                <th className="py-3 px-4">PO Reference</th>
                <th className="py-3 px-4">Vendor & Transporter</th>
                <th className="py-3 px-4">Invoice / Challan</th>
                <th className="py-3 px-4">Vehicle #</th>
                <th className="py-3 px-4 text-right">Quarantine State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    Loading Gate Inward Entries...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No recent gate entries recorded.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-orange-600">
                      {entry.gateEntryNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {entry.projectId}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {entry.poId?.poNumber || 'PO-2026-BOM-001'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {entry.vendorId?.name || 'Authorized Supplier'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Carrier: {entry.transporterName || 'Direct Delivery'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {entry.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 uppercase text-[11px]">
                      {entry.vehicleNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {entry.status}
                      </span>
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
