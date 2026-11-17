'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Wrench,
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Send,
  Boxes,
  Eye,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import MaterialRequestModal from './modals/MaterialRequestModal';
import ReturnWipModal from './modals/ReturnWipModal';
import StoreMaterialIssuedHistoryTab from './StoreMaterialIssuedHistoryTab';
import StoreWorkOrderWipTab from './StoreWorkOrderWipTab';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';
import {
  useGetMaterialRequestsQuery,
  useIssueMaterialRequestMutation,
  useGetInventoryQuery
} from '../api/storeApi';

interface WipTabProps {
  subTab?: 'requests' | 'issued-history' | 'workorders' | 'inventory';
}

export default function WipTab({ subTab = 'requests' }: WipTabProps) {
  const dispatch = useAppDispatch();

  // Active sub-tab state (synced with prop)
  const activeSubTab = subTab;
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedReturnItem, setSelectedReturnItem] = useState<any | null>(null);

  // Column filter states
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Queries
  const { data: pendingMrData, isLoading: isLoadingPending } = useGetMaterialRequestsQuery(
    { status: 'PENDING' },
    { skip: activeSubTab !== 'requests' }
  );
  const { data: issuedMrData } = useGetMaterialRequestsQuery({ status: 'ISSUED' });
  const { data: invData, isLoading: isLoadingInv } = useGetInventoryQuery({}, { skip: activeSubTab !== 'inventory' });

  const [issueMrTrigger, { isLoading: isIssuing }] = useIssueMaterialRequestMutation();

  // Data mapping
  const pendingRequests = useMemo(() => pendingMrData?.materialRequests || [], [pendingMrData]);
  const issuedRequestsCount = useMemo(() => issuedMrData?.materialRequests?.length || 0, [issuedMrData]);

  // Floor inventory: items with issuedQty > 0
  const floorWipItems = useMemo(() => {
    const list = invData?.items || [];
    return list
      .filter((it: any) => Number(it.issuedQty || it.wipStock || 0) > 0)
      .map((it: any) => ({
        id: it.id || it._id,
        itemCode: it.itemCode || it.drawingNumber,
        itemName: it.itemName || it.title,
        category: it.category || it.itemType || 'BO',
        uom: it.baseUom || 'Nos',
        issuedQty: Number(it.issuedQty || it.wipStock || 0),
        acceptedQty: Number(it.acceptedQty || it.stock || 0),
        unitRate: Number(it.unitRate || 0),
        wipValue: Number(it.wipValue || (it.issuedQty || 0) * (it.unitRate || 0)),
        locationName: it.locationName || 'Shopfloor Assembly'
      }));
  }, [invData]);

  // Handle Store Issue Action
  const handleIssueRequest = async (mr: any) => {
    try {
      await issueMrTrigger({ id: mr.id || mr._id }).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: `All set! Materials for ${mr.mrNumber} issued to floor (Bucket 3 → Bucket 4).`
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || 'Could not issue materials right now. Please check stock.'
        })
      );
    }
  };

  // Filter handlers
  const handleFilterChange = (colKey: string, values: string[] | null) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (!values || values.length === 0) delete next[colKey];
      else next[colKey] = values;
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setActiveFilters({});
    setSortField('createdAt');
    setSortDir('desc');
  };

  const hasActiveFilters = searchTerm.trim().length > 0 || Object.keys(activeFilters).length > 0;

  // Distinct values helper
  const getDistinctValues = (dataset: any[], field: string) => {
    const map: Record<string, number> = {};
    dataset.forEach((it: any) => {
      const val = String(it[field] || '');
      if (val) map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map).map(([value, count]) => ({ value, count }));
  };

  // Filtered pending requests
  const filteredRequests = useMemo(() => {
    return pendingRequests.filter((req: any) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mrNum = (req.mrNumber || '').toLowerCase();
        const prj = (req.projectId || '').toLowerCase();
        const dept = (req.department || '').toLowerCase();
        if (!mrNum.includes(q) && !prj.includes(q) && !dept.includes(q)) return false;
      }
      for (const [key, vals] of Object.entries(activeFilters)) {
        const itemVal = String(req[key] || '');
        if (!vals.includes(itemVal)) return false;
      }
      return true;
    });
  }, [pendingRequests, searchTerm, activeFilters]);

  // Filtered floor items
  const filteredFloorItems = useMemo(() => {
    return floorWipItems.filter((item: any) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const code = (item.itemCode || '').toLowerCase();
        const name = (item.itemName || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !cat.includes(q)) return false;
      }
      for (const [key, vals] of Object.entries(activeFilters)) {
        const itemVal = String(item[key] || '');
        if (!vals.includes(itemVal)) return false;
      }
      return true;
    });
  }, [floorWipItems, searchTerm, activeFilters]);

  return (
    <div className="space-y-4">
      {/* Sub-Tabs Bar (Button-Type Standard with Direct Link Routes) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <Link
            href="/store/wip/requests"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'requests'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Send size={14} />
            <span>Material Requests ({pendingRequests.length})</span>
          </Link>

          <Link
            href="/store/wip/issued-history"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'issued-history'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <RotateCcw size={14} />
            <span>Material Issued History ({issuedRequestsCount})</span>
          </Link>

          <Link
            href="/store/wip/workorders"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'workorders'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Wrench size={14} />
            <span>Work Orders Issued</span>
          </Link>

          <Link
            href="/store/wip/inventory"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'inventory'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Boxes size={14} />
            <span>WIP Floor Inventory ({floorWipItems.length})</span>
          </Link>
        </div>

        {/* Primary Action Button */}
        {activeSubTab === 'requests' && (
          <button
            type="button"
            onClick={() => setIsRequestModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-xs shadow-orange-500/20 transition-all cursor-pointer self-start md:self-auto"
          >
            <Plus size={14} />
            <span>Raise Material Request</span>
          </button>
        )}
      </div>

      {/* Sub-Tab 2: Material Issued History Tab */}
      {activeSubTab === 'issued-history' && <StoreMaterialIssuedHistoryTab />}

      {/* Sub-Tab 3: Work Orders Issued Tab */}
      {activeSubTab === 'workorders' && <StoreWorkOrderWipTab />}

      {/* Sub-Tab 1: Material Requests Table */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          {/* Dedicated Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search MR number, work order, workstation..."
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-hidden text-slate-900 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer self-end sm:self-auto"
              >
                <RotateCcw size={14} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto min-h-[260px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 min-w-[140px]">
                      <ExcelColumnFilter
                        title="MR Number"
                        columnKey="mrNumber"
                        selectedValues={activeFilters['mrNumber'] || null}
                        distinctValues={getDistinctValues(pendingRequests, 'mrNumber')}
                        onFilterChange={(vals) => handleFilterChange('mrNumber', vals)}
                        currentSortField={sortField}
                        currentSortDirection={sortDir}
                        onSortChange={(field, dir) => {
                          setSortField(field);
                          setSortDir(dir);
                        }}
                      />
                    </th>
                    <th className="py-3 px-3 min-w-[150px]">
                      <ExcelColumnFilter
                        title="Work Order / Project"
                        columnKey="projectId"
                        selectedValues={activeFilters['projectId'] || null}
                        distinctValues={getDistinctValues(pendingRequests, 'projectId')}
                        onFilterChange={(vals) => handleFilterChange('projectId', vals)}
                        currentSortField={sortField}
                        currentSortDirection={sortDir}
                        onSortChange={(field, dir) => {
                          setSortField(field);
                          setSortDir(dir);
                        }}
                      />
                    </th>
                    <th className="py-3 px-3 min-w-[160px]">
                      <ExcelColumnFilter
                        title="Workstation / Bay"
                        columnKey="department"
                        selectedValues={activeFilters['department'] || null}
                        distinctValues={getDistinctValues(pendingRequests, 'department')}
                        onFilterChange={(vals) => handleFilterChange('department', vals)}
                        currentSortField={sortField}
                        currentSortDirection={sortDir}
                        onSortChange={(field, dir) => {
                          setSortField(field);
                          setSortDir(dir);
                        }}
                      />
                    </th>
                    <th className="py-3 px-3 min-w-[260px]">Requisition Components</th>
                    <th className="py-3 px-3 min-w-[120px] text-center">Status</th>
                    <th className="py-3 px-3 w-36 text-center">Store Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoadingPending ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                        Loading pending material requests...
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center">
                        <Send className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-700">No pending material requests</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Raise a material request above to requisition parts for assembly floor.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req: any, idx: number) => {
                      const itemsList = Array.isArray(req.items) ? req.items : [];
                      return (
                        <tr key={req.id || req._id} className="hover:bg-orange-50/20 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono font-extrabold text-orange-600">
                            {req.mrNumber}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {req.projectId}
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium">
                            {req.department || 'Production Assembly'}
                          </td>
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              {itemsList.slice(0, 3).map((it: any, i: number) => (
                                <div key={i} className="text-[11px] text-slate-700">
                                  <span className="font-bold text-slate-900">{it.itemCode}</span> •{' '}
                                  {it.itemName} ({it.requestedQty ?? it.quantity ?? 1} {it.uom || 'Nos'})
                                </div>
                              ))}
                              {itemsList.length > 3 && (
                                <div className="text-[10px] text-slate-400 italic">
                                  +{itemsList.length - 3} more line items
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={11} />
                              <span>PENDING ISSUE</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              disabled={isIssuing}
                              onClick={() => handleIssueRequest(req)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
                            >
                              Issue to Floor
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: WIP Floor Inventory Table */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-4">
          {/* Dedicated Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search part code, description, category..."
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-hidden text-slate-900 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer self-end sm:self-auto"
              >
                <RotateCcw size={14} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto min-h-[260px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 min-w-[240px]">
                      <ExcelColumnFilter
                        title="Item Code & Description"
                        columnKey="itemCode"
                        selectedValues={activeFilters['itemCode'] || null}
                        distinctValues={getDistinctValues(floorWipItems, 'itemCode')}
                        onFilterChange={(vals) => handleFilterChange('itemCode', vals)}
                        currentSortField={sortField}
                        currentSortDirection={sortDir}
                        onSortChange={(field, dir) => {
                          setSortField(field);
                          setSortDir(dir);
                        }}
                      />
                    </th>
                    <th className="py-3 px-3 min-w-[120px]">
                      <ExcelColumnFilter
                        title="Category"
                        columnKey="category"
                        selectedValues={activeFilters['category'] || null}
                        distinctValues={getDistinctValues(floorWipItems, 'category')}
                        onFilterChange={(vals) => handleFilterChange('category', vals)}
                        currentSortField={sortField}
                        currentSortDirection={sortDir}
                        onSortChange={(field, dir) => {
                          setSortField(field);
                          setSortDir(dir);
                        }}
                      />
                    </th>
                    <th className="py-3 px-3 min-w-[140px] text-center">Active WIP on Floor</th>
                    <th className="py-3 px-3 min-w-[130px] text-center">Available in Store</th>
                    <th className="py-3 px-3 min-w-[140px] text-right">Floor Valuation (₹)</th>
                    <th className="py-3 px-3 w-32 text-center">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoadingInv ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                        Loading WIP floor inventory...
                      </td>
                    </tr>
                  ) : filteredFloorItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center">
                        <Boxes className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-700">No active WIP items on floor</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Parts issued from Material Requests (Bucket 4) will appear here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredFloorItems.map((item: any, idx: number) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-slate-900">{item.itemCode}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-sm">{item.itemName}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{item.category}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-extrabold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg text-xs">
                            {item.issuedQty} {item.uom}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-600">
                          {item.acceptedQty} {item.uom}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Number(item.wipValue).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedReturnItem(item)}
                            className="px-3 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-orange-700 bg-slate-100 hover:bg-orange-50 border border-slate-200 transition-colors cursor-pointer"
                          >
                            Return
                          </button>
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

      {/* Modal 1: Material Request Modal */}
      {isRequestModalOpen && (
        <MaterialRequestModal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          onSuccess={(msg) =>
            dispatch(
              addToast({
                type: 'success',
                message: msg
              })
            )
          }
        />
      )}

      {/* Modal 2: Return WIP Modal */}
      {selectedReturnItem && (
        <ReturnWipModal
          isOpen={Boolean(selectedReturnItem)}
          item={selectedReturnItem}
          onClose={() => setSelectedReturnItem(null)}
          onSubmitSuccess={() => {
            dispatch(
              addToast({
                type: 'success',
                message: 'All set! Materials returned to Available Store Stock (Bucket 4 → Bucket 3).'
              })
            );
            setSelectedReturnItem(null);
          }}
        />
      )}
    </div>
  );
}
