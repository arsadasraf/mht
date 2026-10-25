'use client';

import React from 'react';
import { CheckSquare, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useGetInspectionsQuery } from '../api/incomingQualityApi';

export default function InspectionsTab() {
  const { data, isLoading } = useGetInspectionsQuery({});
  const inspections = data?.inspections || [];

  const passedCount = inspections.filter((i) => i.overallVerdict === 'ACCEPTED').length;
  const rejectedCount = inspections.filter((i) => i.overallVerdict === 'REJECTED').length;

  return (
    <div className="space-y-4">
      {/* Header Chips */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {inspections.length} Inspection Reports
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {passedCount} Passed
          </span>
          {rejectedCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
              {rejectedCount} Rejections
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">QC Report #</th>
                <th className="py-3 px-4">Project Spine</th>
                <th className="py-3 px-4">PO #</th>
                <th className="py-3 px-4">Item Inspected</th>
                <th className="py-3 px-4">Received Qty</th>
                <th className="py-3 px-4">Accepted / Rejected</th>
                <th className="py-3 px-4">Overall Verdict</th>
                <th className="py-3 px-4 text-right">Inspected By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    Loading Quality Reports...
                  </td>
                </tr>
              ) : inspections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No QC inspection records found.
                  </td>
                </tr>
              ) : (
                inspections.map((qc) => (
                  <tr key={qc._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-orange-600">
                      {qc.inspectionNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {qc.projectId}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {qc.poNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{qc.itemName}</div>
                      <div className="font-mono text-[11px] text-slate-500">{qc.itemCode}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {qc.receivedQty?.baseQty} {qc.receivedQty?.baseUom}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {qc.acceptedQty?.baseQty} Acc
                        </span>
                        {qc.rejectedQty?.baseQty > 0 && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            {qc.rejectedQty?.baseQty} Rej
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {qc.overallVerdict === 'ACCEPTED' ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ACCEPTED
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          {qc.overallVerdict}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 text-[11px]">
                      {qc.inspectedBy ? `${qc.inspectedBy.firstName} ${qc.inspectedBy.lastName}` : 'QC Lead'}
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
