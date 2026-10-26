'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '../../../store/hooks';
import {
  FolderGit2,
  Plus,
  Search,
  Cpu,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowRight,
  X,
  FileCheck2,
  SlidersHorizontal,
  Kanban,
  FileText,
  UserCheck,
  Building2,
  ChevronRight,
  Check
} from 'lucide-react';
import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useGetAvailableCustomerPosQuery,
  useGetStageMastersQuery
} from '../api/projectApi';
import { setActiveProjectId, addToast } from '../../../store/uiSlice';

export default function ProjectsTab() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal Mode: 'CUSTOMER_PO' | 'DIRECT'
  const [creationMode, setCreationMode] = useState<'CUSTOMER_PO' | 'DIRECT'>('CUSTOMER_PO');
  const [selectedPoId, setSelectedPoId] = useState('');

  // Form State
  const [projectName, setProjectName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [machineModel, setMachineModel] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [targetDispatchDate, setTargetDispatchDate] = useState('');
  const [plantLocation, setPlantLocation] = useState('Main Works - Unit 1');

  // Custom stage selection from Stage Master
  const [selectedStageCodes, setSelectedStageCodes] = useState<string[]>([]);
  const [hasInitializedStages, setHasInitializedStages] = useState(false);

  const { data, isLoading } = useGetProjectsQuery({
    search: searchTerm || undefined,
    stage: stageFilter || undefined
  });

  const { data: customerPoData, isLoading: isLoadingPos } = useGetAvailableCustomerPosQuery();
  const { data: stageMastersData } = useGetStageMastersQuery();

  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();

  const projects = data?.projects || [];
  const availablePos = customerPoData?.customerPos || [];
  const stageMasters = stageMastersData?.stages || [];

  // When stage masters load, initialize selected stages
  React.useEffect(() => {
    if (stageMasters.length > 0 && !hasInitializedStages) {
      setSelectedStageCodes(stageMasters.map((s) => s.stageCode));
      setHasInitializedStages(true);
    }
  }, [stageMasters, hasInitializedStages]);

  const handleSelectPo = (poId: string) => {
    setSelectedPoId(poId);
    const po = availablePos.find((p) => p._id === poId);
    if (po) {
      const cust = po.companyName || po.customerName || '';
      const model = po.items?.[0]?.modelCode || po.items?.[0]?.description || 'Custom Precision SPM';
      setCustomerName(cust);
      setMachineModel(model);
      setProjectName(`${cust} — ${model} Execution`);

      if (po.totalAmount) {
        setCurrency(po.totalAmount.currency || 'INR');
        setAmount(String(po.totalAmount.amount || ''));
        setExchangeRate(po.totalAmount.exchangeRate || 1.0);
      }

      if (po.deliveryCommitmentDate) {
        setTargetDispatchDate(new Date(po.deliveryCommitmentDate).toISOString().split('T')[0]);
      }
    }
  };

  const handleSelectProject = (projectId: string) => {
    dispatch(setActiveProjectId(projectId));
    dispatch(
      addToast({
        type: 'info',
        title: 'Project Selected',
        message: `Active reference set to ${projectId}.`
      })
    );
  };

  const handleOpenKanban = (projectId: string) => {
    dispatch(setActiveProjectId(projectId));
    router.push('/project-setup/kanban');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (creationMode === 'CUSTOMER_PO' && !selectedPoId && !customerName) {
      dispatch(
        addToast({
          type: 'warning',
          title: 'Select a Customer PO',
          message: 'Please pick a confirmed customer purchase order or switch to direct creation.'
        })
      );
      return;
    }

    if (!projectName || !customerName || !machineModel || !amount) {
      dispatch(
        addToast({
          type: 'warning',
          title: 'Missing Required Fields',
          message: 'Please ensure Project Name, Customer Name, Machine Model, and Contract Amount are entered.'
        })
      );
      return;
    }

    try {
      // Build stages payload based on selected stages from master
      const stagesPayload = stageMasters
        .filter((sm) => selectedStageCodes.includes(sm.stageCode))
        .map((sm, idx) => ({
          title: sm.stageName,
          stage: sm.stageCode,
          stageCode: sm.stageCode,
          order: idx + 1,
          leadRole: sm.leadRole,
          weightPercent: sm.weightPercent,
          daysOffset: sm.standardDaysOffset
        }));

      const payload = {
        creationMode,
        customerPoId: creationMode === 'CUSTOMER_PO' ? selectedPoId : undefined,
        projectName,
        customerName,
        machineModel,
        contractValue: {
          currency,
          amount: Number(amount),
          exchangeRate: Number(exchangeRate)
        },
        targetDispatchDate: targetDispatchDate ? new Date(targetDispatchDate) : undefined,
        plantLocation,
        stages: stagesPayload.length > 0 ? stagesPayload : undefined
      };

      const res = await createProject(payload).unwrap();

      setIsModalOpen(false);
      // Reset form
      setProjectName('');
      setCustomerName('');
      setMachineModel('');
      setAmount('');
      setSelectedPoId('');
      setTargetDispatchDate('');

      dispatch(setActiveProjectId(res.project?.projectId));

      dispatch(
        addToast({
          type: 'success',
          title: 'All set! Master Work Order Minted',
          message: `Project ${res.project?.projectId} minted with ${res.milestonesCount || 8} stages initialized.`
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Project Minting Blocked',
          message: err?.data?.message || 'We could not save this right now. Please check fields and try again.'
        })
      );
    }
  };

  const formatIndianCurrency = (amountINR: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amountINR);
  };

  return (
    <div className="space-y-6">
      {/* Header and KPI summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Projects
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/project-setup/kanban')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all"
          >
            <Kanban size={15} className="text-orange-500" />
            <span>Kanban Board</span>
          </button>

          <button
            onClick={() => {
              setIsModalOpen(true);
              setCreationMode('CUSTOMER_PO');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all"
          >
            <Plus size={16} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">Total Projects</div>
          <div className="text-2xl font-extrabold text-slate-900">{projects.length}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">Design & BOM</div>
          <div className="text-2xl font-extrabold text-orange-600">
            {projects.filter((p) => p.currentStage === 'DESIGN_BOM').length}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">Assembly & Trial</div>
          <div className="text-2xl font-extrabold text-sky-600">
            {
              projects.filter(
                (p) =>
                  p.currentStage === 'PRODUCTION_ASSEMBLY' || p.currentStage === 'MACHINE_TRIAL'
              ).length
            }
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">Dispatch Ready</div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {projects.filter((p) => p.currentStage === 'DISPATCH_READY').length}
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PRJ-ID, WO, customer, machine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Stage:</span>
          {['', 'PROJECT_SETUP', 'DESIGN_BOM', 'PROCUREMENT', 'PRODUCTION_ASSEMBLY', 'DISPATCH_READY'].map((st) => (
            <button
              key={st}
              onClick={() => setStageFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                stageFilter === st
                  ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === '' ? 'All Stages' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
            Loading project records...
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Cpu size={36} className="mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No Machine Projects Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by minting a new project based on a confirmed Customer PO or direct entry.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
            >
              <Plus size={15} /> Mint First Project
            </button>
          </div>
        ) : (
          projects.map((p) => {
            const hasPo = Boolean(p.customerPoNumber || p.customerPoRef);

            return (
              <div
                key={p._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                          {p.projectId}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-slate-500">
                          {p.workOrderNumber}
                        </span>
                      </div>
                      {hasPo && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                          <FileCheck2 size={12} className="text-emerald-600" />
                          <span>PO: {p.customerPoNumber || p.customerPoRef?.poNumber}</span>
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-slate-100 text-slate-700">
                      {p.currentStage?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                    {p.projectName}
                  </h3>

                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <Building2 size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{p.customerName}</span>
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <Cpu size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{p.machineModel}</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                        Contract Value
                      </span>
                      <span className="font-bold text-slate-900 font-mono">
                        {p.contractValue?.currency === 'INR'
                          ? formatIndianCurrency(p.contractValue?.amount || 0)
                          : `${p.contractValue?.currency} ${p.contractValue?.amount?.toLocaleString()}`}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                        Target Dispatch
                      </span>
                      <span className="font-medium text-slate-700 text-xs font-mono">
                        {p.targetDispatchDate
                          ? new Date(p.targetDispatchDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'TBD'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenKanban(p.projectId)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 text-xs font-bold transition-colors"
                  >
                    <Kanban size={13} />
                    <span>Project Kanban</span>
                  </button>

                  <button
                    onClick={() => handleSelectProject(p.projectId)}
                    title="Set as active reference across all modules"
                    className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span>Set Active</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mint Work Order Standard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Standard Crisp White Ribbon Header with Amber Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Cpu size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    New Project
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body with internal scrolling */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Creation Mode Segmented Button Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Creation Mode
                </label>
                <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setCreationMode('CUSTOMER_PO')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-initial ${
                      creationMode === 'CUSTOMER_PO'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileCheck2 size={14} />
                    <span>Based on Customer PO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreationMode('DIRECT')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-initial ${
                      creationMode === 'DIRECT'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Plus size={14} />
                    <span>Direct / Self Creation</span>
                  </button>
                </div>
              </div>

              {/* Mode A: Customer PO Selection */}
              {creationMode === 'CUSTOMER_PO' && (
                <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">
                      Select Customer Purchase Order
                    </span>
                  </div>

                  {isLoadingPos ? (
                    <div className="text-xs text-slate-500 py-2">Loading customer purchase orders...</div>
                  ) : availablePos.length === 0 ? (
                    <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-amber-200">
                      No pending customer POs available in CRM. You can enter details manually below or switch to Direct Creation.
                    </div>
                  ) : (
                    <select
                      value={selectedPoId}
                      onChange={(e) => handleSelectPo(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 font-medium focus:border-orange-500 focus:outline-none"
                    >
                      <option value="">-- Choose a Customer Purchase Order --</option>
                      {availablePos.map((po) => (
                        <option key={po._id} value={po._id}>
                          {po.poNumber} — {po.companyName || po.customerName} ({po.currency} {po.totalAmount?.amount?.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Machine & Commercial Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Project Work Order Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BHEL Power Grids — AFW-1200 Execution"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Schneider Electric Ltd"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Machine Model / Product Line *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AFW-1200-PRO High Speed Winder"
                    value={machineModel}
                    onChange={(e) => setMachineModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Currency & Amount *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={currency}
                      onChange={(e) => {
                        setCurrency(e.target.value);
                        if (e.target.value === 'INR') setExchangeRate(1.0);
                      }}
                      className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none font-bold"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>

                    <input
                      type="number"
                      required
                      placeholder="8500000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Dispatch Date
                  </label>
                  <input
                    type="date"
                    value={targetDispatchDate}
                    onChange={(e) => setTargetDispatchDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Stage Master Template Selection */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800">
                      Standard Stages
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStageCodes.length === stageMasters.length) {
                        setSelectedStageCodes([]);
                      } else {
                        setSelectedStageCodes(stageMasters.map((s) => s.stageCode));
                      }
                    }}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                  >
                    {selectedStageCodes.length === stageMasters.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                  {stageMasters.map((stage, idx) => {
                    const isChecked = selectedStageCodes.includes(stage.stageCode);
                    return (
                      <label
                        key={stage._id || stage.stageCode}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all border text-xs ${
                          isChecked
                            ? 'bg-white border-orange-300 shadow-xs'
                            : 'bg-transparent border-transparent text-slate-500 hover:bg-white/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStageCodes([...selectedStageCodes, stage.stageCode]);
                            } else {
                              setSelectedStageCodes(selectedStageCodes.filter((c) => c !== stage.stageCode));
                            }
                          }}
                          className="mt-0.5 rounded text-orange-500 focus:ring-orange-500"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-400">#{idx + 1}</span>
                            <span className="truncate">{stage.stageName}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {stage.leadRole} • +{stage.standardDaysOffset || 14} days
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleCreateSubmit}
                disabled={isCreating}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
