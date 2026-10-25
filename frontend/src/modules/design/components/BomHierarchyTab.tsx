'use client';

import React from 'react';
import { useAppSelector } from '../../../store/hooks';
import { Layers, AlertTriangle, ShieldCheck, Cpu, CornerDownRight, FileCode2 } from 'lucide-react';
import { useGetBomByProjectQuery } from '../api/designApi';

export default function BomHierarchyTab() {
  const { activeProjectId } = useAppSelector((state) => state.ui);
  const { data, isLoading } = useGetBomByProjectQuery(activeProjectId || 'PRJ-2026-001');

  const bom = data?.bom;
  const items = bom?.items || [];

  return (
    <div className="space-y-4">
      {/* BOM Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-xs font-bold text-orange-600">
                {activeProjectId}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                {bom?.revision || 'REV-0'}
              </span>
              {bom?.isFrozen && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  BASELINE FROZEN
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              3-Level Hierarchical Engineering BOM Tree
            </h2>
          </div>
        </div>

        <div className="text-xs text-slate-600 flex items-center gap-2">
          <span>BOM Document: <strong className="font-mono text-slate-800">{bom?.bomNumber || 'BOM-PRJ-2026-001'}</strong></span>
          <span>•</span>
          <span>{items.length} Line Items</span>
        </div>
      </div>

      {/* Hierarchical Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Tree Level</th>
                <th className="py-3 px-4">Part / Asm Code</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Sub-Assembly Group</th>
                <th className="py-3 px-4">Make / Buy</th>
                <th className="py-3 px-4">Quantity (Dual Unit)</th>
                <th className="py-3 px-4">Drawing Ref</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    Loading BOM Hierarchy Tree...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No BOM released for project {activeProjectId}.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isLevel1 = item.level === 1;
                  const isLevel2 = item.level === 2;
                  const isLevel3 = item.level === 3;
                  const isFrozen = item.ecoStatus === 'FROZEN_ECO';

                  return (
                    <tr
                      key={item._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLevel1 ? 'bg-slate-50/60 font-semibold' : ''
                      } ${isFrozen ? 'bg-red-50/40' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <div
                          className="flex items-center"
                          style={{ paddingLeft: `${(item.level - 1) * 16}px` }}
                        >
                          {isLevel1 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white uppercase">
                              L1 • Machine
                            </span>
                          )}
                          {isLevel2 && (
                            <div className="flex items-center gap-1">
                              <CornerDownRight size={13} className="text-slate-400" />
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800">
                                L2 • Sub-Asm
                              </span>
                            </div>
                          )}
                          {isLevel3 && (
                            <div className="flex items-center gap-1">
                              <CornerDownRight size={13} className="text-orange-500" />
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-800">
                                L3 • Part
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {item.itemCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{item.itemName}</td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {item.subAssemblyGroup || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            item.makeOrBuy === 'MAKE'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}
                        >
                          {item.makeOrBuy}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-semibold text-slate-900">
                            {item.quantity?.baseQty} {item.quantity?.baseUom}
                          </span>
                          {item.quantity?.altUom && item.quantity?.altUom !== item.quantity?.baseUom && (
                            <span className="text-[10px] text-slate-500">
                              ({item.quantity?.altQty} {item.quantity?.altUom})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {item.drawingNumber ? (
                          <div className="flex items-center gap-1 text-sky-600 font-mono text-[11px] font-medium">
                            <FileCode2 size={13} />
                            <span>{item.drawingNumber}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isFrozen ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            FROZEN (ECO)
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            RELEASED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
