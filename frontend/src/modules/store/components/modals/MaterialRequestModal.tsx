'use client';

import React, { useState } from 'react';
import { X, Wrench, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { addToast } from '../../../../store/uiSlice';

interface MaterialRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (data: any) => void;
}

export default function MaterialRequestModal({
  isOpen,
  onClose,
  onSubmitSuccess
}: MaterialRequestModalProps) {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);

  const [projectId, setProjectId] = useState(activeProjectId || '');
  const [workstation, setWorkstation] = useState('MECHANICAL_ASSEMBLY');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'LINE_STOP'>('NORMAL');
  const [requiredDate, setRequiredDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState([
    { itemCode: '', itemName: '', requestedQty: 1, uom: 'NOS', remarks: '' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const addItemRow = () => {
    setItems([...items, { itemCode: '', itemName: '', requestedQty: 1, uom: 'NOS', remarks: '' }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId.trim()) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Please link this material request to a Project ID.'
        })
      );
      return;
    }

    const invalidItems = items.some((it) => !it.itemName.trim() || it.requestedQty <= 0);
    if (invalidItems) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Please specify valid item names and positive quantities.'
        })
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        requestId: `MR-${Date.now().toString().slice(-5)}`,
        projectId,
        workstation,
        priority,
        requiredDate,
        notes,
        items,
        status: 'PENDING_ISSUE',
        createdAt: new Date().toISOString()
      };

      if (onSubmitSuccess) {
        onSubmitSuccess(payload);
      }

      dispatch(
        addToast({
          type: 'success',
          message: `All set! Floor Material Request raised for ${items.length} item(s).`
        })
      );
      onClose();
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: "We couldn't raise this material request right now. Please try again."
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8">
        {/* Header Ribbon Standard */}
        <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
              <Wrench size={18} />
            </div>
            <div>
              <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                Raise Floor Material Request (Requisition)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project / Work Order ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="PRJ-2026-XXXX"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assembly Cell / Workstation</label>
              <select
                value={workstation}
                onChange={(e) => setWorkstation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              >
                <option value="MECHANICAL_ASSEMBLY">Mechanical Assembly Station</option>
                <option value="ELECTRICAL_PANEL">Electrical Wiring Bay</option>
                <option value="PNEUMATIC_LINE">Pneumatic & Piping Station</option>
                <option value="SUB_ASSEMBLY">Sub-Assembly Line</option>
                <option value="TRIAL_BAY">Machine Trial Floor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:ring-2 font-bold ${
                  priority === 'LINE_STOP'
                    ? 'border-red-400 text-red-700 bg-red-50'
                    : priority === 'HIGH'
                    ? 'border-amber-400 text-amber-700 bg-amber-50'
                    : 'border-slate-200 text-slate-800'
                }`}
              >
                <option value="NORMAL">Normal Requirement</option>
                <option value="HIGH">High Priority</option>
                <option value="LINE_STOP">Line Stoppage (Urgent)</option>
              </select>
            </div>
          </div>

          {/* Dynamic Requested Items Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Requisition Items
              </span>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Plus size={14} /> Add Item Row
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-left w-36">Part / Item Code</th>
                    <th className="py-2.5 px-3 text-left">Description / Specification</th>
                    <th className="py-2.5 px-3 text-left w-24">Req. Qty</th>
                    <th className="py-2.5 px-3 text-left w-24">UOM</th>
                    <th className="py-2.5 px-3 text-left">Station Remarks</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="CODE-XXXX"
                          value={item.itemCode}
                          onChange={(e) => updateItem(idx, 'itemCode', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-orange-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="Item name / spec required"
                          required
                          value={item.itemName}
                          onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500 font-medium"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.requestedQty}
                          onChange={(e) =>
                            updateItem(idx, 'requestedQty', parseInt(e.target.value, 10) || 1)
                          }
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-center focus:outline-none focus:border-orange-500"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={item.uom}
                          onChange={(e) => updateItem(idx, 'uom', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                        >
                          <option value="NOS">NOS</option>
                          <option value="PCS">PCS</option>
                          <option value="SET">SET</option>
                          <option value="MTR">MTR</option>
                          <option value="KG">KG</option>
                          <option value="BOX">BOX</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="Sub-assembly note"
                          value={item.remarks}
                          onChange={(e) => updateItem(idx, 'remarks', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          disabled={items.length <= 1}
                          onClick={() => removeItemRow(idx)}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-30 p-1 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Required On Floor Date</label>
              <input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Floor Technician Notes</label>
              <input
                type="text"
                placeholder="Station reference or assembly notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              <CheckCircle2 size={15} />
              {isSubmitting ? 'Raising Request...' : 'Submit Material Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
