'use client';

import React, { Suspense } from 'react';
import PurchaseProjectsTab from '../../../../../modules/purchase/components/PurchaseProjectsTab';

export default function PurchaseProjectsKanbanPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400 font-semibold">
          Loading Procurement Kanban Board...
        </div>
      }
    >
      <PurchaseProjectsTab initialSubTab="kanban" />
    </Suspense>
  );
}

