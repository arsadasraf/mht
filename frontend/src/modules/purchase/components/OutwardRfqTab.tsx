'use client';

import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import {
  Inbox,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  X,
  Send
} from 'lucide-react';
import { useGetVendorsQuery, useGetRfqsQuery, useCreateRfqMutation } from '../api/purchaseApi';

interface RfqItem {
  id: string;
  rfqNumber: string;
  projectId: string;
  title: string;
  vendorCount: number;
  itemCount: number;
  submissionDeadline: string;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_QUOTED' | 'CLOSED';
  createdAt: string;
}

export default function OutwardRfqTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data: vendorData } = useGetVendorsQuery({});
  const { data: rfqData, isLoading } = useGetRfqsQuery({});
  const [createRfqMutation] = useCreateRfqMutation();

  const vendors = vendorData?.vendors || [];
  const rfqs: RfqItem[] = rfqData?.rfqs || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRfqDetails, setSelectedRfqDetails] = useState<RfqItem | null>(null);

  // Modal Form State
  const [formData, setFormData] = useState({
    title: '',
    projectId: activeProjectId || '',
    submissionDeadline: '',
    selectedVendors: [] as string[],
    notes: '',
    items: [] as Array<{ itemCode: string; description: string; qty: number; uom: string }>
  });

  const filteredRfqs = rfqs.filter(
    (r) =>
      r.rfqNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.projectId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      await createRfqMutation({
        title: formData.title,
        projectId: formData.projectId || activeProjectId,
        submissionDeadline: formData.submissionDeadline,
        items: formData.items,
        notes: formData.notes
      }).unwrap();

      setFormData({
        title: '',
        projectId: activeProjectId || '',
        submissionDeadline: '',
        selectedVendors: [],
        notes: '',
        items: []
      });
      setIsModalOpen(false);
    } catch {
      setIsModalOpen(false);
    }
  };

  const getStatusBadge = (status: RfqItem['status']) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock size={11} /> Sent
          </span>
        );
      case 'PARTIALLY_QUOTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} /> Partially Quoted
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> Closed
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total RFQs</div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">{rfqs.length}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Inbox size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Active Sent</div>
            <div className="text-base font-extrabold text-sky-600 mt-0.5">
              {rfqs.filter((r) => r.status === 'SENT').length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Clock size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Partially Quoted</div>
            <div className="text-base font-extrabold text-amber-600 mt-0.5">
              {rfqs.filter((r) => r.status === 'PARTIALLY_QUOTED').length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileText size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Project</div>
            <div className="text-base font-mono font-extrabold text-orange-600 mt-0.5">
              {activeProjectId || '—'}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Building2 size={16} />
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
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFormData({
                title: '',
                projectId: activeProjectId || '',
                submissionDeadline: '',
                selectedVendors: [],
                notes: '',
                items: []
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-xs shadow-orange-500/20 transition-all"
          >
            <Plus size={15} /> Create Outward RFQ
          </button>
        </div>
      </div>

      {/* RFQ Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">RFQ Number</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Vendors</th>
                <th className="py-3 px-4">Deadline</th>
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
              ) : filteredRfqs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No RFQs found.
                  </td>
                </tr>
              ) : (
                filteredRfqs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-orange-600">{rfq.rfqNumber}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">{rfq.projectId || '—'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">{rfq.title}</td>
                    <td className="py-3 px-4 text-slate-600">{rfq.itemCount}</td>
                    <td className="py-3 px-4 text-slate-600">{rfq.vendorCount}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{rfq.submissionDeadline || '—'}</td>
                    <td className="py-3 px-4">{getStatusBadge(rfq.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        onClick={() => setSelectedRfqDetails(rfq)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View RFQ Details Modal */}
      {selectedRfqDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Inbox size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">{selectedRfqDetails.rfqNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedRfqDetails(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-500 block mb-0.5">Title</span>
                <span className="font-semibold text-slate-900">{selectedRfqDetails.title}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Project</span>
                  <span className="font-mono font-semibold text-slate-900">{selectedRfqDetails.projectId || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Deadline</span>
                  <span className="font-mono font-semibold text-slate-900">{selectedRfqDetails.submissionDeadline || '—'}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedRfqDetails(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create RFQ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            {/* Header Ribbon (Title and Icon Only) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Inbox size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">Create Outward RFQ</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateRfq} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Project</label>
                  <input
                    type="text"
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-semibold"
                    placeholder="Project ID"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Submission Deadline</label>
                  <input
                    type="date"
                    value={formData.submissionDeadline}
                    onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="RFQ title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes / instructions"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-xs"
                >
                  <Send size={14} /> Dispatch Outward RFQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
