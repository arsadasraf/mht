'use client';

import React, { useState } from 'react';
import {
  Layers,
  Sliders,
  Scale,
  ShieldAlert,
  Plus,
  Search,
  CheckCircle2,
  Boxes,
  MapPin,
  Clock
} from 'lucide-react';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import BinLocationModal from './modals/BinLocationModal';

type MasterSubTab = 'BINS' | 'CATEGORIES' | 'UOM_MATRIX' | 'SAFETY_STOCK';

export default function StoreMasterTab() {
  const dispatch = useAppDispatch();
  const [activeSubTab, setActiveSubTab] = useState<MasterSubTab>('BINS');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBinModalOpen, setIsBinModalOpen] = useState(false);

  // Initial Store Master state
  const [binLocations, setBinLocations] = useState<any[]>([
    {
      id: 'BIN-1',
      zone: 'RAW_MATERIAL_YARD',
      binCode: 'YARD-RM-01',
      aisle: 'Y1',
      rackNumber: '01',
      shelfLevel: 'GROUND',
      capacityQty: 50,
      capacityUom: 'MT',
      description: 'Heavy structural plates & round bar yard'
    },
    {
      id: 'BIN-2',
      zone: 'BOUGHT_OUT_RACKS',
      binCode: 'RACK-BO-A01',
      aisle: 'A',
      rackNumber: '01',
      shelfLevel: 'L2',
      capacityQty: 250,
      capacityUom: 'NOS',
      description: 'Servo drives, motors & pneumatic cylinders'
    },
    {
      id: 'BIN-3',
      zone: 'CONSUMABLES_CAGE',
      binCode: 'BIN-CNS-01',
      aisle: 'C',
      rackNumber: '02',
      shelfLevel: 'L3',
      capacityQty: 500,
      capacityUom: 'BOXES',
      description: 'High-tensile fasteners, adhesives & lubricants'
    },
    {
      id: 'BIN-4',
      zone: 'FINISHED_GOODS_BAY',
      binCode: 'BAY-FG-01',
      aisle: 'D',
      rackNumber: '01',
      shelfLevel: 'HEAVY_FLOOR',
      capacityQty: 4,
      capacityUom: 'NOS',
      description: 'Completed machine staging with overhead crane access'
    }
  ]);

  const [categories] = useState<any[]>([
    {
      code: 'RAW_MATERIAL',
      name: 'Raw Materials',
      subTypes: 'Sheets, Plates, Round Bars, Pipes, Profiles',
      defaultZone: 'RAW_MATERIAL_YARD',
      qcRequired: true,
      traceability: 'HEAT_NUMBER_MANDATORY'
    },
    {
      code: 'BOUGHT_OUT',
      name: 'Bought Out Components',
      subTypes: 'Motors, Drives, PLCs, Bearings, LM Guides, Sensors',
      defaultZone: 'BOUGHT_OUT_RACKS',
      qcRequired: true,
      traceability: 'SERIAL_BARCODE_TRACKED'
    },
    {
      code: 'CONSUMABLES',
      name: 'Consumables & Fasteners',
      subTypes: 'Bolts, Nuts, Lubricants, Coolants, Welding Electrodes',
      defaultZone: 'CONSUMABLES_CAGE',
      qcRequired: false,
      traceability: 'BATCH_LOT_EXPIRY'
    },
    {
      code: 'FINISHED_GOODS',
      name: 'Finished Machines & Modules',
      subTypes: 'Complete ETO Machinery, Tested Modular Stations',
      defaultZone: 'FINISHED_GOODS_BAY',
      qcRequired: true,
      traceability: 'EQUIPMENT_SERIAL_PDI'
    }
  ]);

  const [uomMatrix] = useState<any[]>([
    { baseUom: 'KG', alternateUom: 'MT', ratio: 0.001, formula: '1 MT = 1,000 KG' },
    { baseUom: 'MTR', alternateUom: 'ROLL', ratio: 50, formula: '1 ROLL = 50 MTR' },
    { baseUom: 'NOS', alternateUom: 'BOX', ratio: 100, formula: '1 BOX = 100 NOS' },
    { baseUom: 'LTR', alternateUom: 'BARREL', ratio: 210, formula: '1 BARREL = 210 LTR' }
  ]);

  const [safetyRules] = useState<any[]>([
    {
      itemCode: 'FAST-M8-30',
      itemName: 'High-Tensile Socket Head Cap Screws M8x30',
      category: 'CONSUMABLES',
      minSafetyStock: 200,
      reorderQty: 500,
      leadTimeDays: 3,
      currentStock: 320,
      status: 'ADEQUATE'
    },
    {
      itemCode: 'OIL-VG-68',
      itemName: 'Hydraulic Oil Tellus S2 M 46 (20L Cans)',
      category: 'CONSUMABLES',
      minSafetyStock: 10,
      reorderQty: 25,
      leadTimeDays: 5,
      currentStock: 4,
      status: 'REORDER_REQUIRED'
    },
    {
      itemCode: 'THK-LM-25',
      itemName: 'THK Linear Motion Guide 25mm x 1200mm',
      category: 'BOUGHT_OUT',
      minSafetyStock: 4,
      reorderQty: 8,
      leadTimeDays: 14,
      currentStock: 6,
      status: 'ADEQUATE'
    }
  ]);

  const handleAddBin = (newBin: any) => {
    setBinLocations((prev) => [
      { id: `BIN-${Date.now()}`, ...newBin },
      ...prev
    ]);
  };

  return (
    <div className="space-y-4">
      {/* Metric Cards (Strictly label + value) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total Bin Locations
          </div>
          <div className="text-lg font-extrabold text-slate-900 mt-0.5">
            {binLocations.length} Configured
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Storage Zones
          </div>
          <div className="text-lg font-extrabold text-sky-600 mt-0.5">
            {categories.length} Primary Zones
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            UOM Converters
          </div>
          <div className="text-lg font-extrabold text-emerald-600 mt-0.5">
            {uomMatrix.length} Mathematical Rules
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Reorder Level Watch
          </div>
          <div className="text-lg font-extrabold text-amber-600 mt-0.5">
            {safetyRules.filter((r) => r.status === 'REORDER_REQUIRED').length} Items Low
          </div>
        </div>
      </div>

      {/* Sub-Tabs Bar & Add Location Button */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Modern Button-Type Sub-Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('BINS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'BINS'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <MapPin size={14} />
            Warehouse & Bins ({binLocations.length})
          </button>

          <button
            onClick={() => setActiveSubTab('CATEGORIES')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'CATEGORIES'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers size={14} />
            Item Categories ({categories.length})
          </button>

          <button
            onClick={() => setActiveSubTab('UOM_MATRIX')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'UOM_MATRIX'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Scale size={14} />
            UOM Matrix ({uomMatrix.length})
          </button>

          <button
            onClick={() => setActiveSubTab('SAFETY_STOCK')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'SAFETY_STOCK'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldAlert size={14} />
            Safety Stock & Reorder Rules
          </button>
        </div>

        {/* Action Button */}
        {activeSubTab === 'BINS' && (
          <button
            onClick={() => setIsBinModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 self-end md:self-auto shrink-0"
          >
            <Plus size={15} /> Add Bin Location
          </button>
        )}
      </div>

      {/* Sub-View 1: Warehouse & Bins */}
      {activeSubTab === 'BINS' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Bin / Location Code</th>
                  <th className="py-3 px-4">Storage Zone</th>
                  <th className="py-3 px-4 text-center">Aisle</th>
                  <th className="py-3 px-4 text-center">Rack #</th>
                  <th className="py-3 px-4 text-center">Shelf Level</th>
                  <th className="py-3 px-4 font-mono">Max Capacity</th>
                  <th className="py-3 px-4">Location Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {binLocations.map((b) => (
                  <tr key={b.id || b.binCode} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                        {b.binCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {b.zone?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-center text-slate-600">
                      {b.aisle}
                    </td>
                    <td className="py-3 px-4 font-mono text-center text-slate-600">
                      {b.rackNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-center text-slate-600">
                      {b.shelfLevel}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {b.capacityQty} {b.capacityUom}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {b.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-View 2: Item Categories */}
      {activeSubTab === 'CATEGORIES' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Category Code</th>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Typical Material Scope</th>
                  <th className="py-3 px-4">Assigned Storage Zone</th>
                  <th className="py-3 px-4">QC Inspection</th>
                  <th className="py-3 px-4">Traceability Mandate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {categories.map((c) => (
                  <tr key={c.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {c.code}
                    </td>
                    <td className="py-3 px-4 font-bold text-orange-600">
                      {c.name}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {c.subTypes}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600 text-[11px]">
                      {c.defaultZone?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4">
                      {c.qcRequired ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px]">
                          <CheckCircle2 size={11} /> Mandatory Inward QC
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium text-[10px]">Direct Inward</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-600 font-semibold">
                      {c.traceability}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-View 3: UOM Conversion Matrix */}
      {activeSubTab === 'UOM_MATRIX' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Base UOM (Ledger Standard)</th>
                  <th className="py-3 px-4">Alternate / Secondary Unit</th>
                  <th className="py-3 px-4 font-mono">Conversion Ratio</th>
                  <th className="py-3 px-4">Normalization Formula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {uomMatrix.map((u, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {u.baseUom}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-orange-600">
                      {u.alternateUom}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800 font-semibold">
                      {u.ratio}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {u.formula}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-View 4: Safety Stock & Reorder Rules */}
      {activeSubTab === 'SAFETY_STOCK' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Part / Item Code</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 font-mono text-slate-600">Min Safety Stock</th>
                  <th className="py-3 px-4 font-mono text-sky-700 font-bold">Reorder Qty</th>
                  <th className="py-3 px-4 font-mono text-slate-600">Lead Time (Days)</th>
                  <th className="py-3 px-4 font-mono font-bold text-slate-900">Current Stock</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {safetyRules.map((rule, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {rule.itemCode}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {rule.itemName}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {rule.category}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {rule.minSafetyStock}
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-700 font-bold">
                      {rule.reorderQty}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {rule.leadTimeDays}d
                    </td>
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-900">
                      {rule.currentStock}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {rule.status === 'REORDER_REQUIRED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={11} /> Reorder Triggered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} /> Stock Adequate
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <BinLocationModal
        isOpen={isBinModalOpen}
        onClose={() => setIsBinModalOpen(false)}
        onSubmitSuccess={handleAddBin}
      />
    </div>
  );
}
