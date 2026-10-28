'use client';

import React, { useState } from 'react';
import { X, Truck, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { addToast } from '../../../../store/uiSlice';

interface DeliveryChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (data: any) => void;
}

export default function DeliveryChallanModal({
  isOpen,
  onClose,
  onSubmitSuccess
}: DeliveryChallanModalProps) {
  const dispatch = useAppDispatch();
  const { activeProjectId } = useAppSelector((state) => state.ui);

  const [dcType, setDcType] = useState<'RETURNABLE' | 'NON_RETURNABLE'>('RETURNABLE');
  const [challanNumber, setChallanNumber] = useState(`DC-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [projectId, setProjectId] = useState(activeProjectId || '');
  const [purpose, setPurpose] = useState('EXTERNAL_JOBWORK');
  const [expectedReturnDate, setExpectedReturnDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [eWayBillNumber, setEWayBillNumber] = useState('');

  const [items, setItems] = useState([
    { itemCode: '', description: '', qty: 1, uom: 'NOS', hsn: '8479', unitValueINR: 5000, remarks: '' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const addItemRow = () => {
    setItems([
      ...items,
      { itemCode: '', description: '', qty: 1, uom: 'NOS', hsn: '8479', unitValueINR: 1000, remarks: '' }
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const totalValueINR = items.reduce((acc, it) => acc + (it.qty * it.unitValueINR || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consigneeName.trim()) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Please provide the consignee or party name.'
        })
      );
      return;
    }

    const invalidItems = items.some((it) => !it.description.trim() || it.qty <= 0);
    if (invalidItems) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Please provide valid item descriptions and quantities.'
        })
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        challanNumber,
        dcType,
        challanDate,
        consigneeName,
        consigneeAddress,
        gstin,
        projectId,
        purpose,
        expectedReturnDate: dcType === 'RETURNABLE' ? expectedReturnDate : null,
        transporterName,
        vehicleNumber,
        eWayBillNumber,
        items,
        totalValueINR,
        status: 'DISPATCHED',
        createdAt: new Date().toISOString()
      };

      if (onSubmitSuccess) {
        onSubmitSuccess(payload);
      }

      dispatch(
        addToast({
          type: 'success',
          message: `All set! Delivery Challan ${challanNumber} (${dcType}) created successfully.`
        })
      );
      onClose();
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: "We couldn't generate this delivery challan. Please try again."
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8">
        {/* Header Ribbon Standard */}
        <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
              <Truck size={18} />
            </div>
            <div>
              <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                Create Delivery Challan (DC)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* DC Type Toggle (Modern Button Pill Style) */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setDcType('RETURNABLE')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                dcType === 'RETURNABLE'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Returnable DC (RDC)
            </button>
            <button
              type="button"
              onClick={() => setDcType('NON_RETURNABLE')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                dcType === 'NON_RETURNABLE'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Non-Returnable DC (NRDC)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Challan Number</label>
              <input
                type="text"
                required
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-orange-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Challan Date</label>
              <input
                type="date"
                required
                value={challanDate}
                onChange={(e) => setChallanDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="PRJ-2026-XXXX"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Consignee / Party Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Vendor or Customer name"
                value={consigneeName}
                onChange={(e) => setConsigneeName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Party GSTIN</label>
              <input
                type="text"
                placeholder="27AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Delivery / Plant Address</label>
              <input
                type="text"
                placeholder="Complete destination address"
                value={consigneeAddress}
                onChange={(e) => setConsigneeAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Purpose of Dispatch</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
              >
                <option value="EXTERNAL_JOBWORK">External Jobwork / Machining</option>
                <option value="SURFACE_TREATMENT">Heat Treatment / Anodizing / Plating</option>
                <option value="CALIBRATION_TESTING">Instrument Calibration / Testing</option>
                <option value="VENDOR_REWORK">Vendor Rework / Warranty Repair</option>
                <option value="CUSTOMER_TRIAL">Customer Trial / Demonstration</option>
                <option value="SCRAP_DISPOSAL">Scrap Metal Disposal (Non-Returnable)</option>
              </select>
            </div>

            {dcType === 'RETURNABLE' && (
              <div>
                <label className="block text-xs font-bold text-amber-700 mb-1">
                  Expected Return Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-xl text-xs focus:outline-none focus:border-orange-500 font-semibold"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle / LR #</label>
              <input
                type="text"
                placeholder="MH-12-AB-1234 or LR-991"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Challan Items ({items.length})
              </span>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-left w-32">Item Code</th>
                    <th className="py-2.5 px-3 text-left">Description</th>
                    <th className="py-2.5 px-3 text-left w-20">Qty</th>
                    <th className="py-2.5 px-3 text-left w-20">UOM</th>
                    <th className="py-2.5 px-3 text-left w-24">HSN</th>
                    <th className="py-2.5 px-3 text-right w-28">Est. Value (₹)</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="CODE-XXXX"
                          value={item.itemCode}
                          onChange={(e) => updateItem(idx, 'itemCode', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-orange-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="Item description / process"
                          required
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500 font-medium"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(idx, 'qty', parseInt(e.target.value, 10) || 1)
                          }
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-center focus:outline-none focus:border-orange-500"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={item.uom}
                          onChange={(e) => updateItem(idx, 'uom', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                        >
                          <option value="NOS">NOS</option>
                          <option value="PCS">PCS</option>
                          <option value="SET">SET</option>
                          <option value="KG">KG</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.hsn}
                          onChange={(e) => updateItem(idx, 'hsn', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-center focus:outline-none focus:border-orange-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          value={item.unitValueINR}
                          onChange={(e) =>
                            updateItem(idx, 'unitValueINR', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-right font-semibold focus:outline-none focus:border-orange-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          disabled={items.length <= 1}
                          onClick={() => removeItemRow(idx)}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-30 p-1 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-2 text-xs font-bold text-slate-700">
              Total Declared Value: <span className="font-mono text-orange-600 ml-1">₹{totalValueINR.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              <CheckCircle2 size={15} />
              {isSubmitting ? 'Creating Challan...' : 'Generate Delivery Challan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
