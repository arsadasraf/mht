'use client';

import React from 'react';
import Link from 'next/link';
import { useAppSelector } from '../../../store/hooks';
import {
  Inbox,
  FileSpreadsheet,
  Receipt,
  IndianRupee,
  Building2,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import {
  useGetPurchaseOrdersQuery,
  useGetVendorsQuery,
  useGetRfqsQuery,
  useGetQuotationsQuery,
  useGetBillsQuery
} from '../api/purchaseApi';

export default function PurchaseDashboardTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data: poData } = useGetPurchaseOrdersQuery({});
  const { data: vendorData } = useGetVendorsQuery({});
  const { data: rfqData } = useGetRfqsQuery({});
  const { data: quoteData } = useGetQuotationsQuery({});
  const { data: billData } = useGetBillsQuery({});

  const pos = poData?.purchaseOrders || [];
  const vendors = vendorData?.vendors || [];
  const rfqs = rfqData?.rfqs || [];
  const quotes = quoteData?.quotations || [];
  const bills = billData?.bills || [];

  const totalCommittedSpend = pos.reduce(
    (sum, p) => sum + (p.totalAmount?.baseAmountINR || 0),
    0
  );

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  const kpiCards = [
    {
      label: 'Outward RFQs',
      value: rfqs.length,
      icon: Inbox,
      href: '/purchase/rfq',
      color: 'text-sky-600 bg-sky-50'
    },
    {
      label: 'Inward Quotes',
      value: quotes.length,
      icon: FileSpreadsheet,
      href: '/purchase/quotations',
      color: 'text-amber-600 bg-amber-50'
    },
    {
      label: 'Outward POs',
      value: pos.length,
      icon: Receipt,
      href: '/purchase/orders',
      color: 'text-orange-600 bg-orange-50'
    },
    {
      label: 'Purchase Bills',
      value: bills.length,
      icon: IndianRupee,
      href: '/purchase/bills',
      color: 'text-emerald-600 bg-emerald-50'
    },
    {
      label: 'Vendors',
      value: vendors.length,
      icon: Building2,
      href: '/purchase/masters',
      color: 'text-purple-600 bg-purple-50'
    },
    {
      label: 'Committed Spend',
      value: formatCurrency(totalCommittedSpend),
      icon: TrendingUp,
      href: '/purchase/orders',
      color: 'text-emerald-700 bg-emerald-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900">
              Purchase Dashboard
            </h1>
            {activeProjectId && (
              <div className="text-xs font-mono font-bold text-orange-600 mt-0.5">
                {activeProjectId}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/purchase/rfq"
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-xs shadow-orange-500/20"
          >
            + Create RFQ
          </Link>
          <Link
            href="/purchase/orders"
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Purchase Orders
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {kpiCards.map((card, idx) => {
          const IconComponent = card.icon;
          return (
            <Link
              key={idx}
              href={card.href}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">
                  {card.label}
                </span>
                <div className={`w-8 h-8 rounded-xl ${card.color} flex items-center justify-center shrink-0`}>
                  <IconComponent size={16} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors">
                  {card.value}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pipeline Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sourcing Stages */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs lg:col-span-2">
          <div className="mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900">Sourcing Pipeline</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Link
              href="/purchase/rfq"
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-orange-300 transition-all"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase">Stage 1</div>
              <div className="text-xs font-bold text-slate-900 mt-1">Outward RFQ</div>
              <div className="mt-3 flex items-center text-xs font-semibold text-orange-600 gap-1">
                <span>View</span> <ArrowRight size={13} />
              </div>
            </Link>

            <Link
              href="/purchase/quotations"
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-orange-300 transition-all"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase">Stage 2</div>
              <div className="text-xs font-bold text-slate-900 mt-1">Inward Quotes</div>
              <div className="mt-3 flex items-center text-xs font-semibold text-orange-600 gap-1">
                <span>View</span> <ArrowRight size={13} />
              </div>
            </Link>

            <Link
              href="/purchase/orders"
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-orange-300 transition-all"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase">Stage 3</div>
              <div className="text-xs font-bold text-slate-900 mt-1">Outward PO</div>
              <div className="mt-3 flex items-center text-xs font-semibold text-orange-600 gap-1">
                <span>View</span> <ArrowRight size={13} />
              </div>
            </Link>

            <Link
              href="/purchase/bills"
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-orange-300 transition-all"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase">Stage 4</div>
              <div className="text-xs font-bold text-slate-900 mt-1">Purchase Bills</div>
              <div className="mt-3 flex items-center text-xs font-semibold text-orange-600 gap-1">
                <span>View</span> <ArrowRight size={13} />
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <h2 className="text-sm font-extrabold text-slate-900">Masters</h2>
          </div>
          <div className="space-y-3">
            <Link
              href="/purchase/price-list"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
            >
              <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600">
                Item Price List
              </span>
              <ArrowRight size={15} className="text-slate-400 group-hover:text-orange-600" />
            </Link>

            <Link
              href="/purchase/masters"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
            >
              <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600">
                Vendors
              </span>
              <ArrowRight size={15} className="text-slate-400 group-hover:text-orange-600" />
            </Link>

            <Link
              href="/purchase/masters?subtab=company"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
            >
              <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600">
                Company Profile
              </span>
              <ArrowRight size={15} className="text-slate-400 group-hover:text-orange-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
