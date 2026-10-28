'use client';

import React, { useState } from 'react';
import { X, Award, CheckCircle2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { addToast } from '../../../../store/uiSlice';

interface FgReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (data: any) => void;
}

export default function FgReceiptModal({ isOpen, onClose, onSubmitSuccess }: FgReceiptModalProps) {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);

  const [formData, setFormData] = useState({
    projectId: activeProjectId || '',
    machineName: '',
    serialNumber: '',
    assemblyCellRef: 'CELL-01',
    pdiCertificateNumber: '',
    trialVerdict: 'FAT_CLEARED',
    stagingBay: 'BAY-FG-01',
    targetDispatchDate: '',
    officerRemarks: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId.trim()) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Please link this Finished Goods inward to a Project ID.'
        })
      );
      return;
    }
    if (!formData.machineName.trim()) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Please provide the machine or assembly name.'
        })
      );
      return;
    }
    if (!formData.serialNumber.trim()) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Equipment serial number or machine tag is required for FG inward.'
        })
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        category: 'FINISHED_GOODS',
        ...formData,
        inwardDate: new Date().toISOString()
      };

      if (onSubmitSuccess) {
        onSubmitSuccess(payload);
      }

      dispatch(
        addToast({
          type: 'success',
          message: `All set! Finished Goods receipt logged for ${formData.machineName} (${formData.serialNumber}).`
        })
      );
      onClose();
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: "We couldn't save this FG receipt right now. Please try again."
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
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                Finished Goods (FG) Inward Receipt
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
                Project / Work Order ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="PRJ-2026-XXXX"
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Machine Serial # / Equipment Tag <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="MH-ETO-2026-091"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono font-bold text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Machine / Sub-Assembly Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Automated High-Speed Precision Winding Machine"
                value={formData.machineName}
                onChange={(e) => setFormData({ ...formData, machineName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assembly Cell Sign-Off Ref</label>
              <select
                value={formData.assemblyCellRef}
                onChange={(e) => setFormData({ ...formData, assemblyCellRef: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              >
                <option value="CELL-01">Mechanical Integration Cell 1</option>
                <option value="CELL-02">Electrical Panel & Wiring Bay</option>
                <option value="CELL-03">Pneumatic & Piping Cell</option>
                <option value="CELL-TRIAL">Trial & Commissioning Bay</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                PDI / Clearance Certificate #
              </label>
              <input
                type="text"
                placeholder="PDI-CLR-2026-102"
                value={formData.pdiCertificateNumber}
                onChange={(e) => setFormData({ ...formData, pdiCertificateNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Trial Verdict Status</label>
              <select
                value={formData.trialVerdict}
                onChange={(e) => setFormData({ ...formData, trialVerdict: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-semibold text-emerald-700"
              >
                <option value="FAT_CLEARED">Factory Acceptance Test (FAT) Cleared</option>
                <option value="DRY_RUN_PASS">Dry Run Trial Passed</option>
                <option value="WET_RUN_PASS">Wet Run Production Simulation Passed</option>
                <option value="PENDING_PDI_SIGN">Pending Final Client Inspector Sign-off</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Store FG Staging Bay</label>
              <input
                type="text"
                value={formData.stagingBay}
                onChange={(e) => setFormData({ ...formData, stagingBay: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Dispatch Date</label>
              <input
                type="date"
                value={formData.targetDispatchDate}
                onChange={(e) => setFormData({ ...formData, targetDispatchDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Store Inward Officer Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Preservation status, crane lifting balance, protective wrapping check..."
                value={formData.officerRemarks}
                onChange={(e) => setFormData({ ...formData, officerRemarks: e.target.value })}
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
              {isSubmitting ? 'Recording...' : 'Accept FG into Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
