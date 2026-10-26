'use client';

import React, { useState } from 'react';
import {
  Settings,
  Calculator,
  IndianRupee,
  Receipt,
  Plus,
  X,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { useGetMasterDomainQuery, useCreateMasterEntityMutation } from '../api/mastersApi';

export default function SettingMasterTab() {
  const { data } = useGetMasterDomainQuery('settings');
  const [activeSub, setActiveSub] = useState<'uom' | 'currency' | 'tax'>('uom');

  const settings = data?.data || {
    uoms: [
      { code: 'NOS', name: 'Numbers / Pieces', type: 'DISCRETE', isFractional: false },
      { code: 'SET', name: 'Complete Assembly Set', type: 'DISCRETE', isFractional: false },
      { code: 'KG', name: 'Kilograms', type: 'CONTINUOUS', isFractional: true },
      { code: 'MTR', name: 'Meters', type: 'CONTINUOUS', isFractional: true },
      { code: 'BOX', name: 'Box (Multi-pack)', type: 'DISCRETE', isFractional: false },
      { code: 'ROLL', name: 'Roll', type: 'CONTINUOUS', isFractional: true }
    ],
    currencies: [
      { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateToINR: 1.0, isBase: true },
      { code: 'USD', symbol: '$', name: 'US Dollar', rateToINR: 86.5, isBase: false },
      { code: 'EUR', symbol: '€', name: 'Euro', rateToINR: 92.4, isBase: false },
      { code: 'GBP', symbol: '£', name: 'British Pound', rateToINR: 108.2, isBase: false }
    ],
    taxSlabs: [
      { rate: 0, label: '0% (Exempt)', cgst: 0, sgst: 0, igst: 0 },
      { rate: 5, label: '5% GST', cgst: 2.5, sgst: 2.5, igst: 5 },
      { rate: 12, label: '12% GST', cgst: 6, sgst: 6, igst: 12 },
      { rate: 18, label: '18% GST (Standard)', cgst: 9, sgst: 9, igst: 18 },
      { rate: 28, label: '28% GST (Heavy Machinery)', cgst: 14, sgst: 14, igst: 28 }
    ]
  };

  return (
    <div className="space-y-4">
      {/* Sub Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setActiveSub('uom')}
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
            activeSub === 'uom'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Calculator size={14} />
          <span>UOM & Units</span>
        </button>

        <button
          onClick={() => setActiveSub('currency')}
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
            activeSub === 'currency'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <IndianRupee size={14} />
          <span>Currencies & Rates</span>
        </button>

        <button
          onClick={() => setActiveSub('tax')}
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
            activeSub === 'tax'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Receipt size={14} />
          <span>GST & Tax Slabs</span>
        </button>
      </div>

      {/* UOM View */}
      {activeSub === 'uom' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Unit of Measure (UOM) Directory</h3>
              <p className="text-xs text-slate-500 mt-0.5">Discrete units enforce integer counts; continuous units allow fractions</p>
            </div>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">UOM Code</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Unit Classification</th>
                <th className="py-3 px-4">Fractional Support</th>
                <th className="py-3 px-4 text-right">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {settings.uoms?.map((u: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-orange-600">{u.code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{u.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-700">
                      {u.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {u.isFractional ? (
                      <span className="text-emerald-700 font-semibold">Allowed (Continuous)</span>
                    ) : (
                      <span className="text-slate-500">Integer Only (Discrete)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500">Global System</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Currency View */}
      {activeSub === 'currency' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Enterprise Currencies & Conversion Rates</h3>
              <p className="text-xs text-slate-500 mt-0.5">Base currency is INR (₹); foreign quotes lock the exchange rate permanently</p>
            </div>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Currency Code</th>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Currency Name</th>
                <th className="py-3 px-4">Locked Rate to INR (₹)</th>
                <th className="py-3 px-4 text-right">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {settings.currencies?.map((cur: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-orange-600">{cur.code}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 text-sm">{cur.symbol}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{cur.name}</td>
                  <td className="py-3 px-4 font-mono font-extrabold text-slate-900">
                    1.00 {cur.code} = ₹{cur.rateToINR}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {cur.isBase ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                        Base Operating Currency
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        Foreign Commercial
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tax View */}
      {activeSub === 'tax' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Goods and Services Tax (GST) Slabs</h3>
              <p className="text-xs text-slate-500 mt-0.5">Automated split for intra-state (CGST + SGST) vs inter-state (IGST)</p>
            </div>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Tax Slab Rate</th>
                <th className="py-3 px-4">Description Label</th>
                <th className="py-3 px-4">CGST (%)</th>
                <th className="py-3 px-4">SGST (%)</th>
                <th className="py-3 px-4 text-right">IGST Total (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {settings.taxSlabs?.map((t: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-orange-600">{t.rate}%</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{t.label}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{t.cgst}%</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{t.sgst}%</td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">{t.igst}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
