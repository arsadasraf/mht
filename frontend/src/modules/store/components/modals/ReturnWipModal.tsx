'use client';

import React, { useState } from 'react';
import { X, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useAppDispatch } from '../../../../store/hooks';
import { addToast } from '../../../../store/uiSlice';

interface ReturnWipModalProps {
  isOpen: boolean;
  item: any;
  onClose: () => void;
  onSubmitSuccess?: (data: any) => void;
}

export default function ReturnWipModal({
  isOpen,
  item,
  onClose,
  onSubmitSuccess
}: ReturnWipModalProps) {
  const dispatch = useAppDispatch();

  const [returnQty, setReturnQty] = useState(item?.issuedQty || 1);
  const [returnReason, setReturnReason] = useState('SURPLUS_LEFTOVER');
  const [destinationBucket, setDestinationBucket] = useState<'ACCEPTED_STORE' | 'QUARANTINE_REWORK'>('ACCEPTED_STORE');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (returnQty <= 0) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Return quantity must be greater than zero.'
        })
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        wipItemId: item.id || item._id,
        projectId: item.projectId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        returnQty,
        returnReason,
        destinationBucket,
        remarks,
        returnedAt: new Date().toISOString()
      };

      if (onSubmitSuccess) {
        onSubmitSuccess(payload);
      }

      dispatch(
        addToast({
          type: 'success',
          message: `All set! Returned ${returnQty} ${item.uom || 'units'} of ${item.itemName} back to Store.`
        })
      );
      onClose();
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: "We couldn't process this stock return right now. Please try again."
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
        {/* Header Ribbon */}
        <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                Return Floor Stock to Store
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
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Project Reference:</span>
              <span className="font-mono font-bold text-slate-800">{item.projectId}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Item:</span>
              <span className="font-semibold text-slate-900">{item.itemName} ({item.itemCode})</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Currently on Floor:</span>
              <span className="font-mono font-bold text-orange-600">{item.issuedQty || 0} {item.uom || 'NOS'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quantity to Return <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={item.issuedQty || 9999}
              required
              value={returnQty}
              onChange={(e) => setReturnQty(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-mono font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Return Reason</label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            >
              <option value="SURPLUS_LEFTOVER">Surplus / Extra Material Leftover</option>
              <option value="ENGINEERING_CHANGE">Engineering Change Order (ECO) Redesign</option>
              <option value="DAMAGED_REWORK">Defective / Requires Rework Inspection</option>
              <option value="WRONG_SPECIFICATION">Wrong Part Issued from Store</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Store Destination Bucket</label>
            <select
              value={destinationBucket}
              onChange={(e) => setDestinationBucket(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 font-semibold"
            >
              <option value="ACCEPTED_STORE">Bucket 3: Cleared in Store (Re-usable Inventory)</option>
              <option value="QUARANTINE_REWORK">Bucket 2: In-QC Quarantine (Requires Inspection)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Return Remarks</label>
            <textarea
              rows={2}
              placeholder="State condition of returned material..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
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
              {isSubmitting ? 'Returning...' : 'Confirm Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
