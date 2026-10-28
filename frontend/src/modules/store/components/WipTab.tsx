'use client';

import React, { useState, useMemo } from 'react';
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
  Boxes
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import MaterialRequestModal from './modals/MaterialRequestModal';
import ReturnWipModal from './modals/ReturnWipModal';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

type WipSubTab = 'MATERIAL_REQUESTS' | 'WIP_INVENTORY';

export default function WipTab() {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);

  const [activeSubTab, setActiveSubTab] = useState<WipSubTab>('MATERIAL_REQUESTS');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedReturnItem, setSelectedReturnItem] = useState<any | null>(null);

  // Column filter states
  const [projectFilter, setProjectFilter] = useState<string[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[] | null>(null);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Local state for material requests & WIP items
  const [materialRequests, setMaterialRequests] = useState<any[]>([
    {
      id: 'MR-10492',
      requestId: 'MR-10492',
      projectId: 'PRJ-2026-001',
      workstation: 'MECHANICAL_ASSEMBLY',
      priority: 'HIGH',
      requiredDate: '2026-10-28',
      status: 'PENDING_ISSUE',
      itemsCount: 3,
      items: [
        { itemCode: 'THK-LM-25', itemName: 'THK Linear Motion Guide 25mm x 1200mm', requestedQty: 2, uom: 'NOS' },
        { itemCode: 'FAST-M8-30', itemName: 'High-Tensile Socket Head Cap Screws M8x30', requestedQty: 40, uom: 'NOS' },
        { itemCode: 'AL-BRK-01', itemName: 'Mounting Bracket AL6061 CNC Machined', requestedQty: 2, uom: 'NOS' }
      ],
      notes: 'Required for Main Carriage Z-Axis slide assembly',
      createdAt: '2026-10-26T09:15:00Z'
    },
    {
      id: 'MR-10493',
      requestId: 'MR-10493',
      projectId: 'PRJ-2026-002',
      workstation: 'ELECTRICAL_PANEL',
      priority: 'NORMAL',
      requiredDate: '2026-10-29',
      status: 'ISSUED',
      itemsCount: 2,
      items: [
        { itemCode: 'PLC-S7-1200', itemName: 'Siemens S7-1200 CPU 1214C DC/DC/DC', requestedQty: 1, uom: 'NOS' },
        { itemCode: 'PSU-24V-10A', itemName: 'Weidmuller 24V DC 10A Switched Mode Power Supply', requestedQty: 1, uom: 'NOS' }
      ],
      notes: 'Enclosure control panel mounting',
      createdAt: '2026-10-25T14:30:00Z'
    }
  ]);

  const [wipItems, setWipItems] = useState<any[]>([
    {
      id: 'WIP-8821',
      projectId: 'PRJ-2026-001',
      workstation: 'MECHANICAL_ASSEMBLY',
      itemCode: 'THK-LM-25',
      itemName: 'THK Linear Motion Guide 25mm x 1200mm',
      issuedQty: 2,
      uom: 'NOS',
      issuedDate: '2026-10-25',
      daysOnFloor: 1,
      status: 'IN_ASSEMBLY'
    },
    {
      id: 'WIP-8822',
      projectId: 'PRJ-2026-002',
      workstation: 'ELECTRICAL_PANEL',
      itemCode: 'PLC-S7-1200',
      itemName: 'Siemens S7-1200 CPU 1214C DC/DC/DC',
      issuedQty: 1,
      uom: 'NOS',
      issuedDate: '2026-10-24',
      daysOnFloor: 2,
      status: 'WIRING_IN_PROGRESS'
    },
    {
      id: 'WIP-8823',
      projectId: 'PRJ-2026-001',
      workstation: 'PNEUMATIC_LINE',
      itemCode: 'FESTO-CYL-50',
      itemName: 'Festo Pneumatic Cylinder DNC-50-250-PPV-A',
      issuedQty: 4,
      uom: 'NOS',
      issuedDate: '2026-10-22',
      daysOnFloor: 4,
      status: 'READY_FOR_COMMISSIONING'
    }
  ]);

  // Handle new material request created
  const handleRequestCreated = (newReq: any) => {
    setMaterialRequests((prev) => [newReq, ...prev]);
  };

  // Handle Store Issue Action
  const handleIssueRequest = (reqId: string) => {
    const target = materialRequests.find((r) => r.id === reqId || r.requestId === reqId);
    if (!target) return;

    setMaterialRequests((prev) =>
      prev.map((r) =>
        r.id === reqId || r.requestId === reqId ? { ...r, status: 'ISSUED' } : r
      )
    );

    // Push into WIP Floor Inventory
    const newWipEntries = (target.items || []).map((it: any, index: number) => ({
      id: `WIP-${Date.now()}-${index}`,
      projectId: target.projectId,
      workstation: target.workstation,
      itemCode: it.itemCode || 'PART-GEN',
      itemName: it.itemName,
      issuedQty: it.requestedQty,
      uom: it.uom || 'NOS',
      issuedDate: new Date().toISOString().split('T')[0],
      daysOnFloor: 0,
      status: 'IN_ASSEMBLY'
    }));

    setWipItems((prev) => [...newWipEntries, ...prev]);

    dispatch(
      addToast({
        type: 'success',
        message: `All set! Material Request ${target.requestId} issued to floor (Bucket 3 → Bucket 4).`
      })
    );
  };

  // Handle return completed
  const handleReturnSuccess = (returnData: any) => {
    setWipItems((prev) =>
      prev.filter((item) => (item.id || item._id) !== returnData.wipItemId)
    );
  };

  // Filter distinct values for requests
  const distinctProjects: DistinctValueItem[] = useMemo(() => {
    const map = new Map<string, number>();
    const currentList = activeSubTab === 'MATERIAL_REQUESTS' ? materialRequests : wipItems;
    currentList.forEach((i) => {
      const p = i.projectId || 'N/A';
      map.set(p, (map.get(p) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [activeSubTab, materialRequests, wipItems]);

  const distinctStatuses: DistinctValueItem[] = useMemo(() => {
    const map = new Map<string, number>();
    const currentList = activeSubTab === 'MATERIAL_REQUESTS' ? materialRequests : wipItems;
    currentList.forEach((i) => {
      const s = i.status || 'N/A';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [activeSubTab, materialRequests, wipItems]);

  // Filtered lists
  const filteredRequests = useMemo(() => {
    return materialRequests.filter((req) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const id = (req.requestId || '').toLowerCase();
        const proj = (req.projectId || '').toLowerCase();
        const stn = (req.workstation || '').toLowerCase();
        if (!id.includes(q) && !proj.includes(q) && !stn.includes(q)) return false;
      }
      if (projectFilter && projectFilter.length > 0) {
        if (!projectFilter.includes(req.projectId)) return false;
      }
      if (statusFilter && statusFilter.length > 0) {
        if (!statusFilter.includes(req.status)) return false;
      }
      return true;
    });
  }, [materialRequests, searchTerm, projectFilter, statusFilter]);

  const filteredWipItems = useMemo(() => {
    return wipItems.filter((item) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const code = (item.itemCode || '').toLowerCase();
        const name = (item.itemName || '').toLowerCase();
        const proj = (item.projectId || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !proj.includes(q)) return false;
      }
      if (projectFilter && projectFilter.length > 0) {
        if (!projectFilter.includes(item.projectId)) return false;
      }
      if (statusFilter && statusFilter.length > 0) {
        if (!statusFilter.includes(item.status)) return false;
      }
      return true;
    });
  }, [wipItems, searchTerm, projectFilter, statusFilter]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setProjectFilter(null);
    setStatusFilter(null);
  };

  return (
    <div className="space-y-4">
      {/* Metric Cards (Strictly label + value) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Open Material Requests
          </div>
          <div className="text-lg font-extrabold text-amber-600 mt-0.5">
            {materialRequests.filter((r) => r.status === 'PENDING_ISSUE').length} Pending
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Line Stoppage Alerts
          </div>
          <div className="text-lg font-extrabold text-red-600 mt-0.5">
            {materialRequests.filter((r) => r.priority === 'LINE_STOP' && r.status === 'PENDING_ISSUE').length} Critical
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Items on Floor (Bucket 4)
          </div>
          <div className="text-lg font-extrabold text-orange-600 mt-0.5">
            {wipItems.reduce((acc, it) => acc + (it.issuedQty || 0), 0)} Units Active
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Active Projects in WIP
          </div>
          <div className="text-lg font-extrabold text-slate-900 mt-0.5">
            {new Set(wipItems.map((i) => i.projectId)).size} Machines
          </div>
        </div>
      </div>

      {/* Sub-Tabs Bar & Requisition Button */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Modern Button-Type Sub-Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveSubTab('MATERIAL_REQUESTS')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'MATERIAL_REQUESTS'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Send size={14} />
            Material Requests ({materialRequests.length})
          </button>

          <button
            onClick={() => setActiveSubTab('WIP_INVENTORY')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'WIP_INVENTORY'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Boxes size={14} />
            WIP Inventory ({wipItems.length})
          </button>
        </div>

        {/* Action Button */}
        {activeSubTab === 'MATERIAL_REQUESTS' && (
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 self-end md:self-auto shrink-0"
          >
            <Plus size={15} /> Raise Material Request
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeSubTab === 'MATERIAL_REQUESTS'
                ? 'Search request #, project ID, workstation...'
                : 'Search part code, item name, project ID...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs"
          />
        </div>

        {(searchTerm || projectFilter || statusFilter) && (
          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors"
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
        )}
      </div>

      {/* Sub-Tab 1: Material Requests Table */}
      {activeSubTab === 'MATERIAL_REQUESTS' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Request #</th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="Project ID"
                      columnKey="projectId"
                      distinctValues={distinctProjects}
                      selectedValues={projectFilter}
                      onFilterChange={setProjectFilter}
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={(f, d) => {
                        setSortField(f);
                        setSortDirection(d);
                      }}
                    />
                  </th>
                  <th className="py-3 px-4">Station / Cell</th>
                  <th className="py-3 px-4">Requisition Items</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Required Date</th>
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
                  <th className="py-3 px-4 text-right">Store Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      No material requests recorded.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id || req.requestId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {req.requestId}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">
                        {req.projectId}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium text-[11px]">
                        {req.workstation?.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {req.items?.map((it: any, i: number) => (
                            <div key={i} className="text-[11px] text-slate-700 font-medium">
                              • <span className="font-bold text-slate-900">{it.itemName}</span> ({it.requestedQty} {it.uom})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            req.priority === 'LINE_STOP'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : req.priority === 'HIGH'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {req.priority?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {req.requiredDate}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === 'ISSUED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {req.status === 'ISSUED' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          {req.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {req.status === 'PENDING_ISSUE' ? (
                          <button
                            onClick={() => handleIssueRequest(req.id || req.requestId)}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors shadow-xs"
                          >
                            Issue to Floor
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-700 flex items-center justify-end gap-1">
                            <CheckCircle2 size={13} /> Issued
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: WIP Floor Inventory Table */}
      {activeSubTab === 'WIP_INVENTORY' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="Project ID"
                      columnKey="projectId"
                      distinctValues={distinctProjects}
                      selectedValues={projectFilter}
                      onFilterChange={setProjectFilter}
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSortChange={(f, d) => {
                        setSortField(f);
                        setSortDirection(d);
                      }}
                    />
                  </th>
                  <th className="py-3 px-4">Assembly Station / Bay</th>
                  <th className="py-3 px-4">Part / Component Code</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-orange-600 font-bold">Issued on Floor</th>
                  <th className="py-3 px-4">Floor Aging</th>
                  <th className="py-3 px-4">
                    <ExcelColumnFilter
                      title="Assembly Status"
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
                  <th className="py-3 px-4 text-right">Floor Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredWipItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      No active items currently issued on floor.
                    </td>
                  </tr>
                ) : (
                  filteredWipItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">
                        {item.projectId}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 text-[11px]">
                        {item.workstation?.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {item.itemCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {item.itemName}
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-orange-600">
                        {item.issuedQty} {item.uom}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {item.daysOnFloor} day(s)
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          {item.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedReturnItem(item)}
                          className="text-xs font-bold text-slate-700 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1"
                        >
                          <RotateCcw size={12} /> Return to Store
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <MaterialRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmitSuccess={handleRequestCreated}
      />

      <ReturnWipModal
        isOpen={Boolean(selectedReturnItem)}
        item={selectedReturnItem}
        onClose={() => setSelectedReturnItem(null)}
        onSubmitSuccess={handleReturnSuccess}
      />
    </div>
  );
}
