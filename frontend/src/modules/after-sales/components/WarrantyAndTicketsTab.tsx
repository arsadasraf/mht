'use client';

import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { LifeBuoy, Plus, Wrench, ShieldCheck, Clock, CheckCircle2, X } from 'lucide-react';
import { useGetServiceTicketsQuery, useCreateServiceTicketMutation } from '../api/afterSalesApi';
import { addToast } from '../../../store/uiSlice';

export default function WarrantyAndTicketsTab() {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data, isLoading } = useGetServiceTicketsQuery({});
  const [createServiceTicket, { isLoading: isCreating }] = useCreateServiceTicketMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceType, setServiceType] = useState('PREVENTIVE_MAINTENANCE');
  const [customerName, setCustomerName] = useState('Bharat Heavy Electricals Ltd');

  const tickets = data?.tickets || [];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !description) {
      dispatch(addToast({
        type: 'warning',
        title: 'Incomplete Ticket',
        message: 'Ticket title and description are required.',
        fixHint: 'Provide brief issue description before submitting.'
      }));
      return;
    }

    try {
      await createServiceTicket({
        projectId: activeProjectId || 'PRJ-2026-001',
        customerName,
        serviceType,
        title,
        description
      }).unwrap();

      setIsModalOpen(false);
      setTitle('');
      setDescription('');

      dispatch(addToast({
        type: 'success',
        title: 'Service Ticket Logged',
        message: `Field ticket for ${activeProjectId} registered and dispatched to service engineers.`
      }));
    } catch (err: any) {
      dispatch(addToast({
        type: 'error',
        title: 'Failed to Log Ticket',
        message: err?.data?.message || 'Unable to register service ticket.',
        fixHint: err?.data?.fixHint || 'Verify project ID and connection.'
      }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar (Zero narrative banner) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {tickets.length} Active Tickets
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Under Warranty
          </span>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-sm transition-all"
        >
          <Plus size={15} />
          <span>Log Service Ticket</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Ticket #</th>
                <th className="py-3 px-4">Machine Spine ID</th>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Service Type</th>
                <th className="py-3 px-4">Title & Issue</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    Loading Field Service Records...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No open service tickets recorded.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-orange-600">
                      {t.ticketNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {t.projectId}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{t.customerName}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        {t.serviceType?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-slate-900">{t.title}</div>
                      <div className="text-[11px] text-slate-500 truncate">{t.description}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Log Field Service Ticket
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Machine Spine ID
                </label>
                <input
                  type="text"
                  disabled
                  value={activeProjectId}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Service Category
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="PREVENTIVE_MAINTENANCE">Preventive Maintenance</option>
                  <option value="BREAKDOWN">Emergency Breakdown</option>
                  <option value="SPARE_PARTS">Spare Parts Request</option>
                  <option value="WARRANTY_INSPECTION">Warranty Annual Inspection</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ticket Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spindle servo drive alarm calibration"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issue Description & Diagnostic *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed breakdown description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {isCreating ? 'Logging...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
