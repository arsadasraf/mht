'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Boxes,
  Layers,
  Cpu,
  Search,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  ExternalLink,
  Download,
  Building2,
  FileSpreadsheet,
  Check,
  X
} from 'lucide-react';
import { useGetInventoryQuery, useCreateGrnMutation } from '../api/storeApi';
import { useGetVendorsQuery } from '../../purchase/api/purchaseApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

interface StoreInventoryTabProps {
  initialSubTab?: 'rm-bo' | 'fg';
}

export default function StoreInventoryTab({ initialSubTab }: StoreInventoryTabProps) {
  const pathname = usePathname();

  // Determine active sub-tab from URL route or prop
  const currentSubTab: 'rm-bo' | 'fg' = useMemo(() => {
    if (initialSubTab) return initialSubTab;
    if (pathname?.includes('/store/inventory/fg')) return 'fg';
    return 'rm-bo';
  }, [pathname, initialSubTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string[] | null>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Modals state
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // GRN Form State
  const [grnForm, setGrnForm] = useState({
    itemCode: '',
    itemName: '',
    itemType: 'RM',
    receivedQty: '1',
    baseUom: 'Nos',
    unitRate: '0',
    binLocation: 'BIN-RM-A01',
    vendorName: '',
    poNumber: '',
    invoiceNo: '',
    batchNumber: '',
    qcGate: 'DIRECT_ACCEPTED', // 'DIRECT_ACCEPTED' | 'IN_QC'
    notes: ''
  });

  // Queries
  const { data: invData, isLoading: isLoadingInv } = useGetInventoryQuery({
    category: currentSubTab === 'rm-bo' ? 'RM_BO' : 'FG'
  });
  const { data: vendorData } = useGetVendorsQuery({});

  const [createGrnTrigger, { isLoading: isCreatingGrn }] = useCreateGrnMutation();

  const inventoryItems = useMemo(() => invData?.items || [], [invData]);
  const vendors = useMemo(() => vendorData?.vendors || [], [vendorData]);

  // Aggregate KPI summary metrics
  const totalItems = inventoryItems.length;
  const totalAcceptedStock = inventoryItems.reduce(
    (sum: number, it: any) => sum + (it.acceptedQty || it.buckets?.accepted || 0),
    0
  );
  const totalInQcStock = inventoryItems.reduce(
    (sum: number, it: any) => sum + (it.inQcQty || it.buckets?.inQc || 0),
    0
  );
  const lowStockCount = inventoryItems.filter(
    (it: any) =>
      it.minSafetyStock > 0 &&
      (it.acceptedQty || it.buckets?.accepted || 0) <= it.minSafetyStock
  ).length;

  // Filtering & Sorting
  const filteredItems = useMemo(() => {
    let result = [...inventoryItems];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (it: any) =>
          (it.itemCode && it.itemCode.toLowerCase().includes(q)) ||
          (it.itemName && it.itemName.toLowerCase().includes(q)) ||
          (it.binLocation && it.binLocation.toLowerCase().includes(q)) ||
          (it.category && it.category.toLowerCase().includes(q)) ||
          (it.make && it.make.toLowerCase().includes(q))
      );
    }

    Object.entries(columnFilters).forEach(([colKey, selectedVals]) => {
      if (selectedVals && selectedVals.length > 0) {
        result = result.filter((it: any) => {
          const val = String(it[colKey] || '(Blanks)');
          return selectedVals.includes(val);
        });
      }
    });

    if (sortConfig) {
      result.sort((a: any, b: any) => {
        const valA = a[sortConfig.key] ?? '';
        const valB = b[sortConfig.key] ?? '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [inventoryItems, searchTerm, columnFilters, sortConfig]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 || Object.keys(columnFilters).length > 0 || sortConfig !== null;

  const resetAllFilters = () => {
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig(null);
  };

  const handleFilterChange = (columnKey: string, selected: string[] | null) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!selected || selected.length === 0) {
        delete next[columnKey];
      } else {
        next[columnKey] = selected;
      }
      return next;
    });
  };

  const getDistinctValues = (columnKey: string): DistinctValueItem[] => {
    const map: Record<string, number> = {};
    inventoryItems.forEach((item: any) => {
      const val = String(item[columnKey] || '(Blanks)');
      map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Open GRN Modal
  const handleOpenGrnModal = (preselectedItem?: any) => {
    if (preselectedItem) {
      setGrnForm({
        itemCode: preselectedItem.itemCode,
        itemName: preselectedItem.itemName,
        itemType: preselectedItem.itemType || (currentSubTab === 'rm-bo' ? 'RM' : 'FG'),
        receivedQty: '1',
        baseUom: preselectedItem.baseUom || 'Nos',
        unitRate: String(preselectedItem.standardRateINR || 0),
        binLocation: preselectedItem.binLocation || (currentSubTab === 'rm-bo' ? 'BIN-RM-A01' : 'FG Store (Bay 1)'),
        vendorName: '',
        poNumber: '',
        invoiceNo: '',
        batchNumber: '',
        qcGate: 'DIRECT_ACCEPTED',
        notes: ''
      });
    } else {
      const firstItem = inventoryItems[0];
      setGrnForm({
        itemCode: firstItem?.itemCode || '',
        itemName: firstItem?.itemName || '',
        itemType: firstItem?.itemType || (currentSubTab === 'rm-bo' ? 'RM' : 'FG'),
        receivedQty: '1',
        baseUom: firstItem?.baseUom || 'Nos',
        unitRate: String(firstItem?.standardRateINR || 0),
        binLocation: currentSubTab === 'rm-bo' ? 'BIN-RM-A01' : 'FG Store (Bay 1)',
        vendorName: '',
        poNumber: '',
        invoiceNo: '',
        batchNumber: '',
        qcGate: 'DIRECT_ACCEPTED',
        notes: ''
      });
    }
    setIsGrnModalOpen(true);
  };

  // When user picks an item from the searchable dropdown in GRN form
  const handleSelectGrnItem = (code: string) => {
    const it = inventoryItems.find((item: any) => item.itemCode === code);
    if (it) {
      setGrnForm((prev) => ({
        ...prev,
        itemCode: it.itemCode,
        itemName: it.itemName,
        itemType: it.itemType || (currentSubTab === 'rm-bo' ? 'RM' : 'FG'),
        baseUom: it.baseUom || 'Nos',
        unitRate: String(it.standardRateINR || 0),
        binLocation: it.binLocation || prev.binLocation
      }));
    } else {
      setGrnForm((prev) => ({ ...prev, itemCode: code }));
    }
  };

  // Submit Inward GRN
  const handleSubmitGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grnForm.itemCode) return;

    try {
      const payload = {
        grnType: grnForm.itemType || (currentSubTab === 'rm-bo' ? 'BO' : 'FG'),
        itemCode: grnForm.itemCode,
        itemName: grnForm.itemName,
        receivedQty: parseFloat(grnForm.receivedQty) || 1,
        baseUom: grnForm.baseUom,
        unitRate: parseFloat(grnForm.unitRate) || 0,
        binLocation: grnForm.binLocation,
        vendorName: grnForm.vendorName || 'Standard Supplier',
        poNumber: grnForm.poNumber,
        invoiceNo: grnForm.invoiceNo,
        batchNumber: grnForm.batchNumber,
        qcGate: grnForm.qcGate,
        notes: grnForm.notes
      };

      await createGrnTrigger(payload).unwrap();

      setToastMessage(
        grnForm.qcGate === 'DIRECT_ACCEPTED'
          ? `All set! Material inwarded into available stock for ${grnForm.itemCode}.`
          : `All set! Material placed into Incoming QC Hold for ${grnForm.itemCode}.`
      );
      setIsGrnModalOpen(false);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage('We could not save this GRN right now. Please check the fields and try again.');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner with Industrial Identity */}
      <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-amber-400 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0 shadow-xs">
            <Boxes size={22} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              Store & Plant Inventory Ledger
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-medium text-slate-500">
                Machine House — Winding Technologies
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-semibold text-orange-600">
                Sourced Live from Design Master
              </span>
            </div>
          </div>
        </div>

        {/* Action Button: Inward Material (GRN) */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenGrnModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all shrink-0"
          >
            <Plus size={16} />
            <span>{currentSubTab === 'rm-bo' ? 'Inward Material (GRN)' : 'Inward FG Machine'}</span>
          </button>
        </div>
      </div>

      {/* Modern Button-Type Sub-Tabs (Strictly 2 Sub-Tabs: RM & BO vs FG Items) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Link
          href="/store/inventory/rm-bo"
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap ${
            currentSubTab === 'rm-bo'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs'
          }`}
        >
          <Layers size={15} />
          <span>RM & BO Items Inventory</span>
        </Link>

        <Link
          href="/store/inventory/fg"
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap ${
            currentSubTab === 'fg'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs'
          }`}
        >
          <Cpu size={15} />
          <span>Finished Goods (FG) Items</span>
        </Link>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">
              {currentSubTab === 'rm-bo' ? 'Master RM & BO Items' : 'Master FG Models'}
            </span>
            <Boxes size={16} className="text-orange-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalItems}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">Accepted Stock</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {totalAcceptedStock} {currentSubTab === 'rm-bo' ? 'Units / Kg' : 'Machines'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">In-QC Quarantine</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{totalInQcStock}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide">Low Stock Alerts</span>
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div className="text-2xl font-extrabold text-red-600">{lowStockCount}</div>
        </div>
      </div>

      {/* Main Table Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              currentSubTab === 'rm-bo'
                ? 'Search by item code, name, make, category, bin...'
                : 'Search by model code, machine description, staging bay...'
            }
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
          />
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all self-end sm:self-auto"
          >
            <RotateCcw size={13} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Inventory Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoadingInv ? (
          <div className="p-16 text-center text-xs text-slate-500 font-medium">
            Loading store inventory records...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center">
            <Boxes size={36} className="mx-auto text-slate-300 mb-2" />
            <div className="text-xs font-bold text-slate-800">No inventory records found</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'No items currently exist in Design Master. Configure items in Design Master first, or inward material using GRN.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {currentSubTab === 'rm-bo' ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Item Code"
                        columnKey="itemCode"
                        distinctValues={getDistinctValues('itemCode')}
                        selectedValues={columnFilters['itemCode'] || null}
                        onFilterChange={(selected) => handleFilterChange('itemCode', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Item Name & Make"
                        columnKey="itemName"
                        distinctValues={getDistinctValues('itemName')}
                        selectedValues={columnFilters['itemName'] || null}
                        onFilterChange={(selected) => handleFilterChange('itemName', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Type"
                        columnKey="itemType"
                        distinctValues={getDistinctValues('itemType')}
                        selectedValues={columnFilters['itemType'] || null}
                        onFilterChange={(selected) => handleFilterChange('itemType', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Category"
                        columnKey="category"
                        distinctValues={getDistinctValues('category')}
                        selectedValues={columnFilters['category'] || null}
                        onFilterChange={(selected) => handleFilterChange('category', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4">UOM</th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Bin Location"
                        columnKey="binLocation"
                        distinctValues={getDistinctValues('binLocation')}
                        selectedValues={columnFilters['binLocation'] || null}
                        onFilterChange={(selected) => handleFilterChange('binLocation', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4 text-center">Accepted Stock</th>
                    <th className="py-3 px-4 text-center">In-QC Hold</th>
                    <th className="py-3 px-4 text-center">Allocated</th>
                    <th className="py-3 px-4 text-center">Safety Stock</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((it: any, idx: number) => {
                    const accepted = it.acceptedQty || it.buckets?.accepted || 0;
                    const inQc = it.inQcQty || it.buckets?.inQc || 0;
                    const allocated = it.reservedQuantity || 0;
                    const isLow = it.minSafetyStock > 0 && accepted <= it.minSafetyStock;

                    return (
                      <tr key={it.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                        <td className="py-3.5 px-4 font-mono font-extrabold text-orange-600">
                          <button
                            onClick={() => setPreviewItem(it)}
                            className="hover:underline text-left font-mono"
                          >
                            {it.itemCode}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>{it.itemName}</div>
                          {it.make && (
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                              Make: {it.make}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              it.itemType === 'RM'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {it.itemType || 'BO'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{it.category || 'General'}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 font-bold">{it.baseUom}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-800 font-bold">
                          {it.binLocation || 'BIN-RM-A01'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-extrabold text-emerald-700">
                          <span
                            className={`px-2 py-0.5 rounded-md ${
                              isLow
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-emerald-50'
                            }`}
                          >
                            {accepted}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-600">
                          {inQc}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                          {allocated}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                          {it.minSafetyStock || 0}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenGrnModal(it)}
                              className="px-2.5 py-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] shadow-xs shadow-orange-500/20 transition-all flex items-center gap-1 shrink-0"
                            >
                              <Plus size={12} />
                              <span>GRN</span>
                            </button>
                            <button
                              onClick={() => setPreviewItem(it)}
                              title="Preview Item Dossier"
                              className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Model Code"
                        columnKey="itemCode"
                        distinctValues={getDistinctValues('itemCode')}
                        selectedValues={columnFilters['itemCode'] || null}
                        onFilterChange={(selected) => handleFilterChange('itemCode', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Machine Description"
                        columnKey="itemName"
                        distinctValues={getDistinctValues('itemName')}
                        selectedValues={columnFilters['itemName'] || null}
                        onFilterChange={(selected) => handleFilterChange('itemName', selected)}
                        currentSortField={sortConfig?.key}
                        currentSortDirection={sortConfig?.direction}
                        onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                      />
                    </th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">UOM</th>
                    <th className="py-3 px-4">Staging Location / Bay</th>
                    <th className="py-3 px-4 text-center">Ready Stock</th>
                    <th className="py-3 px-4 text-center">In-Trial / Testing</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((fg: any, idx: number) => (
                    <tr key={fg.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-orange-600">
                        <button
                          onClick={() => setPreviewItem(fg)}
                          className="hover:underline text-left font-mono"
                        >
                          {fg.itemCode}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{fg.itemName}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {fg.classification || 'MACHINE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{fg.baseUom}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {fg.binLocation || 'FG Store (Bay 1)'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-extrabold text-emerald-700">
                        <span className="bg-emerald-50 px-2 py-0.5 rounded-md">
                          {fg.acceptedQty || fg.buckets?.accepted || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-600">
                        {fg.inQcQty || fg.buckets?.inQc || 0}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenGrnModal(fg)}
                            className="px-2.5 py-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] shadow-xs shadow-orange-500/20 transition-all flex items-center gap-1 shrink-0"
                          >
                            <Plus size={12} />
                            <span>Inward FG</span>
                          </button>
                          <button
                            onClick={() => setPreviewItem(fg)}
                            title="Preview FG Dossier"
                            className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Material Inward (GRN) Modal */}
      {isGrnModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe (AGENTS.md mandate) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-sm font-extrabold">
                    {currentSubTab === 'rm-bo'
                      ? 'Material Inward (GRN) — Goods Receipt Note'
                      : 'Finished Goods Inward (GRN)'}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Select items from Design Master to inward into Store inventory
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsGrnModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitGrn} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Item Selector from Design Master */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Select Item from Design Master
                </label>
                <select
                  required
                  value={grnForm.itemCode}
                  onChange={(e) => handleSelectGrnItem(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose Item from Design Master --</option>
                  {inventoryItems.map((item: any) => (
                    <option key={item.id} value={item.itemCode}>
                      {item.itemCode} — {item.itemName} ({item.baseUom})
                    </option>
                  ))}
                </select>
              </div>

              {/* Inward Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Inward Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={grnForm.receivedQty}
                    onChange={(e) => setGrnForm({ ...grnForm, receivedQty: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Unit of Measurement (UOM)
                  </label>
                  <input
                    type="text"
                    required
                    value={grnForm.baseUom}
                    onChange={(e) => setGrnForm({ ...grnForm, baseUom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-orange-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Storage Bin / Location
                  </label>
                  <input
                    type="text"
                    required
                    value={grnForm.binLocation}
                    onChange={(e) => setGrnForm({ ...grnForm, binLocation: e.target.value })}
                    placeholder="BIN-RM-A01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Vendor & PO References Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Vendor / Supplier
                  </label>
                  <select
                    value={grnForm.vendorName}
                    onChange={(e) => setGrnForm({ ...grnForm, vendorName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Vendor --</option>
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.vendorName || v.name}>
                        {v.vendorName || v.name}
                      </option>
                    ))}
                    <option value="Direct Production">Direct In-House Production</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    PO Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={grnForm.poNumber}
                    onChange={(e) => setGrnForm({ ...grnForm, poNumber: e.target.value })}
                    placeholder="PO-2026-0001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Challan / Invoice No
                  </label>
                  <input
                    type="text"
                    value={grnForm.invoiceNo}
                    onChange={(e) => setGrnForm({ ...grnForm, invoiceNo: e.target.value })}
                    placeholder="INV-99214"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* QC Gate Setting */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Quality Clearance Routing (QC Gate)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      grnForm.qcGate === 'DIRECT_ACCEPTED'
                        ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="qcGate"
                      value="DIRECT_ACCEPTED"
                      checked={grnForm.qcGate === 'DIRECT_ACCEPTED'}
                      onChange={() => setGrnForm({ ...grnForm, qcGate: 'DIRECT_ACCEPTED' })}
                      className="mt-0.5 text-orange-500 focus:ring-orange-500"
                    />
                    <div>
                      <div className="text-xs font-bold">Direct Store Clearance</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Immediately increments available accepted stock in Store.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      grnForm.qcGate === 'IN_QC'
                        ? 'bg-amber-50/60 border-amber-300 text-amber-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="qcGate"
                      value="IN_QC"
                      checked={grnForm.qcGate === 'IN_QC'}
                      onChange={() => setGrnForm({ ...grnForm, qcGate: 'IN_QC' })}
                      className="mt-0.5 text-orange-500 focus:ring-orange-500"
                    />
                    <div>
                      <div className="text-xs font-bold">Incoming QC Hold (Quarantine)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Places material into quarantine bucket pending Quality check.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Inward Remarks / Heat / Batch Details
                </label>
                <input
                  type="text"
                  value={grnForm.notes}
                  onChange={(e) => setGrnForm({ ...grnForm, notes: e.target.value })}
                  placeholder="e.g. Batch #TC-2026-A, heat tested, verified against mill cert."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsGrnModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingGrn}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>{isCreatingGrn ? 'Inwarding...' : 'Complete Inward GRN'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Preview Dossier Modal */}
      {previewItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Boxes size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-sm font-extrabold">{previewItem.itemCode}</h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {previewItem.category || 'Store Item'} • {previewItem.binLocation}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Item Description</label>
                <div className="text-sm font-extrabold text-slate-900">{previewItem.itemName}</div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Accepted Stock</div>
                  <div className="text-base font-extrabold text-emerald-700">
                    {previewItem.acceptedQty || previewItem.buckets?.accepted || 0} {previewItem.baseUom}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">In-QC Quarantine</div>
                  <div className="text-base font-extrabold text-amber-600">
                    {previewItem.inQcQty || previewItem.buckets?.inQc || 0} {previewItem.baseUom}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Storage Bin</div>
                  <div className="text-base font-mono font-bold text-slate-900">
                    {previewItem.binLocation || 'BIN-GEN-01'}
                  </div>
                </div>
              </div>

              {/* Photo & Technical PDF Document Card (AGENTS.md mandate) */}
              {previewItem.pdfUrl && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {previewItem.pdfName || `${previewItem.itemCode}.pdf`}
                    </div>
                    <div className="text-[10px] text-slate-400">Technical Drawing / Datasheet PDF</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={previewItem.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>See PDF</span>
                    </a>
                    <a
                      href={previewItem.pdfUrl}
                      download={previewItem.pdfName || `${previewItem.itemCode}.pdf`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors"
                    >
                      <Download size={13} />
                      <span>Download PDF</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Universal Action Tracking Audit Card */}
              <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Created By</div>
                  <div className="font-bold text-slate-900">{previewItem.createdByName || 'System'}</div>
                  <div className="text-[10px] text-slate-400">
                    {previewItem.createdAt ? new Date(previewItem.createdAt).toLocaleString('en-IN') : '-'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Last Updated</div>
                  <div className="font-bold text-slate-900">
                    {previewItem.updatedByName || previewItem.createdByName || 'System'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {previewItem.updatedAt ? new Date(previewItem.updatedAt).toLocaleString('en-IN') : '-'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

