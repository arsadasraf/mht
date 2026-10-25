'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Lock,
  ArrowRight,
  ExternalLink,
  MapPin,
  Phone,
  Sparkles,
  Globe
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50 flex flex-col justify-between font-sans text-slate-900 select-none antialiased selection:bg-orange-500 selection:text-white">
      {/* 1. Top Header: Basic Info & Quick Actions */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 shadow-xs flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Emblem & Corporate Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shadow-xs flex-shrink-0">
              <Image
                src="/branding/mh_icon.png"
                alt="Machine House Emblem"
                width={28}
                height={28}
                priority
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                MACHINE HOUSE TECHNOLOGIES
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-orange-600 uppercase tracking-widest leading-none mt-0.5">
                House of Innovations..... • Bengaluru Works
              </span>
            </div>
          </div>

          {/* Plant Status Indicator & Header Login Button */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Bengaluru Works Active</span>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all cursor-pointer"
            >
              <Lock size={14} />
              <span>Login to ERP</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Centered Executive Hero */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto w-full text-center">
        <div className="w-full space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-md p-3.5 flex items-center justify-center hover:scale-105 transition-transform">
              <Image
                src="/branding/mh_icon.png"
                alt="Machine House Technologies"
                width={54}
                height={54}
                priority
                className="object-contain"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold shadow-2xs">
              <Sparkles size={13} className="text-orange-500" />
              <span>Machine House - Winding Technologies • Est. 2016</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Enterprise Plant Execution <br />
              <span className="text-orange-600">&amp; Resource Planning Portal</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
              Internal operating system for precision coil winding machinery, transformer HV/LV automation, and custom SPM manufacturing.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 hover:-translate-y-0.5 transition-all cursor-pointer group"
            >
              <Lock size={16} />
              <span>Login to ERP Portal</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href="https://www.machinehousetechnologies.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-300 hover:border-orange-300 hover:bg-slate-50 text-slate-800 hover:text-orange-600 text-sm font-bold shadow-2xs transition-all cursor-pointer"
            >
              <Globe size={16} className="text-slate-500" />
              <span>Official Website</span>
              <ExternalLink size={14} className="text-slate-400" />
            </a>
          </div>
        </div>
      </main>

      {/* 3. Compact Industrial Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 px-4 sm:px-8 text-xs text-slate-500 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left text-[11px]">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1">
            <span className="font-extrabold text-slate-800">
              Machine House Technologies
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin size={12} className="text-orange-500" />
              <span>Gottigere, Bengaluru - 560083</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Phone size={12} className="text-orange-500" />
              <span className="font-mono text-slate-700 font-semibold">+91 8047640100</span>
            </span>
            <span>•</span>
            <span>Director: Mr. M.P. Roshan</span>
          </div>

          <div className="text-slate-400">
            &copy; {new Date().getFullYear()} All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
