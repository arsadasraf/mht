'use client';

import React, { useState } from 'react';
import { X, Wrench, CheckCircle2 } from 'lucide-react';
import { useAppDispatch } from '../../../../store/hooks';
import { addToast } from '../../../../store/uiSlice';

interface ConsumableGrnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (data: any) => void;
}

export default function ConsumableGrnModal({
  isOpen,
  onClose,
  onSubmitSuccess
}: ConsumableGrnModalProps) {
  const dispatch = useAppDispatch();

  const [formData, setFormData] = useState({
    poNumber: '',
    vendorName: '',
    invoiceOrChallanNumber: '',
    subCategory: 'FASTENERS',
    itemName: '',
    specGrade: '',
    batchLotNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    packUnit: 'BOXES',
    packSize: '100 Pcs/Box',
    quantityReceived: 1,
    minReorderLevel: 5,
    binLocation: 'BIN-CNS-01',
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
          message: 'Please provide a PO number for this consumable inward.'
        })
      );
      return;
    }
    if (!formData.itemName.trim()) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Please specify the consumable item name.'
        })
      );
      return;
    }
    if (formData.quantityReceived <= 0) {
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
        category: 'CONSUMABLES',
        ...formData,
        inwardDate: new Date().toISOString()
      };

      if (onSubmitSuccess) {
        onSubmitSuccess(payload);
      }

      dispatch(
        addToast({
          type: 'success',
          message: `All set! Consumable GRN recorded for ${formData.itemName}.`
        })
      );
      onClose();
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: "We couldn't save this consumable GRN right now. Please try again."
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
              <Wrench size={18} />
            </div>
            <div>
              <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                Consumables Goods Receipt Note
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Consumable Sub-Category</label>
              <select
                value={formData.subCategory}
                onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              >
                <option value="FASTENERS">Fasteners (Bolts, Nuts, Washers)</option>
                <option value="LUBRICANTS_COOLANTS">Lubricants, Oils & Coolants</option>
                <option value="CUTTING_TOOLS">Cutting Tools, Carbide Inserts & Drills</option>
                <option value="WELDING">Welding Wire, Rods & Electrodes</option>
                <option value="ADHESIVES_SEALANTS">Adhesives, Epoxies & Sealants</option>
                <option value="INDUSTRIAL_GAS">Shielding Gas (Argon, CO2, O2)</option>
                <option value="SAFETY_PPE">Safety & PPE Supplies</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Item Specification / Size
              </label>
              <input
                type="text"
                placeholder="e.g. M10x40 Grade 10.9 Zinc Plated or ISO VG 68"
                value={formData.specGrade}
                onChange={(e) => setFormData({ ...formData, specGrade: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Item Name / Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. High-Tensile Socket Head Cap Screws or Hydraulic Oil Tellus S2 M 46"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Batch / Lot #</label>
              <input
                type="text"
                placeholder="LOT-2026-B81"
                value={formData.batchLotNumber}
                onChange={(e) => setFormData({ ...formData, batchLotNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Shelf Life / Expiry Date</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Packaging Unit</label>
              <select
                value={formData.packUnit}
                onChange={(e) => setFormData({ ...formData, packUnit: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              >
                <option value="BOXES">Boxes</option>
                <option value="PACKS">Packs / Pouches</option>
                <option value="CANS_BARRELS">Cans / Barrels (Litres)</option>
                <option value="CYLINDERS">Cylinders</option>
                <option value="KG">Kg (Kilograms)</option>
                <option value="PCS">Individual Pcs</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Inward Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantityReceived}
                onChange={(e) =>
                  setFormData({ ...formData, quantityReceived: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Min Reorder Alert Level</label>
              <input
                type="number"
                min="0"
                value={formData.minReorderLevel}
                onChange={(e) =>
                  setFormData({ ...formData, minReorderLevel: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Storage Bin / Cabinet Location</label>
              <input
                type="text"
                value={formData.binLocation}
                onChange={(e) => setFormData({ ...formData, binLocation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supplier Invoice / DC #
              </label>
              <input
                type="text"
                placeholder="INV-2026-CNS-88"
                value={formData.invoiceOrChallanNumber}
                onChange={(e) => setFormData({ ...formData, invoiceOrChallanNumber: e.target.value })}
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
              {isSubmitting ? 'Recording GRN...' : 'Log Consumable GRN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
