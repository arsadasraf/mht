'use client';

import React from 'react';
import { AlertTriangle, Trash2, HelpCircle, Loader2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Yes, proceed',
  cancelText = 'Keep it',
  variant = 'danger',
  isLoading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const iconBg = isDanger
    ? 'bg-red-50 text-red-600 border-red-200'
    : isWarning
    ? 'bg-amber-50 text-amber-600 border-amber-200'
    : 'bg-orange-50 text-orange-600 border-orange-200';

  const confirmBtnBg = isDanger
    ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-xs shadow-red-500/20'
    : isWarning
    ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-xs shadow-amber-500/20'
    : 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-xs shadow-orange-500/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>
              {isDanger ? (
                <Trash2 className="w-5 h-5" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <HelpCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 font-medium">Quick Confirmation</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conversational Informal Message */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${confirmBtnBg}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
