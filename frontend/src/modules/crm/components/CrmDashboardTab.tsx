'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Inbox,
  Award,
  Wallet,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Layers,
  Sparkles,
  Building2,
  Calendar,
  Filter,
  User,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useGetCrmOverviewQuery } from '../api/crmApi';

// Indian Numbering Formatter (Lakhs & Crores)
const formatINR = (amount?: number | string): string => {
  const num = Number(amount || 0);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
};

const getProgressBarWidth = (pct: number): string => {
  if (pct >= 100) return 'w-full';
  if (pct >= 90) return 'w-11/12';
  if (pct >= 80) return 'w-4/5';
  if (pct >= 75) return 'w-3/4';
  if (pct >= 66) return 'w-2/3';
  if (pct >= 60) return 'w-3/5';
  if (pct >= 50) return 'w-1/2';
  if (pct >= 40) return 'w-2/5';
  if (pct >= 33) return 'w-1/3';
  if (pct >= 25) return 'w-1/4';
  if (pct >= 20) return 'w-1/5';
  if (pct >= 15) return 'w-1/6';
  if (pct >= 10) return 'w-1/12';
  if (pct > 0) return 'w-2';
  return 'w-0';
};

const STAGE_CONFIG = [
  { key: 'NEW', label: 'New Enquiries', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'TECHNICAL_REVIEW', label: 'Technical Review', color: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
  { key: 'QUOTE_PREPARED', label: 'Quotation Prepared', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'NEGOTIATION', label: 'Commercial Negotiation', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'WON', label: 'Customer PO Won', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'LOST', label: 'Closed (Lost)', color: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' }
];

export default function CrmDashboardTab() {
  // Filter States
  const [dateScope, setDateScope] = useState('this_month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('ALL');
  const [source, setSource] = useState('ALL');

  // Query params for API
  const queryParams = {
    dateScope: dateScope !== 'custom' ? dateScope : undefined,
    fromDate: dateScope === 'custom' && fromDate ? fromDate : undefined,
    toDate: dateScope === 'custom' && toDate ? toDate : undefined,
    assignedTo: assignedTo !== 'ALL' ? assignedTo : undefined,
    source: source !== 'ALL' ? source : undefined
  };

  const { data, isLoading, isError, refetch } = useGetCrmOverviewQuery(queryParams);

  const rawData = data as unknown as {
    metrics?: {
      totalLeads?: number;
      openPipelineValueINR?: number;
      wonValueINR?: number;
      winRatePercent?: number;
      avgDealSizeINR?: number;
      indiaMartCount?: number;
      totalQuotations?: number;
    };
    stageDistribution?: Record<string, { count?: number; value?: number; percentage?: number }>;
    sourceDistribution?: Record<string, number>;
    machinePopularity?: Record<string, number>;
    stalledAlerts?: Array<{ _id: string; leadNumber: string; customerName: string; companyName: string; stage: string; daysInStage: number }>;
  };

  const metrics = rawData?.metrics || {
    totalLeads: 0,
    openPipelineValueINR: 0,
    wonValueINR: 0,
    winRatePercent: 0,
    avgDealSizeINR: 0,
    indiaMartCount: 0,
    totalQuotations: 0
  };

  const stageDistribution = rawData?.stageDistribution || {};
  const sourceDistribution = rawData?.sourceDistribution || {};
  const machinePopularity = rawData?.machinePopularity || {};
  const stalledAlerts = rawData?.stalledAlerts || [];

  return (
    <div className="space-y-6">
      {/* 1. Focused Single-Line Action & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Date Scope Quick Pills (Segmented Button Pills) */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: 'Custom' }
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDateScope(p.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateScope === p.id
                  ? 'bg-orange-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Range Inline Inputs when Custom is selected */}
        {dateScope === 'custom' && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-orange-50/70 border border-orange-200 rounded-xl text-xs">
            <span className="text-orange-900 font-bold">Range:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-0.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-0.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
            />
          </div>
        )}

        {/* Right: Sales Rep Filter, Source Filter, Refresh & Navigation Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sales Rep Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition-colors">
            <User size={13} className="text-orange-500 flex-shrink-0" />
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-hidden cursor-pointer text-xs pr-1"
            >
              <option value="ALL">All Sales Representatives</option>
              <option value="SELF">Assigned to Me</option>
              <option value="UNASSIGNED">Unassigned Leads</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition-colors">
            <Filter size={13} className="text-orange-500 flex-shrink-0" />
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-hidden cursor-pointer text-xs pr-1"
            >
              <option value="ALL">All Sources</option>
              <option value="INDIAMART">IndiaMART</option>
              <option value="TRADEINDIA">TradeIndia</option>
              <option value="DIRECT_EXHIBITION">Exhibition / Direct</option>
              <option value="DIRECT_PHONE">Direct Phone Call</option>
              <option value="WEBSITE">Website Portal</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => refetch()}
            title="Refresh Metrics"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw size={13} className={isLoading ? 'animate-spin text-orange-500' : 'text-slate-500'} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Go to Leads & Inquiry Link */}
          <Link
            href="/crm/leads"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Inbox size={14} />
            <span>Leads &amp; Inquiry</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Executive KPI Chips (5 Industrial Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total Enquiries */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between hover:border-orange-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Enquiries
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Inbox size={15} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.totalLeads}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
              <span>IndiaMART:</span>
              <strong className="text-slate-700">{metrics.indiaMartCount || 0}</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Active Open Pipeline */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between hover:border-orange-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Pipeline
            </span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatINR(metrics.openPipelineValueINR)}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
              <span>Across active technical quotes</span>
            </div>
          </div>
        </div>

        {/* Card 3: Orders Won (Customer POs) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between hover:border-orange-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Orders Won (POs)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award size={15} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">
              {formatINR(metrics.wonValueINR)}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-700 font-semibold">
              <CheckCircle2 size={12} />
              <span>Converted to Projects</span>
            </div>
          </div>
        </div>

        {/* Card 4: Win Rate % */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between hover:border-orange-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Conversion Rate
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet size={15} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.winRatePercent || 0}%
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
              <span>Avg Order:</span>
              <strong className="text-slate-700">{formatINR(metrics.avgDealSizeINR)}</strong>
            </div>
          </div>
        </div>

        {/* Card 5: Quotations Sent */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between hover:border-orange-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Quotations Sent
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.totalQuotations || 0}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-700 font-semibold">
              <span>With Company Master Letterhead</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Funnel Stages Breakdown (6 Operational Stages) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={17} className="text-orange-500" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Pipeline Stage Funnel &amp; Volume Breakdown
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-400 font-mono">
            Scope: {dateScope.toUpperCase().replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {STAGE_CONFIG.map((stage) => {
            const stageData = stageDistribution[stage.key] || { count: 0, value: 0, percentage: 0 };
            return (
              <div
                key={stage.key}
                className={`p-3.5 rounded-xl border ${stage.border} ${stage.bg} flex flex-col justify-between transition-all`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {stageData.percentage || 0}%
                  </span>
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900">
                    {stageData.count || 0}
                  </div>
                  <div className={`text-xs font-bold leading-tight mt-0.5 ${stage.text}`}>
                    {stage.label}
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 mt-1">
                    {formatINR(stageData.value || 0)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Bottom Grid: Lead Sources & Machine Catalog Popularity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Source Channels */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-orange-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Enquiry Acquisition Channels
              </h3>
            </div>
            <Link
              href="/crm/masters"
              className="text-xs text-orange-600 font-bold hover:underline"
            >
              Configure APIs &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { label: 'IndiaMART Marketplace', key: 'INDIAMART', color: 'bg-emerald-500' },
              { label: 'TradeIndia B2B', key: 'TRADEINDIA', color: 'bg-blue-500' },
              { label: 'Exhibitions & Direct Works Visits', key: 'DIRECT_EXHIBITION', color: 'bg-purple-500' },
              { label: 'Direct Phone & Reference', key: 'DIRECT_PHONE', color: 'bg-amber-500' },
              { label: 'Website Inquiries', key: 'WEBSITE', color: 'bg-orange-500' }
            ].map((src) => {
              const count = sourceDistribution[src.key] || 0;
              const total = metrics.totalLeads || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={src.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-700">{src.label}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`${src.color} h-full rounded-full transition-all ${getProgressBarWidth(pct)}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Inquired Machine Models */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-orange-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Top Inquired Machine Models
              </h3>
            </div>
            <Link
              href="/crm/masters"
              className="text-xs text-orange-600 font-bold hover:underline"
            >
              Product Catalog &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { code: 'MHT-2100', name: 'Table Top CNC Coil Winder (0.02 - 1.6mm)', count: machinePopularity['MHT-2100'] || 0 },
              { code: 'AGI-0815', name: 'Heavy Transformer HV/LV Winder (up to 1500mm)', count: machinePopularity['AGI-0815'] || 0 },
              { code: 'AFW-0632', name: 'Automatic Foil & Strip Winding Machine', count: machinePopularity['AFW-0632'] || 0 },
              { code: 'MHT-1100', name: 'Digital Stepper Coil Winding Machine', count: machinePopularity['MHT-1100'] || 0 },
              { code: 'AS-150', name: '4-Axis Automatic Stator Needle Winder', count: machinePopularity['AS-150'] || 0 }
            ].map((machine) => (
              <div
                key={machine.code}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 font-mono">{machine.code}</span>
                  <span className="text-slate-500 ml-2">{machine.name}</span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-orange-100 text-orange-700 font-bold font-mono">
                  {machine.count} inqs
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
