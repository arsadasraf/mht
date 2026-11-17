'use client';

import React from 'react';
import { Lock, ShieldCheck, FileCode2, AlertCircle } from 'lucide-react';

export interface WorkOrderBomBadgeProps {
  isBomLocked?: boolean;
  bomStatus?: string | null;
  bomAttached?: boolean;
  attachedDrawingsCount?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export default function WorkOrderBomBadge({
  isBomLocked = false,
  bomStatus = 'NOT_ATTACHED',
  bomAttached = false,
  attachedDrawingsCount = 0,
  size = 'xs',
  className = ''
}: WorkOrderBomBadgeProps) {
  const normStatus = String(bomStatus || '').toUpperCase();
  const isLocked = isBomLocked || normStatus === 'LOCKED_FREEZE' || normStatus === 'FROZEN';
  const isPending = normStatus === 'PENDING_APPROVAL';
  const isAttached = bomAttached || isLocked || isPending || normStatus === 'DRAFT' || attachedDrawingsCount > 0;

  let badgeStyle = 'bg-slate-100 text-slate-500 border-slate-200';
  let label = 'No BOM';
  let IconComponent = AlertCircle;

  if (isLocked) {
    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold shadow-2xs';
    label = 'BOM Live';
    IconComponent = Lock;
  } else if (isPending) {
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
    label = 'BOM Pending';
    IconComponent = ShieldCheck;
  } else if (isAttached) {
    badgeStyle = 'bg-sky-50 text-sky-800 border-sky-300 font-bold';
    label = 'BOM Attached';
    IconComponent = FileCode2;
  }

  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-[10px] gap-1'
      : size === 'sm'
      ? 'px-2.5 py-1 text-xs gap-1.5'
      : 'px-3 py-1.5 text-xs gap-2 font-bold';

  const iconSize = size === 'xs' ? 11 : size === 'sm' ? 13 : 14;

  return (
    <span
      className={`inline-flex items-center rounded-lg border uppercase tracking-wider shrink-0 transition-colors ${sizeClasses} ${badgeStyle} ${className}`}
      title={
        isLocked
          ? 'BOM is approved and live across production'
          : isPending
          ? 'BOM is attached and awaiting manager approval'
          : isAttached
          ? 'BOM and drawings are attached'
          : 'No drawing or BOM attached yet'
      }
    >
      <IconComponent size={iconSize} className="shrink-0" />
      <span>{label}</span>
    </span>
  );
}

