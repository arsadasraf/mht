'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Home,
  Cpu
} from 'lucide-react';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/authSlice';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              logo_alignment?: string;
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState('asrafali444u@gmail.com');
  const [password, setPassword] = useState('Admin@MH2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fixHint, setFixHint] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Standard Credentials Login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setFixHint('');

    try {
      const res = await fetch('/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw {
          message: data.message || 'Authentication failed.',
          fixHint: data.fixHint || 'Please check your credentials.'
        };
      }

      if (typeof window !== 'undefined') {
        if (data.accessToken) localStorage.setItem('mht_access_token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('mht_refresh_token', data.refreshToken);
        if (data.user) localStorage.setItem('mht_user', JSON.stringify(data.user));
      }

      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
      router.push('/crm/leads');
    } catch (err: unknown) {
      const errorObj = err as { message?: string; fixHint?: string };
      setErrorMsg(errorObj.message || 'Unable to connect to the authentication service.');
      setFixHint(errorObj.fixHint || 'Verify your network connection or administrator credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth SSO Handler
  const handleGoogleCredentialResponse = async (response: { credential: string }) => {
    if (!response || !response.credential) {
      setErrorMsg('No Google credential received.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setFixHint('');

    try {
      const res = await fetch('/api/v1/admin/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw {
          message: data.message || 'Google authentication failed.',
          fixHint: data.fixHint || 'Ensure your Google account matches the designated administrator email.'
        };
      }

      if (typeof window !== 'undefined') {
        if (data.accessToken) localStorage.setItem('mht_access_token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('mht_refresh_token', data.refreshToken);
        if (data.user) localStorage.setItem('mht_user', JSON.stringify(data.user));
      }

      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
      router.push('/crm/leads');
    } catch (err: unknown) {
      const errorObj = err as { message?: string; fixHint?: string };
      setErrorMsg(errorObj.message || 'Unable to authenticate with Google SSO.');
      setFixHint(errorObj.fixHint || 'Only pre-registered or authorized corporate Google accounts can sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mount Google Identity Services (GSI)
  useEffect(() => {
    const googleClientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      '784057626241-eish7vufabh0d4ttmi910enchmbo8rk5.apps.googleusercontent.com';

    const renderGoogleButton = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false
          });

          const btnContainer = document.getElementById('googleSignInContainer');
          if (btnContainer) {
            btnContainer.innerHTML = '';
            const containerWidth = Math.min(btnContainer.offsetWidth || 320, 360);
            window.google.accounts.id.renderButton(btnContainer, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: containerWidth > 200 ? containerWidth : 280
            });
          }
        } catch (e) {
          console.warn('GSI Render Error:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleButton;
      document.body.appendChild(script);
    }

    const handleResize = () => {
      if (window.google?.accounts?.id) {
        renderGoogleButton();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50 flex flex-col justify-between font-sans text-slate-800 select-none">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3 shadow-xs flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
              <Image
                src="/branding/mh_icon.png"
                alt="Machine House Logo"
                width={28}
                height={28}
                priority
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-slate-900 tracking-tight leading-tight group-hover:text-orange-600 transition-colors">
                MACHINE HOUSE TECHNOLOGIES
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-orange-600 uppercase tracking-widest leading-none mt-0.5">
                House of Innovations..... • Bengaluru, India
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-orange-600 text-xs font-semibold transition-colors shadow-2xs"
            >
              <Home size={13} />
              <span>Landing Page</span>
            </Link>

            <a
              href="https://www.machinehousetechnologies.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-orange-600 text-xs font-medium transition-colors shadow-2xs"
            >
              <span>Catalog Website</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </header>

      {/* Main Single-Screen Centered Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 max-w-6xl mx-auto w-full">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-4">
          {/* Card Header */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md mb-2">
              <Cpu size={24} />
            </div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Plant Execution &amp; ERP Portal
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure Operational Access • Machine House Technologies
            </p>
          </div>

          {/* Actionable Error Alert */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              <div className="flex items-center gap-2 font-semibold text-red-900 mb-1">
                <AlertCircle size={15} />
                <span>Authentication Alert</span>
              </div>
              <p className="leading-relaxed">{errorMsg}</p>
              {fixHint && (
                <div className="mt-2 pt-2 border-t border-red-200 text-[11px] text-red-700 font-medium">
                  Suggestion: {fixHint}
                </div>
              )}
            </div>
          )}

          {/* Form Login */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Corporate Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono"
                  placeholder="name@machinehouse.in"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <span>Sign In to Plant Portal</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* SSO Divider */}
          <div className="relative my-3 flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
              or Single Sign-On
            </span>
          </div>

          {/* Google OAuth GSI Button Container */}
          <div className="flex flex-col items-center justify-center min-h-[44px]">
            <div id="googleSignInContainer" className="flex justify-center w-full"></div>
          </div>
        </div>
      </main>

      {/* Compact Bottom Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 sm:px-8 text-xs text-slate-500 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-[11px]">
          <div>
            <span className="font-semibold text-slate-700">Machine House Technologies</span>
            <span className="mx-2">•</span>
            <span>Gottigere Works, Bengaluru - 560083</span>
          </div>
          <div className="text-slate-400">
            &copy; {new Date().getFullYear()} All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
