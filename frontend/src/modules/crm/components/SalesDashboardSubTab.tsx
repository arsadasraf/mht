'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  FileSpreadsheet,
  PackageCheck,
  Clock,
  Truck,
  Calendar,
  FileText,
  Search,
  RotateCcw,
  Eye,
  X,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Building2,
  Info
} from 'lucide-react';
import {
  useGetCustomerPosQuery,
  useGetCustomersQuery,
  useGetLeadsQuery
} from '../api/crmApi';

export default function SalesDashboardSubTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [previewPo, setPreviewPo] = useState<any | null>(null);

  // Queries
  const { data: posData, isLoading: isLoadingPos } = useGetCustomerPosQuery({});
  const { data: customersData, isLoading: isLoadingCustomers } = useGetCustomersQuery({});
  const { data: leadsData, isLoading: isLoadingLeads } = useGetLeadsQuery({});

  const customerPos = useMemo(() => posData?.customerPos || [], [posData]);
  const customers = useMemo(() => customersData?.customers || [], [customersData]);
  const leads = useMemo(() => leadsData?.leads || [], [leadsData]);

  // Today's Date formatted
  const reportingDateStr = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  // Flatten PO line items into order tracking rows
  const orderLines = useMemo(() => {
    const lines: Array<{
      id: string;
      poId: string;
      poNumber: string;
      customerName: string;
      companyName: string;
      productCode: string;
      productDescription: string;
      quantity: number;
      uom: string;
      dispatchDate: string | null;
      status: string;
      statusLabel: 'Dispatch planned' | 'Pending schedule' | 'PO awaited' | 'In Production' | 'Stock';
      rawPo: any;
    }> = [];

    customerPos.forEach((po: any) => {
      const cust = po.companyName || po.customerName || 'Customer';
      const dispDate = po.deliveryCommitmentDate || po.deliveryDueDate || null;

      // Determine clean status label
      let statusLabel: 'Dispatch planned' | 'Pending schedule' | 'PO awaited' | 'In Production' | 'Stock' =
        'Pending schedule';

      if (po.status === 'DISPATCHED' || (dispDate && po.status !== 'CANCELLED')) {
        statusLabel = 'Dispatch planned';
      } else if (po.status === 'RECEIVED' || po.status === 'PENDING_ADVANCE') {
        statusLabel = 'PO awaited';
      } else if (po.status === 'IN_PROGRESS' || po.status === 'WORK_ORDER_CREATED') {
        statusLabel = 'In Production';
      } else if (po.status === 'COMMISSIONED') {
        statusLabel = 'Stock';
      }

      if (Array.isArray(po.items) && po.items.length > 0) {
        po.items.forEach((it: any, idx: number) => {
          lines.push({
            id: `${po._id || po.id}-${idx}`,
            poId: po._id || po.id,
            poNumber: po.poNumber || po.customerPoNumber || `PO-${idx + 1}`,
            customerName: po.customerName || cust,
            companyName: cust,
            productCode: it.modelCode || it.itemCode || 'MHT-WND',
            productDescription: it.description || it.specifications || 'Precision Coil Winding Machine',
            quantity: Number(it.quantity) || 1,
            uom: it.uom || 'Nos',
            dispatchDate: dispDate,
            status: po.status,
            statusLabel,
            rawPo: po
          });
        });
      } else {
        lines.push({
          id: `${po._id || po.id}-0`,
          poId: po._id || po.id,
          poNumber: po.poNumber || po.customerPoNumber || 'PO-RECORD',
          customerName: po.customerName || cust,
          companyName: cust,
          productCode: 'MHT-AUTO',
          productDescription: po.technicalSpecifications || 'Automated Winding Equipment System',
          quantity: 1,
          uom: 'Nos',
          dispatchDate: dispDate,
          status: po.status,
          statusLabel,
          rawPo: po
        });
      }
    });

    // Also include Won Leads awaiting formal PO as "PO awaited" rows
    const wonLeadsAwaitingPo = leads.filter(
      (l: any) => (l.stage === 'WON' || l.stage === 'QUOTE_PREPARED') && !l.convertedProjectId
    );
    wonLeadsAwaitingPo.forEach((lead: any, lIdx: number) => {
      const cust = lead.companyName || lead.customerName || 'Prospective Customer';
      const firstProd = lead.products?.[0];
      lines.push({
        id: `lead-await-${lead._id || lead.id || lIdx}`,
        poId: lead._id || lead.id,
        poNumber: lead.leadNumber || 'ENQ-WON',
        customerName: lead.customerName || cust,
        companyName: cust,
        productCode: firstProd?.modelCode || 'MHT-EST',
        productDescription: firstProd?.modelName || lead.notes || 'Quoted Precision Winding Machinery',
        quantity: Number(firstProd?.quantity) || 1,
        uom: 'Nos',
        dispatchDate: null,
        status: 'PO_AWAITED',
        statusLabel: 'PO awaited',
        rawPo: {
          poNumber: 'Formal PO Awaited',
          customerName: cust,
          companyName: cust,
          poDate: lead.createdAt,
          leadRef: lead
        }
      });
    });

    return lines;
  }, [customerPos, leads]);

  // Aggregated KPIs
  const totalCustomerRecords = useMemo(() => {
    if (customers.length > 0) return customers.length;
    const uniqueCusts = new Set(customerPos.map((p: any) => p.companyName || p.customerName).filter(Boolean));
    return uniqueCusts.size || 0;
  }, [customers, customerPos]);

  const totalOrderLines = orderLines.length;

  const totalQuantity = useMemo(() => {
    return orderLines.reduce((sum, line) => sum + (line.quantity || 1), 0);
  }, [orderLines]);

  const countPoAwaited = useMemo(() => {
    return orderLines.filter((l) => l.statusLabel === 'PO awaited').length;
  }, [orderLines]);

  const countDispatchPlanned = useMemo(() => {
    return orderLines.filter((l) => l.statusLabel === 'Dispatch planned').length;
  }, [orderLines]);

  const countPendingSchedule = useMemo(() => {
    return orderLines.filter((l) => l.statusLabel === 'Pending schedule' || l.statusLabel === 'In Production').length;
  }, [orderLines]);

  const countStock = useMemo(() => {
    return orderLines.filter((l) => l.statusLabel === 'Stock').length;
  }, [orderLines]);

  // Upcoming Dispatches (Sorted by earliest dispatch date)
  const upcomingDispatches = useMemo(() => {
    const withDates = orderLines.filter((l) => l.dispatchDate);
    withDates.sort((a, b) => {
      const tA = new Date(a.dispatchDate!).getTime();
      const tB = new Date(b.dispatchDate!).getTime();
      return tA - tB;
    });
    return withDates.slice(0, 5);
  }, [orderLines]);

  // Filtered Table Rows
  const filteredLines = useMemo(() => {
    return orderLines.filter((line) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matches =
          line.customerName?.toLowerCase().includes(term) ||
          line.companyName?.toLowerCase().includes(term) ||
          line.productCode?.toLowerCase().includes(term) ||
          line.productDescription?.toLowerCase().includes(term) ||
          line.poNumber?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      if (statusFilter !== 'ALL') {
        if (line.statusLabel !== statusFilter) return false;
      }

      return true;
    });
  }, [orderLines, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. MARKETING / SALES DEPARTMENT HEADER BAR              */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Marketing Department</span>
            <span className="text-slate-300 font-normal">|</span>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200">
              ERP Overview
            </span>
          </h2>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Machine House - Winding Technologies (&ldquo;House of Innovations.....&rdquo;)
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700">
          <Calendar size={14} className="text-orange-500" />
          <span>Reporting date: {reportingDateStr}</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TOP 4 EXECUTIVE KPI CARDS (Orange Circular Icons)     */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: CUSTOMER RECORDS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-orange-500/30">
              <Users size={22} />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Customer Records
              </span>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                {isLoadingCustomers ? '...' : totalCustomerRecords}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Customer master entries supplied
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
        </div>

        {/* Card 2: ORDER / STOCK LINES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-orange-500/30">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Order / Stock Lines
              </span>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                {isLoadingPos ? '...' : totalOrderLines}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Listed tracking rows
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
        </div>

        {/* Card 3: TOTAL QUANTITY */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-orange-500/30">
              <PackageCheck size={22} />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Total Quantity
              </span>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                {isLoadingPos ? '...' : totalQuantity}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Units across listed rows
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
        </div>

        {/* Card 4: PO AWAITED */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-orange-500/30">
              <Clock size={22} />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                PO Awaited
              </span>
              <div className="text-2xl font-extrabold text-slate-900 leading-tight">
                {isLoadingPos ? '...' : countPoAwaited}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Marked &ldquo;Not Yet Received&rdquo;
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MIDDLE SECTION: ORDER SNAPSHOT & DISPATCH PIPELINE    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (5 Cols): Order Status Snapshot */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-orange-500" />
              <span>Order status snapshot</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Based on the supplied order-tracking records
            </p>
          </div>

          <div className="space-y-4 py-2">
            {/* Row 1: Dispatch planned */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700">Dispatch planned</span>
                <span className="font-mono font-bold text-slate-900">{countDispatchPlanned}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${totalOrderLines > 0 ? (countDispatchPlanned / totalOrderLines) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Row 2: Pending schedule */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700">Pending schedule</span>
                <span className="font-mono font-bold text-slate-900">{countPendingSchedule}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${totalOrderLines > 0 ? (countPendingSchedule / totalOrderLines) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Row 3: PO awaited */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700">PO awaited</span>
                <span className="font-mono font-bold text-slate-900">{countPoAwaited}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${totalOrderLines > 0 ? (countPoAwaited / totalOrderLines) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Row 4: Stock */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700">Stock</span>
                <span className="font-mono font-bold text-slate-900">{countStock}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-600 rounded-full transition-all duration-300"
                  style={{
                    width: `${totalOrderLines > 0 ? (countStock / totalOrderLines) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action note at bottom */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-900 font-medium">
            <Info size={16} className="text-amber-600 shrink-0" />
            <span>Action: Confirm missing dispatch and handover dates.</span>
          </div>
        </div>

        {/* Right Column (7 Cols): Dispatch & Handover Pipeline */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Truck size={16} className="text-orange-500" />
              <span>Dispatch &amp; handover pipeline</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Planned dates currently present in the source
            </p>
          </div>

          {/* 3 Metric Tiles Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{countDispatchPlanned}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Dispatch planned</div>
              </div>
              <Truck size={18} className="text-sky-500" />
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{countPendingSchedule}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Schedule pending</div>
              </div>
              <Calendar size={18} className="text-orange-500" />
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-2xl font-extrabold text-slate-900">{countPoAwaited}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">PO awaited</div>
              </div>
              <FileText size={18} className="text-red-500" />
            </div>
          </div>

          {/* Upcoming Dispatches List */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar size={13} className="text-orange-500" />
                <span>Upcoming dispatches</span>
              </h4>
              <Link
                href="/crm/customer-po"
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              {upcomingDispatches.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No upcoming dispatches with scheduled commitment dates.
                </div>
              ) : (
                upcomingDispatches.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setPreviewPo(item.rawPo)}
                    className="p-3 flex items-center justify-between text-xs hover:bg-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="font-mono text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 shrink-0">
                        {item.dispatchDate
                          ? new Date(item.dispatchDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'TBD'}
                      </span>
                      <span className="font-bold text-slate-900 truncate">
                        {item.companyName}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium truncate max-w-xs text-right pl-2">
                      {item.productCode} • {item.productDescription}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. BOTTOM SECTION: ORDER BOOKING TRACKER — KEY LINES     */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-orange-500" />
              <span>Order booking tracker — key lines</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Source: uploaded order tracker and live customer purchase orders
            </p>
          </div>

          {/* In-Line Search & Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer, model, PO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-orange-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Dispatch planned">Dispatch planned</option>
              <option value="Pending schedule">Pending schedule</option>
              <option value="In Production">In Production</option>
              <option value="PO awaited">PO awaited</option>
              <option value="Stock">Stock</option>
            </select>

            {(searchTerm || statusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                title="Reset filters"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Product Code</th>
                  <th className="py-3 px-4">Product Description</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4">Dispatch Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {isLoadingPos ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading order booking tracker...
                    </td>
                  </tr>
                ) : filteredLines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No order booking lines found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredLines.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <button
                          onClick={() => setPreviewPo(row.rawPo)}
                          className="text-left font-bold text-slate-900 hover:text-orange-600 transition-colors cursor-pointer truncate max-w-xs block"
                        >
                          {row.companyName}
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          {row.productCode}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700 max-w-sm truncate">
                        {row.productDescription}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                        {row.quantity}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-800">
                        {row.dispatchDate ? (
                          new Date(row.dispatchDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            row.statusLabel === 'Dispatch planned'
                              ? 'bg-sky-50 text-sky-700 border-sky-300'
                              : row.statusLabel === 'PO awaited'
                              ? 'bg-red-50 text-red-700 border-red-300'
                              : row.statusLabel === 'In Production'
                              ? 'bg-orange-50 text-orange-700 border-orange-300'
                              : row.statusLabel === 'Stock'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {row.statusLabel}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setPreviewPo(row.rawPo)}
                          className="p-1 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-slate-100 transition-colors"
                          title="Preview Order Details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div className="flex items-center gap-2 text-xs text-slate-400 italic pt-1">
          <Info size={13} className="shrink-0" />
          <span>Blank dates remain unassigned in source. Please verify before operational use.</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. CLICKABLE ROW PREVIEW DOSSIER MODAL                   */}
      {/* ======================================================== */}
      {previewPo && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Ribbon Header with Amber Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {previewPo.companyName || previewPo.customerName}
                  </h3>
                  <p className="text-[11px] font-mono text-orange-600 font-bold">
                    {previewPo.poNumber || previewPo.customerPoNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/crm/customer-po"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>Customer POs</span>
                </Link>
                <button
                  onClick={() => setPreviewPo(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Properties Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    PO Date
                  </span>
                  <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                    {previewPo.poDate
                      ? new Date(previewPo.poDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : '—'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Commitment Date
                  </span>
                  <div className="text-xs font-mono font-bold text-orange-600 mt-0.5">
                    {previewPo.deliveryCommitmentDate
                      ? new Date(previewPo.deliveryCommitmentDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : 'Not Scheduled'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Status
                  </span>
                  <div className="text-xs font-bold mt-0.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {previewPo.status || 'RECEIVED'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Total Value
                  </span>
                  <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                    {previewPo.totalAmount?.amount
                      ? `₹${Number(previewPo.totalAmount.amount).toLocaleString('en-IN')}`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Items List */}
              {Array.isArray(previewPo.items) && previewPo.items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Machine Order Line Items
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {previewPo.items.map((it: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">
                            {it.modelCode && <span className="font-mono text-orange-600 mr-2">{it.modelCode}</span>}
                            <span>{it.description}</span>
                          </div>
                          {it.specifications && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{it.specifications}</p>
                          )}
                        </div>
                        <div className="text-right font-mono font-bold text-slate-900 pl-4 shrink-0">
                          {it.quantity} {it.uom || 'Nos'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit Trail */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Audit Trail
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Created By
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      {previewPo.createdByName || 'Marketing & Sales User'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {previewPo.createdAt
                        ? new Date(previewPo.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Initial Registration'}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Last Updated By
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      {previewPo.updatedByName || previewPo.createdByName || 'Marketing & Sales User'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {previewPo.updatedAt
                        ? new Date(previewPo.updatedAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'No updates yet'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

