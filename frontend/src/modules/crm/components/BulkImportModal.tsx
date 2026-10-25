'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  X,
  Loader2,
  RefreshCw,
  Building2,
  Phone,
  Mail,
  Info
} from 'lucide-react';
import { useBulkImportLeadsMutation } from '../api/crmApi';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface DryRunSummary {
  totalProcessed?: number;
  totalRows?: number;
  validCount?: number;
  duplicateCount?: number;
  invalidCount?: number;
  importedCount?: number;
}

interface PreviewRow {
  rowNumber: number;
  customerName: string;
  companyName: string;
  contactPhone: string;
  contactEmail: string;
  machineRequirement?: string;
  status: 'VALID' | 'DUPLICATE' | 'INVALID';
  assignedLeadNumber?: string;
  message?: string;
}

interface DryRunResult {
  success?: boolean;
  message?: string;
  summary?: DryRunSummary;
  preview?: PreviewRow[];
}

export default function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Array<Record<string, unknown>>>([]);
  const [defaultSource, setDefaultSource] = useState('INDIAMART');
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [bulkImportLeads, { isLoading: isImporting }] = useBulkImportLeadsMutation();

  if (!isOpen) return null;

  // Download official sample Excel workbook (.xlsx), strictly NOT .csv
  const handleDownloadTemplate = () => {
    const headers = [
      'Customer Name *',
      'Company Name *',
      'Mobile / Phone *',
      'Contact Email',
      'Machine / Product Name *',
      'City',
      'Country',
      'Estimated Value (₹)',
      'Query ID (Optional)'
    ];

    const sampleRows = [
      headers,
      [
        'Rajesh Sharma',
        'Apex Electricals',
        '+91 9845012345',
        'rajesh@apexelectricals.com',
        'Automatic Stator Coil Winder',
        'Bengaluru',
        'India',
        450000,
        'IM-2026-9011'
      ],
      [
        'Vikram Mehra',
        'V-Tech Transformers',
        '+91 9876543210',
        'vikram@vtechtransformers.com',
        'HV Winding Machine AGI-0815',
        'Vadodara',
        'India',
        1450000,
        'IM-2026-9012'
      ],
      [
        'Suresh Nair',
        'Kerala Wire & Cables',
        '+91 9447123890',
        'suresh@keralawire.in',
        'MHT-2100 Table Top Coil Winder',
        'Kochi',
        'India',
        285000,
        'IM-2026-9013'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRows);

    // Formatted column widths
    ws['!cols'] = [
      { wch: 22 }, // Customer Name *
      { wch: 25 }, // Company Name *
      { wch: 18 }, // Mobile / Phone *
      { wch: 28 }, // Contact Email
      { wch: 32 }, // Machine / Product Name *
      { wch: 15 }, // City
      { wch: 12 }, // Country
      { wch: 20 }, // Estimated Value (₹)
      { wch: 22 }  // Query ID (Optional)
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads_Import_Template');
    XLSX.writeFile(wb, 'MH_Leads_Import_Template.xlsx');
  };

  // Upload handler: Enforces Excel only (.xlsx, .xls), strictly rejecting .csv
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setErrorMsg('');
    setSuccessMsg('');

    // Strict validation: Excel only (.xlsx, .xls)
    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
    if (fileExt === 'csv') {
      setErrorMsg('CSV files are not supported. Please upload an Excel workbook (.xlsx or .xls).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (fileExt !== 'xlsx' && fileExt !== 'xls') {
      setErrorMsg('Invalid file format. Please upload an Excel workbook (.xlsx or .xls).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setDryRunResult(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

      if (!json || json.length === 0) {
        throw new Error('The uploaded Excel sheet appears to be empty or contains no readable rows.');
      }

      setParsedRows(json);

      // Immediately execute dry-run validation with backend (passing both rows and leads for robustness)
      const res = await bulkImportLeads({
        rows: json,
        leads: json,
        dryRun: true,
        defaultSource
      }).unwrap();

      setDryRunResult(res as unknown as DryRunResult);
    } catch (err: unknown) {
      console.error('File parsing error:', err);
      const errorObj = err as { data?: { message?: string }; message?: string };
      setErrorMsg(errorObj.data?.message || errorObj.message || 'Failed to parse Excel file. Please verify columns.');
    } finally {
      setIsParsing(false);
    }
  };

  // Execute actual database commit
  const handleExecuteImport = async () => {
    if (!parsedRows.length) return;
    setErrorMsg('');
    try {
      const res = await bulkImportLeads({
        rows: parsedRows,
        leads: parsedRows,
        dryRun: false,
        defaultSource
      }).unwrap();

      const msg = res.message || `Successfully imported ${res.summary?.importedCount || res.summary?.validCount || parsedRows.length} leads!`;
      setSuccessMsg(msg);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      setErrorMsg(errorObj.data?.message || errorObj.message || 'Bulk import failed. Please review the errors.');
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setDryRunResult(null);
    setErrorMsg('');
    setSuccessMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header: Crisp White Header with Amber/Yellow Top Accent Stripe (Master Standard) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 border-t-4 border-t-amber-400 bg-white shadow-xs shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-300/40 flex items-center justify-center text-amber-700 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Bulk Lead Import &amp; IndiaMART Manager (Excel Only)
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Upload Excel workbooks (.xlsx, .xls) with dry-run validation and automatic duplicate detection.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-700 text-xs">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-700 text-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Compulsory Fields Notice with Asterisks */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Compulsory Fields Notice:</span> Fields marked with an asterisk (
              <span className="text-red-600 font-bold">*</span>) are mandatory:{' '}
              <span className="font-semibold underline">Customer Name *</span>,{' '}
              <span className="font-semibold underline">Company Name *</span>,{' '}
              <span className="font-semibold underline">Mobile / Phone *</span>, and{' '}
              <span className="font-semibold underline">Machine / Product Name *</span>. Upload must be an Excel file
              (.xlsx or .xls).
            </div>
          </div>

          {!file ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-orange-500 bg-slate-50 hover:bg-orange-50/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400 group-hover:text-orange-500 group-hover:scale-105 transition-all mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  Click to select or drag Excel workbook (.xlsx, .xls) here
                </h3>
                <p className="text-xs text-slate-500 text-center max-w-sm mb-4">
                  Upload official MH Excel template or exported Excel lead sheets (.xlsx, .xls only — CSV not allowed)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Template Download Card (Excel Only) */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="flex items-center space-x-2 text-slate-700">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Download standard Excel import template with compulsory columns</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel Template (.xlsx)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isParsing && (
                <div className="p-8 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                  <p className="text-xs font-medium text-slate-600">
                    Parsing Excel rows and validating compulsory fields against database...
                  </p>
                </div>
              )}

              {dryRunResult && (
                <div className="space-y-4">
                  {/* Summary KPI Cards */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Rows</span>
                      <span className="text-lg font-black text-slate-900">
                        {dryRunResult.summary?.totalRows || dryRunResult.summary?.totalProcessed || parsedRows.length}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Valid Leads</span>
                      <span className="text-lg font-black text-emerald-700">{dryRunResult.summary?.validCount || 0}</span>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-amber-700 block">Duplicates</span>
                      <span className="text-lg font-black text-amber-700">{dryRunResult.summary?.duplicateCount || 0}</span>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-red-700 block">Invalid Rows</span>
                      <span className="text-lg font-black text-red-700">{dryRunResult.summary?.invalidCount || 0}</span>
                    </div>
                  </div>

                  {/* Preview Rows Table with Asterisks on Compulsory Columns */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto bg-white shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3 w-8">#</th>
                          <th className="py-2.5 px-3">Customer Name *</th>
                          <th className="py-2.5 px-3">Company Name *</th>
                          <th className="py-2.5 px-3">Mobile / Phone *</th>
                          <th className="py-2.5 px-3">Machine / Product *</th>
                          <th className="py-2.5 px-3">Validation Status</th>
                          <th className="py-2.5 px-3">Notes / Diagnostics</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {(dryRunResult.preview || []).map((pRow, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-400 font-mono">{pRow.rowNumber || idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{pRow.customerName || '—'}</td>
                            <td className="py-2 px-3 text-slate-700">{pRow.companyName || '—'}</td>
                            <td className="py-2 px-3 font-mono text-slate-700">{pRow.contactPhone || '—'}</td>
                            <td className="py-2 px-3 text-slate-700">{pRow.machineRequirement || '—'}</td>
                            <td className="py-2 px-3">
                              {pRow.status === 'VALID' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                  <CheckCircle2 size={10} />
                                  <span>Valid</span>
                                </span>
                              ) : pRow.status === 'DUPLICATE' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                  <AlertTriangle size={10} />
                                  <span>Duplicate</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                                  <XCircle size={10} />
                                  <span>Invalid</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-500 text-[10px]">
                              {pRow.message || (pRow.status === 'VALID' ? 'Ready for import' : '—')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          {file ? (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Choose Another Excel File</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {dryRunResult && (
              <button
                type="button"
                disabled={isImporting || !dryRunResult.summary?.validCount}
                onClick={handleExecuteImport}
                className="flex items-center space-x-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing to Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Import {dryRunResult.summary?.validCount || parsedRows.length} Valid Leads
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
