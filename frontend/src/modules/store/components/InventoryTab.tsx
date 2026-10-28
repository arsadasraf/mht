'use client';

import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Layers,
  Cpu,
  Wrench,
  Award,
  Search,
  Plus,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { useGetInventoryQuery } from '../api/storeApi';
import RmGrnModal from './modals/RmGrnModal';
import BoGrnModal from './modals/BoGrnModal';
import ConsumableGrnModal from './modals/ConsumableGrnModal';
import FgReceiptModal from './modals/FgReceiptModal';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

type InventoryCategoryTab = 'RM' | 'BO' | 'CONSUMABLE' | 'FG';

export default function InventoryTab() {
  const [activeSubTab, setActiveSubTab] = useState<InventoryCategoryTab>('RM');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state for individual GRN buttons
  const [isRmModalOpen, setIsRmModalOpen] = useState(false);
  const [isBoModalOpen, setIsBoModalOpen] = useState(false);
  const [isConsumableModalOpen, setIsConsumableModalOpen] = useState(false);
  const [isFgModalOpen, setIsFgModalOpen] = useState(false);

  // Column filter states
  const [codeFilter, setCodeFilter] = useState<string[] | null>(null);
  const [binFilter, setBinFilter] = useState<string[] | null>(null);
  const [sortField, setSortField] = useState<string>('itemCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch real inventory items from store API
  const { data, isLoading } = useGetInventoryQuery({});
  const apiItems: any[] = data?.items || [];

  // Local recorded items buffer (for items created during session)
  const [localItems, setLocalItems] = useState<any[]>([]);

  const allItems = useMemo(() => {
    return [...localItems, ...apiItems];
  }, [localItems, apiItems]);

  // Sub-tab category mapping filter
  const categoryMappedItems = useMemo(() => {
    return allItems.filter((item) => {
      const cat = (item.category || '').toUpperCase();
      if (activeSubTab === 'RM') {
        return cat.includes('RAW') || cat === 'RM' || cat === 'RAW_MATERIAL';
      }
      if (activeSubTab === 'BO') {
        return (
          cat.includes('ELECTRICAL') ||
          cat.includes('PNEUMATIC') ||
          cat.includes('FASTENERS_BEARINGS') ||
          cat.includes('MACHINED') ||
          cat === 'BO' ||
          cat === 'BOUGHT_OUT'
        );
      }
      if (activeSubTab === 'CONSUMABLE') {
        return cat.includes('CONSUMABLE') || cat === 'CONSUMABLES';
      }
      if (activeSubTab === 'FG') {
        return cat.includes('FINISHED') || cat === 'FG' || cat === 'FINISHED_GOODS';
      }
      return true;
    });
  }, [allItems, activeSubTab]);

  // Excel filter distinct values
  const distinctCodes: DistinctValueItem[] = useMemo(() => {
    const map = new Map<string, number>();
    categoryMappedItems.forEach((i) => {
      const code = i.itemCode || 'N/A';
      map.set(code, (map.get(code) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [categoryMappedItems]);

  const distinctBins: DistinctValueItem[] = useMemo(() => {
    const map = new Map<string, number>();
    categoryMappedItems.forEach((i) => {
      const bin = i.binLocation || 'UNASSIGNED';
      map.set(bin, (map.get(bin) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [categoryMappedItems]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let result = categoryMappedItems.filter((item) => {
      // Global search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const code = (item.itemCode || '').toLowerCase();
        const name = (item.itemName || '').toLowerCase();
        const bin = (item.binLocation || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !bin.includes(q)) {
          return false;
        }
      }

      // Column filters
      if (codeFilter && codeFilter.length > 0) {
        if (!codeFilter.includes(item.itemCode)) return false;
      }
      if (binFilter && binFilter.length > 0) {
        if (!binFilter.includes(item.binLocation || 'UNASSIGNED')) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [categoryMappedItems, searchTerm, codeFilter, binFilter, sortField, sortDirection]);

  // Reset filters
  const isFiltered = Boolean(searchTerm || codeFilter || binFilter);
  const handleResetFilters = () => {
    setSearchTerm('');
    setCodeFilter(null);
    setBinFilter(null);
  };

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  // Callback when any GRN is recorded locally
  const handleGrnSuccess = (newRecord: any) => {
    const newItem = {
      _id: `LOCAL-${Date.now()}`,
      itemCode: newRecord.itemCode || newRecord.serialNumber || `PART-${Date.now().toString().slice(-4)}`,
      itemName: newRecord.itemName || newRecord.machineName || `${newRecord.materialGrade || 'Item'} (${newRecord.formType || 'Stock'})`,
      category: newRecord.category,
      binLocation: newRecord.binLocation || newRecord.stagingBay || 'BIN-GEN-01',
      baseUom: newRecord.uom || (newRecord.category === 'RAW_MATERIAL' ? 'KG' : 'NOS'),
      orderedQty: { baseQty: 0 },
      inQcQty: { baseQty: 0 },
      acceptedQty: {
        baseQty: newRecord.receivedQty || newRecord.quantityReceived || newRecord.receivedWeightKg || 1
      },
      reservedQty: { baseQty: newRecord.projectId ? (newRecord.receivedQty || 1) : 0 },
      issuedQty: { baseQty: 0 },
      projectId: newRecord.projectId || ''
    };
    setLocalItems((prev) => [newItem, ...prev]);
  };

  return (
    <div className="space-y-4">
      {/* 4-Bucket Summary Cards (Strictly metric label + value, zero prose) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Bucket 1: Ordered
          </div>
          <div className="text-lg font-extrabold text-sky-600 mt-0.5">Active POs</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Bucket 2: In-QC
          </div>
          <div className="text-lg font-extrabold text-amber-600 mt-0.5">Quarantine Holding</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Bucket 3: Accepted
          </div>
          <div className="text-lg font-extrabold text-emerald-600 mt-0.5">Cleared in Store</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Bucket 4: Issued
          </div>
          <div className="text-lg font-extrabold text-orange-600 mt-0.5">On Assembly Floor</div>
        </div>
      </div>

      {/* Sub-Tabs Bar & Dedicated Contextual GRN Button */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Modern Button-Type Sub-Tabs (Pill Buttons) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('RM')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'RM'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers size={14} />
            Raw Material (RM)
          </button>

          <button
            onClick={() => setActiveSubTab('BO')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'BO'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Cpu size={14} />
            Bought Out (BO)
          </button>

          <button
            onClick={() => setActiveSubTab('CONSUMABLE')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'CONSUMABLE'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Wrench size={14} />
            Consumables
          </button>

          <button
            onClick={() => setActiveSubTab('FG')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'FG'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Award size={14} />
            Finished Goods (FG)
          </button>
        </div>

        {/* Individual Contextual GRN Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {activeSubTab === 'RM' && (
            <button
              onClick={() => setIsRmModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus size={15} /> New RM GRN
            </button>
          )}

          {activeSubTab === 'BO' && (
            <button
              onClick={() => setIsBoModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus size={15} /> New BO GRN
            </button>
          )}

          {activeSubTab === 'CONSUMABLE' && (
            <button
              onClick={() => setIsConsumableModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus size={15} /> New Consumable GRN
            </button>
          )}

          {activeSubTab === 'FG' && (
            <button
              onClick={() => setIsFgModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus size={15} /> Log FG Inward
            </button>
          )}
        </div>
      </div>

      {/* Toolbar: Global Search & Reset Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search items, part codes, bin locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs"
          />
        </div>

        {isFiltered && (
          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors"
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
        )}
      </div>

      {/* Inventory Items Table with Embedded Excel Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Part / Serial Code"
                    columnKey="itemCode"
                    distinctValues={distinctCodes}
                    selectedValues={codeFilter}
                    onFilterChange={setCodeFilter}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSort}
                  />
                </th>
                <th className="py-3 px-4">Description / Spec</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Bin Location"
                    columnKey="binLocation"
                    distinctValues={distinctBins}
                    selectedValues={binFilter}
                    onFilterChange={setBinFilter}
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSort}
                  />
                </th>
                <th className="py-3 px-4 text-sky-700 font-bold">Ordered</th>
                <th className="py-3 px-4 text-amber-700 font-bold">In-QC</th>
                <th className="py-3 px-4 text-emerald-700 font-extrabold">Accepted</th>
                <th className="py-3 px-4 text-orange-600 font-bold">Hard Reserved</th>
                <th className="py-3 px-4 text-right text-slate-600 font-bold">Floor Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 font-medium">
                    Loading inventory ledger items...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Boxes size={32} className="text-slate-300 mb-2" />
                      <p className="text-xs font-semibold text-slate-600">
                        No {activeSubTab} inventory items found.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Log a new GRN using the button above to register inward stock.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item._id || item.itemCode} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{item.itemCode}</span>
                        {item.projectId && (
                          <span className="bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                            {item.projectId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {item.itemName}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-semibold">
                      {item.category?.replace(/_/g, ' ') || activeSubTab}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                      <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                        {item.binLocation || 'UNASSIGNED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-sky-700">
                      {item.orderedQty?.baseQty || 0} {item.baseUom}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-amber-700">
                      {item.inQcQty?.baseQty || 0} {item.baseUom}
                    </td>
                    <td className="py-3 px-4 font-mono font-extrabold text-emerald-700">
                      {item.acceptedQty?.baseQty || 0} {item.baseUom}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-orange-600">
                      {item.reservedQty?.baseQty || 0} {item.baseUom}
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-slate-600 font-semibold">
                      {item.issuedQty?.baseQty || 0} {item.baseUom}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual GRN Modals */}
      <RmGrnModal
        isOpen={isRmModalOpen}
        onClose={() => setIsRmModalOpen(false)}
        onSubmitSuccess={handleGrnSuccess}
      />
      <BoGrnModal
        isOpen={isBoModalOpen}
        onClose={() => setIsBoModalOpen(false)}
        onSubmitSuccess={handleGrnSuccess}
      />
      <ConsumableGrnModal
        isOpen={isConsumableModalOpen}
        onClose={() => setIsConsumableModalOpen(false)}
        onSubmitSuccess={handleGrnSuccess}
      />
      <FgReceiptModal
        isOpen={isFgModalOpen}
        onClose={() => setIsFgModalOpen(false)}
        onSubmitSuccess={handleGrnSuccess}
      />
    </div>
  );
}
