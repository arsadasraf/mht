'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FolderGit2,
  Search,
  RotateCcw,
  Eye,
  Plus,
  Calendar,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  ChevronRight,
  Trash2,
  ExternalLink,
  Check,
  X,
  FileCode2,
  Lock,
  Cpu,
  Download,
  ShieldCheck,
  Ban,
  FileText,
  PackageCheck
} from 'lucide-react';
import WorkOrderBomBadge from '../../../components/ui/WorkOrderBomBadge';
import {
  useGetProjectsQuery,
  useGetMilestonesQuery,
  useGetSubStageMastersQuery,
  useGetDepartmentUsersQuery,
  useAddSubStageToMilestoneMutation,
  useUpdateSubStageMutation,
  useDeleteSubStageMutation
} from '../../project-setup/api/projectApi';
import {
  useGetDesignTeamUsersQuery,
  useGetBomsQuery,
  useGetFgItemsQuery,
  useGetRmItemsQuery,
  useGetDesignMastersQuery,
  useAttachDrawingToProjectMutation,
  useRemoveAttachedDrawingMutation,
  useApproveBomMutation,
  useRejectBomMutation
} from '../api/designApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';
import SearchableSelect, { SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import ConfirmModal from '../../../components/ui/ConfirmModal';

export default function DesignProjectsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string[] | null>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Modals state
  const [selectedProjectForSubStages, setSelectedProjectForSubStages] = useState<any | null>(null);
  const [selectedProjectForDrawing, setSelectedProjectForDrawing] = useState<any | null>(null);
  const [previewProject, setPreviewProject] = useState<any | null>(null);
  const [previewTab, setPreviewTab] = useState<'substages' | 'bom-boq' | 'machines'>('substages');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drawing attachment state inside modal
  const [drawingTierTab, setDrawingTierTab] = useState<'ALL' | 'ASSEMBLY' | 'SUB_ASSEMBLY' | 'COMPONENT'>('ALL');
  const [selectedDrawingCode, setSelectedDrawingCode] = useState<string>('');
  const [machineQty, setMachineQty] = useState<number>(1);
  const [attachMode, setAttachMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [deletingDrawingId, setDeletingDrawingId] = useState<string | null>(null);

  // New Sub-Stage form state
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedMasterSubStageId, setSelectedMasterSubStageId] = useState('');
  const [customSubStageTitle, setCustomSubStageTitle] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('16');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');

  // Sub-stage deletion confirmation state
  const [deletingSubStageId, setDeletingSubStageId] = useState<string | null>(null);

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({
    departmentModule: 'design'
  });
  const { data: subStageMastersData } = useGetSubStageMastersQuery({
    departmentModule: 'design'
  });
  const { data: deptUsersData } = useGetDepartmentUsersQuery();
  const { data: designTeamData } = useGetDesignTeamUsersQuery();
  const { data: bomsData, isLoading: isLoadingBoms } = useGetBomsQuery({});
  const { data: fgItemsData, isLoading: isLoadingFg } = useGetFgItemsQuery({});
  const { data: rmItemsData } = useGetRmItemsQuery({});
  const { data: designMastersData } = useGetDesignMastersQuery({});

  // Mutations
  const [addSubStage, { isLoading: isAddingSubStage }] = useAddSubStageToMilestoneMutation();
  const [updateSubStage, { isLoading: isUpdatingSubStage }] = useUpdateSubStageMutation();
  const [deleteSubStage, { isLoading: isDeletingSubStage }] = useDeleteSubStageMutation();
  const [attachDrawing, { isLoading: isAttachingDrawing }] = useAttachDrawingToProjectMutation();
  const [removeDrawing, { isLoading: isRemovingDrawing }] = useRemoveAttachedDrawingMutation();
  const [approveBom, { isLoading: isApprovingBom }] = useApproveBomMutation();
  const [rejectBom, { isLoading: isRejectingBom }] = useRejectBomMutation();

  const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const subStageMasters = useMemo(() => subStageMastersData?.subStages || [], [subStageMastersData]);
  const departmentUsers = useMemo(() => deptUsersData?.users || [], [deptUsersData]);
  const designTeamUsers = useMemo(() => designTeamData?.users || [], [designTeamData]);

  // Aggregate ALL Master Design Drawings across FgItemMaster, RmItemMaster & DesignItemMaster
  const masterDrawings = useMemo(() => {
    const list: any[] = [];
    const seenCodes = new Set<string>();

    // 1. FG Item Masters (User's real design drawings: Assemblies, Sub-Assemblies, Components)
    if (fgItemsData?.items) {
      for (const fg of fgItemsData.items) {
        const code = String(fg.name || '').trim();
        if (code && !seenCodes.has(code.toUpperCase())) {
          seenCodes.add(code.toUpperCase());
          list.push({
            id: fg.id,
            itemCode: code,
            itemName: fg.description ? `${code} — ${fg.description}` : code,
            drawingNumber: code,
            classification: (fg.classification || 'COMPONENT').toUpperCase(),
            itemType: (fg.classification || 'COMPONENT').toUpperCase(),
            category: fg.categoryName || 'Design Drawing',
            revision: fg.revision || 'Rev 1.0',
            description: fg.description || '',
            make: fg.make || '',
            pdfUrl: fg.pdfUrl,
            photoUrl: fg.photoUrl || (Array.isArray(fg.photos) && fg.photos[0]),
            uom: fg.uom || 'Nos'
          });
        }
      }
    }

    // 2. Design Item Masters (if any)
    if (designMastersData?.items) {
      for (const dm of designMastersData.items) {
        const code = String(dm.itemCode || dm.itemName || '').trim();
        if (code && !seenCodes.has(code.toUpperCase())) {
          seenCodes.add(code.toUpperCase());
          list.push({
            id: dm.id,
            itemCode: code,
            itemName: dm.itemName || code,
            drawingNumber: dm.drawingNumber || code,
            classification: (dm.itemType || 'COMPONENT').toUpperCase(),
            itemType: (dm.itemType || 'COMPONENT').toUpperCase(),
            category: dm.category || 'Mechanical',
            revision: dm.currentVersion || 'v1',
            description: dm.specifications || '',
            pdfUrl: dm.primaryPdfUrl,
            photoUrl: dm.primaryPhotoUrl,
            uom: dm.baseUom || 'Nos'
          });
        }
      }
    }

    // 3. RM Item Masters
    if (rmItemsData?.items) {
      for (const rm of rmItemsData.items) {
        const code = String(rm.name || '').trim();
        if (code && !seenCodes.has(code.toUpperCase())) {
          seenCodes.add(code.toUpperCase());
          list.push({
            id: rm.id,
            itemCode: code,
            itemName: rm.description ? `${code} — ${rm.description}` : code,
            drawingNumber: code,
            classification: 'COMPONENT',
            itemType: 'RM',
            category: rm.categoryName || 'Raw Material',
            revision: rm.revision || 'Rev 1.0',
            description: rm.description || '',
            pdfUrl: rm.pdfUrl,
            photoUrl: rm.photoUrl,
            uom: rm.uom || 'Kg'
          });
        }
      }
    }

    return list;
  }, [fgItemsData, designMastersData, rmItemsData]);

  // Map BOMs by uppercase projectId
  const bomsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (bomsData?.boms) {
      for (const b of bomsData.boms) {
        if (b.projectId) map.set(b.projectId.toUpperCase(), b);
      }
    }
    return map;
  }, [bomsData]);

  // Only users who are active members of the Design Team (isInTeam === true) can be assigned
  const activeDesignTeamEngineers = useMemo(() => {
    return designTeamUsers.filter((u: any) => u.isInTeam === true);
  }, [designTeamUsers]);

  // Extract design stage details per project, join live BOM data, and calculate urgency
  const designProjects = useMemo(() => {
    return rawProjects
      .map((proj: any) => {
        const milestones = proj.milestones || [];
        const designMilestone =
          milestones.find(
            (m: any) =>
              (m.departmentModule && m.departmentModule.toLowerCase() === 'design') ||
              (m.stageCode && m.stageCode.toLowerCase().includes('design')) ||
              (m.title && m.title.toLowerCase().includes('design'))
          ) || milestones[0];

        const targetDateObj = designMilestone?.baselineDate || designMilestone?.projectedDate
          ? new Date(designMilestone.baselineDate || designMilestone.projectedDate)
          : null;
        const targetTs = targetDateObj ? targetDateObj.getTime() : 9999999999999;
        const nowTs = Date.now();
        const daysLeft = targetDateObj
          ? Math.round((targetTs - nowTs) / (1000 * 60 * 60 * 24))
          : null;
        const isOverdue = daysLeft !== null && daysLeft < 0 && designMilestone?.status !== 'COMPLETED';

        const subStages = designMilestone?.subStages || [];
        const completedCount = subStages.filter((s: any) => s.status === 'COMPLETED').length;
        const totalSubStages = subStages.length;
        const progressPercent =
          totalSubStages > 0 ? Math.round((completedCount / totalSubStages) * 100) : 0;

        // Join live BOM record
        const rawBom = bomsMap.get(String(proj.projectId).toUpperCase());
        const attachedDrawings = Array.isArray(rawBom?.attachedDrawings) ? rawBom.attachedDrawings : [];
        const hasBom = Boolean(
          rawBom &&
            (attachedDrawings.length > 0 || rawBom.attachedAssemblyCode || (rawBom.items && rawBom.items.length > 0))
        );
        const approvalStatus = rawBom?.approvalStatus || (rawBom?.isFrozen ? 'LOCKED_FREEZE' : hasBom ? 'DRAFT' : 'NO_DRAWING');
        const isBomLocked = Boolean(rawBom?.isFrozen || approvalStatus === 'LOCKED_FREEZE');

        let drawingBadgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
        let drawingStatusLabel = 'No Drawing';

        if (approvalStatus === 'PENDING_APPROVAL') {
          drawingBadgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
          drawingStatusLabel = 'Pending Approval';
        } else if (approvalStatus === 'LOCKED_FREEZE') {
          drawingBadgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold';
          drawingStatusLabel = 'Approved & Locked';
        } else if (approvalStatus === 'APPROVED') {
          drawingBadgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
          drawingStatusLabel = 'Approved (Live)';
        } else if (approvalStatus === 'REJECTED') {
          drawingBadgeStyle = 'bg-red-50 text-red-700 border-red-200 font-bold';
          drawingStatusLabel = 'Revision Needed';
        } else if (hasBom) {
          drawingBadgeStyle = 'bg-sky-50 text-sky-700 border-sky-200 font-bold';
          drawingStatusLabel = 'Draft Drawing';
        }

        const primaryDrawingCode = attachedDrawings[0]?.itemCode || rawBom?.attachedAssemblyCode || '';
        const drawingsCount = attachedDrawings.length;

        return {
          id: proj.id,
          _id: proj.id,
          projectId: proj.projectId,
          workOrderNumber: proj.workOrderNumber || 'WO-PENDING',
          customerName: proj.customerName || 'Customer',
          machineModel: proj.machineModel || 'Precision Winding Machine',
          designMilestoneId: designMilestone?.id || '',
          designStageTitle: designMilestone?.title || 'Design & CAD',
          designStageCode: designMilestone?.stageCode || 'STG-DESIGN',
          designStatus: designMilestone?.status || 'NOT_STARTED',
          targetDateObj,
          targetTs,
          daysLeft,
          isOverdue,
          subStages,
          completedCount,
          totalSubStages,
          progressPercent,
          rawProject: proj,
          rawMilestone: designMilestone,
          // BOM & Drawing attributes
          hasBom,
          bom: rawBom,
          attachedDrawings,
          drawingsCount,
          primaryDrawingCode,
          drawingApprovalStatus: approvalStatus,
          drawingStatusLabel,
          drawingBadgeStyle,
          isBomLocked
        };
      })
      .sort((a, b) => a.targetTs - b.targetTs);
  }, [rawProjects, bomsMap]);

  // Live selected project with refreshed milestone sub-stages
  const activeSelectedProject = useMemo(() => {
    if (!selectedProjectForSubStages) return null;
    return (
      designProjects.find((p) => p.projectId === selectedProjectForSubStages.projectId) ||
      selectedProjectForSubStages
    );
  }, [selectedProjectForSubStages, designProjects]);

  // Live selected project for drawing attachment
  const activeDrawingProject = useMemo(() => {
    if (!selectedProjectForDrawing) return null;
    return (
      designProjects.find((p) => p.projectId === selectedProjectForDrawing.projectId) ||
      selectedProjectForDrawing
    );
  }, [selectedProjectForDrawing, designProjects]);

  // Live selected project for large dossier preview modal
  const activePreviewProject = useMemo(() => {
    if (!previewProject) return null;
    const found = designProjects.find(
      (p) =>
        p.projectId === previewProject.projectId ||
        p.workOrderNumber === previewProject.workOrderNumber ||
        p.id === previewProject.id
    );
    return found || previewProject;
  }, [previewProject, designProjects]);

  // Master Drawing counts by Tier for Tabs (counts only, no names needed in list)
  const drawingCounts = useMemo(() => {
    let all = masterDrawings.length;
    let asm = 0;
    let sub = 0;
    let cmp = 0;
    masterDrawings.forEach((i: any) => {
      const cls = (i.classification || i.itemType || '').toUpperCase();
      if (cls === 'ASSEMBLY' || cls === 'FG') asm++;
      else if (cls === 'SUB_ASSEMBLY') sub++;
      else cmp++;
    });
    return { all, asm, sub, cmp };
  }, [masterDrawings]);

  // Filtered Master Drawings in Modal by Tier Tab
  const modalMasterDrawings = useMemo(() => {
    let items = [...masterDrawings];
    if (drawingTierTab !== 'ALL') {
      if (drawingTierTab === 'ASSEMBLY') {
        items = items.filter((i: any) => i.classification === 'ASSEMBLY' || i.itemType === 'ASSEMBLY' || i.itemType === 'FG');
      } else if (drawingTierTab === 'SUB_ASSEMBLY') {
        items = items.filter((i: any) => i.classification === 'SUB_ASSEMBLY' || i.itemType === 'SUB_ASSEMBLY');
      } else {
        items = items.filter((i: any) => i.classification === 'COMPONENT' || i.itemType === 'COMPONENT' || i.itemType === 'BO' || i.itemType === 'RM');
      }
    }
    return items;
  }, [masterDrawings, drawingTierTab]);

  // SearchableSelect options for Master Drawings
  const drawingSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    return modalMasterDrawings.map((item) => ({
      value: item.itemCode,
      label: item.itemCode,
      subLabel: `${item.classification} • ${item.revision} • ${item.itemName}`,
      badge: item.classification
    }));
  }, [modalMasterDrawings]);

  // Selected Drawing Master object
  const selectedDrawingMaster = useMemo(() => {
    if (!selectedDrawingCode) return null;
    return masterDrawings.find((m) => m.itemCode.toUpperCase() === selectedDrawingCode.toUpperCase()) || null;
  }, [selectedDrawingCode, masterDrawings]);

  // Filtering & Sorting
  const filteredProjects = useMemo(() => {
    let result = [...designProjects];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.projectId.toLowerCase().includes(q) ||
          p.workOrderNumber.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          p.machineModel.toLowerCase().includes(q) ||
          p.designStageTitle.toLowerCase().includes(q) ||
          p.primaryDrawingCode.toLowerCase().includes(q) ||
          p.drawingStatusLabel.toLowerCase().includes(q)
      );
    }

    // Apply Column Filters
    Object.entries(columnFilters).forEach(([colKey, activeValues]) => {
      if (!activeValues || activeValues.length === 0) return;
      result = result.filter((item) => {
        const val = String((item as any)[colKey] || '');
        return activeValues.includes(val);
      });
    });

    // Apply Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any = (a as any)[sortConfig.key];
        let bVal: any = (b as any)[sortConfig.key];

        if (sortConfig.key === 'targetDateObj') {
          aVal = a.targetTs;
          bVal = b.targetTs;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [designProjects, searchTerm, columnFilters, sortConfig]);

  // Distinct values for Excel Filters
  const distinctWorkOrders = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    designProjects.forEach((p) => {
      const val = p.workOrderNumber || p.projectId;
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [designProjects]);

  const distinctCustomers = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    designProjects.forEach((p) => {
      counts.set(p.customerName, (counts.get(p.customerName) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [designProjects]);

  const distinctModels = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    designProjects.forEach((p) => {
      counts.set(p.machineModel, (counts.get(p.machineModel) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [designProjects]);

  const distinctStages = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    designProjects.forEach((p) => {
      counts.set(p.designStageTitle, (counts.get(p.designStageTitle) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [designProjects]);

  const distinctStatuses = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    designProjects.forEach((p) => {
      counts.set(p.designStatus, (counts.get(p.designStatus) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [designProjects]);

  const distinctDrawingStatuses = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    designProjects.forEach((p) => {
      counts.set(p.drawingStatusLabel, (counts.get(p.drawingStatusLabel) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [designProjects]);

  const isAnyFilterActive =
    searchTerm.trim().length > 0 ||
    Object.values(columnFilters).some((v) => v !== null && v.length > 0) ||
    sortConfig !== null;

  const handleResetFilters = () => {
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig(null);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Open Drawing Modal
  const handleOpenDrawingModal = (project: any) => {
    setSelectedProjectForDrawing(project);
    setDrawingTierTab('ALL');
    setSelectedDrawingCode('');
    setMachineQty(1);
    setAttachMode('APPEND');
    setIsRejectOpen(false);
    setRejectionReasonText('');
    setDeletingDrawingId(null);
  };

  // Attach Drawing from Master to Project
  const handleAttachDrawingSubmit = async () => {
    if (!activeDrawingProject || !selectedDrawingCode) {
      showToast('Please select a master drawing first.');
      return;
    }

    try {
      const res = await attachDrawing({
        projectId: activeDrawingProject.projectId,
        itemCode: selectedDrawingCode,
        machineQuantity: machineQty,
        mode: attachMode
      }).unwrap();

      showToast(res.message || 'All set! Drawing attached successfully.');
      setSelectedDrawingCode('');
    } catch (err: any) {
      showToast(err?.data?.message || "We couldn't attach this drawing right now.");
    }
  };

  // Remove attached drawing from project
  const handleRemoveDrawingAction = async (drawingId: string, itemCode: string) => {
    if (!activeDrawingProject) return;
    try {
      const res = await removeDrawing({
        projectId: activeDrawingProject.projectId,
        drawingId,
        itemCode
      }).unwrap();
      showToast(res.message || 'Drawing removed from Work Order.');
      setDeletingDrawingId(null);
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not remove drawing.');
    }
  };

  // Approve & Freeze BOM
  const handleApproveBomAction = async () => {
    if (!activeDrawingProject) return;
    try {
      const res = await approveBom(activeDrawingProject.projectId).unwrap();
      showToast(res.message || 'All set! BOM approved and permanently locked.');
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not approve BOM right now.');
    }
  };

  // Reject BOM
  const handleRejectBomAction = async () => {
    if (!activeDrawingProject) return;
    try {
      const res = await rejectBom({
        projectId: activeDrawingProject.projectId,
        rejectionReason: rejectionReasonText.trim() || 'Requires revision by design team'
      }).unwrap();
      showToast(res.message || 'BOM returned for revision.');
      setIsRejectOpen(false);
      setRejectionReasonText('');
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not reject BOM right now.');
    }
  };

  // Open Sub-Stages Modal
  const handleOpenSubStages = (project: any) => {
    setSelectedProjectForSubStages(project);
    setIsAddFormOpen(false);
    setSelectedMasterSubStageId('');
    setCustomSubStageTitle('');
    setAssignedUserId('');
    setTargetEndDate('');
  };

  // Handle adding sub-stage
  const handleAddSubStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedProject) return;

    let subStageName = customSubStageTitle.trim();
    let subStageCode = '';
    if (selectedMasterSubStageId) {
      const master = subStageMasters.find((m: any) => m.id === selectedMasterSubStageId || m._id === selectedMasterSubStageId);
      if (master) {
        subStageName = master.subStageName || master.name;
        subStageCode = master.subStageCode;
      }
    }

    if (!subStageName) {
      showToast('Please select or enter a sub-stage title.');
      return;
    }

    try {
      await addSubStage({
        id: activeSelectedProject.designMilestoneId,
        projectId: activeSelectedProject.projectId,
        milestoneId: activeSelectedProject.designMilestoneId,
        subStageCode: subStageCode || `SUB-DES-${Date.now().toString().slice(-4)}`,
        name: subStageName,
        assignedUserId: assignedUserId || null,
        targetEndDate: targetEndDate || null,
        estimatedHours: Number(estimatedHours) || 16,
        priority
      }).unwrap();

      showToast('All set! Design sub-stage added successfully.');
      setIsAddFormOpen(false);
      setSelectedMasterSubStageId('');
      setCustomSubStageTitle('');
      setAssignedUserId('');
      setTargetEndDate('');
    } catch (err: any) {
      showToast(err?.data?.message || "We couldn't add the sub-stage right now.");
    }
  };

  // Handle Sub-Stage Status Toggle
  const handleUpdateSubStageStatus = async (subStageId: string, currentStatus: string) => {
    if (!activeSelectedProject) return;
    const nextStatus = currentStatus === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';

    try {
      await updateSubStage({
        subStageId,
        status: nextStatus
      }).unwrap();
      showToast(`Status updated to ${nextStatus.replace('_', ' ')}.`);
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not update status.');
    }
  };

  // Handle Sub-Stage Assignment Update
  const handleUpdateSubStageAssignee = async (subStageId: string, newUserId: string) => {
    try {
      await updateSubStage({
        subStageId,
        assignedUserId: newUserId || null
      }).unwrap();
      showToast('Engineer assignment updated.');
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not update engineer.');
    }
  };

  // Handle Sub-Stage Deletion
  const handleConfirmDeleteSubStage = async () => {
    if (!deletingSubStageId) return;
    try {
      await deleteSubStage(deletingSubStageId).unwrap();
      showToast('Sub-stage removed.');
      setDeletingSubStageId(null);
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not delete sub-stage.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Dedicated In-Line Table Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Side: Dedicated Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search work order, customer, machine model, drawing..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-white focus:bg-white rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Right Side: Reset Filters Button */}
        <div className="flex items-center gap-2">
          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0"
              title="Reset all active column filters and search"
            >
              <RotateCcw size={13} className="text-slate-400" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoadingProjects ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading design work orders...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <FolderGit2 size={24} />
            </div>
            <div className="text-sm font-bold text-slate-800">No Design Work Orders Found</div>
            <div className="text-xs text-slate-500 max-w-sm mx-auto">
              {isAnyFilterActive
                ? 'No work orders match your search or active column filters.'
                : 'Work orders will appear here once created in Project Setup with a Design milestone.'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4 text-left">#</th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Work Order ID"
                      columnKey="workOrderNumber"
                      selectedValues={columnFilters['workOrderNumber'] || null}
                      distinctValues={distinctWorkOrders}
                      currentSortField={sortConfig?.key}
                      currentSortDirection={sortConfig?.direction}
                      onFilterChange={(values) => setColumnFilters((prev) => ({ ...prev, workOrderNumber: values }))}
                      onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                    />
                  </th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Customer"
                      columnKey="customerName"
                      selectedValues={columnFilters['customerName'] || null}
                      distinctValues={distinctCustomers}
                      currentSortField={sortConfig?.key}
                      currentSortDirection={sortConfig?.direction}
                      onFilterChange={(values) => setColumnFilters((prev) => ({ ...prev, customerName: values }))}
                      onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                    />
                  </th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Machine Model"
                      columnKey="machineModel"
                      selectedValues={columnFilters['machineModel'] || null}
                      distinctValues={distinctModels}
                      currentSortField={sortConfig?.key}
                      currentSortDirection={sortConfig?.direction}
                      onFilterChange={(values) => setColumnFilters((prev) => ({ ...prev, machineModel: values }))}
                      onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                    />
                  </th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Design Stage"
                      columnKey="designStageTitle"
                      selectedValues={columnFilters['designStageTitle'] || null}
                      distinctValues={distinctStages}
                      currentSortField={sortConfig?.key}
                      currentSortDirection={sortConfig?.direction}
                      onFilterChange={(values) => setColumnFilters((prev) => ({ ...prev, designStageTitle: values }))}
                      onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                    />
                  </th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Design Target Date"
                      columnKey="targetDateObj"
                      selectedValues={null}
                      distinctValues={[]}
                      currentSortField={sortConfig?.key}
                      currentSortDirection={sortConfig?.direction}
                      onFilterChange={() => {}}
                      onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                    />
                  </th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Status"
                      columnKey="designStatus"
                      selectedValues={columnFilters['designStatus'] || null}
                      distinctValues={distinctStatuses}
                      currentSortField={sortConfig?.key}
                      currentSortDirection={sortConfig?.direction}
                      onFilterChange={(values) => setColumnFilters((prev) => ({ ...prev, designStatus: values }))}
                      onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                    />
                  </th>
                  <th className="py-3 px-4 text-left">
                    <ExcelColumnFilter
                      title="Drawing / BOM"
                      columnKey="drawingStatusLabel"
                      selectedValues={columnFilters['drawingStatusLabel'] || null}
                      distinctValues={distinctDrawingStatuses}
                      currentSortField={sortConfig?.key}
                      currentSortDirection={sortConfig?.direction}
                      onFilterChange={(values) => setColumnFilters((prev) => ({ ...prev, drawingStatusLabel: values }))}
                      onSortChange={(field, direction) => setSortConfig({ key: field, direction })}
                    />
                  </th>
                  <th className="py-3 px-4 text-center">Sub-Stages Progress</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-orange-600">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewProject(p)}
                          className="hover:underline text-left font-mono"
                        >
                          {p.workOrderNumber || p.projectId}
                        </button>
                        <WorkOrderBomBadge
                          isBomLocked={p.isBomLocked}
                          bomStatus={p.drawingApprovalStatus}
                          bomAttached={p.hasBom}
                          attachedDrawingsCount={p.drawingsCount}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{p.customerName}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{p.machineModel}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{p.designStageTitle}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">
                        {p.designStageCode}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {p.targetDateObj ? (
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-slate-900">
                            {p.targetDateObj.toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          {p.isOverdue ? (
                            <span className="inline-block text-[10px] font-extrabold text-red-700 bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                              Overdue by {Math.abs(p.daysLeft || 0)}d
                            </span>
                          ) : p.daysLeft !== null && p.daysLeft <= 14 ? (
                            <span className="inline-block text-[10px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              {p.daysLeft}d left
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] font-semibold text-slate-500">
                              {p.daysLeft}d left
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono">TBD</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          p.designStatus === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.designStatus === 'IN_PROGRESS'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : p.designStatus === 'ON_HOLD'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {p.designStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    {/* Design Drawing / BOM Status */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${p.drawingBadgeStyle}`}
                          >
                            {p.isBomLocked ? <Lock size={10} className="shrink-0" /> : null}
                            <span>{p.drawingStatusLabel}</span>
                          </span>
                          {p.drawingsCount > 1 && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-800">
                              +{p.drawingsCount}
                            </span>
                          )}
                        </div>
                        {p.primaryDrawingCode ? (
                          <div
                            className="text-xs font-mono font-bold text-slate-800 truncate max-w-[170px]"
                            title={p.primaryDrawingCode}
                          >
                            {p.primaryDrawingCode}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No drawing</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="w-32 mx-auto space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-600">
                            {p.completedCount}/{p.totalSubStages} Done
                          </span>
                          <span className="text-orange-600">{p.progressPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all duration-300"
                            style={{ width: `${p.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDrawingModal(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 font-bold text-xs border border-slate-200 transition-all flex items-center gap-1.5 shrink-0"
                          title="Attach or Review Design Drawing & BOM"
                        >
                          <FileCode2 size={13} className="text-orange-600" />
                          <span>{p.hasBom ? `Drawings (${p.drawingsCount || 1})` : 'Attach Drawing'}</span>
                        </button>
                        <button
                          onClick={() => handleOpenSubStages(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs shadow-orange-500/20 transition-all flex items-center gap-1.5 shrink-0"
                        >
                          <Layers size={13} />
                          <span>Sub-Stages</span>
                        </button>
                        <button
                          onClick={() => setPreviewProject(p)}
                          title="Preview Project Dossier"
                          className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Multi-Drawing Attachment & Approval Manager (AGENTS.md Compliant) */}
      {activeDrawingProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1560px] max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe (AGENTS.md mandate) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 lg:px-8 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FileCode2 size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold flex items-center gap-2">
                    <span>Design Drawings & BOM Management</span>
                    <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200">
                      {activeDrawingProject.workOrderNumber || activeDrawingProject.projectId}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    {activeDrawingProject.customerName} • {activeDrawingProject.machineModel}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedProjectForDrawing(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body (with pb-44 bottom clearance so dropdowns are never hidden) */}
            <div className="p-6 lg:p-8 space-y-6 overflow-y-auto flex-1 pb-44">
              {/* TOP SECTION: ATTACH DESIGN DRAWING FROM MASTER (KEYWORD SEARCHABLE SELECTOR WITH CATEGORY TABS) */}
              {!activeDrawingProject.isBomLocked && (
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Plus size={15} className="text-orange-600" />
                      <span>Add Design Drawing from Master to Work Order</span>
                    </h4>

                    {/* Button-Type Segmented Tabs with Category Counts (Zero Underline Tabs - AGENTS.md mandate) */}
                    <div className="inline-flex p-1 bg-slate-200/70 rounded-xl border border-slate-300/60 shrink-0">
                      {(['ALL', 'ASSEMBLY', 'SUB_ASSEMBLY', 'COMPONENT'] as const).map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => {
                            setDrawingTierTab(tier);
                            setSelectedDrawingCode('');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            drawingTierTab === tier
                              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                        >
                          {tier === 'ALL'
                            ? `All (${drawingCounts.all})`
                            : tier === 'ASSEMBLY'
                            ? `Assemblies (${drawingCounts.asm})`
                            : tier === 'SUB_ASSEMBLY'
                            ? `Sub-Assemblies (${drawingCounts.sub})`
                            : `Components (${drawingCounts.cmp})`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Searchable Select (Full-width, Keyword Searchable) */}
                  <div className="space-y-4">
                    <div className="relative z-30">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Select Master Design Drawing
                      </label>
                      <SearchableSelect
                        label="Master Drawing"
                        value={selectedDrawingCode}
                        onChange={(val) => setSelectedDrawingCode(val)}
                        options={drawingSelectOptions}
                        allOptionLabel="-- Select Master Drawing --"
                        placeholder="Type drawing name, code, model (e.g. COIL, RRO, Flyer)..."
                        icon={FileCode2}
                        className="w-full"
                      />
                    </div>

                    {/* Selected Drawing Action Card (When Selected) */}
                    {selectedDrawingMaster && (
                      <div className="p-4 bg-orange-50/70 rounded-xl border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-150">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                              {selectedDrawingMaster.classification}
                            </span>
                            <span className="font-mono text-sm font-extrabold text-slate-900">
                              {selectedDrawingMaster.itemCode}
                            </span>
                            <span className="text-xs font-mono text-slate-500">
                              ({selectedDrawingMaster.revision})
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-700">
                            {selectedDrawingMaster.itemName}
                          </div>
                          {selectedDrawingMaster.pdfUrl && (
                            <div className="flex items-center gap-2 pt-1">
                              <a
                                href={selectedDrawingMaster.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:underline"
                              >
                                <ExternalLink size={12} />
                                <span>See Technical PDF</span>
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Quantity and Add Button */}
                        <div className="flex items-center gap-3">
                          <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-slate-600 block">Quantity</label>
                            <input
                              type="number"
                              min={1}
                              value={machineQty}
                              onChange={(e) => setMachineQty(Math.max(1, Number(e.target.value) || 1))}
                              className="w-20 px-3 py-1.5 bg-white rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 text-center outline-none focus:border-orange-500"
                            />
                          </div>

                          <div className="pt-4">
                            <button
                              type="button"
                              onClick={handleAttachDrawingSubmit}
                              disabled={isAttachingDrawing}
                              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs shadow-orange-500/20 transition-all flex items-center gap-1.5"
                            >
                              <Plus size={15} />
                              <span>{isAttachingDrawing ? 'Adding...' : 'Add to Work Order'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* BOTTOM SECTION: ATTACHED DESIGN DRAWINGS LIST TABLE & APPROVAL */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span>Attached Design Drawings on Work Order</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {activeDrawingProject.attachedDrawings?.length || 0}
                    </span>
                  </h4>
                  {activeDrawingProject.bom && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${activeDrawingProject.drawingBadgeStyle}`}>
                      {activeDrawingProject.isBomLocked && <Lock size={12} />}
                      <span>{activeDrawingProject.drawingStatusLabel}</span>
                    </span>
                  )}
                </div>

                {(!activeDrawingProject.attachedDrawings || activeDrawingProject.attachedDrawings.length === 0) ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="text-xs font-bold text-slate-700">No Drawings Attached Yet</div>
                    <div className="text-[11px] text-slate-400">
                      Use the searchable selector above to select and attach drawings from Design Masters.
                    </div>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3 text-left">#</th>
                          <th className="py-2.5 px-3 text-left">Drawing Code & Name</th>
                          <th className="py-2.5 px-3 text-left">Tier</th>
                          <th className="py-2.5 px-3 text-left">Revision</th>
                          <th className="py-2.5 px-3 text-center">Multiplier</th>
                          <th className="py-2.5 px-3 text-left">PDF Drawing</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeDrawingProject.attachedDrawings.map((drg: any, dIdx: number) => (
                          <tr key={drg.drawingId || dIdx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{dIdx + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-extrabold text-slate-900">{drg.itemCode}</div>
                              {drg.description && (
                                <div className="text-[10px] text-slate-500 line-clamp-1">{drg.description}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                {drg.classification || 'COMPONENT'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{drg.revision || 'Rev 1.0'}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                              {drg.quantity || 1}
                            </td>
                            <td className="py-2.5 px-3">
                              {drg.pdfUrl ? (
                                <a
                                  href={drg.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline"
                                >
                                  <ExternalLink size={12} />
                                  <span>See PDF</span>
                                </a>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">No file</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {!activeDrawingProject.isBomLocked ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDrawingAction(drg.drawingId, drg.itemCode)}
                                  disabled={isRemovingDrawing}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove drawing from Work Order"
                                >
                                  <Trash2 size={13} />
                                </button>
                              ) : (
                                <span className="text-slate-400" title="Locked">
                                  <Lock size={12} />
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Precomputed KPI Summary Cards if drawings exist */}
                {activeDrawingProject.bom && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Total BOM Nodes</div>
                      <div className="text-base font-extrabold text-slate-900">
                        {activeDrawingProject.bom.summary?.totalItems || activeDrawingProject.bom.items?.length || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Make vs Buy</div>
                      <div className="text-sm font-extrabold text-slate-900">
                        <span className="text-orange-600">{activeDrawingProject.bom.summary?.makeCount || 0} Make</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-blue-600">{activeDrawingProject.bom.summary?.buyCount || 0} Buy</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Drawings Count</div>
                      <div className="text-base font-extrabold text-emerald-700">
                        {activeDrawingProject.attachedDrawings?.length || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Estimated Total Cost</div>
                      <div className="text-sm font-extrabold text-slate-900 font-mono">
                        ₹{(activeDrawingProject.bom.summary?.estimatedTotalCostINR || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                )}

                {/* APPROVER ACTION BANNER (When PENDING_APPROVAL) */}
                {activeDrawingProject.drawingApprovalStatus === 'PENDING_APPROVAL' && (
                  <div className="p-4 bg-amber-500/10 border border-amber-300 rounded-xl space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                          <ShieldCheck size={16} className="text-amber-600" />
                          <span>Drawing & BOM Awaiting Approval</span>
                        </div>
                        <div className="text-[11px] text-amber-800">
                          Approving will make this BOM live across Purchase, Store, and Production, and permanently lock changes.
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsRejectOpen(!isRejectOpen)}
                          className="px-3 py-1.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold transition-all"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={handleApproveBomAction}
                          disabled={isApprovingBom}
                          className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all flex items-center gap-1.5"
                        >
                          <ShieldCheck size={14} />
                          <span>{isApprovingBom ? 'Approving...' : 'Approve & Freeze BOM'}</span>
                        </button>
                      </div>
                    </div>

                    {isRejectOpen && (
                      <div className="pt-3 border-t border-amber-200/60 space-y-2">
                        <label className="text-xs font-bold text-red-800 block">
                          Reason for Revision / Rejection:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={rejectionReasonText}
                            onChange={(e) => setRejectionReasonText(e.target.value)}
                            placeholder="e.g. Gear ratio mismatch or missing 2D fabrication drawing"
                            className="flex-1 px-3 py-2 bg-white rounded-xl border border-red-300 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-red-400"
                          />
                          <button
                            type="button"
                            onClick={handleRejectBomAction}
                            disabled={isRejectingBom}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shrink-0"
                          >
                            Confirm Rejection
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* LOCKED BANNER (When LOCKED_FREEZE) */}
                {activeDrawingProject.isBomLocked && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs text-emerald-900">
                      <Lock size={16} className="text-emerald-700 shrink-0" />
                      <div>
                        <strong>BOM is Approved & Permanently Locked.</strong> All nodes and drawings are live. Any modification strictly requires an Engineering Change Request (ECO).
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const p = activeDrawingProject;
                        setSelectedProjectForDrawing(null);
                        setPreviewProject(p);
                        setPreviewTab('bom-boq');
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                    >
                      <span>View BOM in Dossier</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 lg:px-8 py-3.5 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-500 font-medium">
                Multiple drawings can be attached to a Work Order. Changes will lock permanently upon approval.
              </div>
              <button
                type="button"
                onClick={() => setSelectedProjectForDrawing(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Stages Manager Modal */}
      {activeSelectedProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl lg:max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe (AGENTS.md mandate) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 lg:px-8 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-sm font-extrabold flex items-center gap-2">
                    <span>Design Sub-Stages</span>
                    <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                      {activeSelectedProject.workOrderNumber || activeSelectedProject.projectId}
                    </span>
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {activeSelectedProject.customerName} • {activeSelectedProject.machineModel}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedProjectForSubStages(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Project Target & Overall Progress Summary */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-800">
                    Milestone: {activeSelectedProject.designStageTitle} ({activeSelectedProject.designStageCode})
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar size={13} className="text-slate-400" />
                    <span>
                      Target:{' '}
                      {activeSelectedProject.targetDateObj
                        ? activeSelectedProject.targetDateObj.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : 'TBD'}
                    </span>
                    {activeSelectedProject.daysLeft !== null && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          activeSelectedProject.isOverdue
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {activeSelectedProject.isOverdue
                          ? `Overdue by ${Math.abs(activeSelectedProject.daysLeft)}d`
                          : `${activeSelectedProject.daysLeft}d left`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-700">
                      {activeSelectedProject.completedCount} / {activeSelectedProject.totalSubStages} Completed
                    </div>
                    <div className="text-sm font-extrabold text-orange-600">
                      {activeSelectedProject.progressPercent}%
                    </div>
                  </div>
                  <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-300"
                      style={{ width: `${activeSelectedProject.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Sub-Stages List Header & Add Button */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Configured Sub-Stages ({activeSelectedProject.subStages.length})
                </div>
                {!isAddFormOpen && (
                  <button
                    onClick={() => setIsAddFormOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs shadow-orange-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Add Sub-Stage</span>
                  </button>
                )}
              </div>

              {/* Add New Sub-Stage Form */}
              {isAddFormOpen && (
                <form
                  onSubmit={handleAddSubStageSubmit}
                  className="bg-orange-50/50 rounded-2xl border border-orange-200 p-4 space-y-4 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold text-orange-950 flex items-center gap-1.5">
                      <Plus size={14} className="text-orange-600" />
                      <span>Add New Sub-Stage to Work Order</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddFormOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Master Sub-Stage Picker */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Select from Master Sub-Stages
                      </label>
                      <select
                        value={selectedMasterSubStageId}
                        onChange={(e) => {
                          setSelectedMasterSubStageId(e.target.value);
                          if (e.target.value) setCustomSubStageTitle('');
                        }}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-orange-500"
                      >
                        <option value="">-- Or enter custom sub-stage below --</option>
                        {subStageMasters.map((sm: any) => (
                          <option key={sm.id || sm._id} value={sm.id || sm._id}>
                            {sm.subStageName || sm.name} ({sm.subStageCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Custom Title (if not using master) */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Or Custom Sub-Stage Title
                      </label>
                      <input
                        type="text"
                        value={customSubStageTitle}
                        onChange={(e) => {
                          setCustomSubStageTitle(e.target.value);
                          if (e.target.value) setSelectedMasterSubStageId('');
                        }}
                        placeholder="e.g. Spindle CAD & FEA Analysis"
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* Assigned Engineer (Restricted to Design Team members only) */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Assigned Design Engineer
                      </label>
                      <select
                        value={assignedUserId}
                        onChange={(e) => setAssignedUserId(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-orange-500"
                      >
                        <option value="">-- Unassigned --</option>
                        {activeDesignTeamEngineers.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target End Date */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Target End Date
                      </label>
                      <input
                        type="date"
                        value={targetEndDate}
                        onChange={(e) => setTargetEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddFormOpen(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingSubStage}
                      className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs shadow-orange-500/20 transition-all"
                    >
                      {isAddingSubStage ? 'Adding...' : 'Save Sub-Stage'}
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-Stages List Table */}
              {activeSelectedProject.subStages.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                  No sub-stages added yet. Click &ldquo;Add Sub-Stage&rdquo; to define design deliverables.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  {activeSelectedProject.subStages.map((sub: any, sIdx: number) => {
                    const isDone = sub.status === 'COMPLETED';

                    return (
                      <div
                        key={sub.id || sIdx}
                        className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isDone ? 'bg-slate-50/50' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Status Checkbox & Title */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleUpdateSubStageStatus(sub.id, sub.status)}
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                              isDone
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                                : 'border-slate-300 hover:border-orange-500 bg-white text-transparent'
                            }`}
                            title={isDone ? 'Mark as Incomplete' : 'Mark as Completed'}
                          >
                            <Check size={12} strokeWidth={3} className={isDone ? 'opacity-100' : 'opacity-0'} />
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold ${
                                  isDone ? 'line-through text-slate-400' : 'text-slate-900'
                                }`}
                              >
                                {sub.name || sub.subStageName}
                              </span>
                              {sub.subStageCode && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  {sub.subStageCode}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              {sub.targetEndDate && (
                                <span className="flex items-center gap-1">
                                  <Clock size={11} className="text-slate-400" />
                                  <span>
                                    Due {new Date(sub.targetEndDate).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short'
                                    })}
                                  </span>
                                </span>
                              )}
                              {sub.priority && (
                                <span
                                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                                    sub.priority === 'CRITICAL' || sub.priority === 'HIGH'
                                      ? 'bg-red-50 text-red-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {sub.priority}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Engineer Assignment & Actions */}
                        <div className="flex items-center gap-2.5 self-end sm:self-auto">
                          <div className="flex items-center gap-1.5">
                            <Users size={13} className="text-slate-400" />
                            <select
                              value={sub.assignedUserId || ''}
                              onChange={(e) => handleUpdateSubStageAssignee(sub.id, e.target.value)}
                              className="px-2 py-1 bg-slate-50 hover:bg-white rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 outline-none"
                            >
                              <option value="">Unassigned</option>
                              {activeDesignTeamEngineers.map((u: any) => (
                                <option key={u.id} value={u.id}>
                                  {u.firstName} {u.lastName}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => setDeletingSubStageId(sub.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove sub-stage"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProjectForSubStages(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Sub-Stage Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingSubStageId)}
        title="Remove this Sub-Stage?"
        message="This will delete the sub-stage from this project's design milestone and update overall stage progress."
        confirmText="Yes, remove"
        cancelText="Cancel"
        isLoading={isDeletingSubStage}
        onConfirm={handleConfirmDeleteSubStage}
        onClose={() => setDeletingSubStageId(null)}
      />
      {/* Work Order Master Dossier Preview Modal (Large Master Desktop Size per AGENTS.md mandate) */}
      {activePreviewProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1560px] max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe (AGENTS.md mandate) */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 lg:px-8 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <FolderGit2 size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-slate-900 text-base font-extrabold font-mono">
                      {activePreviewProject.workOrderNumber || activePreviewProject.projectId}
                    </h3>
                    <WorkOrderBomBadge
                      isBomLocked={activePreviewProject.isBomLocked}
                      bomStatus={activePreviewProject.drawingApprovalStatus || activePreviewProject.bom?.approvalStatus}
                      bomAttached={activePreviewProject.hasBom}
                      attachedDrawingsCount={activePreviewProject.drawingsCount}
                      size="sm"
                    />
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {activePreviewProject.customerName} • {activePreviewProject.machineModel}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const p = activePreviewProject;
                    setPreviewProject(null);
                    handleOpenDrawingModal(p);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <FileCode2 size={13} />
                  <span>Attach / Edit Drawings</span>
                </button>
                <button
                  onClick={() => setPreviewProject(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Segmented Navigation Tabs (Button-type tabs per AGENTS.md mandate) */}
            <div className="px-6 lg:px-8 pt-3 pb-0 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="inline-flex p-1 bg-slate-200/70 rounded-xl border border-slate-300/60 mb-3 gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewTab('substages')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    previewTab === 'substages'
                      ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <Layers size={14} />
                  <span>Sub-Stages Progress</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      previewTab === 'substages' ? 'bg-white/20 text-white' : 'bg-slate-300/80 text-slate-700'
                    }`}
                  >
                    {activePreviewProject.subStages?.length || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('bom-boq')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    previewTab === 'bom-boq'
                      ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <FileCode2 size={14} />
                  <span>BOM & BOQ</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      previewTab === 'bom-boq' ? 'bg-white/20 text-white' : 'bg-slate-300/80 text-slate-700'
                    }`}
                  >
                    {activePreviewProject.attachedDrawings?.length || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('machines')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    previewTab === 'machines'
                      ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <PackageCheck size={14} />
                  <span>Attached Machines</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      previewTab === 'machines' ? 'bg-white/20 text-white' : 'bg-slate-300/80 text-slate-700'
                    }`}
                  >
                    {activePreviewProject.rawProject?.poItems?.length || 1}
                  </span>
                </button>
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-6 lg:p-8 space-y-6 overflow-y-auto flex-1">
              {/* TAB 1: SUB-STAGES PROGRESS */}
              {previewTab === 'substages' && (
                <div className="space-y-4">
                  {/* KPI Progress Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Overall Progress</div>
                      <div className="text-lg font-extrabold text-orange-600">
                        {activePreviewProject.progressPercent || 0}%
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all duration-300"
                          style={{ width: `${activePreviewProject.progressPercent || 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Completed Stages</div>
                      <div className="text-lg font-extrabold text-emerald-700">
                        {activePreviewProject.completedCount || 0} / {activePreviewProject.totalSubStages || 0}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Sub-stages done</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Active Milestone</div>
                      <div className="text-sm font-extrabold text-slate-900 truncate">
                        {activePreviewProject.designStageTitle || 'Design & CAD'}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-1">
                        {activePreviewProject.designStageCode || 'STG-DESIGN'}
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Target Completion</div>
                      <div className="text-sm font-extrabold text-slate-900">
                        {activePreviewProject.targetDateObj
                          ? activePreviewProject.targetDateObj.toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'TBD'}
                      </div>
                      <div className="text-[10px] font-bold mt-1">
                        {activePreviewProject.isOverdue ? (
                          <span className="text-red-600">Overdue by {Math.abs(activePreviewProject.daysLeft || 0)}d</span>
                        ) : activePreviewProject.daysLeft !== null ? (
                          <span className="text-slate-500">{activePreviewProject.daysLeft} days remaining</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Sub-Stages Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Layers size={14} className="text-orange-600" />
                        <span>Milestone Sub-Stages Breakdown</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const p = activePreviewProject;
                          setPreviewProject(null);
                          handleOpenSubStages(p);
                        }}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
                      >
                        Manage / Assign Sub-Stages →
                      </button>
                    </div>

                    {(!activePreviewProject.subStages || activePreviewProject.subStages.length === 0) ? (
                      <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1">
                        <div className="text-xs font-bold text-slate-700">No Sub-Stages Configured Yet</div>
                        <div className="text-[11px] text-slate-400">
                          Click "Manage / Assign Sub-Stages" to create and assign design sub-stages.
                        </div>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                            <tr>
                              <th className="py-2.5 px-3 text-left">#</th>
                              <th className="py-2.5 px-3 text-left">Sub-Stage Title & Code</th>
                              <th className="py-2.5 px-3 text-left">Assigned Engineer</th>
                              <th className="py-2.5 px-3 text-left">Target Date</th>
                              <th className="py-2.5 px-3 text-left">Status</th>
                              <th className="py-2.5 px-3 text-center">Progress</th>
                              <th className="py-2.5 px-3 text-left">Notes / Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {activePreviewProject.subStages.map((ss: any, sIdx: number) => {
                              const isDone = ss.status === 'COMPLETED';
                              const inProg = ss.status === 'IN_PROGRESS';
                              const isRev = ss.status === 'REVIEW' || ss.status === 'UNDER_REVIEW';
                              return (
                                <tr key={ss.id || sIdx} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-400">#{sIdx + 1}</td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-bold text-slate-900">{ss.title}</div>
                                    <div className="text-[10px] font-mono text-slate-400">
                                      {ss.stageCode || ss.code || 'SUB-STAGE'}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {ss.assignedToName ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                          {ss.assignedToName.charAt(0).toUpperCase()}
                                        </span>
                                        <div>
                                          <div className="font-bold text-slate-800">{ss.assignedToName}</div>
                                          {ss.assignedToEmail && (
                                            <div className="text-[10px] text-slate-400 line-clamp-1">{ss.assignedToEmail}</div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-700">
                                    {ss.targetDate
                                      ? new Date(ss.targetDate).toLocaleDateString('en-IN', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric'
                                        })
                                      : '-'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                        isDone
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : inProg
                                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                                          : isRev
                                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                                          : 'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      {String(ss.status || 'NOT_STARTED').replace(/_/g, ' ')}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="font-mono font-bold text-slate-900">{ss.progressPercent || (isDone ? 100 : 0)}%</span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[200px] truncate">
                                    {ss.remarks || ss.notes || '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: BOM & BOQ */}
              {previewTab === 'bom-boq' && (
                <div className="space-y-5">
                  {/* KPI Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">BOM Status</div>
                      <div className="mt-1">
                        <WorkOrderBomBadge
                          isBomLocked={activePreviewProject.isBomLocked}
                          bomStatus={activePreviewProject.drawingApprovalStatus || activePreviewProject.bom?.approvalStatus}
                          bomAttached={activePreviewProject.hasBom}
                          attachedDrawingsCount={activePreviewProject.drawingsCount}
                          size="sm"
                        />
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Attached Drawings</div>
                      <div className="text-lg font-extrabold text-slate-900">
                        {activePreviewProject.attachedDrawings?.length || 0}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Master drawings linked</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Make vs Buy</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-1">
                        <span className="text-orange-600">{activePreviewProject.bom?.summary?.makeCount || 0} Make</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-blue-600">{activePreviewProject.bom?.summary?.buyCount || 0} Buy</span>
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Estimated Total Cost</div>
                      <div className="text-base font-extrabold text-slate-900 font-mono mt-1">
                        ₹{(activePreviewProject.bom?.summary?.estimatedTotalCostINR || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Attached Master Drawings Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <FileCode2 size={14} className="text-orange-600" />
                        <span>Attached Master Design Drawings ({activePreviewProject.attachedDrawings?.length || 0})</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const p = activePreviewProject;
                          setPreviewProject(null);
                          handleOpenDrawingModal(p);
                        }}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
                      >
                        <span>Attach / Manage Drawings →</span>
                      </button>
                    </div>

                    {(!activePreviewProject.attachedDrawings || activePreviewProject.attachedDrawings.length === 0) ? (
                      <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1">
                        <div className="text-xs font-bold text-slate-700">No Drawings Attached Yet</div>
                        <div className="text-[11px] text-slate-400">
                          Click "Attach / Edit Drawings" to select drawings from Design Master.
                        </div>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                            <tr>
                              <th className="py-2.5 px-3 text-left">#</th>
                              <th className="py-2.5 px-3 text-left">Drawing Code & Description</th>
                              <th className="py-2.5 px-3 text-left">Classification</th>
                              <th className="py-2.5 px-3 text-left">Revision</th>
                              <th className="py-2.5 px-3 text-center">Multiplier</th>
                              <th className="py-2.5 px-3 text-left">PDF Datasheet</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {activePreviewProject.attachedDrawings.map((drg: any, dIdx: number) => (
                              <tr key={drg.drawingId || dIdx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-400">#{dIdx + 1}</td>
                                <td className="py-2.5 px-3">
                                  <div className="font-mono font-extrabold text-slate-900">{drg.itemCode}</div>
                                  {drg.description && (
                                    <div className="text-[10px] text-slate-500 line-clamp-1">{drg.description}</div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                    {drg.classification || 'COMPONENT'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">{drg.revision || 'Rev 1.0'}</td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                                  {drg.quantity || 1}
                                </td>
                                <td className="py-2.5 px-3">
                                  {drg.pdfUrl ? (
                                    <a
                                      href={drg.pdfUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:underline"
                                    >
                                      <ExternalLink size={12} />
                                      <span>See PDF</span>
                                    </a>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">No file</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Hierarchical BOM & BOQ Tree Items */}
                  {activePreviewProject.bom?.items && activePreviewProject.bom.items.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Cpu size={14} className="text-orange-600" />
                        <span>BOM / BOQ Node Items ({activePreviewProject.bom.items.length})</span>
                      </h4>
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] sticky top-0 z-10">
                            <tr>
                              <th className="py-2 px-3 text-left">Level</th>
                              <th className="py-2 px-3 text-left">Item Code</th>
                              <th className="py-2 px-3 text-left">Description</th>
                              <th className="py-2 px-3 text-center">Qty</th>
                              <th className="py-2 px-3 text-left">UOM</th>
                              <th className="py-2 px-3 text-left">Make/Buy</th>
                              <th className="py-2 px-3 text-right">Unit Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {activePreviewProject.bom.items.map((node: any, nIdx: number) => (
                              <tr key={node.id || nIdx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2 px-3 font-mono font-bold text-slate-500">
                                  {'—'.repeat(node.itemLevel || 0)} L{node.itemLevel || 0}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-slate-900">{node.itemCode}</td>
                                <td className="py-2 px-3 text-slate-700 truncate max-w-[200px]">
                                  {node.itemName || node.description}
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                                  {node.quantity || 1}
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-600">{node.uom || 'NOS'}</td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                      node.itemType === 'MAKE' || node.classification === 'ASSEMBLY'
                                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}
                                  >
                                    {node.itemType || (node.classification === 'ASSEMBLY' ? 'MAKE' : 'BUY')}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-700">
                                  {node.unitCostINR ? `₹${Number(node.unitCostINR).toLocaleString('en-IN')}` : '-'}
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

              {/* TAB 3: ATTACHED MACHINES */}
              {previewTab === 'machines' && (
                <div className="space-y-4">
                  {/* Primary Machine Details Card */}
                  <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Primary Machine Model
                        </div>
                        <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                          <span>{activePreviewProject.machineModel}</span>
                        </h4>
                      </div>
                      {/* Bold Highlighted Quantity Badge per user directive */}
                      <div className="px-3.5 py-1.5 bg-orange-500 text-white rounded-xl shadow-xs font-bold text-xs flex items-center gap-1.5 shrink-0">
                        <PackageCheck size={15} />
                        <span>
                          Quantity: {activePreviewProject.rawProject?.poItems?.[0]?.quantity || activePreviewProject.rawProject?.contractValue?.quantity || 1} Units
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Product Description</div>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {activePreviewProject.rawProject?.productDescription || activePreviewProject.machineModel}
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Technical Specifications</div>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {activePreviewProject.rawProject?.techSpec || 'Standard Machine Specifications'}
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Cost Center</div>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {activePreviewProject.rawProject?.costCenter || 'Standard Production'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer PO & Order Reference */}
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <FileText size={14} className="text-orange-600" />
                      <span>Customer & Purchase Order Contract</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Customer Name</div>
                        <div className="font-bold text-slate-900 mt-0.5">{activePreviewProject.customerName}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Customer PO Number</div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">
                          {activePreviewProject.rawProject?.customerPoNumber ||
                            activePreviewProject.rawProject?.customerPoRef?.poNumber ||
                            'PO-PENDING'}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">PO Receipt Date</div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">
                          {activePreviewProject.rawProject?.poReceiptDate
                            ? new Date(activePreviewProject.rawProject.poReceiptDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : '-'}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Delivery Commitment Date</div>
                        <div className="font-mono font-bold text-orange-600 mt-0.5">
                          {activePreviewProject.rawProject?.deliveryCommitmentDate
                            ? new Date(activePreviewProject.rawProject.deliveryCommitmentDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : 'TBD'}
                        </div>
                      </div>
                    </div>

                    {/* PO Line Items Table (if present) */}
                    {activePreviewProject.rawProject?.poItems && activePreviewProject.rawProject.poItems.length > 0 && (
                      <div className="pt-2 space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Customer PO Line Items ({activePreviewProject.rawProject.poItems.length}):
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                              <tr>
                                <th className="py-2 px-3 text-left">Sl</th>
                                <th className="py-2 px-3 text-left">Machine / Item Description</th>
                                <th className="py-2 px-3 text-center">Quantity</th>
                                <th className="py-2 px-3 text-right">Unit Rate (₹)</th>
                                <th className="py-2 px-3 text-right">Total Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {activePreviewProject.rawProject.poItems.map((item: any, iIdx: number) => (
                                <tr key={item.id || iIdx} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-2 px-3 font-mono font-bold text-slate-400">{item.slNo || iIdx + 1}</td>
                                  <td className="py-2 px-3 font-semibold text-slate-900">{item.description || item.itemName}</td>
                                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                                    {item.quantity || 1} {item.uom || 'Units'}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-slate-700">
                                    {item.unitRate ? `₹${Number(item.unitRate).toLocaleString('en-IN')}` : '-'}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                    {item.totalAmount ? `₹${Number(item.totalAmount).toLocaleString('en-IN')}` : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Universal Action Tracking Audit Section */}
              <div className="border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Created By</div>
                    <div className="font-bold text-slate-900">
                      {activePreviewProject.rawProject?.createdByName || 'System'}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {activePreviewProject.rawProject?.createdAt
                      ? new Date(activePreviewProject.rawProject.createdAt).toLocaleString('en-IN')
                      : '-'}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Last Updated By</div>
                    <div className="font-bold text-slate-900">
                      {activePreviewProject.rawProject?.updatedByName ||
                        activePreviewProject.rawProject?.createdByName ||
                        'System'}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {activePreviewProject.rawProject?.updatedAt
                      ? new Date(activePreviewProject.rawProject.updatedAt).toLocaleString('en-IN')
                      : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 lg:px-8 py-3.5 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-500 font-medium">
                Work Order Reference: {activePreviewProject.workOrderNumber || activePreviewProject.projectId}
              </div>
              <button
                type="button"
                onClick={() => setPreviewProject(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
