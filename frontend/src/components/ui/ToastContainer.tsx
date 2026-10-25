'use client';

import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { removeToast } from '../../store/uiSlice';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.ui.toasts);

  useEffect(() => {
    if (toasts.length === 0) return;
    const latestToast = toasts[toasts.length - 1];
    const timer = setTimeout(() => {
      dispatch(removeToast(latestToast.id));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toasts, dispatch]);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-16 md:bottom-6 right-4 md:right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      aria-live="assertive"
    >
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let borderClass = 'border-emerald-300';
        let iconColor = 'text-emerald-600';
        let bgClass = 'bg-white';
        let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';

        if (toast.type === 'error') {
          Icon = AlertCircle;
          borderClass = 'border-red-300';
          iconColor = 'text-red-600';
          badgeBg = 'bg-red-50 text-red-700 border-red-200';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          borderClass = 'border-amber-300';
          iconColor = 'text-amber-600';
          badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
        } else if (toast.type === 'info') {
          Icon = Info;
          borderClass = 'border-sky-300';
          iconColor = 'text-sky-600';
          badgeBg = 'bg-sky-50 text-sky-700 border-sky-200';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-lg ${borderClass} ${bgClass} transition-all duration-200 animate-in slide-in-from-bottom-2`}
          >
            <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
              <Icon size={18} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-xs text-slate-900">
                  {toast.title || (toast.type === 'error' ? 'Action Failed' : 'Notification')}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${badgeBg} uppercase tracking-wider`}>
                  {toast.type}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed break-words">
                {toast.message}
              </p>
              {toast.fixHint && (
                <div className="mt-1.5 p-1.5 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-1">
                  <span className="font-semibold text-slate-700 flex-shrink-0">Action:</span>
                  <span>{toast.fixHint}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => dispatch(removeToast(toast.id))}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded -mr-1 -mt-1 cursor-pointer"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
