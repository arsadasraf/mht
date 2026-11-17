'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  X,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Download,
  Boxes,
  Clock,
  Layers,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { useGetProjectsQuery } from '../../../project-setup/api/projectApi';
import {
  useGetWorkOrderBomItemsQuery,
  useCreateMaterialRequestMutation,
  useUpdateMaterialRequestMutation,
  useGetInventoryQuery
} from '../../api/storeApi';

interface RequestLineItem {
  id: string;
  itemCode: string;
  itemName: string;
  description?: string;
  revision?: string;
  uom: string;
  requestedQty: number;
  liveAvailableStock: number;
  remarks?: string;
}

interface MaterialRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  editingRequest?: any;
}

const WORKSTATIONS = [
  { value: 'MECHANICAL_ASSEMBLY', label: 'Mechanical Assembly (Bay 1)' },
  { value: 'ELECTRICAL_PANEL', label: 'Electrical Panel & Wiring (Bay 2)' },
  { value: 'PNEUMATICS', label: 'Pneumatics & Piping' },
  { value: 'TESTING_TRIAL', label: 'Testing & Trial Stage' },
  { value: 'PRODUCTION_GENERAL', label: 'General Shopfloor Assembly' }
];

const PRIORITIES = [
  { value: 'NORMAL', label: 'Normal', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'HIGH', label: 'High Priority', color: 'bg-amber-50 text-amber-800 border-amber-300' },
  { value: 'LINE_STOP', label: 'Line Stoppage (Critical)', color: 'bg-red-50 text-red-700 border-red-300 font-extrabold' }
];

