'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAppSelector } from '../../store/hooks';
import { useSendHeartbeatMutation } from '../../modules/admin/api/adminApi';

export default function HeartbeatTracker() {
  const pathname = usePathname();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [sendHeartbeat] = useSendHeartbeatMutation();
  const lastTabRef = useRef<string>('');

  useEffect(() => {
    if (!isAuthenticated) return;

    // Send heartbeat when user switches tabs or routes
    if (lastTabRef.current !== pathname) {
      lastTabRef.current = pathname;
      sendHeartbeat({ currentActiveTab: pathname }).catch(() => {});
    }

    // Periodic heartbeat every 60 seconds to track presence and usage time
    const interval = setInterval(() => {
      sendHeartbeat({ currentActiveTab: pathname }).catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, [pathname, isAuthenticated, sendHeartbeat]);

  return null;
}
