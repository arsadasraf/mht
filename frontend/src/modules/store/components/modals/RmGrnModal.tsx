'use client';

import React, { useState } from 'react';
import { X, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { addToast } from '../../../../store/uiSlice';

interface RmGrnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (data: any) => void;
}

export default function RmGrnModal({ isOpen, onClose, onSubmitSuccess }: RmGrnModalProps) {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);

  const [formData, setFormData] = useState({
    poNumber: '',
    vendorName: '',
    invoiceOrChallanNumber: '',
    challanDate: new Date().toISOString().split('T')[0],
    materialGrade: 'SS304',
    formType: 'SHEET_PLATE',
    heatNumber: '',
    mtcRef: '',
    dimensions: '',
    receivedWeightKg: 0,
    piecesCount: 1,
    binLocation: 'YARD-RM-01',
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
          message: 'Please provide a PO number to link this raw material inward.'
        })
      );
      return;
    }
    if (!formData.vendorName.trim()) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Please specify the vendor or supplier name.'
        })
      );
      return;
    }
    if (formData.receivedWeightKg <= 0 && formData.piecesCount <= 0) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Received weight or pieces count must be greater than zero.'
        })
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        category: 'RAW_MATERIAL',
        ...formData,
        inwardDate: new Date().toISOString()
      };

      if (onSubmitSuccess) {
        onSubmitSuccess(payload);
      }

      dispatch(
        addToast({
          type: 'success',
          message: `All set! Raw material GRN recorded with Heat #${formData.heatNumber || 'N/A'}.`
        })
      );
      onClose();
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: "We couldn't save this RM GRN right now. Please try again."
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
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                Raw Material (RM) Goods Receipt Note
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
                placeholder="Vendor company name"
                value={formData.vendorName}
                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vendor Challan / Invoice #
              </label>
              <input
                type="text"
                placeholder="DC-9921 or INV-541"
                value={formData.invoiceOrChallanNumber}
                onChange={(e) => setFormData({ ...formData, invoiceOrChallanNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Challan Date</label>
              <input
                type="date"
                value={formData.challanDate}
                onChange={(e) => setFormData({ ...formData, challanDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Material Grade / Spec</label>
              <select
                value={formData.materialGrade}
                onChange={(e) => setFormData({ ...formData, materialGrade: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              >
                <option value="SS304">SS 304 (Stainless Steel)</option>
                <option value="SS316L">SS 316L (Food / Chemical Grade)</option>
                <option value="MS_IS2062">Mild Steel (IS 2062 Grade E250)</option>
                <option value="EN8_EN9">EN8 / EN9 Medium Carbon Steel</option>
                <option value="EN24_EN31">EN24 / EN31 Alloy Steel</option>
                <option value="AL6061_T6">Aluminium 6061-T6</option>
                <option value="COPPER_BRASS">Electrolytic Copper / Brass</option>
                <option value="OTHER">Custom Grade</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Raw Form Type</label>
              <select
                value={formData.formType}
                onChange={(e) => setFormData({ ...formData, formType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              >
                <option value="SHEET_PLATE">Sheet / Plate</option>
                <option value="ROUND_BAR">Round Bar / Shaft</option>
                <option value="PIPE_TUBE">Seamless Pipe / Box Tube</option>
                <option value="STRUCTURAL">Angle / Channel / Beam</option>
                <option value="BLOCK_FORGING">Machined Block / Forging Blank</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Heat / Melt / Batch #
              </label>
              <input
                type="text"
                placeholder="HEAT-8841-A"
                value={formData.heatNumber}
                onChange={(e) => setFormData({ ...formData, heatNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mill Test Certificate (MTC) Ref
              </label>
              <input
                type="text"
                placeholder="MTC-2026-X8"
                value={formData.mtcRef}
                onChange={(e) => setFormData({ ...formData, mtcRef: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Received Dimensions
              </label>
              <input
                type="text"
                placeholder="e.g. 12mm x 1500mm x 3000mm or Dia 50mm x 3m"
                value={formData.dimensions}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Received Weight (Kg)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.receivedWeightKg || ''}
                onChange={(e) =>
                  setFormData({ ...formData, receivedWeightKg: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pieces / Plates Count</label>
              <input
                type="number"
                min="1"
                value={formData.piecesCount}
                onChange={(e) =>
                  setFormData({ ...formData, piecesCount: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Storage Yard / Rack Location</label>
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
                placeholder="Leave blank for General Raw Stock or enter PRJ-XXXX"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Receiving Remarks / Heat Notes
              </label>
              <textarea
                rows={2}
                placeholder="Surface condition, color coding, bundling remarks..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
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
              {isSubmitting ? 'Recording GRN...' : 'Log RM GRN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
