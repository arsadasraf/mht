'use client';

import React, { useState } from 'react';
import { X, Cpu, CheckCircle2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { addToast } from '../../../../store/uiSlice';

interface BoGrnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (data: any) => void;
}

export default function BoGrnModal({ isOpen, onClose, onSubmitSuccess }: BoGrnModalProps) {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);

  const [formData, setFormData] = useState({
    poNumber: '',
    vendorName: '',
    invoiceOrChallanNumber: '',
    challanDate: new Date().toISOString().split('T')[0],
    itemCode: '',
    itemName: '',
    brandMake: 'Siemens',
    modelNumber: '',
    serialNumbers: '',
    receivedQty: 1,
    uom: 'NOS',
    warrantyMonths: 12,
    sealIntact: true,
    binLocation: 'RACK-BO-01',
    projectId: activeProjectId || '',
    remarks: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.poNumber.trim()) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Please provide a PO number to link this bought-out item inward.'
        })
      );
      return;
    }
    if (!formData.itemName.trim()) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Please provide the component name or description.'
        })
      );
      return;
    }
    if (formData.receivedQty <= 0) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Received quantity must be at least 1.'
        })
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        category: 'BOUGHT_OUT',
        ...formData,
        inwardDate: new Date().toISOString()
      };

      if (onSubmitSuccess) {
        onSubmitSuccess(payload);
      }

      dispatch(
        addToast({
          type: 'success',
          message: `All set! Bought-out component GRN recorded for ${formData.itemName}.`
        })
      );
      onClose();
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: "We couldn't save this BO GRN right now. Please try again."
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
        {/* Header Ribbon Standard */}
        <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                Bought Out (BO) Goods Receipt Note
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Purchase Order # <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="PO-2026-XXXX"
                value={formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supplier / Vendor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Vendor name"
                value={formData.vendorName}
                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Make / Manufacturer Brand <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Siemens, Festo, THK, Schneider, SKF"
                value={formData.brandMake}
                onChange={(e) => setFormData({ ...formData, brandMake: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Model / Catalog Part #
              </label>
              <input
                type="text"
                placeholder="Manufacturer model / part #"
                value={formData.modelNumber}
                onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Component Name / Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Servo Motor 1.5kW 3000RPM with Brake or Pneumatic Cylinder 50x250"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Received Qty <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.receivedQty}
                onChange={(e) =>
                  setFormData({ ...formData, receivedQty: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unit of Measure (UOM)</label>
              <select
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              >
                <option value="NOS">NOS (Numbers)</option>
                <option value="PCS">PCS (Pieces)</option>
                <option value="SET">SET (Assembly Set)</option>
                <option value="MTR">MTR (Meters)</option>
                <option value="PAIR">PAIR</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Serial # / Barcode Tag
              </label>
              <input
                type="text"
                placeholder="SN-99841-A2 (comma separated if multiple)"
                value={formData.serialNumbers}
                onChange={(e) => setFormData({ ...formData, serialNumbers: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Warranty (Months)</label>
              <input
                type="number"
                min="0"
                value={formData.warrantyMonths}
                onChange={(e) =>
                  setFormData({ ...formData, warrantyMonths: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vendor Invoice / Challan #
              </label>
              <input
                type="text"
                placeholder="INV-2026-778"
                value={formData.invoiceOrChallanNumber}
                onChange={(e) => setFormData({ ...formData, invoiceOrChallanNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Storage Shelf / Bin Location</label>
              <input
                type="text"
                value={formData.binLocation}
                onChange={(e) => setFormData({ ...formData, binLocation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project Hard Allocation (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave blank for Common Store or specify PRJ-XXXX"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.sealIntact}
                  onChange={(e) => setFormData({ ...formData, sealIntact: e.target.checked })}
                  className="rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                />
                <span className="text-xs font-semibold text-slate-700">
                  OEM Factory Seal Intact & Zero Visible Physical Transit Damage
                </span>
              </label>
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
              {isSubmitting ? 'Recording GRN...' : 'Log BO GRN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
