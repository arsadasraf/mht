'use client';

import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  Calendar,
  IndianRupee
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import DeliveryChallanModal from './modals/DeliveryChallanModal';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

type DcTypeFilter = 'ALL' | 'RETURNABLE' | 'NON_RETURNABLE';

export default function DeliveryChallanTab() {
  const dispatch = useAppDispatch();
  const [activeFilter, setActiveFilter] = useState<DcTypeFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Column filter states
  const [consigneeFilter, setConsigneeFilter] = useState<string[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[] | null>(null);
  const [sortField, setSortField] = useState<string>('challanDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Delivery challans data list
  const [challans, setChallans] = useState<any[]>([
    {
      id: 'DC-2026-0041',
      challanNumber: 'DC-2026-0041',
      dcType: 'RETURNABLE',
      challanDate: '2026-10-24',
      consigneeName: 'Hi-Tech Heat Treaters Pvt Ltd',
      projectId: 'PRJ-2026-001',
      purpose: 'SURFACE_TREATMENT',
      purposeLabel: 'Gas Nitriding & Induction Hardening',
      expectedReturnDate: '2026-10-31',
      transporterName: 'V-Trans Logistics',
      vehicleNumber: 'MH-12-RN-4819',
      itemsCount: 4,
      totalValueINR: 185000,
      status: 'DISPATCHED'
    },
    {
      id: 'DC-2026-0038',
      challanNumber: 'DC-2026-0038',
      dcType: 'RETURNABLE',
      challanDate: '2026-10-12',
      consigneeName: 'Precision Wire Cut & EDM Services',
      projectId: 'PRJ-2026-001',
      purpose: 'EXTERNAL_JOBWORK',
      purposeLabel: 'Wire EDM Profile Cutting for Cam Followers',
      expectedReturnDate: '2026-10-20',
      transporterName: 'Local Van Pickup',
      vehicleNumber: 'MH-14-EA-7721',
      itemsCount: 2,
      totalValueINR: 92000,
      status: 'RETURN_OVERDUE'
    },
    {
      id: 'DC-2026-0040',
      challanNumber: 'DC-2026-0040',
      dcType: 'NON_RETURNABLE',
      challanDate: '2026-10-22',
      consigneeName: 'Omkar Steels & Scrap Processors',
      projectId: '',
      purpose: 'SCRAP_DISPOSAL',
      purposeLabel: 'CNC Turnings & MS Offcut Scrap Dispatch',
      expectedReturnDate: null,
      transporterName: 'Plant Tractor Trailer',
      vehicleNumber: 'MH-12-Q-1102',
      itemsCount: 1,
      totalValueINR: 34000,
      status: 'CLOSED'
    }
  ]);

  const handleCreateChallan = (newDc: any) => {
    setChallans((prev) => [newDc, ...prev]);
  };

  const handleMarkReturned = (dcId: string) => {
    setChallans((prev) =>
      prev.map((c) =>
        c.id === dcId || c.challanNumber === dcId ? { ...c, status: 'CLOSED' } : c
      )
    );
    dispatch(
      addToast({
        type: 'success',
        message: `All set! Return inward logged for ${dcId}. Job-work items returned to Store.`
      })
    );
  };

  // Distinct values for ExcelColumnFilter
  const distinctConsignees: DistinctValueItem[] = useMemo(() => {
    const map = new Map<string, number>();
    challans.forEach((c) => {
      const name = c.consigneeName || 'N/A';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [challans]);

  const distinctStatuses: DistinctValueItem[] = useMemo(() => {
    const map = new Map<string, number>();
    challans.forEach((c) => {
      const s = c.status || 'N/A';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [challans]);

  // Filtered & Sorted challans
  const filteredChallans = useMemo(() => {
    let list = challans.filter((c) => {
      if (activeFilter === 'RETURNABLE' && c.dcType !== 'RETURNABLE') return false;
      if (activeFilter === 'NON_RETURNABLE' && c.dcType !== 'NON_RETURNABLE') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const num = (c.challanNumber || '').toLowerCase();
        const party = (c.consigneeName || '').toLowerCase();
        const proj = (c.projectId || '').toLowerCase();
        const veh = (c.vehicleNumber || '').toLowerCase();
        if (!num.includes(q) && !party.includes(q) && !proj.includes(q) && !veh.includes(q)) {
          return false;
        }
      }

      if (consigneeFilter && consigneeFilter.length > 0) {
        if (!consigneeFilter.includes(c.consigneeName)) return false;
      }
      if (statusFilter && statusFilter.length > 0) {
        if (!statusFilter.includes(c.status)) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [challans, activeFilter, searchTerm, consigneeFilter, statusFilter, sortField, sortDirection]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setConsigneeFilter(null);
    setStatusFilter(null);
  };

  const totalOutwardValueINR = useMemo(() => {
    return challans.reduce((sum, c) => sum + (c.totalValueINR || 0), 0);
  }, [challans]);

  return (
    <div className="space-y-4">
      {/* Metric Cards (Strictly label + value) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total DC Dispatches
          </div>
          <div className="text-lg font-extrabold text-slate-900 mt-0.5">
            {challans.length} Challans
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Active Returnable (RDC)
          </div>
          <div className="text-lg font-extrabold text-sky-600 mt-0.5">
            {challans.filter((c) => c.dcType === 'RETURNABLE' && c.status !== 'CLOSED').length} Open at Vendors
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Overdue Returns Alert
          </div>
          <div className="text-lg font-extrabold text-red-600 mt-0.5">
            {challans.filter((c) => c.status === 'RETURN_OVERDUE').length} Overdue
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Declared Outward Goods
          </div>
          <div className="text-lg font-extrabold text-orange-600 mt-0.5 font-mono">
            ₹{totalOutwardValueINR.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Sub-Filters & Create DC Button */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Modern Button-Type Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'ALL'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            All Challans
          </button>

          <button
            onClick={() => setActiveFilter('RETURNABLE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'RETURNABLE'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Returnable DC (RDC)
          </button>

          <button
            onClick={() => setActiveFilter('NON_RETURNABLE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'NON_RETURNABLE'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Non-Returnable DC (NRDC)
          </button>
        </div>

        {/* Create DC Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 self-end md:self-auto shrink-0"
        >
          <Plus size={15} /> Create Delivery Challan
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search DC #, consignee name, vehicle #, project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs"
          />
        </div>

        {(searchTerm || consigneeFilter || statusFilter) && (
          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors"
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
        )}
      </div>

      {/* Delivery Challans Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Challan #</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Consignee / Party"
                    columnKey="consigneeName"
                    distinctValues={distinctConsignees}
                    selectedValues={consigneeFilter}
                    onFilterChange={setConsigneeFilter}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(f, d) => {
                      setSortField(f);
                      setSortDirection(d);
                    }}
                  />
                </th>
                <th className="py-3 px-4">Project Ref</th>
                <th className="py-3 px-4">Vehicle / Transporter</th>
                <th className="py-3 px-4 font-mono">Value (₹)</th>
                <th className="py-3 px-4">Expected Return</th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Status"
                    columnKey="status"
                    distinctValues={distinctStatuses}
                    selectedValues={statusFilter}
                    onFilterChange={setStatusFilter}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={(f, d) => {
                      setSortField(f);
                      setSortDirection(d);
                    }}
                  />
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500">
                    No delivery challans found.
                  </td>
                </tr>
              ) : (
                filteredChallans.map((dc) => (
                  <tr key={dc.id || dc.challanNumber} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {dc.challanNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          dc.dcType === 'RETURNABLE'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {dc.dcType === 'RETURNABLE' ? 'Returnable (RDC)' : 'Non-Returnable (NRDC)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {dc.challanDate}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {dc.consigneeName}
                    </td>
                    <td className="py-3 px-4 font-mono text-orange-600 font-bold">
                      {dc.projectId || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px] font-mono">
                      {dc.vehicleNumber || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      ₹{dc.totalValueINR?.toLocaleString('en-IN') || 0}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {dc.expectedReturnDate ? (
                        <span
                          className={`font-semibold ${
                            dc.status === 'RETURN_OVERDUE' ? 'text-red-600 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {dc.expectedReturnDate}
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          dc.status === 'CLOSED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : dc.status === 'RETURN_OVERDUE'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {dc.status === 'CLOSED' ? (
                          <CheckCircle2 size={11} />
                        ) : dc.status === 'RETURN_OVERDUE' ? (
                          <AlertTriangle size={11} />
                        ) : (
                          <Clock size={11} />
                        )}
                        {dc.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {dc.dcType === 'RETURNABLE' && dc.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleMarkReturned(dc.id || dc.challanNumber)}
                            className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Mark Returned
                          </button>
                        )}
                        <button
                          onClick={() =>
                            dispatch(
                              addToast({
                                type: 'info',
                                message: `Opening print preview for Delivery Challan ${dc.challanNumber}...`
                              })
                            )
                          }
                          className="text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Print Delivery Challan"
                        >
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <DeliveryChallanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmitSuccess={handleCreateChallan}
      />
    </div>
  );
}
