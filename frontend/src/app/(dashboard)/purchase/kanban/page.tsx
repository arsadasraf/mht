'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RedirectToProjectsKanban() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams?.toString();
    router.replace(`/purchase/projects/kanban${query ? `?${query}` : ''}`);
  }, [router, searchParams]);

  return (
    <div className="p-8 text-center text-xs text-slate-400 font-semibold">
      Redirecting to Procurement Kanban...
    </div>
  );
}

export default function PurchaseKanbanPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400 font-semibold">
          Redirecting to Procurement Kanban...
        </div>
      }
    >
      <RedirectToProjectsKanban />
    </Suspense>
  );
}


