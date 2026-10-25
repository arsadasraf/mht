'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import TabNav from '../../components/layout/TabNav';
import BottomTabBar from '../../components/layout/BottomTabBar';
import MobileModuleDrawer from '../../components/layout/MobileModuleDrawer';
import MoreSheet from '../../components/layout/MoreSheet';
import ToastContainer from '../../components/ui/ToastContainer';
import HeartbeatTracker from '../../components/layout/HeartbeatTracker';

import RouteGuard from '../../components/layout/RouteGuard';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const moduleSlug = segments[0] || 'crm';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Header currentModule={moduleSlug} />

      <div className="flex flex-1 min-w-0">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <TabNav moduleSlug={moduleSlug} />

          <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-8 min-w-0 max-w-full">
            <RouteGuard>{children}</RouteGuard>
          </main>
        </div>
      </div>

      {/* Global In-App Toast System */}
      <ToastContainer />

      {/* Online Presence & Tab Heartbeat Monitor */}
      <HeartbeatTracker />

      {/* Mobile & Tablet Native Navigation Overlays */}
      <BottomTabBar moduleSlug={moduleSlug} />
      <MobileModuleDrawer />
      <MoreSheet moduleSlug={moduleSlug} />
    </div>
  );
}
