'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  IndianRupee,
  Search,
  RotateCcw,
  Save,
  Check,
  X,
  FileText,
  ShoppingBag,
  PackageCheck,
  TrendingUp,
  Boxes,
  ArrowLeft,
  Kanban,
  Layers,
  Loader2
} from 'lucide-react';
import {
  useGetProjectCostingDashboardQuery,
  useUpdateProjectBomPricesMutation
} from '../api/projectApi';
import { setActiveProjectId, addToast } from '../../../store/uiSlice';
import ExcelColumnFilter from '../../../components/ui/ExcelColumnFilter';
import SearchableSelect from '../../../components/ui/SearchableSelect';
import WorkOrderBomBadge from '../../../components/ui/WorkOrderBomBadge';

export default function ProjectCostingTab() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);

  const { data, isLoading, refetch } = useGetProjectCostingDashboardQuery();
  const [updateBomPrices, { isLoading: isSavingPrices }] = useUpdateProjectBomPricesMutation();

  const projects = useMemo(() => data?.projects || [], [data]);

  // Active Work Order Selection (same pattern as ProjectKanbanTab)
  const selectedWorkOrderNo = useMemo(() => {
    if (
      activeProjectId &&
      projects.some(
        (p: any) => p.workOrderNumber === activeProjectId || p.projectId === activeProjectId
      )
    ) {
      return activeProjectId;
    }
    return projects[0]?.workOrderNumber || '';
  }, [activeProjectId, projects]);

  const selectedProject = useMemo(() => {
    return (
      projects.find(
        (p: any) =>
          p.workOrderNumber === selectedWorkOrderNo || p.projectId === selectedWorkOrderNo
      ) || null
    );
  }, [projects, selectedWorkOrderNo]);

  const handleSelectWorkOrder = (woNumber: string) => {
    if (woNumber && woNumber !== 'ALL') {
      dispatch(setActiveProjectId(woNumber));
    }
  };

  // Sub-view switcher for the selected Work Order
  const [activeSubView, setActiveSubView] = useState<'bom' | 'po-grn' | 'drawings'>('bom');

  // Local editable prices state: Record<rowIndex, number | string>
  const [editedPrices, setEditedPrices] = useState<Record<number, string>>({});
  const [savingRowIndex, setSavingRowIndex] = useState<number | null>(null);

  // Reset local edits when switching Work Order
  useEffect(() => {
    setEditedPrices({});
  }, [selectedWorkOrderNo]);

  // BOM Table Search & Category Filter State
  const [bomSearchTerm, setBomSearchTerm] = useState('');
  const [activeCategoryPill, setActiveCategoryPill] = useState<string>('ALL');

  // Column-Based Excel Filters for Complete BOM Table
  const [excelFilters, setExcelFilters] = useState<{
    itemCode: string[] | null;
    itemName: string[] | null;
    category: string[] | null;
    itemType: string[] | null;
    makeOrBuy: string[] | null;
    uom: string[] | null;
  }>({
    itemCode: null,
    itemName: null,
    category: null,
    itemType: null,
    makeOrBuy: null,
    uom: null
  });

  // Sorting State for BOM Table
  const [sortField, setSortField] = useState<string>('slNo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amt || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Work Order Options for SearchableSelect
  const workOrderOptions = useMemo(
    () =>
      projects.map((p: any) => ({
        value: p.workOrderNumber,
        label: p.workOrderNumber,
        subLabel: `${p.customerName} • ${p.machineModel || 'Machine'}`,
        badge: p.bomAttached ? `${p.bomItemsCount} BOM` : 'No BOM'
      })),
    [projects]
  );

  // Enriched BOM Items for the selected Work Order with live edited price calculations
  const bomItems = useMemo(() => {
    const raw = selectedProject?.itemizedBomCosting || [];
    return raw.map((it: any, idx: number) => {
      const rowIndex = it.index !== undefined ? Number(it.index) : idx;
      const baseRate = Number(it.effectiveRateINR ?? it.standardRateINR ?? 0);
      const hasEdit = Object.prototype.hasOwnProperty.call(editedPrices, rowIndex);
      const currentRate = hasEdit ? Math.max(0, Number(editedPrices[rowIndex]) || 0) : baseRate;
      const isDirty = hasEdit && Math.abs(currentRate - baseRate) > 0.001;
      const qty = Number(it.quantityPerMachine || 1);
      const liveLineTotalINR = Math.round(qty * currentRate * 100) / 100;

      return {
        ...it,
        rowIndex,
        baseRate,
        currentRate,
        editedInputValue: hasEdit ? editedPrices[rowIndex] : String(baseRate),
        isDirty,
        liveLineTotalINR
      };
    });
  }, [selectedProject, editedPrices]);

  // Distinct Categories for quick category pill bar
  const categoryPills = useMemo(() => {
    const map = new Map<string, number>();
    bomItems.forEach((it: any) => {
      const cat = it.category || 'General';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([category, count]) => ({ category, count }));
  }, [bomItems]);

  // Distinct Values for Excel Column Filters on BOM Table
  const distinctValues = useMemo(() => {
    const build = (getter: (r: any) => string) => {
      const map: Record<string, number> = {};
      bomItems.forEach((r: any) => {
        const v = getter(r) || '(Blanks)';
        map[v] = (map[v] || 0) + 1;
      });
      return Object.entries(map)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      itemCode: build((r) => r.itemCode),
      itemName: build((r) => r.itemName),
      category: build((r) => r.category),
      itemType: build((r) => r.itemType),
      makeOrBuy: build((r) => r.makeOrBuy),
      uom: build((r) => r.uom)
    };
  }, [bomItems]);

  // Filtered & Sorted BOM Items
  const filteredBomItems = useMemo(() => {
    const result = bomItems.filter((r: any) => {
      if (activeCategoryPill !== 'ALL' && (r.category || 'General') !== activeCategoryPill) {
        return false;
      }
      if (bomSearchTerm.trim()) {
        const q = bomSearchTerm.toLowerCase();
        const matches =
          r.itemCode?.toLowerCase().includes(q) ||
          r.itemName?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.itemType?.toLowerCase().includes(q) ||
          r.makeOrBuy?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (excelFilters.itemCode && !excelFilters.itemCode.includes(r.itemCode || '(Blanks)')) return false;
      if (excelFilters.itemName && !excelFilters.itemName.includes(r.itemName || '(Blanks)')) return false;
      if (excelFilters.category && !excelFilters.category.includes(r.category || '(Blanks)')) return false;
      if (excelFilters.itemType && !excelFilters.itemType.includes(r.itemType || '(Blanks)')) return false;
      if (excelFilters.makeOrBuy && !excelFilters.makeOrBuy.includes(r.makeOrBuy || '(Blanks)')) return false;
      if (excelFilters.uom && !excelFilters.uom.includes(r.uom || '(Blanks)')) return false;

      return true;
    });

    result.sort((a: any, b: any) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (sortField === 'effectiveRateINR') {
        va = a.currentRate;
        vb = b.currentRate;
      } else if (sortField === 'lineTotalINR') {
        va = a.liveLineTotalINR;
        vb = b.liveLineTotalINR;
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDirection === 'asc' ? -1 : 1;
      if (va > vb) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [bomItems, activeCategoryPill, bomSearchTerm, excelFilters, sortField, sortDirection]);

  // Live Financial Totals for the Selected Work Order
  const liveMetrics = useMemo(() => {
    let totalBomCost = 0;
    let makeCost = 0;
    let buyCost = 0;

    bomItems.forEach((it: any) => {
      totalBomCost += it.liveLineTotalINR;
      if (it.makeOrBuy === 'MAKE') makeCost += it.liveLineTotalINR;
      else buyCost += it.liveLineTotalINR;
    });

    const contractValue = Number(selectedProject?.contractValueINR || 0);
    const committedPo = Number(selectedProject?.committedPoCostINR || 0);
    const inwardGrn = Number(selectedProject?.inwardGrnCostINR || 0);
    const baselineCost = totalBomCost > 0 ? totalBomCost : Math.max(inwardGrn, committedPo);
    const projectedMarginINR = Math.round((contractValue - baselineCost) * 100) / 100;
    const projectedMarginPercent =
      contractValue > 0
        ? Math.round(((contractValue - baselineCost) / contractValue) * 1000) / 10
        : 0;

    return {
      contractValue,
      totalBomCost: Math.round(totalBomCost * 100) / 100,
      makeCost: Math.round(makeCost * 100) / 100,
      buyCost: Math.round(buyCost * 100) / 100,
      committedPo,
      inwardGrn,
      projectedMarginINR,
      projectedMarginPercent
    };
  }, [bomItems, selectedProject]);

  const dirtyItems = useMemo(() => bomItems.filter((it: any) => it.isDirty), [bomItems]);

  const hasActiveFilters =
    Boolean(bomSearchTerm.trim()) ||
    activeCategoryPill !== 'ALL' ||
    Object.values(excelFilters).some((v) => v !== null);

  const handleResetFilters = () => {
    setBomSearchTerm('');
    setActiveCategoryPill('ALL');
    setExcelFilters({
      itemCode: null,
      itemName: null,
      category: null,
      itemType: null,
      makeOrBuy: null,
      uom: null
    });
  };

  const handlePriceInputChange = (rowIndex: number, val: string) => {
    setEditedPrices((prev) => ({
      ...prev,
      [rowIndex]: val
    }));
  };

  // Save a single item's price
  const handleSaveSingleRowPrice = async (item: any) => {
    if (!selectedProject) return;
    setSavingRowIndex(item.rowIndex);
    try {
      const res = await updateBomPrices({
        id: selectedProject.workOrderNumber || selectedProject.id,
        updates: [
          {
            index: item.rowIndex,
            itemId: item.id,
            itemCode: item.itemCode,
            standardRateINR: Number(item.currentRate) || 0
          }
        ]
      }).unwrap();

      setEditedPrices((prev) => {
        const next = { ...prev };
        delete next[item.rowIndex];
        return next;
      });

      dispatch(
        addToast({
          type: 'success',
          title: 'Item Price Saved',
          message: res.message || `All set! Updated unit price for ${item.itemCode}.`
        })
      );
      refetch();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Price Update Failed',
          message: err?.data?.message || 'We could not save this item price right now.'
        })
      );
    } finally {
      setSavingRowIndex(null);
    }
  };

  // Save all modified item prices at once
  const handleSaveAllDirtyPrices = async () => {
    if (!selectedProject || dirtyItems.length === 0) return;
    try {
      const res = await updateBomPrices({
        id: selectedProject.workOrderNumber || selectedProject.id,
        updates: dirtyItems.map((it: any) => ({
          index: it.rowIndex,
          itemId: it.id,
          itemCode: it.itemCode,
          standardRateINR: Number(it.currentRate) || 0
        }))
      }).unwrap();

      setEditedPrices({});
      dispatch(
        addToast({
          type: 'success',
          title: 'BOM Prices Updated',
          message: res.message || `Great! Saved ${dirtyItems.length} item price(s) for ${selectedProject.workOrderNumber}.`
        })
      );
      refetch();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Save Failed',
          message: err?.data?.message || 'We could not save the BOM price changes right now.'
        })
      );
    }
  };

  const filteredTotalCostINR = useMemo(
    () =>
      Math.round(
        filteredBomItems.reduce((sum: number, it: any) => sum + it.liveLineTotalINR, 0) * 100
      ) / 100,
    [filteredBomItems]
  );

  const filteredTotalQty = useMemo(
    () =>
      filteredBomItems.reduce(
        (sum: number, it: any) => sum + (Number(it.quantityPerMachine) || 0),
        0
      ),
    [filteredBomItems]
  );

  return (
    <div className="space-y-4">
      {/* 1. TOP BAR: WORK ORDER SELECTOR & METADATA SNAPSHOT (MATCHING KANBAN WORKFLOW) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => router.push('/project-setup/projects')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors self-start sm:self-auto shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Projects</span>
          </button>

          {/* SearchableSelect Work Order Picker */}
          <div className="w-full sm:w-72">
            <SearchableSelect
              label="Work Order"
              value={selectedWorkOrderNo}
              onChange={handleSelectWorkOrder}
              options={workOrderOptions}
              allOptionLabel="Select Work Order"
              placeholder="Search Work Order..."
            />
          </div>

          {/* Active Work Order Metadata Snapshot */}
          {selectedProject && (
            <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200">
                  {selectedProject.workOrderNumber}
                </span>
                <WorkOrderBomBadge
                  isBomLocked={selectedProject.isBomLocked}
                  bomStatus={selectedProject.bomStatus}
                  bomAttached={selectedProject.bomAttached}
                  attachedDrawingsCount={selectedProject.attachedDrawingsCount}
                />
                {selectedProject.customerPoNumber && (
                  <span className="text-[11px] font-mono font-semibold text-slate-500">
                    PO: {selectedProject.customerPoNumber}
                  </span>
                )}
              </div>
              <div className="text-xs font-extrabold text-slate-900 truncate max-w-md">
                {selectedProject.customerName} • {selectedProject.machineModel}
              </div>
            </div>
          )}
        </div>

        {/* Right Actions: Save All Prices, Kanban Link & Sync */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          {dirtyItems.length > 0 && (
            <button
              type="button"
              disabled={isSavingPrices}
              onClick={handleSaveAllDirtyPrices}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {isSavingPrices ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Price Changes ({dirtyItems.length})</span>
            </button>
          )}

          {selectedProject && (
            <button
              type="button"
              onClick={() => {
                dispatch(setActiveProjectId(selectedProject.workOrderNumber));
                router.push('/project-setup/kanban');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-all"
            >
              <Kanban className="w-3.5 h-3.5 text-orange-500" />
              <span>Kanban</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 2. SINGLE WORK ORDER FINANCIAL KPI STRIP (ZERO FILLER SUBTEXT) */}
      {selectedProject && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Contract Value
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <IndianRupee className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg font-mono font-black text-slate-900">
              {formatCurrency(liveMetrics.contractValue)}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total BOM & BOQ Cost
              </span>
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center">
                <Boxes className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-lg font-mono font-black text-sky-700">
              {formatCurrency(liveMetrics.totalBomCost)}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Make / Buy Split
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xs font-mono font-extrabold text-slate-800 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-indigo-700">MAKE:</span>
                <span>{formatCurrency(liveMetrics.makeCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700">BUY:</span>
                <span>{formatCurrency(liveMetrics.buyCost)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                PO & GRN Cost
              </span>
              <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xs font-mono font-extrabold text-slate-800 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-orange-600">PO:</span>
                <span>{formatCurrency(liveMetrics.committedPo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-700">GRN:</span>
                <span>{formatCurrency(liveMetrics.inwardGrn)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Projected Margin
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p
                className={`text-lg font-mono font-black ${
                  liveMetrics.projectedMarginINR >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {formatCurrency(liveMetrics.projectedMarginINR)}
              </p>
              <span className="text-xs font-mono font-bold text-slate-500">
                ({liveMetrics.projectedMarginPercent}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. SEGMENTED BUTTON-TYPE VIEW TABS FOR THE SELECTED WORK ORDER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-200/70 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveSubView('bom')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubView === 'bom'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Complete BOM & BOQ Price Editor</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/15">
              {bomItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('drawings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubView === 'drawings'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Attached Design Drawings</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/15">
              {selectedProject?.attachedDrawings?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('po-grn')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubView === 'po-grn'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Vendor POs & Inward GRN Ledger</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/15">
              {(selectedProject?.poLedger?.length || 0) + (selectedProject?.grnLedger?.length || 0)}
            </span>
          </button>
        </div>

        {/* Category Filter Pill Bar when on BOM view */}
        {activeSubView === 'bom' && categoryPills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategoryPill('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeCategoryPill === 'ALL'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Categories ({bomItems.length})
            </button>
            {categoryPills.map((cp) => (
              <button
                key={cp.category}
                type="button"
                onClick={() => setActiveCategoryPill(cp.category)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeCategoryPill === cp.category
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cp.category} ({cp.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. SUB-VIEW 1: COMPLETE BOM & BOQ TABLE WITH CATEGORY, EXCEL FILTERS & INLINE PRICE EDITOR */}
      {activeSubView === 'bom' && (
        <div className="space-y-3">
          {/* Top Dedicated In-Line Table Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Left Side: Dedicated In-Line Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={bomSearchTerm}
                onChange={(e) => setBomSearchTerm(e.target.value)}
                placeholder="Search BOM items by Item Code, Description, Category, Type..."
                className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
              />
              {bomSearchTerm && (
                <button
                  type="button"
                  onClick={() => setBomSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right Side: Reset Filters & Save Price Changes Button */}
            <div className="flex items-center gap-2 justify-end">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}

              <button
                type="button"
                disabled={dirtyItems.length === 0 || isSavingPrices}
                onClick={handleSaveAllDirtyPrices}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  dirtyItems.length > 0
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-xs shadow-orange-500/20 cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                {isSavingPrices ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>
                  {dirtyItems.length > 0
                    ? `Save Price Changes (${dirtyItems.length})`
                    : 'All Prices Saved'}
                </span>
              </button>
            </div>
          </div>

          {/* Complete BOM & BOQ Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-10">#</th>
                    <th className="py-3 px-3">
                      <ExcelColumnFilter
                        title="Item / Part Code"
                        columnKey="itemCode"
                        distinctValues={distinctValues.itemCode}
                        selectedValues={excelFilters.itemCode}
                        onFilterChange={(selected) =>
                          setExcelFilters((prev) => ({ ...prev, itemCode: selected }))
                        }
                        currentSortField={sortField}
                        currentSortDirection={sortDirection}
                        onSortChange={handleSortChange}
                      />
                    </th>
                    <th className="py-3 px-4">
                      <ExcelColumnFilter
                        title="Item Description"
                        columnKey="itemName"
                        distinctValues={distinctValues.itemName}
                        selectedValues={excelFilters.itemName}
                        onFilterChange={(selected) =>
                          setExcelFilters((prev) => ({ ...prev, itemName: selected }))
                        }
                        currentSortField={sortField}
                        currentSortDirection={sortDirection}
                        onSortChange={handleSortChange}
                      />
                    </th>
                    <th className="py-3 px-3">
                      <ExcelColumnFilter
                        title="Category"
                        columnKey="category"
                        distinctValues={distinctValues.category}
                        selectedValues={excelFilters.category}
                        onFilterChange={(selected) =>
                          setExcelFilters((prev) => ({ ...prev, category: selected }))
                        }
                        currentSortField={sortField}
                        currentSortDirection={sortDirection}
                        onSortChange={handleSortChange}
                      />
                    </th>
                    <th className="py-3 px-3">
                      <ExcelColumnFilter
                        title="Type"
                        columnKey="itemType"
                        distinctValues={distinctValues.itemType}
                        selectedValues={excelFilters.itemType}
                        onFilterChange={(selected) =>
                          setExcelFilters((prev) => ({ ...prev, itemType: selected }))
                        }
                        currentSortField={sortField}
                        currentSortDirection={sortDirection}
                        onSortChange={handleSortChange}
                      />
                    </th>
                    <th className="py-3 px-3">
                      <ExcelColumnFilter
                        title="Make / Buy"
                        columnKey="makeOrBuy"
                        distinctValues={distinctValues.makeOrBuy}
                        selectedValues={excelFilters.makeOrBuy}
                        onFilterChange={(selected) =>
                          setExcelFilters((prev) => ({ ...prev, makeOrBuy: selected }))
                        }
                        currentSortField={sortField}
                        currentSortDirection={sortDirection}
                        onSortChange={handleSortChange}
                      />
                    </th>
                    <th className="py-3 px-3 text-right">Qty / Machine</th>
                    <th className="py-3 px-3">
                      <ExcelColumnFilter
                        title="UOM"
                        columnKey="uom"
                        distinctValues={distinctValues.uom}
                        selectedValues={excelFilters.uom}
                        onFilterChange={(selected) =>
                          setExcelFilters((prev) => ({ ...prev, uom: selected }))
                        }
                        currentSortField={sortField}
                        currentSortDirection={sortDirection}
                        onSortChange={handleSortChange}
                      />
                    </th>
                    <th className="py-3 px-4 text-right w-44">Unit Price (INR)</th>
                    <th className="py-3 px-4 text-right">Total Cost</th>
                    <th className="py-3 px-3 text-center w-20">Save</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        Loading BOM & BOQ costing items...
                      </td>
                    </tr>
                  ) : !selectedProject ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        Select a Work Order above to inspect its BOM & BOQ costing.
                      </td>
                    </tr>
                  ) : filteredBomItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center">
                        <div className="max-w-sm mx-auto space-y-1.5">
                          <Boxes className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-700">
                            {bomItems.length === 0
                              ? `No BOM & BOQ items attached to ${selectedProject.workOrderNumber} yet.`
                              : 'No BOM items match the active filters.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBomItems.map((it: any, idx: number) => {
                      const isRowSaving = savingRowIndex === it.rowIndex;
                      return (
                        <tr
                          key={it.id || idx}
                          className={`transition-colors ${
                            it.isDirty ? 'bg-amber-50/40' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3 px-3 text-center text-slate-400 text-[11px] font-mono">
                            {it.slNo || idx + 1}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {it.itemCode}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {it.itemName}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]">
                              {it.category}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold uppercase">
                              {it.itemType}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                it.makeOrBuy === 'MAKE'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {it.makeOrBuy}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {it.quantityPerMachine}
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-medium">{it.uom}</td>

                          {/* Inline Editable Unit Price Input */}
                          <td className="py-2.5 px-4 text-right">
                            <div className="relative flex items-center justify-end">
                              <span className="text-[11px] font-mono font-bold text-slate-400 mr-1.5">
                                ₹
                              </span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={it.editedInputValue}
                                onChange={(e) =>
                                  handlePriceInputChange(it.rowIndex, e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && it.isDirty) {
                                    e.preventDefault();
                                    handleSaveSingleRowPrice(it);
                                  }
                                }}
                                className={`w-28 px-2.5 py-1.5 text-right font-mono text-xs font-bold rounded-xl border focus:outline-none transition-all ${
                                  it.isDirty
                                    ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-500/20'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                                }`}
                              />
                            </div>
                          </td>

                          {/* Live Line Total */}
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700">
                            {formatCurrency(it.liveLineTotalINR)}
                          </td>

                          {/* Direct Row Save Action */}
                          <td className="py-2.5 px-3 text-center">
                            {it.isDirty ? (
                              <button
                                type="button"
                                disabled={isRowSaving || isSavingPrices}
                                onClick={() => handleSaveSingleRowPrice(it)}
                                title="Save price for this item"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                              >
                                {isRowSaving ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>Save</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-400">
                                Saved
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredBomItems.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200 text-xs font-extrabold text-slate-900">
                      <td colSpan={6} className="py-3 px-4 text-right uppercase tracking-wider text-slate-500">
                        Total ({filteredBomItems.length} BOM Items):
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900">
                        {filteredTotalQty}
                      </td>
                      <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider text-slate-500">
                        Total BOM & BOQ Cost:
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm text-emerald-700">
                        {formatCurrency(filteredTotalCostINR)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-VIEW 2: ATTACHED DESIGN DRAWINGS FOR SELECTED WORK ORDER */}
      {activeSubView === 'drawings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-4">Drawing / Assembly Code</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-3">Classification</th>
                  <th className="py-3 px-3">Revision</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Technical PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!selectedProject?.attachedDrawings || selectedProject.attachedDrawings.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No design drawings attached to this Work Order yet.
                    </td>
                  </tr>
                ) : (
                  selectedProject.attachedDrawings.map((drw: any, idx: number) => {
                    const pdfLink = drw.primaryPdfUrl || drw.pdfUrl || drw.drawingPdfUrl || '';
                    return (
                      <tr key={drw.id || idx} className="hover:bg-slate-50">
                        <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-orange-600">
                          {drw.itemCode || drw.drawingNumber || drw.name}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {drw.itemName || drw.description || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold uppercase">
                            {drw.classification || drw.itemType || 'ASSEMBLY'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {drw.revision || 'Rev 1.0'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {drw.approvalStatus || 'ATTACHED'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {pdfLink ? (
                            <a
                              href={pdfLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 text-[11px] font-bold"
                            >
                              <FileText className="w-3 h-3" />
                              <span>See PDF</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No PDF</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. SUB-VIEW 3: VENDOR POs & INWARD STORE GRN LEDGER FOR SELECTED WORK ORDER */}
      {activeSubView === 'po-grn' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Outward Vendor POs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Vendor Purchase Orders ({selectedProject?.poLedger?.length || 0})
              </span>
              <span className="text-xs font-mono font-bold text-orange-600">
                {formatCurrency(selectedProject?.committedPoCostINR || 0)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">PO Number</th>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!selectedProject?.poLedger || selectedProject.poLedger.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No Vendor POs issued for this Work Order yet.
                      </td>
                    </tr>
                  ) : (
                    selectedProject.poLedger.map((po: any) => (
                      <tr key={po.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-orange-600">{po.poNumber}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{po.vendorName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(po.createdAt)}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {po.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(po.amountINR)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inward Store GRNs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Inward Store GRNs ({selectedProject?.grnLedger?.length || 0})
              </span>
              <span className="text-xs font-mono font-bold text-indigo-700">
                {formatCurrency(selectedProject?.inwardGrnCostINR || 0)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">GRN Number</th>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Freight/Pack</th>
                    <th className="py-2.5 px-3 text-right">Landed Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!selectedProject?.grnLedger || selectedProject.grnLedger.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No Store GRNs recorded for this Work Order yet.
                      </td>
                    </tr>
                  ) : (
                    selectedProject.grnLedger.map((grn: any) => (
                      <tr key={grn.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{grn.grnNumber}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{grn.vendorName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(grn.receivedDate)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {formatCurrency(grn.logisticsINR)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-indigo-700">
                          {formatCurrency(grn.grandTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
