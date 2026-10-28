'use client';

import React, { useState } from 'react';
import { X, Layers, CheckCircle2 } from 'lucide-react';
import { useAppDispatch } from '../../../../store/hooks';
import { addToast } from '../../../../store/uiSlice';

interface BinLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (data: any) => void;
}

export default function BinLocationModal({
  isOpen,
  onClose,
  onSubmitSuccess
}: BinLocationModalProps) {
  const dispatch = useAppDispatch();

  const [formData, setFormData] = useState({
    zone: 'BOUGHT_OUT_RACKS',
    binCode: '',
    aisle: 'A',
    rackNumber: '01',
    shelfLevel: 'L2',
    capacityQty: 100,
    capacityUom: 'NOS',
    description: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.binCode.trim()) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Please provide a unique Bin or Location Code.'
        })
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        binCode: formData.binCode.toUpperCase().trim(),
        createdAt: new Date().toISOString()
      };

      if (onSubmitSuccess) {
        onSubmitSuccess(payload);
      }

      dispatch(
        addToast({
          type: 'success',
          message: `All set! Storage location ${formData.binCode} added to Store Master.`
        })
      );
      onClose();
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: "We couldn't save this location right now. Please try again."
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
        {/* Header Ribbon Standard */}
        <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                Add Warehouse / Rack Location
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Storage Zone</label>
            <select
              value={formData.zone}
              onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            >
              <option value="RAW_MATERIAL_YARD">Raw Material Heavy Yard</option>
              <option value="BOUGHT_OUT_RACKS">Bought-Out Multi-Tier Racks</option>
              <option value="CONSUMABLES_CAGE">Consumables Secure Cage</option>
              <option value="FINISHED_GOODS_BAY">Finished Goods Staging Bay</option>
              <option value="SUB_ASSEMBLY_STAGING">WIP Sub-Assembly Staging</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Bin / Location Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. BIN-BO-A04 or YARD-RM-02"
              value={formData.binCode}
              onChange={(e) => setFormData({ ...formData, binCode: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:border-orange-500 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Aisle</label>
              <input
                type="text"
                value={formData.aisle}
                onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rack #</label>
              <input
                type="text"
                value={formData.rackNumber}
                onChange={(e) => setFormData({ ...formData, rackNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Shelf Level</label>
              <input
                type="text"
                value={formData.shelfLevel}
                onChange={(e) => setFormData({ ...formData, shelfLevel: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Max Capacity</label>
              <input
                type="number"
                min="1"
                value={formData.capacityQty}
                onChange={(e) =>
                  setFormData({ ...formData, capacityQty: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Capacity Unit</label>
              <select
                value={formData.capacityUom}
                onChange={(e) => setFormData({ ...formData, capacityUom: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
              >
                <option value="NOS">NOS</option>
                <option value="KG">KG</option>
                <option value="BOXES">BOXES</option>
                <option value="PALLETS">PALLETS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Location Notes</label>
            <input
              type="text"
              placeholder="e.g. Ground level heavy storage, crane accessible"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
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
              {isSubmitting ? 'Saving...' : 'Save Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
