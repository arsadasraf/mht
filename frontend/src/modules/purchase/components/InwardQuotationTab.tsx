'use client';

import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import {
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Receipt,
  X,
  TrendingDown,
  Award
} from 'lucide-react';
import { useGetQuotationsQuery } from '../api/purchaseApi';

interface VendorQuote {
  id: string;
  quoteNumber: string;
  rfqNumber: string;
  vendorName: string;
  projectId?: string;
  receivedDate: string;
  totalAmountINR: number;
  leadTimeDays: number;
  paymentTerms: string;
  status: 'RECEIVED' | 'UNDER_REVIEW' | 'ACCEPTED_L1' | 'REJECTED';
}

export default function InwardQuotationTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data: quoteData, isLoading } = useGetQuotationsQuery({});
  const quotes: VendorQuote[] = quoteData?.quotations || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuoteForCs, setSelectedQuoteForCs] = useState<VendorQuote | null>(null);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  const filteredQuotes = quotes.filter(
    (q) =>
      q.quoteNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.rfqNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const l1Count = quotes.filter((q) => q.status === 'ACCEPTED_L1').length;
  const csCount = new Set(quotes.map((q) => q.rfqNumber).filter(Boolean)).size;
  const avgLeadTime = quotes.length
    ? `${Math.round(quotes.reduce((acc, q) => acc + (q.leadTimeDays || 0), 0) / quotes.length)}d`
    : '—';

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Inward Quotes</div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">{quotes.length}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <FileSpreadsheet size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">L1 Lowest Bids</div>
            <div className="text-base font-extrabold text-emerald-600 mt-0.5">{l1Count}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Comparative Statements</div>
            <div className="text-base font-extrabold text-sky-600 mt-0.5">{csCount}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <TrendingDown size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Average Lead Time</div>
            <div className="text-base font-extrabold text-purple-600 mt-0.5">{avgLeadTime}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock size={16} />
          </div>
        </div>
      </div>

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
      </div>

      {/* Inward Quotation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Quote Number</th>
                <th className="py-3 px-4">RFQ Ref</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Quoted Value</th>
                <th className="py-3 px-4">Lead Time</th>
                <th className="py-3 px-4">Payment Terms</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No quotations found.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{q.quoteNumber}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-orange-600">{q.rfqNumber || '—'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{q.vendorName}</td>
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-900">
                      {formatCurrency(q.totalAmountINR)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{q.leadTimeDays ? `${q.leadTimeDays}d` : '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{q.paymentTerms || '—'}</td>
                    <td className="py-3 px-4">
                      {q.status === 'ACCEPTED_L1' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Award size={11} /> L1 Selected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {q.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedQuoteForCs(q)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quote Details Modal */}
      {selectedQuoteForCs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
            {/* Header Ribbon (Title and Icon Only) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <TrendingDown size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                  {selectedQuoteForCs.quoteNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedQuoteForCs(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Vendor</span>
                  <span className="font-semibold text-slate-900">{selectedQuoteForCs.vendorName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">RFQ Reference</span>
                  <span className="font-mono font-semibold text-orange-600">{selectedQuoteForCs.rfqNumber || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Quoted Value</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedQuoteForCs.totalAmountINR)}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Lead Time</span>
                  <span className="text-slate-800">{selectedQuoteForCs.leadTimeDays ? `${selectedQuoteForCs.leadTimeDays} Days` : '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Payment Terms</span>
                  <span className="text-slate-800">{selectedQuoteForCs.paymentTerms || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Status</span>
                  <span className="font-semibold text-slate-800">{selectedQuoteForCs.status}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedQuoteForCs(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