export default function MaterialRequestModal({
  isOpen,
  onClose,
  onSuccess,
  editingRequest
}: MaterialRequestModalProps) {
  // Projects / Work Orders Query
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery(
    {},
    { skip: !isOpen }
  );
  const projects = useMemo(() => {
    const list = projectsData?.projects || [];
    return list.filter((p: any) => p.status !== 'DISPATCHED' && p.status !== 'COMPLETED');
  }, [projectsData]);

  // Form State
  const [selectedWorkOrder, setSelectedWorkOrder] = useState('');
  const [department, setDepartment] = useState('MECHANICAL_ASSEMBLY');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'LINE_STOP'>('NORMAL');
  const [requiredDate, setRequiredDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<RequestLineItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Selected Project Object
  const currentProject = useMemo(() => {
    return projects.find(
      (p: any) =>
        (p.workOrderNumber && p.workOrderNumber.toUpperCase() === selectedWorkOrder.toUpperCase()) ||
        (p.projectId && p.projectId.toUpperCase() === selectedWorkOrder.toUpperCase())
    );
  }, [projects, selectedWorkOrder]);

  // Query Attached BOM Items for Selected Work Order
  const { data: bomData, isLoading: isLoadingBom } = useGetWorkOrderBomItemsQuery(
    currentProject?.projectId || selectedWorkOrder,
    { skip: !isOpen || !selectedWorkOrder }
  );

  const attachedBomItems = useMemo(() => bomData?.items || [], [bomData]);

  // General inventory for custom line item live stock lookups
  const { data: invData } = useGetInventoryQuery({ category: 'RM_BO' }, { skip: !isOpen });
  const storeInventory = useMemo(() => invData?.items || [], [invData]);

  // Mutations
  const [createMrTrigger, { isLoading: isCreating }] = useCreateMaterialRequestMutation();
  const [updateMrTrigger, { isLoading: isUpdating }] = useUpdateMaterialRequestMutation();

  // Populate when editing
  useEffect(() => {
    if (editingRequest) {
      setSelectedWorkOrder(editingRequest.projectId || '');
      setDepartment(editingRequest.department || 'MECHANICAL_ASSEMBLY');
      setNotes(editingRequest.notes || '');
      if (Array.isArray(editingRequest.items)) {
        setLineItems(
          editingRequest.items.map((it: any, idx: number) => ({
            id: `edit-${idx}-${Date.now()}`,
            itemCode: it.itemCode || '',
            itemName: it.itemName || it.itemCode || '',
            description: it.description || '',
            revision: it.revision || 'Rev 1.0',
            uom: it.uom || it.baseUom || 'Nos',
            requestedQty: Number(it.quantity ?? it.requestedQty ?? 1),
            liveAvailableStock: Number(it.liveAvailableStock ?? 999),
            remarks: it.remarks || ''
          }))
        );
      }
    } else {
      // Default to first open project if available
      if (projects.length > 0 && !selectedWorkOrder) {
        setSelectedWorkOrder(projects[0].workOrderNumber || projects[0].projectId);
      }
    }
  }, [editingRequest, projects, selectedWorkOrder]);

  if (!isOpen) return null;

  // Transfer single item from attached BOM into request lines
  const handleFetchBomItem = (item: any) => {
    if (item.liveAvailableStock <= 0) return; // Disallowed if out of stock
    const code = item.itemCode.toUpperCase().trim();
    const existingIdx = lineItems.findIndex((it) => it.itemCode.toUpperCase() === code);

    const planned = Number(item.plannedQty || 1);
    const available = Number(item.liveAvailableStock || 0);
    const initialQty = Math.min(planned, available);

    if (existingIdx >= 0) {
      // Already added, focus or alert
      return;
    }

    const newLine: RequestLineItem = {
      id: `line-${code}-${Date.now()}`,
      itemCode: code,
      itemName: item.itemName,
      description: item.description || '',
      revision: item.revision || 'Rev 1.0',
      uom: item.uom || 'Nos',
      requestedQty: initialQty > 0 ? initialQty : 1,
      liveAvailableStock: available,
      remarks: ''
    };

    setLineItems((prev) => [...prev, newLine]);
  };

  // Fetch all in-stock attached items at once
  const handleFetchAllInStockItems = () => {
    const inStock = attachedBomItems.filter((i: any) => Number(i.liveAvailableStock) > 0);
    if (inStock.length === 0) return;

    const newLines: RequestLineItem[] = [];
    inStock.forEach((item: any) => {
      const code = item.itemCode.toUpperCase().trim();
      const alreadyPresent = lineItems.some((it) => it.itemCode.toUpperCase() === code);
      if (!alreadyPresent) {
        const planned = Number(item.plannedQty || 1);
        const available = Number(item.liveAvailableStock || 0);
        newLines.push({
          id: `line-${code}-${Date.now()}-${Math.random()}`,
          itemCode: code,
          itemName: item.itemName,
          description: item.description || '',
          revision: item.revision || 'Rev 1.0',
          uom: item.uom || 'Nos',
          requestedQty: Math.min(planned, available),
          liveAvailableStock: available,
          remarks: ''
        });
      }
    });

    if (newLines.length > 0) {
      setLineItems((prev) => [...prev, ...newLines]);
    }
  };

  // Add empty custom line item
  const handleAddCustomLine = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        itemCode: '',
        itemName: '',
        uom: 'Nos',
        requestedQty: 1,
        liveAvailableStock: 0,
        remarks: ''
      }
    ]);
  };

  // Remove line item
  const handleRemoveLine = (id: string) => {
    setLineItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Update line item
  const handleUpdateLine = (id: string, field: keyof RequestLineItem, val: any) => {
    setLineItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: val };

        // If itemCode changes, look up live stock
        if (field === 'itemCode') {
          const match = storeInventory.find(
            (inv: any) => (inv.itemCode || '').toUpperCase().trim() === String(val).toUpperCase().trim()
          );
          if (match) {
            updated.itemName = match.itemName || updated.itemName;
            updated.uom = match.baseUom || updated.uom;
            updated.liveAvailableStock = Number(match.acceptedQty ?? match.stock ?? 0);
          }
        }

        return updated;
      })
    );
  };

  // Strict Validation: Any line item requesting more than live stock?
  const stockViolations = useMemo(() => {
    return lineItems.filter((it) => {
      const requested = Number(it.requestedQty || 0);
      const stock = Number(it.liveAvailableStock || 0);
      return requested > stock || stock <= 0;
    });
  }, [lineItems]);

  const hasStockError = stockViolations.length > 0;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedWorkOrder.trim()) {
      setErrorMessage('Please select an Open Work Order to link this material request.');
      return;
    }

    if (lineItems.length === 0) {
      setErrorMessage('Please add at least one line item to this request.');
      return;
    }

    const invalidItems = lineItems.some((it) => !it.itemName.trim() || Number(it.requestedQty) <= 0);
    if (invalidItems) {
      setErrorMessage('Please ensure all items have valid names and positive quantities.');
      return;
    }

    if (hasStockError) {
      const badCodes = stockViolations.map((it) => it.itemCode || it.itemName).join(', ');
      setErrorMessage(
        `Request exceeds live available stock for: ${badCodes}. Quantities must be within available inventory.`
      );
      return;
    }

    try {
      const payload = {
        projectId: selectedWorkOrder.trim().toUpperCase(),
        department,
        priority,
        requiredDate,
        notes: notes.trim(),
        items: lineItems.map((it) => ({
          itemCode: it.itemCode.trim().toUpperCase(),
          itemName: it.itemName.trim(),
          description: it.description || '',
          revision: it.revision || 'Rev 1.0',
          uom: it.uom || 'Nos',
          requestedQty: Number(it.requestedQty),
          liveAvailableStock: Number(it.liveAvailableStock),
          remarks: it.remarks || ''
        }))
      };

      if (editingRequest) {
        await updateMrTrigger({ id: editingRequest.id || editingRequest._id, ...payload }).unwrap();
        if (onSuccess) {
          onSuccess(`All set! Material Request ${editingRequest.mrNumber} updated successfully.`);
        }
      } else {
        const res = await createMrTrigger(payload).unwrap();
        if (onSuccess) {
          onSuccess(res?.message || 'All set! Material Request raised and routed to Store.');
        }
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.data?.message || 'We could not save this material request right now. Please check your fields.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl lg:max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Ribbon Standard: Crisp White with Amber Stripe */}
        <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
              <Wrench size={18} />
            </div>
            <div>
              <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                {editingRequest ? `Edit Material Request (${editingRequest.mrNumber})` : 'New Material Request'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Select an open Work Order, fetch attached BOM parts with live stock verification, and requisition materials
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Top Error Alert */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-medium">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION 1: Open Work Order Dropdown & Requisition Details */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
            {/* Open Work Orders Dropdown */}
            <div className="sm:col-span-6 space-y-1">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Open Work Order <span className="text-red-500">*</span>
              </label>
              {isLoadingProjects ? (
                <div className="text-xs text-slate-400 py-2">Loading open work orders...</div>
              ) : projects.length === 0 ? (
                <div className="text-xs text-amber-700 italic py-2">
                  No active work orders found. You can enter a custom work order identifier below.
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedWorkOrder}
                    onChange={(e) => setSelectedWorkOrder(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 transition-all cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Open Work Order ({projects.length} Active) --</option>
                    {projects.map((p: any) => {
                      const woCode = p.workOrderNumber || p.projectId;
                      return (
                        <option key={p.id} value={woCode}>
                          {woCode} • {p.customerName || 'Customer'} {p.machineModel ? `(${p.machineModel})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
              {currentProject && (
                <p className="text-[11px] text-slate-500 font-medium">
                  {currentProject.projectName} • Model: <span className="font-semibold text-slate-800">{currentProject.machineModel || 'N/A'}</span>
                </p>
              )}
            </div>

            {/* Department / Workstation */}
            <div className="sm:col-span-3 space-y-1">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Workstation / Bay <span className="text-red-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 transition-all cursor-pointer"
              >
                {WORKSTATIONS.map((ws) => (
                  <option key={ws.value} value={ws.value}>
                    {ws.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="sm:col-span-3 space-y-1">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 transition-all cursor-pointer"
              >
                {PRIORITIES.map((pr) => (
                  <option key={pr.value} value={pr.value}>
                    {pr.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 2: Attached Work Order Items Drawer with Live Stock Verification */}
          {selectedWorkOrder && (
            <div className="bg-amber-50/50 border border-amber-200/90 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                    <Layers size={14} className="text-orange-500" />
                    <span>Attached Work Order Items in {selectedWorkOrder}</span>
                    <span className="text-[10px] font-mono font-bold bg-white text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200">
                      {attachedBomItems.length} BOM Parts
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Click "Fetch" to add parts with live stock verification into your material request
                  </p>
                </div>

                {attachedBomItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleFetchAllInStockItems}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-xs shadow-orange-500/20 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Download size={13} />
                    <span>Fetch All In-Stock Items</span>
                  </button>
                )}
              </div>

              {isLoadingBom ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  Loading attached BOM items and querying live inventory stock...
                </div>
              ) : attachedBomItems.length === 0 ? (
                <div className="p-4 bg-white/80 rounded-xl border border-amber-200 text-xs text-amber-900">
                  <p className="font-bold">No BOM items attached to this Work Order yet.</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    You can add custom line items below or attach an assembly BOM in Design Module.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-xl border border-amber-200/70 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-amber-100/70 border-b border-amber-200 text-slate-700 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Item Code &amp; Name</th>
                        <th className="py-2 px-2 text-center w-24">Planned Qty</th>
                        <th className="py-2 px-3 text-center w-36">Live Available Stock</th>
                        <th className="py-2 px-3 text-center w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100/60">
                      {attachedBomItems.map((bItem: any) => {
                        const inStock = Number(bItem.liveAvailableStock || 0) > 0;
                        const isAlreadyAdded = lineItems.some(
                          (it) => it.itemCode.toUpperCase() === bItem.itemCode.toUpperCase()
                        );
                        return (
                          <tr key={bItem.id} className="hover:bg-amber-50/50 transition-colors">
                            <td className="py-2 px-3">
                              <div className="font-mono font-bold text-slate-900">{bItem.itemCode}</div>
                              <div className="text-[11px] text-slate-500 truncate max-w-sm">
                                {bItem.itemName}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-slate-700">
                              {bItem.plannedQty} {bItem.uom}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {inStock ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={11} />
                                  <span>{bItem.liveAvailableStock} {bItem.uom} Available</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                                  <AlertCircle size={11} />
                                  <span>0 {bItem.uom} (Out of Stock)</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                disabled={!inStock || isAlreadyAdded}
                                onClick={() => handleFetchBomItem(bItem)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  isAlreadyAdded
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : inStock
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-xs cursor-pointer'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                                title={
                                  !inStock
                                    ? 'Cannot request: item is out of stock in Store'
                                    : isAlreadyAdded
                                    ? 'Item already added to request'
                                    : 'Fetch into request'
                                }
                              >
                                {isAlreadyAdded ? 'Added' : inStock ? '+ Fetch' : 'No Stock'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: Request Lines Table with Strict Live Stock Ceiling Validation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <Boxes size={15} className="text-orange-500" />
                  <span>Requisition Line Items ({lineItems.length})</span>
                </h4>
                <p className="text-[10px] text-slate-500">
                  Requested quantity cannot exceed live available stock in Store
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddCustomLine}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shrink-0 cursor-pointer"
              >
                <Plus size={14} />
                <span>Custom Item</span>
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto min-h-[140px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 min-w-[260px]">Item Code &amp; Description</th>
                      <th className="py-3 px-3 w-24">UOM</th>
                      <th className="py-3 px-3 w-36 text-center">Live Available Stock</th>
                      <th className="py-3 px-3 w-32 text-center">Requested Qty</th>
                      <th className="py-3 px-3 min-w-[180px]">Remarks / Usage</th>
                      <th className="py-3 px-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                          <p className="text-xs font-bold text-slate-700">No items added to this request yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Fetch attached items from the Work Order BOM above or click "Custom Item" to add manually.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((item, idx) => {
                        const isExceeded = Number(item.requestedQty) > Number(item.liveAvailableStock);
                        const isZeroStock = Number(item.liveAvailableStock) <= 0;
                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              isExceeded || isZeroStock ? 'bg-red-50/40' : 'hover:bg-slate-50/60'
                            }`}
                          >
                            <td className="py-3 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>

                            {/* Item Code & Description */}
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  value={item.itemCode}
                                  onChange={(e) =>
                                    handleUpdateLine(item.id, 'itemCode', e.target.value.toUpperCase())
                                  }
                                  placeholder="Item code..."
                                  className="font-mono font-bold text-orange-600 text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white focus:border-orange-500 w-44"
                                  required
                                />
                                <input
                                  type="text"
                                  value={item.itemName}
                                  onChange={(e) => handleUpdateLine(item.id, 'itemName', e.target.value)}
                                  placeholder="Item description..."
                                  className="w-full text-xs font-semibold text-slate-900 px-2 py-1 rounded-lg border border-slate-200 bg-white focus:border-orange-500"
                                  required
                                />
                              </div>
                            </td>

                            {/* UOM */}
                            <td className="py-3 px-3">
                              <input
                                type="text"
                                value={item.uom}
                                onChange={(e) => handleUpdateLine(item.id, 'uom', e.target.value)}
                                className="w-full font-mono font-bold text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:border-orange-500 text-slate-700"
                                required
                              />
                            </td>

                            {/* Live Available Stock (Bucket 3: acceptedQty) */}
                            <td className="py-3 px-3 text-center">
                              {Number(item.liveAvailableStock) > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={12} />
                                  <span>{item.liveAvailableStock} {item.uom}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                                  <AlertCircle size={12} />
                                  <span>0 {item.uom}</span>
                                </span>
                              )}
                            </td>

                            {/* Requested Qty (with strict validation against liveAvailableStock) */}
                            <td className="py-3 px-3 text-center">
                              <div className="space-y-1">
                                <input
                                  type="number"
                                  min="0.001"
                                  step="any"
                                  max={item.liveAvailableStock > 0 ? item.liveAvailableStock : 0}
                                  value={item.requestedQty}
                                  onChange={(e) =>
                                    handleUpdateLine(item.id, 'requestedQty', Number(e.target.value))
                                  }
                                  className={`w-full text-center font-extrabold text-xs px-2 py-1.5 rounded-lg border ${
                                    isExceeded
                                      ? 'border-red-400 bg-red-50 text-red-700'
                                      : 'border-slate-200 bg-white focus:border-orange-500'
                                  }`}
                                  required
                                />
                                {isExceeded && (
                                  <p className="text-[10px] text-red-600 font-bold leading-tight">
                                    Exceeds stock ({item.liveAvailableStock})
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Remarks */}
                            <td className="py-3 px-3">
                              <input
                                type="text"
                                value={item.remarks || ''}
                                onChange={(e) => handleUpdateLine(item.id, 'remarks', e.target.value)}
                                placeholder="e.g. Z-Axis carriage slide"
                                className="w-full text-xs text-slate-700 px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:border-orange-500"
                              />
                            </td>

                            {/* Remove Action */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(item.id)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
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

          {/* Notes */}
          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
              Requisition Notes / Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any specific instructions for Store team..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {hasStockError ? (
              <span className="text-red-600 font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} />
                <span>Adjust requested quantities to match available store stock before submitting</span>
              </span>
            ) : (
              <span>All quantities verified within available store stock</span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isCreating || isUpdating || hasStockError || lineItems.length === 0}
              onClick={handleSubmit}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all ${
                isCreating || isUpdating || hasStockError || lineItems.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-orange-500/20 cursor-pointer'
              }`}
            >
              <CheckCircle2 size={14} />
              <span>
                {isCreating || isUpdating
                  ? 'Saving...'
                  : editingRequest
                  ? 'Update Material Request'
                  : `Submit Material Request (${lineItems.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
