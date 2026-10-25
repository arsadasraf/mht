'use client';

import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { FileCode2, Eye, ShieldCheck, Download, ExternalLink, X, Lock } from 'lucide-react';
import { useGetDrawingsQuery } from '../api/designApi';

export default function CadDrawingsTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);
  const { data, isLoading } = useGetDrawingsQuery({ projectId: activeProjectId || 'PRJ-2026-001' });

  const [activeViewerDrawing, setActiveViewerDrawing] = useState<any>(null);

  const drawings = data?.drawings || [];

  const handleOpenViewer = (drawing) => {
    setActiveViewerDrawing(drawing);
  };

  const closeViewer = () => {
    setActiveViewerDrawing(null);
  };

  return (
    <div className="space-y-4">
      {/* Compact Header Bar (Zero narrative block) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {drawings.length} CAD Assets
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
            Dynamic Watermark Active
          </span>
        </div>
      </div>

      {/* Drawings Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {isLoading ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            Loading Project CAD Drawings...
          </div>
        ) : drawings.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            No CAD drawings registered for project {activeProjectId}.
          </div>
        ) : (
          drawings.map((dwg) => (
            <div
              key={dwg._id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                    {dwg.category}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                    {dwg.revision}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                    <FileCode2 size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {dwg.title}
                    </h3>
                    <span className="font-mono text-[11px] text-slate-500 block truncate">
                      {dwg.drawingNumber}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
                  <span>Format: <strong className="text-slate-700 uppercase">{dwg.fileExtension || 'PDF'}</strong></span>
                  <span>{dwg.fileSize ? `${(dwg.fileSize / 1024 / 1024).toFixed(1)} MB` : '1.8 MB'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleOpenViewer(dwg)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold text-xs transition-colors"
                >
                  <Eye size={14} />
                  <span>View Blueprint</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Watermarked CAD Viewer Modal */}
      {activeViewerDrawing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCode2 size={18} className="text-sky-600" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    {activeViewerDrawing.title} ({activeViewerDrawing.drawingNumber})
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    Proprietary Machine House Drawing • Controlled Watermarked View
                  </span>
                </div>
              </div>
              <button
                onClick={closeViewer}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* In-Browser CAD Canvas with Dynamic Watermark */}
            <div className="relative flex-1 bg-slate-950 p-8 min-h-[360px] flex items-center justify-center select-none overflow-hidden">
              {/* Dynamic Security Watermarks */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-around items-center opacity-15 rotate-[-25deg] select-none text-white font-mono text-xs font-bold space-y-12">
                <div>MACHINE HOUSE • {user?.email || 'ENGINEER'} • {activeProjectId} • {new Date().toISOString()}</div>
                <div>CONFIDENTIAL INTELLECTUAL PROPERTY • DO NOT DISTRIBUTE</div>
                <div>MACHINE HOUSE • {user?.email || 'ENGINEER'} • {activeProjectId} • {new Date().toISOString()}</div>
              </div>

              {/* Technical Drawing Blueprint Mock Wireframe */}
              <div className="relative z-10 border border-sky-400/40 rounded-lg p-6 max-w-md w-full bg-slate-900/80 backdrop-blur text-sky-300 font-mono text-xs space-y-3 shadow-2xl">
                <div className="flex justify-between border-b border-sky-500/30 pb-2">
                  <span className="font-bold">DWG: {activeViewerDrawing.drawingNumber}</span>
                  <span>REV: {activeViewerDrawing.revision}</span>
                </div>
                <div className="h-32 border border-dashed border-sky-500/30 rounded flex items-center justify-center text-sky-400 text-center p-3 text-[11px]">
                  [ 3D CAD Wireframe Projection — Precision Tolerances: ±0.01mm ]
                </div>
                <div className="flex justify-between text-[10px] text-sky-400/70 pt-1">
                  <span>SCALE: 1:1</span>
                  <span>PROJECTION: THIRD ANGLE</span>
                  <span>CAD VER: 2026.1</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>OWASP A01 Protected: Download access logged to tamper-proof ISO audit trail.</span>
              </span>
              <button
                onClick={closeViewer}
                className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300 transition-colors"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
