'use client';

import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import {
  IndianRupee,
  Search,
  Plus,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { useGetBillsQuery, useCreateBillMutation } from '../api/purchaseApi';

interface PurchaseBill {
  id: string;
  billNumber: string;
  vendorName: string;
  poNumber: string;
  gateEntryNo: string;
  billDate: string;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  dueDate: string;
  status: 'MATCHED' | 'PENDING_GRN' | 'DISCREPANCY' | 'APPROVED' | 'PAID';
}

export default function PurchaseBillsTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data: billData, isLoading } = useGetBillsQuery({});
  const [createBillMutation] = useCreateBillMutation();

  const bills: PurchaseBill[] = billData?.bills || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBillDetails, setSelectedBillDetails] = useState<PurchaseBill | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    billNumber: '',
    vendorName: '',
    poNumber: '',
    gateEntryNo: '',
    billDate: new Date().toISOString().split('T')[0],
    taxableAmount: '',
    taxAmount: '',
    dueDate: ''
  });

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  const filteredBills = bills.filter(
    (b) =>
      b.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.poNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBillValue = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const handleRecordBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.billNumber || !formData.vendorName) return;

    const taxable = parseFloat(formData.taxableAmount) || 0;
    const tax = parseFloat(formData.taxAmount) || taxable * 0.18;

    try {
      await createBillMutation({
        billNumber: formData.billNumber,
        vendorName: formData.vendorName,
        poNumber: formData.poNumber,
        gateEntryNo: formData.gateEntryNo,
        taxableAmount: taxable,
        taxAmount: tax,
        dueDate: formData.dueDate
      }).unwrap();

      setFormData({
        billNumber: '',
        vendorName: '',
        poNumber: '',
        gateEntryNo: '',
        billDate: new Date().toISOString().split('T')[0],
        taxableAmount: '',
        taxAmount: '',
        dueDate: ''
      });
      setIsModalOpen(false);
    } catch {
      setIsModalOpen(false);
    }
  };

  const getStatusBadge = (status: PurchaseBill['status']) => {
    switch (status) {
      case 'MATCHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> Matched
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <CheckCircle2 size={11} /> Approved
          </span>
        );
      case 'PENDING_GRN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} /> Pending Inward
          </span>
        );
      case 'DISCREPANCY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle size={11} /> Mismatch
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
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
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Purchase Bills</div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">{bills.length}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <IndianRupee size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Invoiced</div>
            <div className="text-base font-extrabold text-emerald-700 mt-0.5">{formatCurrency(totalBillValue)}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileCheck size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">3-Way Matched</div>
            <div className="text-base font-extrabold text-sky-600 mt-0.5">
              {bills.filter((b) => b.status === 'MATCHED' || b.status === 'APPROVED').length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Pending Inward</div>
            <div className="text-base font-extrabold text-amber-600 mt-0.5">
              {bills.filter((b) => b.status === 'PENDING_GRN').length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFormData({
                billNumber: '',
                vendorName: '',
                poNumber: '',
                gateEntryNo: '',
                billDate: new Date().toISOString().split('T')[0],
                taxableAmount: '',
                taxAmount: '',
                dueDate: ''
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-xs shadow-orange-500/20 transition-all"
          >
            <Plus size={15} /> Record Inward Bill
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Invoice Number</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">PO Ref</th>
                <th className="py-3 px-4">Gate Ref</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Due Date</th>
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
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No bills found.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.billNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{b.vendorName}</td>
                    <td className="py-3 px-4 font-mono text-orange-600">{b.poNumber || '—'}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{b.gateEntryNo || '—'}</td>
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-900">
                      {formatCurrency(b.totalAmount)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{b.dueDate || '—'}</td>
                    <td className="py-3 px-4">{getStatusBadge(b.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedBillDetails(b)}
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

      {/* Bill Details Modal */}
      {selectedBillDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <IndianRupee size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                  {selectedBillDetails.billNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBillDetails(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Vendor</span>
                  <span className="font-semibold text-slate-900">{selectedBillDetails.vendorName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">PO Ref</span>
                  <span className="font-mono font-semibold text-orange-600">{selectedBillDetails.poNumber || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Gate Ref</span>
                  <span className="font-mono text-slate-700">{selectedBillDetails.gateEntryNo || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Due Date</span>
                  <span className="font-mono text-slate-700">{selectedBillDetails.dueDate || '—'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Taxable</span>
                  <span className="font-mono text-slate-900">{formatCurrency(selectedBillDetails.taxableAmount)}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Total Amount</span>
                  <span className="font-mono font-bold text-emerald-700">{formatCurrency(selectedBillDetails.totalAmount)}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedBillDetails(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Inward Bill Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            {/* Header Ribbon (Title and Icon Only) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <IndianRupee size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">Record Inward Purchase Bill</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRecordBill} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    placeholder="Invoice number"
                    value={formData.billNumber}
                    onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vendor Name</label>
                  <input
                    type="text"
                    placeholder="Vendor name"
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PO Reference</label>
                  <input
                    type="text"
                    placeholder="PO number"
                    value={formData.poNumber}
                    onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gate Entry Ref</label>
                  <input
                    type="text"
                    placeholder="Gate entry number"
                    value={formData.gateEntryNo}
                    onChange={(e) => setFormData({ ...formData, gateEntryNo: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Taxable Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="Taxable amount"
                    value={formData.taxableAmount}
                    onChange={(e) => setFormData({ ...formData, taxableAmount: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              {/* Footer */}
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
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-xs"
                >
                  Record Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
