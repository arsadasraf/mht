'use client';

import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setCredentials, clearCredentials } from '../../store/authSlice';

export default function AuthRehydrator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (typeof window === 'undefined') return;

    const storedToken = localStorage.getItem('mht_access_token');
    const storedUserStr = localStorage.getItem('mht_user');

    // 1. Instant rehydration from localStorage
    if (storedToken && storedUserStr) {
      try {
        const storedUser = JSON.parse(storedUserStr);
        dispatch(setCredentials({ user: storedUser, accessToken: storedToken }));
      } catch {
        // invalid JSON
      }
    }

    // 2. Validate / revalidate session with /api/v1/admin/auth/me
    fetch('/api/v1/admin/auth/me', {
      headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
      credentials: 'include'
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Session check failed');
      })
      .then((data) => {
        if (data.success && data.user) {
          if (data.accessToken) {
            localStorage.setItem('mht_access_token', data.accessToken);
          }
          localStorage.setItem('mht_user', JSON.stringify(data.user));
          dispatch(
            setCredentials({
              user: data.user,
              accessToken: data.accessToken || storedToken || undefined
            })
          );
        }
      })
      .catch(() => {
        // If storedToken was missing or expired, attempt refresh using HttpOnly cookie or stored token
        const refreshToken = localStorage.getItem('mht_refresh_token');
        fetch('/api/v1/admin/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(refreshToken ? { refreshToken } : {}),
          credentials: 'include'
        })
          .then((r) => r.json())
          .then((refData) => {
            if (refData.success && refData.accessToken) {
              localStorage.setItem('mht_access_token', refData.accessToken);
              if (refData.refreshToken) {
                localStorage.setItem('mht_refresh_token', refData.refreshToken);
              }
              if (refData.user) {
                localStorage.setItem('mht_user', JSON.stringify(refData.user));
              }
              dispatch(setCredentials({ user: refData.user, accessToken: refData.accessToken }));
            }
          })
          .catch(() => {});
      });
  }, [dispatch]);

  return null;
}
