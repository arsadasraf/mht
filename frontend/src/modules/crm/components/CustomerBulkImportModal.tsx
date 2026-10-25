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
  Building2,
  Phone,
  Mail,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { useBulkImportCustomersMutation } from '../api/crmApi';

interface CustomerBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CustomerBulkImportModal({
  isOpen,
  onClose,
  onSuccess
}: CustomerBulkImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Array<Record<string, any>>>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [importSummary, setImportSummary] = useState<{ importedCount?: number; skippedCount?: number; errors?: any[] } | null>(null);

  const [bulkImportCustomers, { isLoading: isImporting }] = useBulkImportCustomersMutation();

  if (!isOpen) return null;

  // Download official Excel template (.xlsx) with compulsory fields marked with asterisk
  const handleDownloadTemplate = () => {
    const headers = [
      'Company Name *',
      'Primary Contact Person *',
      'Designation',
      'Mobile *',
      'Email',
      'Address Line 1 *',
      'Address Line 2',
      'City *',
      'State *',
      'PIN Code *',
      'Country',
      'GSTIN *',
      'PAN',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'Currency',
      'Payment Terms'
    ];

    const sampleRows = [
      headers,
      [
        'Bharat Heavy Electricals Ltd',
        'K. S. Narayanan',
        'Head of Sourcing',
        '+91 9845012345',
        'narayanan.ks@bhel.in',
        'BHEL Industrial Complex, Piplani',
        'Works Gate No. 3',
        'Bhopal',
        'Madhya Pradesh',
        '462022',
        'India',
        '23AAACB1234A1Z5',
        'AAACB1234A',
        'State Bank of India',
        '10982390192',
        'SBIN0040182',
        'INR',
        '30% Advance, 60% Against Proforma, 10% Post Commissioning'
      ],
      [
        'Schneider Electric India Pvt Ltd',
        'Deepak Verma',
        'Senior Procurement Lead',
        '+91 9876543210',
        'deepak.verma@se.com',
        'Plot 88A, Attibele Industrial Area',
        'Near Toll Gate',
        'Bengaluru',
        'Karnataka',
        '562107',
        'India',
        '29AAACS5678B1Z2',
        'AAACS5678B',
        'HDFC Bank',
        '50200012345678',
        'HDFC0001234',
        'INR',
        'Net 30 Days'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    ws['!cols'] = [
      { wch: 30 }, // Company Name *
      { wch: 24 }, // Primary Contact Person *
      { wch: 22 }, // Designation
      { wch: 18 }, // Mobile *
      { wch: 26 }, // Email
      { wch: 32 }, // Address Line 1 *
      { wch: 22 }, // Address Line 2
      { wch: 15 }, // City *
      { wch: 18 }, // State *
      { wch: 12 }, // PIN Code *
      { wch: 12 }, // Country
      { wch: 20 }, // GSTIN *
      { wch: 15 }, // PAN
      { wch: 22 }, // Bank Name
      { wch: 20 }, // Account Number
      { wch: 15 }, // IFSC Code
      { wch: 10 }, // Currency
      { wch: 30 }  // Payment Terms
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer_Master_Template');
    XLSX.writeFile(wb, 'MH_Customer_Bulk_Import_Template.xlsx');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setErrorMsg('');
    setSuccessMsg('');
    setImportSummary(null);

    // Reject CSV files — Excel only (.xlsx, .xls)
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

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (!json || json.length === 0) {
        throw new Error('The uploaded file appears to be empty or contains no readable rows.');
      }

      setParsedRows(json);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMsg(err.message || 'Failed to parse file. Please verify CSV or Excel format.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedRows.length) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await bulkImportCustomers({
        customers: parsedRows
      }).unwrap();

      setImportSummary({
        importedCount: res.importedCount,
        skippedCount: res.skippedCount,
        errors: res.errors
      });
      setSuccessMsg(res.message || `Successfully imported ${res.importedCount} customers!`);

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.data?.message || err.message || 'Bulk import failed. Please verify format.');
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setErrorMsg('');
    setSuccessMsg('');
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header: Crisp White Header with Amber/Yellow Top Accent Stripe (Master Standard) */}
        <div className="px-6 py-4 border-b border-slate-200 border-t-4 border-t-amber-400 bg-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-300/40 flex items-center justify-center text-amber-700 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Bulk Import Customers (Excel Only)</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Upload Excel spreadsheet (.xlsx, .xls) with contact, address, and GSTIN details.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {/* Action Bar: Download Sample Template (Excel Only) */}
          <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Standard Customer Bulk Import Template (.xlsx)
              </span>
              <p className="text-[11px] text-slate-600">
                Compulsory columns marked with an asterisk (*): Company Name *, Primary Contact Person *, Mobile *, Address Line 1 *, City *, State *, PIN Code *, GSTIN *.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-300 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Excel Template (.xlsx)</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
                <Upload className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Click to select or drag &amp; drop Excel spreadsheet
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supported format: Microsoft Excel (.xlsx, .xls) — CSV files are not accepted
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{file.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} customer records detected
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Change File"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Spreadsheet Preview ({parsedRows.length} Rows)
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  First 5 rows displayed below for dry-run preview
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Company Name</th>
                      <th className="py-2 px-3">Contact Person</th>
                      <th className="py-2 px-3">Mobile / Email</th>
                      <th className="py-2 px-3">City & State</th>
                      <th className="py-2 px-3">GSTIN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {parsedRows.slice(0, 5).map((row, idx) => {
                      const company = row.companyName || row['Company Name'] || row.Company || '—';
                      const contact = row.contactPerson || row['Primary Contact Person'] || row['Contact Person'] || '—';
                      const mobile = row.mobile || row.Mobile || row.Phone || '—';
                      const email = row.email || row.Email || '—';
                      const city = row.city || row.City || '—';
                      const state = row.state || row.State || '—';
                      const gstin = row.gstin || row.GSTIN || '—';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{company}</td>
                          <td className="py-2 px-3">{contact}</td>
                          <td className="py-2 px-3 text-slate-600 text-[11px]">
                            {mobile} • {email}
                          </td>
                          <td className="py-2 px-3">{city}, {state}</td>
                          <td className="py-2 px-3 font-mono text-[11px]">{gstin}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {parsedRows.length > 5 && (
                <p className="text-[11px] text-slate-500 italic text-center">
                  + {parsedRows.length - 5} more records will be processed during import
                </p>
              )}
            </div>
          )}

          {/* Import Summary after Execution */}
          {importSummary && importSummary.errors && importSummary.errors.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-800">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Skipped Rows ({importSummary.errors.length}):
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {importSummary.errors.slice(0, 5).map((e, idx) => (
                  <li key={idx}>Row {e.row}: {e.error}</li>
                ))}
              </ul>
              {importSummary.errors.length > 5 && (
                <p className="text-[10px] text-amber-700 italic">
                  + {importSummary.errors.length - 5} additional skipped rows
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={parsedRows.length === 0 || isImporting}
            className="flex items-center gap-1.5 px-5 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing Customers...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Import {parsedRows.length ? `${parsedRows.length} Customers` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
