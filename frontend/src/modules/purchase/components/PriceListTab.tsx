'use client';

import React, { useState } from 'react';
import {
  Calculator,
  Search,
  Plus,
  Building2,
  X,
  Tag,
  CheckCircle2
} from 'lucide-react';

interface PriceItem {
  id: string;
  itemCode: string;
  description: string;
  category: string;
  vendorName: string;
  unitPrice: number;
  uom: string;
  moq: number;
  effectiveFrom: string;
  effectiveTo: string;
  lastPoNumber?: string;
}

export default function PriceListTab() {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    itemCode: '',
    description: '',
    category: 'ELECTRICAL_COMPONENTS',
    vendorName: '',
    unitPrice: '',
    uom: 'NOS',
    moq: '1',
    effectiveFrom: '',
    effectiveTo: ''
  });

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  const filteredItems = items.filter(
    (i) =>
      i.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.vendorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemCode || !formData.vendorName) return;

    const newItem: PriceItem = {
      id: `pi-${Date.now()}`,
      itemCode: formData.itemCode.toUpperCase(),
      description: formData.description,
      category: formData.category,
      vendorName: formData.vendorName,
      unitPrice: parseFloat(formData.unitPrice) || 0,
      uom: formData.uom,
      moq: parseInt(formData.moq, 10) || 1,
      effectiveFrom: formData.effectiveFrom,
      effectiveTo: formData.effectiveTo
    };

    setItems([newItem, ...items]);
    setFormData({
      itemCode: '',
      description: '',
      category: 'ELECTRICAL_COMPONENTS',
      vendorName: '',
      unitPrice: '',
      uom: 'NOS',
      moq: '1',
      effectiveFrom: '',
      effectiveTo: ''
    });
    setIsModalOpen(false);
  };

  const vendorCount = new Set(items.map((i) => i.vendorName).filter(Boolean)).size;
  const categoryCount = new Set(items.map((i) => i.category).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Priced Items</div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">{items.length}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Calculator size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Active Agreements</div>
            <div className="text-base font-extrabold text-emerald-600 mt-0.5">{items.length}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Contract Vendors</div>
            <div className="text-base font-extrabold text-sky-600 mt-0.5">{vendorCount}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Building2 size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Categories</div>
            <div className="text-base font-extrabold text-purple-600 mt-0.5">{categoryCount}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Tag size={16} />
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
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-xs shadow-orange-500/20 transition-all"
          >
            <Plus size={15} /> Add Rate Agreement
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Item Code</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Agreed Unit Rate</th>
                <th className="py-3 px-4">UOM</th>
                <th className="py-3 px-4">MOQ</th>
                <th className="py-3 px-4">Validity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No rate agreements found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-orange-600">{item.itemCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.description}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.vendorName}</td>
                    <td className="py-3 px-4 font-mono font-extrabold text-emerald-700">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.uom}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{item.moq}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {item.effectiveFrom && item.effectiveTo
                        ? `${item.effectiveFrom} to ${item.effectiveTo}`
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Rate Agreement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            {/* Header Ribbon (Title and Icon Only) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Calculator size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">Add Rate Agreement</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddItem} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item Code</label>
                  <input
                    type="text"
                    placeholder="Item code"
                    value={formData.itemCode}
                    onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  >
                    <option value="ELECTRICAL_COMPONENTS">Electrical Components</option>
                    <option value="FASTENERS_BEARINGS">Fasteners & Bearings</option>
                    <option value="PNEUMATICS_HYDRAULICS">Pneumatics & Hydraulics</option>
                    <option value="MACHINED_PARTS">Machined Parts</option>
                    <option value="RAW_MATERIAL">Raw Material</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item Description</label>
                  <input
                    type="text"
                    placeholder="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contract Rate (₹)</label>
                  <input
                    type="number"
                    placeholder="Unit rate"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-mono"
                    required
                  />
                </div>
              </div>

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
                  Save Rate Agreement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
