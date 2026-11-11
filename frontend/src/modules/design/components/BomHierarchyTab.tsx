'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import {
  Layers,
  Cpu,
  CornerDownRight,
  FileCode2,
  Plus,
  Upload,
  CheckCircle2,
  History,
  Settings,
  X,
  Link2,
  FolderGit2,
  UserCheck
} from 'lucide-react';
import {
  useGetBomByProjectQuery,
  useGetDesignMastersQuery,
  useSaveDesignMasterItemMutation,
  useAddDesignFileVersionMutation,
  useAttachAssemblyToProjectMutation,
  useUpdateDesignMasterConfigMutation
} from '../api/designApi';
import {
  useGetProjectsQuery,
  useGetStageMastersQuery,
  useCreateSubStageMasterMutation,
  useGetMilestonesQuery,
  useGetDepartmentUsersQuery,
  useAddSubStageToMilestoneMutation,
  useUpdateSubStageMutation
} from '../../project-setup/api/projectApi';
import { setActiveProjectId, addToast } from '../../../store/uiSlice';

export default function BomHierarchyTab({
  initialSubTab
}: {
  initialSubTab?: 'PROJECT_BOM' | 'MASTERS' | 'SUB_STAGES' | 'POLICY';
} = {}) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const { activeProjectId } = useAppSelector((state) => state.ui);

  const activeView: 'PROJECT_BOM' | 'MASTERS' | 'SUB_STAGES' | 'POLICY' =
    initialSubTab ||
    (pathname?.endsWith('/masters')
      ? 'MASTERS'
      : pathname?.endsWith('/sub-stages')
      ? 'SUB_STAGES'
      : pathname?.endsWith('/prefix-policy')
      ? 'POLICY'
      : 'PROJECT_BOM');
  const [selectedMasterTier, setSelectedMasterTier] = useState<string>('ALL');

  // Fetch projects mentioning a Design stage
  const { data: designProjectsData, isLoading: isDesignProjectsLoading } = useGetProjectsQuery(
    { departmentModule: 'design' },
    { skip: activeView !== 'SUB_STAGES' }
  );
  const designProjects = useMemo(() => designProjectsData?.projects || [], [designProjectsData]);

  const [selectedDesignProjId, setSelectedDesignProjId] = useState<string>('');
  const currentSubStageProjId = useMemo(() => {
    if (selectedDesignProjId) return selectedDesignProjId;
    if (activeProjectId && designProjects.some((p: any) => p.projectId === activeProjectId)) {
      return activeProjectId;
    }
    return designProjects[0]?.projectId || '';
  }, [selectedDesignProjId, activeProjectId, designProjects]);

  const currentProject = useMemo(() => {
    return designProjects.find((p: any) => p.projectId === currentSubStageProjId);
  }, [designProjects, currentSubStageProjId]);

  const { data: bomData, isLoading: bomLoading } = useGetBomByProjectQuery(activeProjectId, {
    skip: !activeProjectId || activeView !== 'PROJECT_BOM'
  });
  const { data: mastersData, isLoading: mastersLoading } = useGetDesignMastersQuery(
    {},
    { skip: activeView === 'SUB_STAGES' }
  );
  const { data: stageMastersData } = useGetStageMastersQuery({}, { skip: activeView !== 'SUB_STAGES' });
  const { data: milestonesData, isLoading: isMilestonesLoading } = useGetMilestonesQuery(currentSubStageProjId, {
    skip: !currentSubStageProjId || activeView !== 'SUB_STAGES'
  });
  const { data: deptUsersData } = useGetDepartmentUsersQuery(undefined, {
    skip: activeView !== 'SUB_STAGES'
  });

  const [attachAssembly, { isLoading: isAttaching }] = useAttachAssemblyToProjectMutation();
  const [saveDesignItem, { isLoading: isSavingMaster }] = useSaveDesignMasterItemMutation();
  const [addFileVersion, { isLoading: isUploadingVer }] = useAddDesignFileVersionMutation();
  const [updateDesignConfig, { isLoading: isSavingPolicy }] = useUpdateDesignMasterConfigMutation();
  const [createSubStageMaster] = useCreateSubStageMasterMutation();
  const [addSubStageToMilestone] = useAddSubStageToMilestoneMutation();
  const [updateSubStage] = useUpdateSubStageMutation();

  const bom = bomData?.bom;
  const bomItems = bom?.items || [];
  const designItems = mastersData?.items || [];
  const assemblyMasters = designItems.filter((i: any) => i.itemType === 'ASSEMBLY');

  const [selectedAssemblyCode, setSelectedAssemblyCode] = useState<string>('');
  const [machineQty, setMachineQty] = useState<number>(1);

  // Add/Edit Design Master Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemForm, setItemForm] = useState({
    itemCode: '',
    itemName: '',
    itemType: 'COMPONENT',
    category: 'Mechanical',
    subAssemblyGroup: 'Traverse Assembly',
    makeOrBuy: 'MAKE',
    baseUom: 'Nos',
    altUom: 'Nos',
    conversionRatio: 1,
    hsnCode: '8479',
    standardRateINR: 0,
    drawingNumber: '',
    specifications: '',
    primaryPhotoUrl: '/branding/mh_icon.png'
  });

  // File Version Modal
  const [versionTargetItem, setVersionTargetItem] = useState<any>(null);
  const [versionForm, setVersionForm] = useState({
    fileCategory: 'PDF_2D',
    fileName: '',
    fileUrl: '',
    changeNotes: ''
  });

  // Design Sub-Stage Form
  const [subStageForm, setSubStageForm] = useState({
    subStageCode: '',
    subStageName: '',
    estimatedDays: 3
  });

  const [policyForm, setPolicyForm] = useState<any>(null);

  const currentPolicy = policyForm || mastersData?.prefixLockPolicy || {
    rmPrefix: 'RM',
    boPrefix: 'BO',
    componentPrefix: 'CMP',
    subAssemblyPrefix: 'SUB',
    assemblyPrefix: 'ASM',
    bomPrefix: 'BOM',
    ecoPrefix: 'ECO',
    lockBomOnFreeze: true,
    autoSendNetDemandToPurchase: true
  };

  const handleAttachAssembly = async () => {
    const code = selectedAssemblyCode || assemblyMasters[0]?.itemCode;
    if (!activeProjectId || !code) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Please select an active Project and an Assembly Machine first.'
        })
      );
      return;
    }

    try {
      const res = await attachAssembly({
        projectId: activeProjectId,
        assemblyCode: code,
        machineQuantity: machineQty
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: res.message || `All set! Assembly ${code} attached to ${activeProjectId}.`
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || 'We could not attach the assembly right now.'
        })
      );
    }
  };

  const handleSaveMasterItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await saveDesignItem(itemForm).unwrap();
      dispatch(addToast({ type: 'success', message: res.message || 'All set! Design Master saved.' }));
      setShowItemModal(false);
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || 'We could not save the Design Master right now.'
        })
      );
    }
  };

  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionTargetItem) return;
    try {
      const res = await addFileVersion({
        id: versionTargetItem._id || versionTargetItem.id,
        ...versionForm
      }).unwrap();
      dispatch(addToast({ type: 'success', message: res.message || 'All set! New file version released.' }));
      setVersionTargetItem(res.item);
      setVersionForm({ fileCategory: 'PDF_2D', fileName: '', fileUrl: '', changeNotes: '' });
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || 'We could not save the file version right now.'
        })
      );
    }
  };

  const handleCreateDesignSubStage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSubStageMaster({
        ...subStageForm,
        parentStageCode: 'STG-DESIGN',
        moduleSlug: 'design'
      }).unwrap();
      dispatch(addToast({ type: 'success', message: 'All set! Design sub-stage added.' }));
      setSubStageForm({ subStageCode: '', subStageName: '', estimatedDays: 3 });
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err?.data?.message || 'Could not add sub-stage.' }));
    }
  };

  const handleSavePolicy = async () => {
    try {
      await updateDesignConfig({ prefixLockPolicy: currentPolicy }).unwrap();
      dispatch(addToast({ type: 'success', message: 'All set! Design prefix and lock policy saved.' }));
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err?.data?.message || 'Could not save policy.' }));
    }
  };

  const filteredMasters =
    selectedMasterTier === 'ALL'
      ? designItems
      : designItems.filter((i: any) => i.itemType === selectedMasterTier);

  const designSubStageMasters = (stageMastersData?.subStages || []).filter(
    (s: any) =>
      s.moduleSlug === 'design' ||
      s.parentStageCode === 'STG-DESIGN' ||
      s.departmentModule === 'design' ||
      s.parentStageCode === 'DESIGN'
  );

  const designMilestone = (milestonesData?.milestones || []).find(
    (m: any) =>
      m.departmentModule === 'design' ||
      m.moduleSlug === 'design' ||
      m.stageCode === 'DESIGN' ||
      m.stageCode === 'STG-DESIGN' ||
      (m.title && m.title.toLowerCase().includes('design'))
  );

  const designUsers = deptUsersData?.users || [];

  // Project-Specific Sub-Stage Creation Form State
  const [newSubStageTitle, setNewSubStageTitle] = useState('');
  const [newSubStageCode, setNewSubStageCode] = useState('');
  const [newSubStageDate, setNewSubStageDate] = useState('');
  const [newSubStageUserId, setNewSubStageUserId] = useState('');
  const [isAddingProjectSubStage, setIsAddingProjectSubStage] = useState(false);

  const handleAddProjectSubStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designMilestone || !newSubStageTitle.trim()) {
      dispatch(addToast({ type: 'error', message: 'Sub-stage title is required.' }));
      return;
    }
    try {
      setIsAddingProjectSubStage(true);
      const engineer = designUsers.find((u: any) => u.id === newSubStageUserId);
      await addSubStageToMilestone({
        id: designMilestone._id || designMilestone.id,
        title: newSubStageTitle.trim(),
        subStageName: newSubStageTitle.trim(),
        subStageCode:
          newSubStageCode.trim().toUpperCase() ||
          newSubStageTitle.trim().toUpperCase().replace(/\s+/g, '_'),
        targetDate: newSubStageDate ? new Date(newSubStageDate) : undefined,
        assignedToUserId: newSubStageUserId || undefined,
        assignedToUserName: engineer ? `${engineer.firstName} ${engineer.lastName}` : undefined
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          title: 'Sub-Stage Added',
          message: `Added '${newSubStageTitle}' to project ${currentSubStageProjId}.`
        })
      );
      setNewSubStageTitle('');
      setNewSubStageCode('');
      setNewSubStageDate('');
      setNewSubStageUserId('');
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Failed',
          message: err?.data?.message || 'Could not add sub-stage to project.'
        })
      );
    } finally {
      setIsAddingProjectSubStage(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Button-Type Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/design/bom/hierarchy"
            className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 ${
              activeView === 'PROJECT_BOM'
                ? 'bg-orange-500 text-white font-semibold shadow-xs shadow-orange-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
            }`}
          >
            <Layers size={14} />
            <span>Project BOM & Attach Assembly</span>
          </Link>

          <Link
            href="/design/bom/masters"
            className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 ${
              activeView === 'MASTERS'
                ? 'bg-orange-500 text-white font-semibold shadow-xs shadow-orange-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
            }`}
          >
            <Cpu size={14} />
            <span>5-Tier Design Masters & File Versions ({designItems.length})</span>
          </Link>

          <Link
            href="/design/bom/sub-stages"
            className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 ${
              activeView === 'SUB_STAGES'
                ? 'bg-orange-500 text-white font-semibold shadow-xs shadow-orange-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
            }`}
          >
            <UserCheck size={14} />
            <span>Design Sub-Stages & Assignment</span>
          </Link>

          <Link
            href="/design/masters/prefix-policy"
            className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 ${
              activeView === 'POLICY'
                ? 'bg-orange-500 text-white font-semibold shadow-xs shadow-orange-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
            }`}
          >
            <Settings size={14} />
            <span>Prefix & Lock Policy</span>
          </Link>
        </div>

        {activeView === 'MASTERS' && (
          <button
            type="button"
            onClick={() => setShowItemModal(true)}
            className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>New Design Master</span>
          </button>
        )}
      </div>

      {/* VIEW 1: PROJECT BOM & ATTACH ASSEMBLY */}
      {activeView === 'PROJECT_BOM' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
                <Layers size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-xs font-bold text-orange-600">
                    {activeProjectId || 'Select Project'}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                    {bom?.revision || 'REV-0'}
                  </span>
                  {bom?.assemblyCode && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Attached: {bom.assemblyCode}
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-bold text-slate-900">
                  3-Level Hierarchical Engineering BOM
                </h2>
              </div>
            </div>

            {/* Attach Assembly Machine Control */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedAssemblyCode || assemblyMasters[0]?.itemCode || ''}
                onChange={(e) => setSelectedAssemblyCode(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50"
              >
                {assemblyMasters.map((asm: any) => (
                  <option key={asm.itemCode} value={asm.itemCode}>
                    {asm.itemCode} — {asm.itemName}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                value={machineQty}
                onChange={(e) => setMachineQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-center text-slate-900"
                placeholder="Qty"
              />

              <button
                type="button"
                onClick={handleAttachAssembly}
                disabled={isAttaching || !activeProjectId}
                className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Link2 size={14} />
                <span>{isAttaching ? 'Attaching...' : 'Attach Assembly Machine to Project'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tree Level</th>
                    <th className="py-3 px-4">Item Code</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Master Tier</th>
                    <th className="py-3 px-4">Make / Buy</th>
                    <th className="py-3 px-4">Quantity (Dual UOM)</th>
                    <th className="py-3 px-4">Drawing / Version</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {bomLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-500">
                        Loading Project BOM...
                      </td>
                    </tr>
                  ) : bomItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-500">
                        No Assembly Machine attached to {activeProjectId || 'this project'} yet. Select an Assembly above and click &quot;Attach Assembly Machine to Project&quot;.
                      </td>
                    </tr>
                  ) : (
                    bomItems.map((item: any, idx: number) => {
                      const isLevel1 = item.level === 1;
                      const isLevel2 = item.level === 2;
                      const isLevel3 = item.level === 3;
                      const isFrozen = item.ecoStatus === 'FROZEN_ECO';
                      const baseQty = item.baseQty ?? item.quantity?.baseQty ?? item.quantityPerMachine ?? 1;
                      const baseUom = item.baseUom ?? item.quantity?.baseUom ?? 'Nos';
                      const altQty = item.altQty ?? item.quantity?.altQty;
                      const altUom = item.altUom ?? item.quantity?.altUom;

                      return (
                        <tr
                          key={`${item.itemCode}-${idx}`}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isLevel1 ? 'bg-slate-50/60 font-semibold' : ''
                          } ${isFrozen ? 'bg-red-50/40' : ''}`}
                        >
                          <td className="py-3 px-4">
                            <div className={`flex items-center ${isLevel2 ? 'pl-4' : isLevel3 ? 'pl-8' : ''}`}>
                              {isLevel1 && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-orange-500 text-white uppercase">
                                  L1 • Machine
                                </span>
                              )}
                              {isLevel2 && (
                                <div className="flex items-center gap-1">
                                  <CornerDownRight size={13} className="text-slate-400" />
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                    L2 • Sub-Asm
                                  </span>
                                </div>
                              )}
                              {isLevel3 && (
                                <div className="flex items-center gap-1">
                                  <CornerDownRight size={13} className="text-orange-500" />
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    L3 • Part
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.itemCode}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{item.itemName}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {item.itemType || 'PART'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase ${
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
                                {baseQty} {baseUom}
                              </span>
                              {altUom && altUom !== baseUom && (
                                <span className="text-[10px] text-slate-500">
                                  ({altQty} {altUom})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {item.drawingNumber ? (
                              <div className="flex items-center gap-1.5 text-sky-700 font-mono text-[11px] font-semibold">
                                <FileCode2 size={13} />
                                <span>{item.drawingNumber}</span>
                                <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 text-[10px]">
                                  {item.versionCode || 'v1'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isFrozen ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                FROZEN ({item.ecoReference || 'ECO'})
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
      )}

      {/* VIEW 2: 5-TIER DESIGN MASTERS & VERSIONED FILES */}
      {activeView === 'MASTERS' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {['ALL', 'RM', 'BO', 'COMPONENT', 'SUB_ASSEMBLY', 'ASSEMBLY'].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedMasterTier(tier)}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${
                  selectedMasterTier === tier
                    ? 'bg-orange-500 text-white font-semibold shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 font-medium'
                }`}
              >
                {tier === 'ALL' ? 'All 5 Tiers' : tier.replace('_', '-')}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tier</th>
                    <th className="py-3 px-4">Item Code</th>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Make/Buy</th>
                    <th className="py-3 px-4">Dual UOM</th>
                    <th className="py-3 px-4">Drawing & Version</th>
                    <th className="py-3 px-4">Audit</th>
                    <th className="py-3 px-4 text-right">Files & Versions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {mastersLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-500">
                        Loading 5-Tier Design Masters...
                      </td>
                    </tr>
                  ) : (
                    filteredMasters.map((item: any) => (
                      <tr key={item.itemCode} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            {item.itemType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.itemCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{item.itemName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                              item.makeOrBuy === 'MAKE'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-orange-50 text-orange-700 border border-orange-200'
                            }`}
                          >
                            {item.makeOrBuy}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {item.baseUom} {item.altUom && item.altUom !== item.baseUom ? `(1:${item.conversionRatio} ${item.altUom})` : ''}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="text-slate-800 font-semibold">{item.drawingNumber || '—'}</span>
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            {item.currentVersion || 'v1'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">
                          {item.updatedByName || item.createdByName || 'System'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setVersionTargetItem(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-semibold text-[11px] inline-flex items-center gap-1"
                          >
                            <FolderGit2 size={13} />
                            <span>Versions ({item.fileVersions?.length || 1})</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: DESIGN SUB-STAGES & USER ASSIGNMENT */}
      {activeView === 'SUB_STAGES' && (
        <div className="space-y-4">
          {/* Project Selector for Projects with Design Stage */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full lg:w-auto">
              <div className="w-full sm:w-80">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Select Project with Design Stage
                </label>
                <div className="relative">
                  <select
                    value={currentSubStageProjId}
                    onChange={(e) => {
                      setSelectedDesignProjId(e.target.value);
                      dispatch(setActiveProjectId(e.target.value));
                    }}
                    disabled={isDesignProjectsLoading || designProjects.length === 0}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none appearance-none pr-9 cursor-pointer transition-colors"
                  >
                    {designProjects.length === 0 ? (
                      <option value="">No projects have a Design stage</option>
                    ) : (
                      designProjects.map((p: any) => (
                        <option key={p.projectId} value={p.projectId}>
                          {p.projectId} — {p.customerName} ({p.machineModel})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {currentProject && (
                <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                      {currentProject.projectId}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                      {currentProject.workOrderNumber || 'WO-PENDING'}
                    </span>
                    {currentProject.deliveryCommitmentDate && (
                      <span className="text-[11px] font-semibold text-slate-500 font-mono">
                        Commitment:{' '}
                        {new Date(currentProject.deliveryCommitmentDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-extrabold text-slate-900">
                    {currentProject.customerName} • {currentProject.machineModel}
                  </div>
                </div>
              )}
            </div>

            {designMilestone && (
              <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Design Stage Status
                  </div>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-orange-50 text-orange-700 border border-orange-200">
                    {designMilestone.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!currentProject || !designMilestone ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <FolderGit2 size={36} className="mx-auto text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-800">
                No Active Design Stage Found
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No project currently includes a Design &amp; CAD stage, or please select a project from the dropdown above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Panel: Add Sub-Stage to Project & Templates */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Plus size={16} className="text-orange-500" />
                    <span>Create Sub-Stage for {currentSubStageProjId}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Add a design sub-stage directly under this project&apos;s Design stage.
                  </p>
                </div>

                <form onSubmit={handleAddProjectSubStage} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sub-Stage Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSubStageTitle}
                      onChange={(e) => setNewSubStageTitle(e.target.value)}
                      placeholder="e.g. 3D Assembly & GA Modeling"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={newSubStageCode}
                        onChange={(e) => setNewSubStageCode(e.target.value.toUpperCase())}
                        placeholder="e.g. DES-3D-GA"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Target Date
                      </label>
                      <input
                        type="date"
                        value={newSubStageDate}
                        onChange={(e) => setNewSubStageDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Assign Design Engineer
                    </label>
                    <select
                      value={newSubStageUserId}
                      onChange={(e) => setNewSubStageUserId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none"
                    >
                      <option value="">-- Select Design Engineer --</option>
                      {designUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingProjectSubStage}
                    className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isAddingProjectSubStage ? 'Adding...' : '+ Add Sub-Stage to Project'}
                  </button>
                </form>

                {/* Reusable Templates List */}
                {designSubStageMasters.length > 0 && (
                  <div className="border-t border-slate-200 pt-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Standard Design Templates
                    </h4>
                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {designSubStageMasters.map((sm: any) => (
                        <div
                          key={sm.subStageCode || sm._id}
                          className="py-2 flex items-center justify-between text-xs gap-2"
                        >
                          <div className="truncate">
                            <span className="font-mono font-bold text-orange-600 mr-1.5">
                              {sm.subStageCode}
                            </span>
                            <span className="font-medium text-slate-800">
                              {sm.subStageName || sm.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await addSubStageToMilestone({
                                id: designMilestone._id || designMilestone.id,
                                title: sm.subStageName || sm.title,
                                subStageCode: sm.subStageCode,
                                subStageName: sm.subStageName || sm.title
                              });
                              dispatch(
                                addToast({
                                  type: 'success',
                                  message: `Attached ${sm.subStageCode} to ${currentSubStageProjId}.`
                                })
                              );
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-700 text-[11px] font-bold shrink-0 cursor-pointer"
                          >
                            + Attach
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel: Active Project Sub-Stages List */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Project Design Sub-Stages ({currentSubStageProjId})
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Sub-stages created and managed by the Design team for this project.
                    </p>
                  </div>

                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
                    {(designMilestone.subStages || []).filter((s: any) => s.status === 'COMPLETED').length}{' '}
                    of {(designMilestone.subStages || []).length} Completed
                  </span>
                </div>

                {(!designMilestone.subStages || designMilestone.subStages.length === 0) ? (
                  <div className="text-xs text-slate-500 py-12 text-center">
                    No sub-stages added to this project yet. Use the form on the left to add your first design sub-stage.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(designMilestone.subStages || []).map((sub: any, idx: number) => (
                      <div
                        key={sub._id || sub.id || idx}
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                              #{sub.order || idx + 1}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-orange-600">
                              {sub.subStageCode}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {sub.title || sub.subStageName}
                            </span>
                          </div>

                          {sub.targetDate && (
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                              <span>Target:</span>
                              <span>
                                {new Date(sub.targetDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={sub.assignedToUserId || sub.assignedToId || ''}
                            onChange={(e) => {
                              const u = designUsers.find((usr: any) => usr.id === e.target.value);
                              updateSubStage({
                                subStageId: sub._id || sub.id,
                                assignedToUserId: e.target.value || null,
                                assignedToUserName: u ? `${u.firstName} ${u.lastName}` : ''
                              });
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-medium text-slate-800"
                          >
                            <option value="">Assign Engineer...</option>
                            {designUsers.map((u: any) => (
                              <option key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
                              </option>
                            ))}
                          </select>

                          <select
                            value={sub.status}
                            onChange={(e) =>
                              updateSubStage({
                                subStageId: sub._id || sub.id,
                                status: e.target.value
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold ${
                              sub.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : sub.status === 'IN_PROGRESS'
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="NOT_STARTED">NOT_STARTED</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="COMPLETED">COMPLETED</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: PREFIX & LOCK POLICY */}
      {activeView === 'POLICY' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Design Prefixes & Lock Policy</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'rmPrefix', label: 'Raw Material (RM) Prefix' },
              { key: 'boPrefix', label: 'Bought-Out (BO) Prefix' },
              { key: 'componentPrefix', label: 'Component Prefix' },
              { key: 'subAssemblyPrefix', label: 'Sub-Assembly Prefix' },
              { key: 'assemblyPrefix', label: 'Assembly Machine Prefix' },
              { key: 'bomPrefix', label: 'Project BOM Prefix' }
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={currentPolicy[f.key] || ''}
                  onChange={(e) => setPolicyForm({ ...currentPolicy, [f.key]: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSavePolicy}
              disabled={isSavingPolicy}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs"
            >
              Save Design Policy
            </button>
          </div>
        </div>
      )}

      {/* MODAL: NEW DESIGN MASTER */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Cpu size={18} />
                </div>
                <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                  Add / Edit 5-Tier Design Master
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMasterItem} className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Master Tier</label>
                <select
                  value={itemForm.itemType}
                  onChange={(e) => setItemForm({ ...itemForm, itemType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="RM">RM (Raw Material)</option>
                  <option value="BO">BO (Bought-Out)</option>
                  <option value="COMPONENT">COMPONENT</option>
                  <option value="SUB_ASSEMBLY">SUB_ASSEMBLY</option>
                  <option value="ASSEMBLY">ASSEMBLY (Complete Machine)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Code</label>
                <input
                  type="text"
                  required
                  value={itemForm.itemCode}
                  onChange={(e) => setItemForm({ ...itemForm, itemCode: e.target.value.toUpperCase() })}
                  placeholder="CMP-WIRE-GUIDE-02"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={itemForm.itemName}
                  onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
                  placeholder="Item description"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Make or Buy</label>
                <select
                  value={itemForm.makeOrBuy}
                  onChange={(e) => setItemForm({ ...itemForm, makeOrBuy: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="MAKE">MAKE (In-House)</option>
                  <option value="BUY">BUY (Purchase)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Drawing Number</label>
                <input
                  type="text"
                  value={itemForm.drawingNumber}
                  onChange={(e) => setItemForm({ ...itemForm, drawingNumber: e.target.value.toUpperCase() })}
                  placeholder="DRG-CMP-305"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMaster}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs"
                >
                  {isSavingMaster ? 'Saving...' : 'Save Design Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FILE VERSIONS (v1, v2, v3...) */}
      {versionTargetItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Design File Versions — {versionTargetItem.itemCode} ({versionTargetItem.currentVersion})
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVersionTargetItem(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <form onSubmit={handleUploadNewVersion} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">File Category</label>
                  <select
                    value={versionForm.fileCategory}
                    onChange={(e) => setVersionForm({ ...versionForm, fileCategory: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="PDF_2D">2D Drawing PDF</option>
                    <option value="CAD_3D">3D CAD (.STEP / .DWG)</option>
                    <option value="PHOTO">Part / Machine Photo</option>
                    <option value="SPEC_SHEET">Spec Sheet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">File Name</label>
                  <input
                    type="text"
                    required
                    value={versionForm.fileName}
                    onChange={(e) => setVersionForm({ ...versionForm, fileName: e.target.value })}
                    placeholder={`${versionTargetItem.itemCode}_next.pdf`}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Revision Note</label>
                  <input
                    type="text"
                    required
                    value={versionForm.changeNotes}
                    onChange={(e) => setVersionForm({ ...versionForm, changeNotes: e.target.value })}
                    placeholder="Updated bore tolerance"
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isUploadingVer}
                    className="w-full py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Upload size={13} />
                    <span>Release Next Version</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {(versionTargetItem.fileVersions || []).map((ver: any) => (
                  <div
                    key={ver._id || ver.id}
                    className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded-lg font-mono font-bold bg-orange-50 text-orange-700 border border-orange-200">
                        {ver.versionCode}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        {ver.fileCategory}
                      </span>
                      <span className="font-mono font-semibold text-slate-900">{ver.fileName}</span>
                      <span className="text-slate-500">{ver.changeNotes}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      By {ver.createdByName || 'System'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
