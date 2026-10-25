'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '../../../store/hooks';
import {
  FolderGit2,
  Plus,
  Search,
  Cpu,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowRight,
  X
} from 'lucide-react';
import { useGetProjectsQuery, useCreateProjectMutation } from '../api/projectApi';
import { setActiveProjectId, addToast } from '../../../store/uiSlice';

export default function ProjectsTab() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [projectName, setProjectName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [machineModel, setMachineModel] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(1.0);

  const { data, isLoading } = useGetProjectsQuery({
    search: searchTerm || undefined,
    stage: stageFilter || undefined
  });

  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();

  const projects = data?.projects || [];

  const handleSelectProject = (projectId) => {
    dispatch(setActiveProjectId(projectId));
    dispatch(addToast({
      type: 'info',
      title: 'Active Spine Selected',
      message: `Active reference set to ${projectId}. All stages now reflect this machine.`
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!projectName || !customerName || !machineModel || !amount) {
      dispatch(addToast({
        type: 'warning',
        title: 'Incomplete Project Details',
        message: 'Please fill in all required machine identification and commercial fields.',
        fixHint: 'Project Name, Customer Name, Machine Model, and Contract Value are mandatory.'
      }));
      return;
    }

    try {
      const res = await createProject({
        projectName,
        customerName,
        machineModel,
        contractValue: {
          currency,
          amount: Number(amount),
          exchangeRate: Number(exchangeRate)
        }
      }).unwrap();

      setIsModalOpen(false);
      setProjectName('');
      setCustomerName('');
      setMachineModel('');
      setAmount('');

      dispatch(addToast({
        type: 'success',
        title: 'Master Work Order Minted',
        message: `Unique Project ID ${res.project?.uniqueProjectId || 'PRJ-XXXX'} minted with base BOM and milestones initialized.`
      }));
    } catch (err: any) {
      dispatch(addToast({
        type: 'error',
        title: 'Project Minting Blocked',
        message: err?.data?.message || 'Unable to register new machine work order.',
        fixHint: err?.data?.fixHint || 'Ensure unique project name and valid numeric contract value.'
      }));
    }
  };

  const formatIndianCurrency = (amountINR) => {
    if (!amountINR) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amountINR);
  };

  return (
    <div className="space-y-5">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Cpu size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Active Builds
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {projects.length} Lines
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Contract Value
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {formatIndianCurrency(projects.reduce((acc, p) => acc + (p.contractValue?.baseAmountINR || 0), 0))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              In Machine Trial
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {projects.filter((p) => p.currentStage === 'MACHINE_TRIAL').length} Units
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              ECO Freeze
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {projects.filter((p) => p.status === 'FROZEN_ECO').length} Locked
            </div>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Unique Project ID, Machine Model, Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-orange-500 shadow-sm font-medium"
          >
            <option value="">All Lifecycle Stages</option>
            <option value="PROJECT_SETUP">Project Setup</option>
            <option value="DESIGN_BOM">Design & BOM</option>
            <option value="PROCUREMENT">Procurement</option>
            <option value="INCOMING_QC">Incoming QC</option>
            <option value="STORE_ALLOCATION">Store Allocation</option>
            <option value="PRODUCTION_ASSEMBLY">Production Assembly</option>
            <option value="MACHINE_TRIAL">Machine Trial</option>
            <option value="DISPATCH_READY">Dispatch Ready</option>
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>Mint Master Work Order</span>
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Unique Project ID / WO</th>
                <th className="py-3 px-4">Machine Description</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Contract Value</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Target Dispatch</th>
                <th className="py-3 px-4 text-right">Spine Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    Loading Active Machine Projects...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    <p className="font-medium text-slate-700">No machine projects found.</p>
                    <p className="text-xs text-slate-400 mt-1">Click &ldquo;+ Mint New Project&rdquo; above to initialize your first machine work order.</p>
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr
                    key={p._id}
                    onClick={() => handleSelectProject(p.projectId)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-orange-600">
                          {p.projectId}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {p.workOrderNumber}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.projectName}</div>
                      <div className="text-[11px] text-slate-500">{p.machineModel}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{p.customerName}</td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-slate-900">
                        {formatIndianCurrency(p.contractValue?.baseAmountINR)}
                      </div>
                      {p.contractValue?.currency !== 'INR' && (
                        <div className="text-[10px] text-slate-500">
                          {p.contractValue.currency} {p.contractValue.amount.toLocaleString()} (@ {p.contractValue.exchangeRate})
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        {p.currentStage?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.status === 'FROZEN_ECO' ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          FROZEN (ECO)
                        </span>
                      ) : p.status === 'ON_TRACK' ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ON TRACK
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          {p.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{new Date(p.targetDispatchDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectProject(p.projectId);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        Set Spine
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {projects.map((p) => (
          <div
            key={p._id}
            onClick={() => handleSelectProject(p.projectId)}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm active:bg-slate-50 transition-all space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-orange-600">
                {p.projectId}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                {p.currentStage?.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-xs">{p.projectName}</div>
              <div className="text-[11px] text-slate-500">{p.customerName} • {p.machineModel}</div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="font-mono font-bold text-slate-900">
                {formatIndianCurrency(p.contractValue?.baseAmountINR)}
              </span>
              <span className="text-[11px] text-slate-500">
                Target: {new Date(p.targetDispatchDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Mint Work Order Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-orange-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Mint New Master Work Order
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Machine Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Automated Foil Winding Machine"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BHEL Power Grids"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Machine Model *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AFW-1200-PRO"
                    value={machineModel}
                    onChange={(e) => setMachineModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      if (e.target.value === 'INR') setExchangeRate(1.0);
                      else if (e.target.value === 'USD') setExchangeRate(83.5);
                      else if (e.target.value === 'EUR') setExchangeRate(90.2);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contract Amount *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="8500000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exchange Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={currency === 'INR'}
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 disabled:opacity-50 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
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
                  {isCreating ? 'Minting...' : 'Mint Master Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
