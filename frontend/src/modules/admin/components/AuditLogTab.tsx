'use client';

import React from 'react';
import { FileSearch, Clock, ShieldCheck, User } from 'lucide-react';
import { useGetAuditLogsQuery } from '../api/adminApi';

export default function AuditLogTab() {
  const { data, isLoading } = useGetAuditLogsQuery({});
  const logs = data?.logs || [];

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {logs.length} Audit Entries
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            ISO Tamper-Proof Trail Active
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Code</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Audit Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    Loading Tamper-Proof Audit Trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No audit events recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'medium'
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.performedByName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{log.performedByEmail}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {log.ipAddress}
                    </td>
                    <td className="py-3 px-4 text-slate-700 text-xs">
                      {log.notes}
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
