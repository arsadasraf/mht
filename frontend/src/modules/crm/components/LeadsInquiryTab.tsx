'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Search,
  Filter,
  Plus,
  Upload,
  Kanban,
  Table as TableIcon,
  Phone,
  Mail,
  Building2,
  Calendar,
  ChevronRight,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Loader2,
  MapPin,
  Cpu,
  Layers,
  Sparkles,
  Send,
  FileText
} from 'lucide-react';
import {
  useGetLeadsQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useUpdateLeadStageMutation,
  useDeleteLeadMutation,
  useGetCrmMastersQuery,
  useCreateQuotationMutation
} from '../api/crmApi';
import BulkImportModal from './BulkImportModal';

const KANBAN_STAGES = [
  { id: 'NEW', title: 'New Inquiries', color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { id: 'TECHNICAL_REVIEW', title: 'Technical Review', color: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  { id: 'QUOTE_PREPARED', title: 'Quote Prepared', color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { id: 'NEGOTIATION', title: 'Negotiation', color: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { id: 'WON', title: 'Won (PO Received)', color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { id: 'LOST', title: 'Lost Deals', color: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' }
];

const formatINR = (amt) => {
  const num = Number(amt || 0);
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

export default function LeadsInquiryTab() {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);

  // Send Quote Modal State
  const [quoteLead, setQuoteLead] = useState<any>(null);
  const [quoteTaxRate, setQuoteTaxRate] = useState(18);
  const [quoteDeliveryWeeks, setQuoteDeliveryWeeks] = useState(8);
  const [quotePaymentTerms, setQuotePaymentTerms] = useState(
    '30% Advance with PO, 60% before dispatch, 10% after site commissioning'
  );
  const [quoteItems, setQuoteItems] = useState<any[]>([]);

  const [quoteCurrency, setQuoteCurrency] = useState('INR');
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState('');
  const [quoteErrorMsg, setQuoteErrorMsg] = useState('');

  // API Queries & Mutations
  const { data: leadsData, isLoading, refetch } = useGetLeadsQuery({
    source: selectedSource || undefined,
    priority: selectedPriority || undefined,
    stage: selectedStage || undefined,
    search: searchTerm || undefined
  });

  const { data: mastersData } = useGetCrmMastersQuery();
  const machinePresets = (mastersData?.masters?.machines || []) as any[];

  const [createLead, { isLoading: isCreatingLead }] = useCreateLeadMutation();
  const [createQuotation, { isLoading: isCreatingQuote }] = useCreateQuotationMutation();
  const [updateLeadStage] = useUpdateLeadStageMutation();
  const [deleteLead] = useDeleteLeadMutation();

  // Multi-Product Form State for Manual Entry
  const [newLead, setNewLead] = useState({
    customerName: '',
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    city: 'Bengaluru',
    country: 'India',
    source: 'DIRECT_SALES',
    priority: 'MEDIUM',
    notes: '',
    products: [
      {
        modelCode: '',
        modelName: '',
        quantity: 1,
        unitPrice: 0,
        currency: 'INR',
        specifications: '',
        customToolingNotes: ''
      }
    ]
  });

  const leads = leadsData?.leads || [];

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((ld) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          ld.leadNumber?.toLowerCase().includes(q) ||
          ld.customerName?.toLowerCase().includes(q) ||
          ld.companyName?.toLowerCase().includes(q) ||
          (ld as any).machineModel?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [leads, searchTerm]);

  // Handle Multi-Product Row Add
  const handleAddProductRow = () => {
    const defaultPreset = machinePresets[0] || {
      modelCode: 'MHT-2100',
      modelName: 'MHT-2100 Table Top Coil Winder',
      basePriceINR: 285000
    };

    setNewLead((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          modelCode: defaultPreset.modelCode,
          modelName: defaultPreset.modelName,
          quantity: 1,
          unitPrice: defaultPreset.basePriceINR,
          currency: 'INR',
          specifications: '',
          customToolingNotes: ''
        }
      ]
    }));
  };

  // Handle Multi-Product Row Remove
  const handleRemoveProductRow = (index) => {
    setNewLead((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  // Handle Multi-Product Change
  const handleProductChange = (index, field, value) => {
    setNewLead((prev) => {
      const updated = [...prev.products];
      if (field === 'modelCode') {
        const preset = machinePresets.find((m) => m.modelCode === value);
        if (preset) {
          updated[index].modelCode = preset.modelCode;
          updated[index].modelName = preset.modelName;
          updated[index].unitPrice = preset.basePriceINR;
        } else {
          updated[index].modelCode = value;
        }
      } else {
        updated[index][field] = value;
      }
      return { ...prev, products: updated };
    });
  };

  // Compute Total Estimate for New Lead
  const computedLeadTotal = useMemo(() => {
    return newLead.products.reduce((acc, p) => acc + (Number(p.quantity || 1) * Number(p.unitPrice || 0)), 0);
  }, [newLead.products]);

  // Submit Manual Lead Creation
  const handleCreateLeadSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newLead,
        machineRequirement: newLead.products.map(p => `${p.quantity}x ${p.modelCode}`).join(', '),
        estimatedValue: {
          currency: newLead.products[0]?.currency || 'INR',
          amount: computedLeadTotal,
          exchangeRate: 1.0,
          baseAmountINR: computedLeadTotal
        }
      };

      await createLead(payload as any).unwrap();
      setIsAddLeadModalOpen(false);
      setNewLead({
        customerName: '',
        companyName: '',
        contactEmail: '',
        contactPhone: '',
        city: 'Bengaluru',
        country: 'India',
        source: 'DIRECT_SALES',
        priority: 'MEDIUM',
        notes: '',
        products: [
          {
            modelCode: '',
            modelName: '',
            quantity: 1,
            unitPrice: 0,
            currency: 'INR',
            specifications: '',
            customToolingNotes: ''
          }
        ]
      });
      refetch();
    } catch (err: any) {
      alert(err.data?.message || 'Failed to create lead.');
    }
  };

  // Open "Send Quote" Modal for a specific lead
  const handleOpenSendQuote = (lead: any) => {
    setQuoteLead(lead);
    setQuoteSuccessMsg('');
    setQuoteErrorMsg('');

    // Pre-populate items from lead products or single machineModel
    let items: any[] = [];
    if (lead.products && lead.products.length > 0) {
      items = lead.products.map((p: any, idx: number) => ({
        itemCode: p.modelCode || `ITEM-${idx + 1}`,
        description: `${p.modelName || p.modelCode} (Qty: ${p.quantity}) ${p.specifications || ''}`,
        quantity: Number(p.quantity || 1),
        unitPrice: Number(p.unitPrice?.amount || p.unitPrice || 250000)
      }));
    } else {
      items = [
        {
          itemCode: lead.machineModel || 'MHT-2100',
          description: `${lead.machineModel || 'Precision Winding Machine'} — Base Automated Assembly`,
          quantity: 1,
          unitPrice: Number(lead.estimatedValue?.amount || 250000)
        }
      ];
    }

    setQuoteItems(items);
    setQuoteCurrency(lead.estimatedValue?.currency || 'INR');
  };

  // Submit Send Quote
  const handleSendQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteLead) return;

    setQuoteErrorMsg('');
    setQuoteSuccessMsg('');

    try {
      const quotePayload = {
        leadId: quoteLead._id,
        customerName: quoteLead.customerName,
        companyName: quoteLead.companyName,
        contactEmail: quoteLead.contactEmail,
        contactPhone: quoteLead.contactPhone,
        machineModel: quoteLead.machineModel || quoteItems[0]?.itemCode || 'MHT-2100',
        items: quoteItems.map((item: any) => ({
          itemCode: item.itemCode,
          description: item.description,
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0)
        })),
        taxRatePercent: Number(quoteTaxRate),
        currency: quoteCurrency,
        exchangeRate: quoteCurrency === 'INR' ? 1.0 : 85.0,
        deliveryWeeks: Number(quoteDeliveryWeeks),
        paymentTerms: quotePaymentTerms,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      const res: any = await createQuotation(quotePayload as any).unwrap();
      setQuoteSuccessMsg(`Official Quotation ${res.quotation?.quoteNumber} generated and linked to ${quoteLead.leadNumber}!`);
      refetch();
    } catch (err: any) {
      setQuoteErrorMsg(err?.data?.message || 'Failed to generate quotation.');
    }
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Focused Single-Line Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Lead #, Customer, Company, Machine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-orange-500 transition-all font-medium"
          />
        </div>

        {/* Right Action Controls: Filters, View Toggle, Import & Add Lead */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-orange-500 transition-all cursor-pointer"
          >
            <option value="">All Stages</option>
            {KANBAN_STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-orange-500 transition-all cursor-pointer"
          >
            <option value="">All Sources</option>
            <option value="DIRECT_SALES">Direct Sales</option>
            <option value="INDIAMART">IndiaMART</option>
            <option value="TRADEINDIA">TradeIndia</option>
            <option value="EXHIBITION">Exhibition</option>
            <option value="WEBSITE">Website Portal</option>
          </select>

          {/* View Switcher: Table vs Kanban (Button Pills) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon size={13} />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Kanban Board View"
            >
              <Kanban size={13} />
              <span>Kanban</span>
            </button>
          </div>

          {/* Excel Import Button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:border-orange-300 bg-slate-50 hover:bg-white text-slate-700 hover:text-orange-600 text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Upload size={14} className="text-slate-500" />
            <span>Import (Excel)</span>
          </button>

          {/* Manual Entry Button */}
          <button
            type="button"
            onClick={() => setIsAddLeadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Lead</span>
          </button>
        </div>

      </div>

      {/* 3. Main Content: Table View or Kanban View */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Lead # &amp; Date</th>
                  <th className="py-3 px-4">Customer &amp; Company</th>
                  <th className="py-3 px-4">Machines / Products Requested</th>
                  <th className="py-3 px-4">Est. Value</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Primary Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <Loader2 size={20} className="animate-spin mx-auto mb-2 text-orange-500" />
                      <span>Loading inquiries...</span>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No customer leads found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((ld) => {
                    const stageObj = KANBAN_STAGES.find((s) => s.id === ld.stage) || KANBAN_STAGES[0];
                    const hasMultiple = ld.products && ld.products.length > 0;
                    return (
                      <tr key={ld._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <div>{ld.leadNumber}</div>
                          <div className="text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                            {new Date(ld.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{ld.companyName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{ld.customerName}</span>
                            <span>•</span>
                            <span>{ld.city || 'India'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {hasMultiple ? (
                            <div className="flex flex-wrap gap-1">
                              {ld.products.map((p, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-800 text-[10px] font-mono font-bold"
                                >
                                  <span>{p.quantity}x</span>
                                  <span>{p.modelCode}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-bold">
                              {(ld as any).machineModel || 'Precision SPM'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {formatINR((ld as any).estimatedValue?.baseAmountINR || (ld as any).estimatedValueINR || (ld as any).estimatedValue?.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {ld.source || 'DIRECT'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${stageObj.bg} ${stageObj.text} ${stageObj.border}`}>
                            {stageObj.title}
                          </span>
                        </td>
                        {/* ONLY Option: Direct Send Quote Action */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenSendQuote(ld)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                          >
                            <Send size={12} />
                            <span>Send Quote</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {KANBAN_STAGES.map((col) => {
            const colLeads = filteredLeads.filter((l) => (l.stage || 'NEW') === col.id);
            return (
              <div key={col.id} className="bg-slate-100/70 border border-slate-200 rounded-2xl p-3 flex flex-col space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${col.color}`}></span>
                    <span className="text-xs font-bold text-slate-800">{col.title}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    {colLeads.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px]">
                  {colLeads.map((ld) => (
                    <div
                      key={ld._id}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-orange-300 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-slate-400">{ld.leadNumber}</span>
                        <span className="text-xs font-mono font-black text-slate-900">
                          {formatINR((ld as any).estimatedValue?.baseAmountINR || (ld as any).estimatedValueINR || (ld as any).estimatedValue?.amount)}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-900 leading-tight">{ld.companyName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{ld.customerName}</div>
                      </div>

                      {/* Products requested pills */}
                      <div className="flex flex-wrap gap-1">
                        {ld.products && ld.products.length > 0 ? (
                          ld.products.map((p, idx) => (
                            <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200">
                              {p.quantity}x {p.modelCode}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {(ld as any).machineModel || 'SPM'}
                          </span>
                        )}
                      </div>

                      {/* Direct Send Quote CTA */}
                      <button
                        type="button"
                        onClick={() => handleOpenSendQuote(ld)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer mt-1"
                      >
                        <Send size={11} />
                        <span>Send Quote</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Modal: Manual Entry with Multiple Product Option */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Inbox size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    New Customer Inquiry &amp; Multi-Machine Entry
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Capture lead contact information and machine requirements.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddLeadModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Customer Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={newLead.customerName}
                    onChange={(e) => setNewLead({ ...newLead, customerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-orange-500"
                    placeholder="e.g. Mr. Rajesh Sharma"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company / Organization *</label>
                  <input
                    type="text"
                    required
                    value={newLead.companyName}
                    onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-orange-500"
                    placeholder="e.g. Apex Transformers &amp; Electricals"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={newLead.contactEmail}
                    onChange={(e) => setNewLead({ ...newLead, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-orange-500"
                    placeholder="rajesh@apexelec.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={newLead.contactPhone}
                    onChange={(e) => setNewLead({ ...newLead, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-orange-500 font-mono"
                    placeholder="+91 9845012345"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City &amp; Country</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newLead.city}
                      onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      placeholder="City (e.g. Bengaluru)"
                    />
                    <input
                      type="text"
                      value={newLead.country}
                      onChange={(e) => setNewLead({ ...newLead, country: e.target.value })}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      placeholder="Country (India)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Inquiry Source &amp; Priority</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newLead.source}
                      onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                      className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="DIRECT_SALES">Direct Sales</option>
                      <option value="INDIAMART">IndiaMART</option>
                      <option value="TRADEINDIA">TradeIndia</option>
                      <option value="EXHIBITION">Exhibition</option>
                      <option value="WEBSITE">Website Portal</option>
                    </select>

                    <select
                      value={newLead.priority}
                      onChange={(e) => setNewLead({ ...newLead, priority: e.target.value })}
                      className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="LOW">Low Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="HIGH">High Priority</option>
                      <option value="CRITICAL">Critical Priority</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Multi-Product Section (Requirement: multiple product option should be there) */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu size={15} className="text-orange-500" />
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      Machines / Products Requested (Multiple Selection)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProductRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-orange-300 text-slate-700 hover:text-orange-600 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Another Machine</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newLead.products.map((prod, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      {/* Product Selector */}
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Select SPM / Machine</label>
                        <select
                          value={prod.modelCode}
                          onChange={(e) => handleProductChange(idx, 'modelCode', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                        >
                          {machinePresets.map((m) => (
                            <option key={m.modelCode} value={m.modelCode}>
                              {m.modelCode} — {m.modelName}
                            </option>
                          ))}
                          <option value="CUSTOM_SPM">Custom Engineered Automation SPM</option>
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={prod.quantity}
                          onChange={(e) => handleProductChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Unit Price (₹ INR)</label>
                        <input
                          type="number"
                          value={prod.unitPrice}
                          onChange={(e) => handleProductChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>

                      {/* Delete Row Button */}
                      <div className="sm:col-span-1 flex justify-end">
                        {newLead.products.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProductRow(idx)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Remove Product"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {/* Technical Notes / Wire Range */}
                      <div className="sm:col-span-12">
                        <input
                          type="text"
                          placeholder="Wire range / tooling customizations / customer specific requirements..."
                          value={prod.specifications}
                          onChange={(e) => handleProductChange(idx, 'specifications', e.target.value)}
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal Tally */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-50/70 border border-orange-200 text-xs">
                  <span className="font-bold text-orange-950">Estimated Inquiry Total ({newLead.products.length} Machines):</span>
                  <span className="font-mono font-extrabold text-orange-700 text-sm">{formatINR(computedLeadTotal)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingLead}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {isCreatingLead ? 'Recording Inquiry...' : 'Save Customer Inquiry'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Send Official Quotation (Direct from Lead) */}
      {quoteLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-8">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Send size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    Generate &amp; Send Quotation — {quoteLead.leadNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {quoteLead.companyName} • {quoteLead.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuoteLead(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendQuoteSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {quoteSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>{quoteSuccessMsg}</span>
                </div>
              )}

              {quoteErrorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                  <span>{quoteErrorMsg}</span>
                </div>
              )}

              {/* Customer Pre-filled Details */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Customer:</span>{' '}
                  <span className="font-bold text-slate-900">{quoteLead.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Company:</span>{' '}
                  <span className="font-bold text-slate-900">{quoteLead.companyName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Email:</span>{' '}
                  <span className="font-mono text-slate-700">{quoteLead.contactEmail}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Phone:</span>{' '}
                  <span className="font-mono text-slate-700">{quoteLead.contactPhone}</span>
                </div>
              </div>

              {/* Quotation Line Items (Pre-populated from Multi-Products) */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-900 uppercase">Quotation Items &amp; Pricing</label>
                {quoteItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-3 font-mono font-bold text-slate-900">{item.itemCode}</div>
                    <div className="col-span-5 text-slate-700">{item.description}</div>
                    <div className="col-span-2 font-mono text-center">Qty: {item.quantity}</div>
                    <div className="col-span-2 font-mono font-bold text-right text-orange-600">
                      {formatINR(item.unitPrice * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Commercial Terms & Tax */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tax / GST Rate (%)</label>
                  <select
                    value={quoteTaxRate}
                    onChange={(e) => setQuoteTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value={18}>18% GST (Domestic Standard)</option>
                    <option value={0}>0% (Export / SEZ Supply)</option>
                    <option value={12}>12% Concessional GST</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Delivery Lead Time (Weeks)</label>
                  <input
                    type="number"
                    min={1}
                    value={quoteDeliveryWeeks}
                    onChange={(e) => setQuoteDeliveryWeeks(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Payment Milestones</label>
                  <input
                    type="text"
                    value={quotePaymentTerms}
                    onChange={(e) => setQuotePaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuoteLead(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isCreatingQuote}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send size={13} />
                  <span>{isCreatingQuote ? 'Dispatching...' : 'Confirm & Generate Quotation'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Excel Bulk Import */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          refetch();
        }}
      />

    </div>
  );
}
