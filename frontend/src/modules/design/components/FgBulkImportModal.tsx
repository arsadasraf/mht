'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Cpu,
  Layers
} from 'lucide-react';
import { useBulkImportFgItemsMutation } from '../api/designApi';

interface FgBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingItems?: any[];
  onSuccess?: () => void;
}

export default function FgBulkImportModal({
  isOpen,
  onClose,
  existingItems = [],
  onSuccess
}: FgBulkImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Array<Record<string, any>>>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [importSummary, setImportSummary] = useState<{
    importedCount?: number;
    newCount?: number;
    restoredCount?: number;
    skippedCount?: number;
    skippedItems?: Array<{ row: number; name: string; revision: string; reason: string }>;
    createdCategoriesCount?: number;
    createdCategories?: string[];
  } | null>(null);

  const [bulkImportFgItems, { isLoading: isImporting }] = useBulkImportFgItemsMutation();

  // Create an index of existing database items by "name:::revision"
  const existingKeySet = useMemo(() => {
    const set = new Set<string>();
    existingItems.forEach((it) => {
      const name = String(it.name || '').trim().toLowerCase();
      const rev = String(it.revision || 'Rev 1.0').trim().toLowerCase();
      if (name) {
        set.add(`${name}:::${rev}`);
      }
    });
    return set;
  }, [existingItems]);

  // Analyze parsed rows for pre-import validation and duplicate alerts
  const analysis = useMemo(() => {
    const validRows: Array<{
      rowNumber: number;
      name: string;
      classification: string;
      revision: string;
      categoryCode: string;
      categoryName: string;
      description: string;
      uom: string;
      hsnCode: string;
    }> = [];

    const duplicateRows: Array<{
      rowNumber: number;
      name: string;
      revision: string;
      reason: string;
      isDbDuplicate: boolean;
      isFileDuplicate: boolean;
    }> = [];

    const seenFileKeys = new Set<string>();

    parsedRows.forEach((row, idx) => {
      const rowNumber = idx + 2; // Row 1 is header in Excel
      const rawName = String(
        row['Part Number / Item Name *'] ||
        row['Part Number *'] ||
        row['Item Name *'] ||
        row['Part Number'] ||
        row['Item Name'] ||
        row['name'] ||
        ''
      ).trim();

      const rawRevision = String(
        row['Revision'] ||
        row['revision'] ||
        'Rev 1.0'
      ).trim() || 'Rev 1.0';

      if (!rawName) {
        duplicateRows.push({
          rowNumber,
          name: '(Empty Name)',
          revision: rawRevision,
          reason: 'Item Name / Part Number is compulsory and cannot be empty.',
          isDbDuplicate: false,
          isFileDuplicate: false
        });
        return;
      }

      const key = `${rawName.toLowerCase()}:::${rawRevision.toLowerCase()}`;

      // Check within-file duplicates
      if (seenFileKeys.has(key)) {
        duplicateRows.push({
          rowNumber,
          name: rawName,
          revision: rawRevision,
          reason: `Duplicate row in uploaded file (Part "${rawName}", Revision "${rawRevision}").`,
          isDbDuplicate: false,
          isFileDuplicate: true
        });
        return;
      }

      // Check database duplicates
      if (existingKeySet.has(key)) {
        duplicateRows.push({
          rowNumber,
          name: rawName,
          revision: rawRevision,
          reason: `FG Item "${rawName}" with Revision "${rawRevision}" already exists in the system.`,
          isDbDuplicate: true,
          isFileDuplicate: false
        });
        return;
      }

      seenFileKeys.add(key);

      const rawClass = String(row['Classification *'] || row['Classification'] || row['classification'] || 'COMPONENT').toUpperCase().trim();
      const validClass = ['COMPONENT', 'SUB_ASSEMBLY', 'ASSEMBLY'].includes(rawClass) ? rawClass : 'COMPONENT';

      validRows.push({
        rowNumber,
        name: rawName,
        classification: validClass,
        revision: rawRevision,
        categoryCode: String(row['Category'] || row['category'] || '').trim(),
        categoryName: String(row['Category'] || row['category'] || '').trim(),
        description: String(row['Description'] || row['description'] || '').trim(),
        uom: String(row['UOM'] || row['uom'] || 'Nos').trim(),
        hsnCode: String(row['HSN Code'] || row['hsnCode'] || '8479').trim()
      });
    });

    return { validRows, duplicateRows };
  }, [parsedRows, existingKeySet]);

  // Download official sample Excel template (.xlsx)
  const handleDownloadTemplate = () => {
    const headers = [
      'Part Number / Item Name *',
      'Revision',
      'Classification *',
      'Description',
      'Category',
      'UOM',
      'HSN Code'
    ];

    const sampleRows = [
      headers,
      [
        'RRO420-01-02-00-01',
        'Rev 1.0',
        'COMPONENT',
        'Hardened precision flyer shaft for winding unit',
        'Flyer Components',
        'Nos',
        '8479'
      ],
      [
        'RRO420-01-02-00-00',
        'Rev 1.0',
        'SUB_ASSEMBLY',
        'Complete flyer spindle sub-assembly with bearings',
        'Spindle Assemblies',
        'Nos',
        '8479'
      ],
      [
        'RRO420-01-00-00-00',
        'Rev 1.0',
        'ASSEMBLY',
        'Main high-speed coil winding head complete assembly',
        'Winding Heads',
        'Nos',
        '8479'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    ws['!cols'] = [
      { wch: 28 },
      { wch: 12 },
      { wch: 18 },
      { wch: 45 },
      { wch: 24 },
      { wch: 10 },
      { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'FG_Items_Template');
    XLSX.writeFile(wb, 'MH_FG_Items_Template.xlsx');
  };

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setErrorMsg('');
    setImportSummary(null);
    setFile(selectedFile);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

        if (!data || data.length === 0) {
          setErrorMsg('The selected spreadsheet appears to be empty. Please verify your file.');
          setParsedRows([]);
        } else {
          setParsedRows(data);
        }
      } catch (err) {
        setErrorMsg('Failed to read the file. Please ensure it is a valid .xlsx or .csv format.');
        setParsedRows([]);
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the file. Please try again.');
      setIsParsing(false);
    };
    reader.readAsBinaryString(selectedFile);
  };

  // Reset file state
  const handleResetFile = () => {
    setFile(null);
    setParsedRows([]);
    setErrorMsg('');
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCloseAndReset = () => {
    handleResetFile();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      handleResetFile();
    }
  }, [isOpen]);

  // Execute import of valid non-duplicate rows
  const handleExecuteImport = async () => {
    if (analysis.validRows.length === 0) {
      setErrorMsg('No valid non-duplicate items found to import.');
      return;
    }

    try {
      const res = await bulkImportFgItems({
        items: analysis.validRows
      }).unwrap();

      setImportSummary({
        importedCount: res.importedCount,
        newCount: (res as any).newCount,
        restoredCount: (res as any).restoredCount,
        skippedCount: res.skippedCount,
        skippedItems: res.skippedItems,
        createdCategoriesCount: res.createdCategoriesCount,
        createdCategories: res.createdCategories
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(
        err?.data?.message || 'We could not complete the bulk import right now. Please try again.'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header Ribbon Standard (Crisp White Header with Amber Accent Stripe) */}
        <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Bulk Import FG Items
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Upload Component, Sub-Assembly, or Assembly parts with duplicate detection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseAndReset}
            className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {importSummary ? (
            /* Dedicated Completion View */
            <div className="py-6 px-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 border border-emerald-300/40 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  All set! {importSummary.importedCount} FG item{importSummary.importedCount === 1 ? '' : 's'} imported successfully
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {importSummary.restoredCount
                    ? `${importSummary.newCount || 0} new FG item(s) created and ${importSummary.restoredCount} previously deleted item(s) restored.`
                    : 'Your master Finished Goods catalog has been updated with the new records.'}
                </p>
              </div>

              {/* Newly Auto-Created Categories Notice */}
              {importSummary.createdCategoriesCount && importSummary.createdCategoriesCount > 0 ? (
                <div className="w-full max-w-xl p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-left space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                    <Layers className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>
                      {importSummary.createdCategoriesCount} new category/categories added to Category Master:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {importSummary.createdCategories?.map((cat, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-white border border-sky-200 rounded-md text-[11px] font-semibold text-sky-800"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Genuine pre-import skipped items details if any */}
              {importSummary.skippedCount && importSummary.skippedCount > 0 ? (
                <div className="w-full max-w-xl p-4 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-2 mt-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{importSummary.skippedCount} duplicate/invalid row(s) were safely skipped</span>
                  </div>
                  {importSummary.skippedItems && importSummary.skippedItems.length > 0 && (
                    <div className="max-h-36 overflow-y-auto divide-y divide-amber-100 text-xs text-amber-800 bg-white rounded-lg p-2 border border-amber-200/60">
                      {importSummary.skippedItems.map((sk, idx) => (
                        <div key={idx} className="py-1.5 flex items-center justify-between gap-2">
                          <span className="font-bold">Row #{sk.row}: {sk.name} ({sk.revision})</span>
                          <span className="text-slate-500 text-[11px]">{sk.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {/* Step 1: Download Template Callout */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800">Need the official FG template?</span>
                  <p className="text-[11px] text-slate-500">
                    Download the pre-formatted Excel template with classification options and sample rows.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shrink-0 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-orange-600" />
                  <span>Download Template (.xlsx)</span>
                </button>
              </div>

              {/* Step 2: Upload Dropzone */}
              {!file && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-orange-500 bg-slate-50 hover:bg-orange-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center mb-1">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800">
                    Click to browse or drag &amp; drop your spreadsheet
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Supports Excel (.xlsx, .xls) and CSV (.csv) files up to 10MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}

              {/* Loading File State */}
              {isParsing && (
                <div className="p-8 text-center space-y-2">
                  <Loader2 className="w-6 h-6 text-orange-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Reading and validating spreadsheet...</p>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Step 3: Analysis & Duplicate Alert */}
              {file && !isParsing && parsedRows.length > 0 && (
                <div className="space-y-4">
                  {/* File Info Bar */}
                  <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold">{file.name}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600">{parsedRows.length} total rows</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetFile}
                      className="text-slate-400 hover:text-slate-700 text-xs font-bold p-1 rounded-md cursor-pointer"
                    >
                      Change File
                    </button>
                  </div>

                  {/* Status Breakdown KPI chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Total Rows</div>
                      <div className="text-base font-extrabold text-slate-900">{parsedRows.length}</div>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <div className="text-[10px] font-bold text-emerald-700 uppercase">Valid for Import</div>
                      <div className="text-base font-extrabold text-emerald-700">
                        {analysis.validRows.length}
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center col-span-2 sm:col-span-1">
                      <div className="text-[10px] font-bold text-amber-700 uppercase">Duplicate / Blocked</div>
                      <div className="text-base font-extrabold text-amber-700">
                        {analysis.duplicateRows.length}
                      </div>
                    </div>
                  </div>

                  {/* PROMINENT DUPLICATE ALERT BANNER */}
                  {analysis.duplicateRows.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-amber-900">
                            Duplicate Alert: Same Part Number with Same Revision cannot be imported
                          </h4>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            {analysis.duplicateRows.length} row(s) below will be strictly skipped to preserve FG item revision integrity. The remaining {analysis.validRows.length} unique row(s) are ready to import.
                          </p>
                        </div>
                      </div>

                      {/* Conflicting rows checklist */}
                      <div className="max-h-40 overflow-y-auto border border-amber-200/80 rounded-xl bg-white divide-y divide-amber-100 text-xs">
                        {analysis.duplicateRows.map((dup, i) => (
                          <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-400">Row #{dup.rowNumber}</span>
                              <span className="font-bold text-slate-800">{dup.name}</span>
                              <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px]">
                                {dup.revision}
                              </span>
                            </div>
                            <span className="text-[11px] font-medium text-amber-800 shrink-0">
                              {dup.reason}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {importSummary ? (
            <>
              <button
                type="button"
                onClick={handleResetFile}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Import Another File
              </button>
              <button
                type="button"
                onClick={handleCloseAndReset}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCloseAndReset}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {file && (
                <button
                  type="button"
                  disabled={isImporting || analysis.validRows.length === 0}
                  onClick={handleExecuteImport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        Import {analysis.validRows.length} Unique FG Item{analysis.validRows.length === 1 ? '' : 's'}
                      </span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

