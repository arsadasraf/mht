'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Boxes,
  Layers,
  Search,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  ExternalLink,
  Download,
  FileSpreadsheet,
  X,
  MapPin,
  FileText,
  ShieldAlert,
  BarChart3,
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  Tag,
  Building2
} from 'lucide-react';
import {
  useGetInventoryQuery,
  useGetStoreLocationsQuery,
  useAssignItemLocationMutation
} from '../api/storeApi';
import { useGetVendorsQuery } from '../../purchase/api/purchaseApi';
import { ExcelColumnFilter } from '../../../components/ui/ExcelColumnFilter';
import GrnBuilderModal from './modals/GrnBuilderModal';
import StoreGrnHistoryTab from './StoreGrnHistoryTab';

interface StoreInventoryTabProps {
  initialSubTab?: 'rm-bo' | 'drawings' | 'grn-history';
}

export default function StoreInventoryTab({ initialSubTab }: StoreInventoryTabProps) {
  const pathname = usePathname();

  // Determine active sub-tab: 'rm-bo', 'drawings', or 'grn-history'
  const currentSubTab: 'rm-bo' | 'drawings' | 'grn-history' = useMemo(() => {
    if (initialSubTab) return initialSubTab;
    if (pathname?.includes('/store/inventory/grn-history')) return 'grn-history';
    if (pathname?.includes('/store/inventory/drawings')) return 'drawings';
    return 'rm-bo';
  }, [pathname, initialSubTab]);

  // If on GRN History sub-tab, render StoreGrnHistoryTab directly
  if (currentSubTab === 'grn-history') {
    return <StoreGrnHistoryTab />;
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [sortField, setSortField] = useState<string>('itemCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showMetrics, setShowMetrics] = useState(false);

  // Modals state
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [preselectedGrnItem, setPreselectedGrnItem] = useState<any | null>(null);
  const [assignLocationTarget, setAssignLocationTarget] = useState<any | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queries
  const { data: invData, isLoading: isLoadingInv } = useGetInventoryQuery({
    category: currentSubTab === 'drawings' ? 'DRAWINGS' : 'RM_BO'
  });
  const { data: vendorData } = useGetVendorsQuery({});
  const { data: locationData } = useGetStoreLocationsQuery({});

  const [assignLocationTrigger, { isLoading: isAssigningLocation }] = useAssignItemLocationMutation();

  const inventoryItems = useMemo(() => {
    return Array.isArray(invData?.items) ? invData.items : [];
  }, [invData]);

  const vendors = useMemo(() => vendorData?.vendors || [], [vendorData]);
  const locations = useMemo(() => locationData?.locations || [], [locationData]);

  // Filter & Sort Logic
  const handleFilterChange = (colKey: string, values: string[] | null) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (!values || values.length === 0) {
        delete next[colKey];
      } else {
        next[colKey] = values;
      }
      return next;
    });
  };

  const handleSortChange = (colKey: string, dir: 'asc' | 'desc') => {
    setSortField(colKey);
    setSortDir(dir);
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setActiveFilters({});
    setSortField('itemCode');
    setSortDir('asc');
  };

  const hasActiveFilters = searchTerm.trim().length > 0 || Object.keys(activeFilters).length > 0;

  const getDistinctValues = (field: string) => {
    const map: Record<string, number> = {};
    inventoryItems.forEach((it: any) => {
      const val = String(it[field] || '');
      if (val) map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map).map(([value, count]) => ({ value, count }));
  };

  const filteredItems = useMemo(() => {
    return inventoryItems
      .filter((it: any) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const code = (it.itemCode || it.drawingNumber || '').toLowerCase();
          const name = (it.itemName || it.title || '').toLowerCase();
          const loc = (it.locationName || '').toLowerCase();
          const cat = (it.category || '').toLowerCase();
          const rev = (it.revision || '').toLowerCase();
          const mk = (it.make || '').toLowerCase();
          const match =
            code.includes(q) ||
            name.includes(q) ||
            loc.includes(q) ||
            cat.includes(q) ||
            rev.includes(q) ||
            mk.includes(q);
          if (!match) return false;
        }

        for (const [key, vals] of Object.entries(activeFilters)) {
          const itemVal = String(it[key] || '');
          if (!vals.includes(itemVal)) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        let valA = a[sortField] ?? '';
        let valB = b[sortField] ?? '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [inventoryItems, searchTerm, activeFilters, sortField, sortDir]);

  // Dynamic filter-driven KPI metrics (live re-computation based on active search & column filters)
  const dynamicItemCount = filteredItems.length;
  const dynamicTotalStock = useMemo(() => {
    return filteredItems.reduce(
      (sum: number, it: any) => sum + (it.stock || it.acceptedQty || 0),
      0
    );
  }, [filteredItems]);
  const dynamicTotalInQc = useMemo(() => {
    return filteredItems.reduce(
      (sum: number, it: any) => sum + (it.inQcQty || 0),
      0
    );
  }, [filteredItems]);
  const dynamicUnassignedCount = useMemo(() => {
    return filteredItems.filter(
      (it: any) => !it.locationName || it.locationName === 'Unassigned'
    ).length;
  }, [filteredItems]);

  const dynamicAvailableValuation = useMemo(() => {
    return filteredItems.reduce((sum: number, it: any) => {
      const stock = Number(it.stock ?? it.acceptedQty ?? 0);
      const rate = Number(it.unitRate ?? it.standardRateINR ?? 0);
      return sum + (it.availableValue !== undefined ? Number(it.availableValue) : stock * rate);
    }, 0);
  }, [filteredItems]);

  const dynamicWipValuation = useMemo(() => {
    return filteredItems.reduce((sum: number, it: any) => {
      const wip = Number(it.wipStock ?? it.issuedQty ?? 0);
      const rate = Number(it.unitRate ?? it.standardRateINR ?? 0);
      return sum + (it.wipValue !== undefined ? Number(it.wipValue) : wip * rate);
    }, 0);
  }, [filteredItems]);

  const dynamicTotalValuation = dynamicAvailableValuation + dynamicWipValuation;

  // Filter-Based Excel Export Handler
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      showToast('No items to export in current filtered view.', 'error');
      return;
    }

    const isDrawings = currentSubTab === 'drawings';
    let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel

    if (isDrawings) {
      const headers = [
        '#',
        'Drawing Number',
        'Title',
        'Revision',
        'Category',
        'Project ID',
        'Design Status',
        'Storage Location',
        'Unit Rate (INR)',
        'Rate Source',
        'Available Stock (Copies)',
        'Available Value (INR)',
        'WIP Stock (Issued to Shopfloor)',
        'WIP Value (INR)',
        'Total Valuation (INR)',
        'In-QC Quarantine',
        'Created By',
        'Updated By'
      ];
      csv += headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';

      filteredItems.forEach((dw: any, idx: number) => {
        const stock = Number(dw.stock ?? dw.acceptedQty ?? 0);
        const wipStock = Number(dw.wipStock ?? dw.issuedQty ?? 0);
        const unitRate = Number(dw.unitRate ?? 0);
        const availVal = dw.availableValue !== undefined ? Number(dw.availableValue) : stock * unitRate;
        const wipVal = dw.wipValue !== undefined ? Number(dw.wipValue) : wipStock * unitRate;
        const totalVal = dw.totalValuation !== undefined ? Number(dw.totalValuation) : availVal + wipVal;

        const row = [
          idx + 1,
          dw.drawingNumber || '',
          dw.title || '',
          dw.revision || 'v1',
          dw.category || '2D Drawing',
          dw.projectId || '',
          dw.status || 'RELEASED',
          dw.locationName || 'Unassigned',
          unitRate.toFixed(2),
          dw.rateSource || 'Standard Base Rate',
          stock,
          availVal.toFixed(2),
          wipStock,
          wipVal.toFixed(2),
          totalVal.toFixed(2),
          dw.inQcQty || 0,
          dw.createdByName || '',
          dw.updatedByName || ''
        ];
        csv += row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
      });
    } else {
      const headers = [
        '#',
        'Item Code',
        'Item Name',
        'Description',
        'Revision',
        'Make',
        'Category',
        'Base UOM',
        'Storage Location',
        'Unit Rate (INR)',
        'Rate Source',
        'Available Stock',
        'Available Value (INR)',
        'WIP Stock (Issued to Production)',
        'WIP Value (INR)',
        'Total Valuation (INR)',
        'In-QC Quarantine'
      ];
      csv += headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';

      filteredItems.forEach((it: any, idx: number) => {
        const stock = Number(it.stock ?? it.acceptedQty ?? 0);
        const wipStock = Number(it.wipStock ?? it.issuedQty ?? 0);
        const unitRate = Number(it.unitRate ?? it.standardRateINR ?? 0);
        const availVal = it.availableValue !== undefined ? Number(it.availableValue) : stock * unitRate;
        const wipVal = it.wipValue !== undefined ? Number(it.wipValue) : wipStock * unitRate;
        const totalVal = it.totalValuation !== undefined ? Number(it.totalValuation) : availVal + wipVal;

        const row = [
          idx + 1,
          it.itemCode || '',
          it.itemName || '',
          it.description || '',
          it.revision || 'Rev 1.0',
          it.make || '',
          it.category || 'RM',
          it.baseUom || 'Nos',
          it.locationName || 'Unassigned',
          unitRate.toFixed(2),
          it.rateSource || 'Standard Base Rate',
          stock,
          availVal.toFixed(2),
          wipStock,
          wipVal.toFixed(2),
          totalVal.toFixed(2),
          it.inQcQty || 0
        ];
        csv += row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `MH_${isDrawings ? 'Design_Drawings' : 'RM_BO'}_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`All set! Exported ${filteredItems.length} items to ${filename}.`);
  };

  // Open Assign Location Modal
  const handleOpenAssignLocation = (item: any) => {
    setAssignLocationTarget(item);
    setSelectedLocation(item.locationName !== 'Unassigned' ? item.locationName : (locations[0]?.locationName || ''));
  };

  // Submit Assign Location
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignLocationTarget || !selectedLocation) return;

    try {
      const code = assignLocationTarget.itemCode || assignLocationTarget.drawingNumber;
      const type = currentSubTab === 'drawings' ? 'DRAWING' : 'RM_BO';
      const name = assignLocationTarget.itemName || assignLocationTarget.title || code;

      await assignLocationTrigger({
        itemCode: code,
        itemType: type,
        locationName: selectedLocation,
        itemName: name
      }).unwrap();

      showToast(`All set! Assigned "${selectedLocation}" to ${code}.`);
      setAssignLocationTarget(null);
    } catch (err: any) {
      showToast(err?.data?.message || 'Unable to assign location. Please try again.', 'error');
    }
  };

  const handleOpenGrnModal = (preselected?: any) => {
    setPreselectedGrnItem(preselected || null);
    setIsGrnModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Modern Button-Type Sub-Tabs & Metrics Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <Link
            href="/store/inventory/rm-bo"
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap ${
              currentSubTab === 'rm-bo'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs'
            }`}
          >
            <Layers size={15} />
            <span>RM &amp; BO Items</span>
          </Link>

          <Link
            href="/store/inventory/drawings"
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap ${
              currentSubTab === 'drawings'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs'
            }`}
          >
            <FileText size={15} />
            <span>Design Drawings</span>
          </Link>

          <Link
            href="/store/inventory/grn-history"
            className="flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all whitespace-nowrap bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs"
          >
            <FileSpreadsheet size={15} />
            <span>GRN History</span>
          </Link>
        </div>

        {/* Dashboard Metrics Toggle (Hidden by Default) */}
        <button
          type="button"
          onClick={() => setShowMetrics((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer shrink-0 self-start sm:self-auto ${
            showMetrics
              ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          title={showMetrics ? 'Hide KPI Summary Cards' : 'Show Filter-Driven KPI Summary Cards'}
        >
          <BarChart3 size={14} className={showMetrics ? 'text-amber-600' : 'text-slate-500'} />
          <span>{showMetrics ? 'Hide Metrics' : 'Show Metrics'}</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Filtered dynamic calculations active" />
          )}
        </button>
      </div>

      {/* Dynamic KPI Summary Chips (Default Hidden, Recalculates from Filtered Rows) */}
      {showMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">
                {currentSubTab === 'rm-bo' ? 'Total RM / BO Items' : 'Total Drawings'}
                {hasActiveFilters && <span className="text-orange-500 font-normal lowercase ml-1">(filtered)</span>}
              </span>
              <Boxes size={16} className="text-orange-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{dynamicItemCount}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Available: <strong className="text-slate-800">{dynamicTotalStock}</strong> {currentSubTab === 'rm-bo' ? 'Units' : 'Copies'}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">
                Available Valuation
                {hasActiveFilters && <span className="text-orange-500 font-normal lowercase ml-1">(filtered)</span>}
              </span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div className="text-xl font-extrabold text-emerald-600 font-mono">
              ₹{dynamicAvailableValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Store Available Stock
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">
                WIP Shopfloor Value
                {hasActiveFilters && <span className="text-orange-500 font-normal lowercase ml-1">(filtered)</span>}
              </span>
              <Clock size={16} className="text-amber-500" />
            </div>
            <div className="text-xl font-extrabold text-amber-600 font-mono">
              ₹{dynamicWipValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Issued to Production
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide">
                Total Asset Valuation
                {hasActiveFilters && <span className="text-orange-500 font-normal lowercase ml-1">(filtered)</span>}
              </span>
              <IndianRupee size={16} className="text-orange-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              ₹{dynamicTotalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Available + WIP Material
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Toolbar (Dedicated Search Bar on Left, Action Buttons & Excel Export on Right) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              currentSubTab === 'rm-bo'
                ? 'Search item code, name, make, revision, location...'
                : 'Search drawing number, title, revision, category, project...'
            }
            className="w-full pl-9 pr-8 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}

          {/* Filter-Driven Excel Export Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs transition-all cursor-pointer"
            title={`Export ${filteredItems.length} active filtered items to Excel / CSV`}
          >
            <Download size={14} className="text-slate-500" />
            <span>Export Excel</span>
            {hasActiveFilters && (
              <span className="px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-700 text-[10px] font-mono font-bold">
                {filteredItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleOpenGrnModal()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs shadow-orange-500/20 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Inward GRN
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[380px]">
          {isLoadingInv ? (
            <div className="py-16 text-center text-slate-400 text-xs font-medium">
              Loading inventory records from Design Master...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No inventory records found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {currentSubTab === 'rm-bo'
                  ? 'RM & BO items defined in Design Master will automatically appear here.'
                  : 'Drawings defined in Design Master will automatically appear here.'}
              </p>
            </div>
          ) : currentSubTab === 'rm-bo' ? (
            /* RM & BO Items Table */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Item Code"
                      columnKey="itemCode"
                      distinctValues={getDistinctValues('itemCode')}
                      selectedValues={activeFilters.itemCode || null}
                      onFilterChange={(vals) => handleFilterChange('itemCode', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'itemCode' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Item Name & Description"
                      columnKey="itemName"
                      distinctValues={getDistinctValues('itemName')}
                      selectedValues={activeFilters.itemName || null}
                      onFilterChange={(vals) => handleFilterChange('itemName', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'itemName' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Revision"
                      columnKey="revision"
                      distinctValues={getDistinctValues('revision')}
                      selectedValues={activeFilters.revision || null}
                      onFilterChange={(vals) => handleFilterChange('revision', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'revision' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Make"
                      columnKey="make"
                      distinctValues={getDistinctValues('make')}
                      selectedValues={activeFilters.make || null}
                      onFilterChange={(vals) => handleFilterChange('make', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'make' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Category"
                      columnKey="category"
                      distinctValues={getDistinctValues('category')}
                      selectedValues={activeFilters.category || null}
                      onFilterChange={(vals) => handleFilterChange('category', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'category' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-3">UOM</th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Location"
                      columnKey="locationName"
                      distinctValues={getDistinctValues('locationName')}
                      selectedValues={activeFilters.locationName || null}
                      onFilterChange={(vals) => handleFilterChange('locationName', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'locationName' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-3 text-right">Price Rate</th>
                  <th className="py-3 px-3 text-center">Avail Stock</th>
                  <th className="py-3 px-3 text-right">Avail Value</th>
                  <th className="py-3 px-3 text-center">WIP Stock</th>
                  <th className="py-3 px-3 text-right">WIP Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((it: any, idx: number) => {
                  const stock = Number(it.stock ?? it.acceptedQty ?? 0);
                  const wipStock = Number(it.wipStock ?? it.issuedQty ?? 0);
                  const unitRate = Number(it.unitRate ?? it.standardRateINR ?? 0);
                  const availValue = it.availableValue !== undefined ? Number(it.availableValue) : stock * unitRate;
                  const wipValue = it.wipValue !== undefined ? Number(it.wipValue) : wipStock * unitRate;
                  const isAssigned = it.locationName && it.locationName !== 'Unassigned';

                  return (
                    <tr
                      key={it.id || idx}
                      onDoubleClick={() => setPreviewItem(it)}
                      title="Double-click row to open full preview dossier"
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer select-none"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(it)}
                          className="font-bold text-orange-600 hover:text-orange-700 hover:underline font-mono text-left cursor-pointer"
                        >
                          {it.itemCode}
                        </button>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 max-w-xs truncate">
                        {it.itemName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {it.revision || 'Rev 1.0'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {it.make || <span className="text-slate-300 italic">None</span>}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{it.category || 'General'}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{it.baseUom || 'Nos'}</td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAssignLocation(it);
                          }}
                          title="Click to change physical location"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            isAssigned
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span>{it.locationName || 'Unassigned'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {unitRate > 0 ? (
                          <span title={`Sourced from: ${it.rateSource || 'Purchase Price List'}`}>
                            ₹{unitRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {stock}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        ₹{availValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {wipStock > 0 ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200"
                            title="Issued to Shopfloor / WIP"
                          >
                            {wipStock}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {wipStock > 0 ? (
                          <span className="font-bold text-amber-700">
                            ₹{wipValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* Design Drawings Table */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Drawing Number"
                      columnKey="drawingNumber"
                      distinctValues={getDistinctValues('drawingNumber')}
                      selectedValues={activeFilters.drawingNumber || null}
                      onFilterChange={(vals) => handleFilterChange('drawingNumber', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'drawingNumber' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Drawing Title"
                      columnKey="title"
                      distinctValues={getDistinctValues('title')}
                      selectedValues={activeFilters.title || null}
                      onFilterChange={(vals) => handleFilterChange('title', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'title' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Revision"
                      columnKey="revision"
                      distinctValues={getDistinctValues('revision')}
                      selectedValues={activeFilters.revision || null}
                      onFilterChange={(vals) => handleFilterChange('revision', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'revision' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Category"
                      columnKey="category"
                      distinctValues={getDistinctValues('category')}
                      selectedValues={activeFilters.category || null}
                      onFilterChange={(vals) => handleFilterChange('category', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'category' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Project Ref"
                      columnKey="projectId"
                      distinctValues={getDistinctValues('projectId')}
                      selectedValues={activeFilters.projectId || null}
                      onFilterChange={(vals) => handleFilterChange('projectId', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'projectId' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Design Status"
                      columnKey="status"
                      distinctValues={getDistinctValues('status')}
                      selectedValues={activeFilters.status || null}
                      onFilterChange={(vals) => handleFilterChange('status', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'status' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-3">
                    <ExcelColumnFilter
                      title="Location"
                      columnKey="locationName"
                      distinctValues={getDistinctValues('locationName')}
                      selectedValues={activeFilters.locationName || null}
                      onFilterChange={(vals) => handleFilterChange('locationName', vals)}
                      currentSortField={sortField}
                      currentSortDirection={sortField === 'locationName' ? sortDir : undefined}
                      onSortChange={(field, dir) => {
                        setSortField(field);
                        setSortDir(dir);
                      }}
                    />
                  </th>
                  <th className="py-3 px-3 text-right">Price Rate</th>
                  <th className="py-3 px-3 text-center">Avail Stock</th>
                  <th className="py-3 px-3 text-right">Avail Value</th>
                  <th className="py-3 px-3 text-center">WIP Stock</th>
                  <th className="py-3 px-3 text-right">WIP Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((dw: any, idx: number) => {
                  const stock = Number(dw.stock ?? dw.acceptedQty ?? 0);
                  const wipStock = Number(dw.wipStock ?? dw.issuedQty ?? 0);
                  const unitRate = Number(dw.unitRate ?? 0);
                  const availValue = dw.availableValue !== undefined ? Number(dw.availableValue) : stock * unitRate;
                  const wipValue = dw.wipValue !== undefined ? Number(dw.wipValue) : wipStock * unitRate;
                  const isAssigned = dw.locationName && dw.locationName !== 'Unassigned';

                  return (
                    <tr
                      key={dw.id || idx}
                      onDoubleClick={() => setPreviewItem(dw)}
                      title="Double-click row to open full preview dossier"
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer select-none"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(dw)}
                          className="font-bold text-orange-600 hover:text-orange-700 hover:underline font-mono text-left cursor-pointer"
                        >
                          {dw.drawingNumber}
                        </button>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 max-w-xs truncate">{dw.title}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {dw.revision || 'v1'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">
                        {dw.category?.replace(/_/g, ' ') || '2D Drawing'}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{dw.projectId || '—'}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          {dw.status || 'RELEASED'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAssignLocation(dw);
                          }}
                          title="Click to change physical location"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            isAssigned
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span>{dw.locationName || 'Unassigned'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {unitRate > 0 ? (
                          <span title={`Sourced from: ${dw.rateSource || 'Purchase Price List'}`}>
                            ₹{unitRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {stock}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        ₹{availValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {wipStock > 0 ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200"
                            title="Issued to Shopfloor / WIP"
                          >
                            {wipStock}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {wipStock > 0 ? (
                          <span className="font-bold text-amber-700">
                            ₹{wipValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Assign Storage Location Modal */}
      {assignLocationTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Assign Storage Location
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Pick a physical warehouse/store location from Location Master
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignLocationTarget(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="p-6 space-y-4">
              {/* Item Summary Card */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {currentSubTab === 'drawings' ? 'Drawing Number' : 'Item Code'}
                  </span>
                  <span className="text-xs font-mono font-bold text-orange-600">
                    {assignLocationTarget.itemCode || assignLocationTarget.drawingNumber}
                  </span>
                </div>
                <p className="text-xs font-extrabold text-slate-900 mt-1">
                  {assignLocationTarget.itemName || assignLocationTarget.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                  <span>Current: <strong>{assignLocationTarget.locationName || 'Unassigned'}</strong></span>
                  <span>•</span>
                  <span>Available Stock: <strong>{assignLocationTarget.stock ?? assignLocationTarget.acceptedQty ?? 0}</strong></span>
                </div>
              </div>

              {/* Location Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Storage Location <span className="text-red-500">*</span>
                </label>
                {locations.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                    <p className="font-semibold">No storage locations found in Location Master.</p>
                    <Link
                      href="/store/master/locations"
                      className="mt-1 inline-block font-bold text-orange-600 underline"
                    >
                      Go to Store &gt; Master &gt; Location Master to add locations
                    </Link>
                  </div>
                ) : (
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Storage Location --</option>
                    {locations.map((loc: any) => (
                      <option key={loc.id} value={loc.locationName}>
                        {loc.locationName} ({loc.locationType}) {loc.description ? `— ${loc.description}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Informative Note */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Physical location assignment organizes store indexing. Stock quantities increase exclusively through genuine Goods Receipt Notes (GRN).
                </span>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignLocationTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigningLocation || !selectedLocation}
                  className="px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 rounded-xl shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
                >
                  {isAssigningLocation ? 'Assigning...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Expansive Goods Receipt Note (GRN) Builder Modal */}
      <GrnBuilderModal
        isOpen={isGrnModalOpen}
        onClose={() => {
          setIsGrnModalOpen(false);
          setPreselectedGrnItem(null);
        }}
        onSuccess={(msg) => showToast(msg)}
        preselectedItem={preselectedGrnItem}
      />

      {/* Item Preview Dossier Modal (Standard Expansive Layout with Double-Click Inward/Outward History) */}
      {previewItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Boxes size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {previewItem.itemCode || previewItem.drawingNumber}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {previewItem.category || 'Store Item'} • Location: <strong className="text-slate-700">{previewItem.locationName || 'Unassigned'}</strong> • Price Source: <strong className="text-orange-600">{previewItem.rateSource || 'Purchase Price List'}</strong>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenAssignLocation(previewItem);
                    setPreviewItem(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Assign Location
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Item Description Header */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {currentSubTab === 'drawings' ? 'Drawing Title' : 'Item Description'}
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {previewItem.itemName || previewItem.title}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-white text-slate-700 border border-slate-200">
                    {previewItem.revision || 'Rev 1.0'}
                  </span>
                  <span className="px-2 py-1 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200">
                    {previewItem.baseUom || 'Nos'}
                  </span>
                </div>
              </div>

              {/* 4 Financial & Inventory Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                    <span>Purchase Price Rate</span>
                    <Tag size={13} className="text-orange-500" />
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 font-mono mt-1">
                    {Number(previewItem.unitRate || 0) > 0 ? (
                      `₹${Number(previewItem.unitRate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : (
                      <span className="text-slate-400 font-normal text-xs">Unset</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                    Per {previewItem.baseUom || 'unit'}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                    <span>Available Store Stock</span>
                    <CheckCircle2 size={13} className="text-emerald-500" />
                  </div>
                  <div className="text-lg font-extrabold text-emerald-700 font-mono mt-1">
                    {previewItem.stock ?? previewItem.acceptedQty ?? 0} {previewItem.baseUom || 'Nos'}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-bold mt-0.5 font-mono">
                    Valuation: ₹{(previewItem.availableValue ?? ((Number(previewItem.stock ?? 0)) * Number(previewItem.unitRate ?? 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                    <span>WIP Shopfloor Stock</span>
                    <Clock size={13} className="text-amber-500" />
                  </div>
                  <div className="text-lg font-extrabold text-amber-600 font-mono mt-1">
                    {previewItem.wipStock ?? previewItem.issuedQty ?? 0} {previewItem.baseUom || 'Nos'}
                  </div>
                  <div className="text-[10px] text-amber-600 font-bold mt-0.5 font-mono">
                    Valuation: ₹{(previewItem.wipValue ?? ((Number(previewItem.wipStock ?? 0)) * Number(previewItem.unitRate ?? 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                    <span>Total Inventory Value</span>
                    <IndianRupee size={13} className="text-orange-500" />
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 font-mono mt-1">
                    ₹{(previewItem.totalValuation ?? (((Number(previewItem.stock ?? 0)) + Number(previewItem.wipStock ?? 0)) * Number(previewItem.unitRate ?? 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                    Available + WIP Shopfloor
                  </div>
                </div>
              </div>

              {/* Top 5 Inward Transactions (GRN Receipts) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <ArrowDownLeft size={15} className="text-emerald-600" />
                    <span>Recent Inward Receipts (Top 5 GRNs)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Inward history from Goods Receipt Notes</span>
                </div>

                {Array.isArray(previewItem.recentInwards) && previewItem.recentInwards.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="py-2 px-3">GRN #</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Vendor</th>
                          <th className="py-2 px-3">Invoice / Challan</th>
                          <th className="py-2 px-3 text-center">Inward Qty</th>
                          <th className="py-2 px-3 text-right">Unit Rate</th>
                          <th className="py-2 px-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewItem.recentInwards.map((inw: any, inwIdx: number) => (
                          <tr key={inwIdx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-mono font-bold text-orange-600">{inw.grnNumber}</td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">
                              {inw.date ? new Date(inw.date).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800 truncate max-w-[150px]">{inw.vendorName}</td>
                            <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">{inw.invoiceNo || '—'}</td>
                            <td className="py-2 px-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {inw.receivedQty} {inw.uom}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              ₹{Number(inw.unitRate || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              ₹{Number(inw.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    No inward GRN records found for this item yet.
                  </div>
                )}
              </div>

              {/* Top 5 Outward Issues to Shopfloor / WIP (Material Requests) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <ArrowUpRight size={15} className="text-amber-600" />
                    <span>Recent Outward Issues to Production (Top 5 MRs)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Outward consumption issued to shopfloor WIP</span>
                </div>

                {Array.isArray(previewItem.recentOutwards) && previewItem.recentOutwards.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="py-2 px-3">MR #</th>
                          <th className="py-2 px-3">Issue Date</th>
                          <th className="py-2 px-3">Department / Line</th>
                          <th className="py-2 px-3">Project Ref</th>
                          <th className="py-2 px-3 text-center">Issued Qty</th>
                          <th className="py-2 px-3 text-right">Unit Rate</th>
                          <th className="py-2 px-3 text-right">Valuation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewItem.recentOutwards.map((outw: any, outwIdx: number) => (
                          <tr key={outwIdx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-mono font-bold text-amber-700">{outw.mrNumber}</td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">
                              {outw.date ? new Date(outw.date).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800">{outw.department}</td>
                            <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">{outw.projectId || 'General'}</td>
                            <td className="py-2 px-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
                                {outw.issuedQty} {outw.uom}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              ₹{Number(outw.unitRate || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                              ₹{Number(outw.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    No outward material requests issued to Production yet for this item.
                  </div>
                )}
              </div>

              {/* Photo & Technical PDF Document Card */}
              {(previewItem.pdfUrl || previewItem.fileUrl) && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {previewItem.pdfName || previewItem.fileName || `${previewItem.itemCode || previewItem.drawingNumber}.pdf`}
                    </div>
                    <div className="text-[10px] text-slate-400">Technical Drawing / Datasheet PDF</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={previewItem.pdfUrl || previewItem.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>See PDF</span>
                    </a>
                    <a
                      href={previewItem.pdfUrl || previewItem.fileUrl}
                      download={previewItem.pdfName || previewItem.fileName || `${previewItem.itemCode || previewItem.drawingNumber}.pdf`}
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
                  <div className="font-bold text-slate-900">{previewItem.createdByName || 'Design Master'}</div>
                  <div className="text-[10px] text-slate-400">
                    {previewItem.createdAt ? new Date(previewItem.createdAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Last Updated</div>
                  <div className="font-bold text-slate-900">
                    {previewItem.updatedByName || previewItem.createdByName || 'Store'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {previewItem.updatedAt ? new Date(previewItem.updatedAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-2xl animate-in slide-in-from-bottom-5">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
