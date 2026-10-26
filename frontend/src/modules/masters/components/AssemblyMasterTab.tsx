'use client';

import React, { useState } from 'react';
import {
  Kanban,
  Search,
  Plus,
  TrendingUp,
  Clock,
  IndianRupee,
  CheckCircle2,
  X
} from 'lucide-react';
import { useGetMasterDomainQuery, useCreateMasterEntityMutation } from '../api/mastersApi';

export default function AssemblyMasterTab() {
  const { data } = useGetMasterDomainQuery('assemblies');
  const [createAssembly] = useCreateMasterEntityMutation();

  const assemblies = data?.data || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    itemCode: '',
    name: '',
    modelSeries: 'CW-Series',
    leadWeeks: 8,
    standardPriceINR: 2200000
  });

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  const filtered = assemblies.filter(
    (a: any) =>
      a.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.modelSeries?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemCode) return;
    await createAssembly({ domain: 'assemblies', data: formData });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Machine Assemblies</div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">{assemblies.length} Products</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Kanban size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">BOM Level 0</div>
            <div className="text-base font-extrabold text-emerald-600 mt-0.5">Top-Level Machines</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Average Lead Time</div>
            <div className="text-base font-extrabold text-sky-600 mt-0.5">8 - 12 Weeks</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Clock size={16} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">CRM Quote Integration</div>
            <div className="text-base font-extrabold text-purple-600 mt-0.5">Preset Catalogs</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <IndianRupee size={16} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search finished machine assemblies by code, model name, or series..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-xs shadow-orange-500/20 transition-all"
        >
          <Plus size={15} /> Add Machine Assembly
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Machine Assembly Code</th>
                <th className="py-3 px-4">Model Description</th>
                <th className="py-3 px-4">Model Series</th>
                <th className="py-3 px-4">Standard Lead Time</th>
                <th className="py-3 px-4">Catalogue Base Price</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-orange-600">{a.itemCode}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{a.name}</td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700">
                      {a.modelSeries}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">{a.leadWeeks} Weeks</td>
                  <td className="py-3 px-4 font-mono font-extrabold text-slate-900">
                    {formatCurrency(a.standardPriceINR)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Kanban size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">Add Machine Assembly</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Define Level 0 finished machine model for CRM quotation</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assembly Code</label>
                  <input
                    type="text"
                    placeholder="e.g. ASY-CW-600"
                    value={formData.itemCode}
                    onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 uppercase font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Machine Model Description</label>
                  <input
                    type="text"
                    placeholder="e.g. 6-Spindle Heavy Gauge Transformer Coil Winder"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Model Series</label>
                  <input
                    type="text"
                    placeholder="e.g. CW-Series 600"
                    value={formData.modelSeries}
                    onChange={(e) => setFormData({ ...formData, modelSeries: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Standard Base Price (₹)</label>
                  <input
                    type="number"
                    value={formData.standardPriceINR}
                    onChange={(e) => setFormData({ ...formData, standardPriceINR: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 shadow-xs"
                >
                  Save Assembly Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
