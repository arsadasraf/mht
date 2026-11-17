'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
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
  ChevronDown,
  Trash2,
  Check,
  X,
  FileCode2,
  Lock,
  Download,
  ShieldCheck,
  ShoppingCart,
  Receipt,
  FileSpreadsheet,
  Inbox,
  UserCheck,
  Send,
  Building2,
  Filter,
  Tag,
  IndianRupee,
  Star,
  Coins,
  ArrowLeft,
  ExternalLink,
  Kanban,
  Boxes
} from 'lucide-react';
import WorkOrderBomBadge from '../../../components/ui/WorkOrderBomBadge';
import {
  useGetProjectsQuery,
  useGetSubStageMastersQuery,
  useGetDepartmentUsersQuery,
  useAddSubStageToMilestoneMutation,
  useUpdateSubStageMutation,
  useDeleteSubStageMutation
} from '../../project-setup/api/projectApi';
import { useGetBomsQuery, useGetRmItemsQuery, useGetFgItemsQuery } from '../../design/api/designApi';
import {
  useGetVendorsQuery,
  useGetPriceAgreementsQuery,
  useGetRfqsQuery,
  useGetPurchaseOrdersQuery,
  useCreateVendorPriceAgreementMutation,
  useUpdateVendorPriceAgreementMutation,
  useCreateRfqMutation,
  useCreatePurchaseOrderMutation
} from '../api/purchaseApi';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';
import SearchableSelect, { SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import OutwardPurchaseOrderModal from './OutwardPurchaseOrderModal';
import PurchaseKanbanTab from './PurchaseKanbanTab';

export interface PurchaseProjectsTabProps {
  initialSubTab?: 'work-orders' | 'material-planning' | 'kanban';
}

function PurchaseProjectsTabInner({ initialSubTab }: PurchaseProjectsTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlProjectId = searchParams?.get('projectId') || searchParams?.get('workOrder') || '';

  const activeSubTab: 'work-orders' | 'material-planning' | 'kanban' =
    initialSubTab ||
    (pathname?.includes('/material-planning')
      ? 'material-planning'
      : pathname?.includes('/kanban')
      ? 'kanban'
      : 'work-orders');

  const [selectedPlanningProjectId, setSelectedPlanningProjectId] = useState<string>(urlProjectId);

  useEffect(() => {
    if (urlProjectId) {
      setSelectedPlanningProjectId(urlProjectId);
    }
  }, [urlProjectId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string[] | null>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Modals state
  const [selectedProjectForSubStages, setSelectedProjectForSubStages] = useState<any | null>(null);
  const [previewProject, setPreviewProject] = useState<any | null>(null);
  const [previewTab, setPreviewTab] = useState<'substages' | 'machines'>('substages');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // BOM Live Sourcing Command Center State
  const [activeBomSubTab, setActiveBomSubTab] = useState<'design-drawing' | 'rm-bo'>('design-drawing');
  const [designDrawingViewMode, setDesignDrawingViewMode] = useState<'tree' | 'flat'>('tree');
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Record<string, boolean>>({});
  const [bomSearchTerm, setBomSearchTerm] = useState('');
  const [bomColumnFilters, setBomColumnFilters] = useState<Record<string, string[] | null>>({});
  const [bomSortConfig, setBomSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedItemKeys, setSelectedItemKeys] = useState<Record<string, boolean>>({});

  // Global Price List Form Modal State
  const [priceListModal, setPriceListModal] = useState<{
    isOpen: boolean;
    item?: any;
    agreementId?: string;
    itemCode: string;
    itemName: string;
    revisionNumber?: string;
    description: string;
    itemType: 'RM_BO' | 'FG';
    category: string;
    make: string;
    uom: string;
    price: string;
    taxRatePercent: number;
    vendorCode: string;
    vendorName: string;
    isPreferred: boolean;
    remarks: string;
  } | null>(null);

  // RFQ Modal State
  const [isRfqModalOpen, setIsRfqModalOpen] = useState(false);
  const [rfqTitle, setRfqTitle] = useState('');
  const [rfqDeadline, setRfqDeadline] = useState('');
  const [rfqSelectedVendors, setRfqSelectedVendors] = useState<string[]>([]);
  const [rfqNotes, setRfqNotes] = useState('');
  const [rfqVendorSearch, setRfqVendorSearch] = useState('');

  // PO Modal State (Multi-Vendor Split)
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [poNotes, setPoNotes] = useState('');
  const [activePoVendorTab, setActivePoVendorTab] = useState<string>('');
  const [unassignedVendorOverrides, setUnassignedVendorOverrides] = useState<Record<string, string>>({});

  // Queries
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery({
    approvedOnly: 'true'
  });
  const { data: subStageMastersData } = useGetSubStageMastersQuery({
    departmentModule: 'purchase'
  });
  const { data: deptUsersData } = useGetDepartmentUsersQuery();
  const { data: bomsData } = useGetBomsQuery({});
  const { data: vendorsData } = useGetVendorsQuery({ includeInactive: false });
  const { data: priceAgreementsData } = useGetPriceAgreementsQuery({});
  const { data: rfqsData } = useGetRfqsQuery({});
  const { data: purchaseOrdersData, refetch: refetchPurchaseOrders } = useGetPurchaseOrdersQuery({});
  const { data: rmItemsData } = useGetRmItemsQuery(undefined);
  const { data: fgItemsData } = useGetFgItemsQuery(undefined);

  // Mutations
  const [addSubStage, { isLoading: isAddingSubStage }] = useAddSubStageToMilestoneMutation();
  const [updateSubStage, { isLoading: isUpdatingSubStage }] = useUpdateSubStageMutation();
  const [deleteSubStage, { isLoading: isDeletingSubStage }] = useDeleteSubStageMutation();
  const [createVendorPriceAgreement, { isLoading: isCreatingAgreement }] = useCreateVendorPriceAgreementMutation();
  const [updateVendorPriceAgreement, { isLoading: isUpdatingAgreement }] = useUpdateVendorPriceAgreementMutation();
  const [createRfqMutation, { isLoading: isSendingRfq }] = useCreateRfqMutation();
  const [createPurchaseOrderMutation, { isLoading: isGeneratingPo }] = useCreatePurchaseOrderMutation();

  const rawProjects = useMemo(() => projectsData?.projects || [], [projectsData]);
  const subStageMasters = useMemo(() => subStageMastersData?.subStages || [], [subStageMastersData]);
  const departmentUsers = useMemo(() => deptUsersData?.users || [], [deptUsersData]);
  const vendors = useMemo(() => vendorsData?.vendors || [], [vendorsData]);
  const priceAgreements = useMemo(() => priceAgreementsData?.priceAgreements || [], [priceAgreementsData]);
  const rfqs = useMemo(() => rfqsData?.rfqs || [], [rfqsData]);
  const purchaseOrders = useMemo(() => purchaseOrdersData?.purchaseOrders || [], [purchaseOrdersData]);
  const rmItems = useMemo(() => rmItemsData?.items || [], [rmItemsData]);
  const fgItems = useMemo(() => fgItemsData?.items || [], [fgItemsData]);

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

  // Filter purchase-eligible team users
  const purchaseUsers = useMemo(() => {
    return departmentUsers.filter((u: any) => {
      const dept = String(u.department || '').toLowerCase();
      const role = String(u.role?.name || u.role || '').toLowerCase();
      return (
        dept.includes('purchase') ||
        dept.includes('procurement') ||
        dept.includes('store') ||
        dept.includes('admin') ||
        role.includes('purchase') ||
        role.includes('buyer') ||
        role.includes('procurement') ||
        role.includes('admin')
      );
    });
  }, [departmentUsers]);

  // Extract purchase stage details per project, join live BOM data, and calculate urgency
  const purchaseProjects = useMemo(() => {
    return rawProjects
      .map((proj: any) => {
        const milestones = proj.milestones || [];
        const purchaseMilestone =
          milestones.find(
            (m: any) =>
              (m.departmentModule && m.departmentModule.toLowerCase() === 'purchase') ||
              (m.stageCode && m.stageCode.toLowerCase().includes('purch')) ||
              (m.title && m.title.toLowerCase().includes('purch'))
          ) || null;

        const targetDateObj = purchaseMilestone?.baselineDate || purchaseMilestone?.projectedDate || proj.deliveryCommitmentDate
          ? new Date(purchaseMilestone?.baselineDate || purchaseMilestone?.projectedDate || proj.deliveryCommitmentDate)
          : null;
        const targetTs = targetDateObj ? targetDateObj.getTime() : 9999999999999;
        const nowTs = Date.now();
        const daysLeft = targetDateObj
          ? Math.round((targetTs - nowTs) / (1000 * 60 * 60 * 24))
          : null;
        const isOverdue = daysLeft !== null && daysLeft < 0 && purchaseMilestone?.status !== 'COMPLETED';

        const subStages = purchaseMilestone?.subStages || [];
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

        return {
          ...proj,
          purchaseMilestone,
          purchaseMilestoneId: purchaseMilestone?.id || `auto-purchase-${proj.projectId}`,
          purchaseLead: purchaseMilestone?.leadRole || 'Purchase Team',
          purchaseStatus: purchaseMilestone?.status || (subStages.length > 0 ? 'IN_PROGRESS' : 'PENDING'),
          targetDate: targetDateObj ? targetDateObj.toISOString().split('T')[0] : '—',
          targetTs,
          daysLeft,
          isOverdue,
          subStages,
          completedCount,
          totalSubStages,
          progressPercent,
          bom: rawBom,
          hasBom,
          isBomLocked,
          drawingApprovalStatus: approvalStatus,
          drawingsCount: attachedDrawings.length
        };
      })
      .sort((a: any, b: any) => {
        // Active sub-stages & overdue first
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return a.targetTs - b.targetTs;
      });
  }, [rawProjects, bomsMap]);

  // Distinct Values for Header Excel Column Filters
  const distinctWorkOrders = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    purchaseProjects.forEach((p: any) => {
      const code = String(p.workOrderNumber || p.projectId).trim();
      counts.set(code, (counts.get(code) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [purchaseProjects]);

  const distinctCustomers = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    purchaseProjects.forEach((p: any) => {
      const cust = String(p.customerName || 'General Customer').trim();
      counts.set(cust, (counts.get(cust) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [purchaseProjects]);

  const distinctModels = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    purchaseProjects.forEach((p: any) => {
      const model = String(p.machineModel || 'Standard Machinery').trim();
      counts.set(model, (counts.get(model) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [purchaseProjects]);

  const distinctStatuses = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    purchaseProjects.forEach((p: any) => {
      const st = String(p.purchaseStatus).toUpperCase();
      counts.set(st, (counts.get(st) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [purchaseProjects]);

  // Filtered and Sorted Table Dataset
  const filteredProjects = useMemo(() => {
    return purchaseProjects.filter((p: any) => {
      // 1. In-Line Search Bar filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesWo = String(p.workOrderNumber || p.projectId).toLowerCase().includes(q);
        const matchesCust = String(p.customerName || '').toLowerCase().includes(q);
        const matchesModel = String(p.machineModel || '').toLowerCase().includes(q);
        const matchesSubStages = p.subStages.some((s: any) =>
          String(s.title || '').toLowerCase().includes(q) ||
          String(s.assignedToUserName || '').toLowerCase().includes(q)
        );
        if (!matchesWo && !matchesCust && !matchesModel && !matchesSubStages) {
          return false;
        }
      }

      // 2. Column-Based Excel Filters
      if (columnFilters.workOrderNumber && columnFilters.workOrderNumber.length > 0) {
        if (!columnFilters.workOrderNumber.includes(String(p.workOrderNumber || p.projectId).trim())) {
          return false;
        }
      }
      if (columnFilters.customerName && columnFilters.customerName.length > 0) {
        if (!columnFilters.customerName.includes(String(p.customerName || 'General Customer').trim())) {
          return false;
        }
      }
      if (columnFilters.machineModel && columnFilters.machineModel.length > 0) {
        if (!columnFilters.machineModel.includes(String(p.machineModel || 'Standard Machinery').trim())) {
          return false;
        }
      }
      if (columnFilters.purchaseStatus && columnFilters.purchaseStatus.length > 0) {
        if (!columnFilters.purchaseStatus.includes(String(p.purchaseStatus).toUpperCase())) {
          return false;
        }
      }

      return true;
    }).sort((a: any, b: any) => {
      if (!sortConfig) return 0;
      let valA: any = a[sortConfig.key];
      let valB: any = b[sortConfig.key];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [purchaseProjects, searchTerm, columnFilters, sortConfig]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    Object.values(columnFilters).some((arr) => arr && arr.length > 0)
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig(null);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Open Sub-Stages Manager modal
  const handleOpenSubStagesModal = (proj: any) => {
    setSelectedProjectForSubStages(proj);
    setIsAddFormOpen(false);
    setSelectedMasterSubStageId('');
    setCustomSubStageTitle('');
    setAssignedUserId('');
    setTargetEndDate(proj.targetDate !== '—' ? proj.targetDate : '');
    setEstimatedHours('16');
  };

  // Add Sub-Stage handler
  const handleCreateSubStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForSubStages) return;

    let finalTitle = customSubStageTitle.trim();
    let subStageCode = '';

    if (selectedMasterSubStageId) {
      const master = subStageMasters.find((m: any) => (m.id || m._id) === selectedMasterSubStageId);
      if (master) {
        finalTitle = master.name || master.subStageName || master.title;
        subStageCode = master.subStageCode || master.code || '';
      }
    }

    if (!finalTitle) {
      showToast('Please select a master sub-stage or enter a custom activity title.');
      return;
    }

    const assignedUser = departmentUsers.find((u: any) => (u.id || u._id) === assignedUserId);

    try {
      await addSubStage({
        id: selectedProjectForSubStages.purchaseMilestoneId,
        projectId: selectedProjectForSubStages.projectId,
        title: finalTitle,
        subStageCode,
        departmentModule: 'purchase',
        assignedToUserId: assignedUserId || null,
        assignedToUserName: assignedUser ? `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() || assignedUser.name : '',
        assignedToUserEmail: assignedUser?.email || '',
        targetEndDate: targetEndDate || undefined,
        estimatedHours: Number(estimatedHours) || 16,
        priority
      }).unwrap();

      showToast('All set! Purchase sub-stage added successfully.');
      setIsAddFormOpen(false);
      setSelectedMasterSubStageId('');
      setCustomSubStageTitle('');
      setAssignedUserId('');
    } catch (err: any) {
      showToast(err?.data?.message || 'We could not add this purchase sub-stage right now.');
    }
  };

  // Toggle Sub-Stage Status (Quick check/complete)
  const handleToggleSubStageStatus = async (sub: any) => {
    const nextStatus = sub.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      await updateSubStage({
        subStageId: sub.id || sub._id,
        status: nextStatus,
        completionPercent: nextStatus === 'COMPLETED' ? 100 : 50
      }).unwrap();
      showToast(nextStatus === 'COMPLETED' ? 'Great! Sub-stage marked as completed.' : 'Sub-stage status updated.');
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not update status.');
    }
  };

  // Re-assign Sub-Stage User
  const handleAssignSubStageUser = async (sub: any, newUserId: string) => {
    const assignedUser = departmentUsers.find((u: any) => (u.id || u._id) === newUserId);
    try {
      await updateSubStage({
        subStageId: sub.id || sub._id,
        assignedToUserId: newUserId || null,
        assignedToUserName: assignedUser ? `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() || assignedUser.name : '',
        assignedToUserEmail: assignedUser?.email || ''
      }).unwrap();
      showToast('Assigned purchase executive updated.');
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not update assignment.');
    }
  };

  // Update target date on sub-stage
  const handleUpdateSubStageDate = async (sub: any, newDate: string) => {
    try {
      await updateSubStage({
        subStageId: sub.id || sub._id,
        targetEndDate: newDate || null
      }).unwrap();
      showToast('Target completion date updated.');
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not update target date.');
    }
  };

  // Delete Sub-Stage Confirm
  const handleConfirmDeleteSubStage = async () => {
    if (!deletingSubStageId) return;
    try {
      await deleteSubStage(deletingSubStageId).unwrap();
      showToast('Sub-stage removed from project.');
      setDeletingSubStageId(null);
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not delete sub-stage.');
    }
  };

  // Open Large Preview Dossier
  const handleOpenPreviewModal = (proj: any) => {
    setPreviewProject(proj);
    setPreviewTab('substages');
  };

  // Active project data for SubStages modal (reflecting live updates)
  const activeSubStagesProject = useMemo(() => {
    if (!selectedProjectForSubStages) return null;
    return (
      purchaseProjects.find(
        (p: any) => p.projectId === selectedProjectForSubStages.projectId
      ) || selectedProjectForSubStages
    );
  }, [selectedProjectForSubStages, purchaseProjects]);

  // Active project data for Preview Dossier
  const activePreviewProject = useMemo(() => {
    if (!previewProject) return null;
    return (
      purchaseProjects.find((p: any) => p.projectId === previewProject.projectId) ||
      previewProject
    );
  }, [previewProject, purchaseProjects]);

  // Active project data for Material Planning tab
  const activePlanningProject = useMemo(() => {
    if (!purchaseProjects || purchaseProjects.length === 0) return null;
    if (selectedPlanningProjectId) {
      const match = purchaseProjects.find(
        (p: any) =>
          String(p.projectId).toUpperCase() === selectedPlanningProjectId.toUpperCase() ||
          String(p.workOrderNumber).toUpperCase() === selectedPlanningProjectId.toUpperCase()
      );
      if (match) return match;
    }
    const withBom = purchaseProjects.find((p: any) => p.hasBom);
    return withBom || purchaseProjects[0];
  }, [purchaseProjects, selectedPlanningProjectId]);

  // Active project data for Kanban tab
  const activeKanbanProject = useMemo(() => {
    if (!purchaseProjects || purchaseProjects.length === 0) return null;
    const targetId = selectedPlanningProjectId || urlProjectId;
    if (!targetId || targetId === 'ALL') return null;
    return (
      purchaseProjects.find(
        (p: any) =>
          String(p.projectId).toUpperCase() === targetId.toUpperCase() ||
          String(p.workOrderNumber).toUpperCase() === targetId.toUpperCase()
      ) || null
    );
  }, [purchaseProjects, selectedPlanningProjectId, urlProjectId]);

  // Active target project for BOM Sourcing logic (Planning tab takes precedence, fallback to Preview)
  const activeTargetProject = useMemo(() => {
    if (activeSubTab === 'material-planning') return activePlanningProject;
    return activePreviewProject;
  }, [activeSubTab, activePlanningProject, activePreviewProject]);

  const isCurrentProjectBomLive = Boolean(
    activeTargetProject?.isBomLocked ||
    activeTargetProject?.drawingApprovalStatus === 'LOCKED_FREEZE' ||
    activeTargetProject?.bom?.approvalStatus === 'LOCKED_FREEZE' ||
    activeTargetProject?.bom?.isFrozen
  );

  const workOrderOptions = useMemo<SearchableSelectOption[]>(() => {
    return purchaseProjects.map((p: any) => {
      const woId = String(p.workOrderNumber || p.projectId);
      const cust = p.customerName || 'General Customer';
      const model = p.machineModel || 'Standard Machinery';
      const bomStatus = p.hasBom
        ? p.isBomLocked
          ? 'BOM Live'
          : 'Draft BOM'
        : 'No BOM';

      return {
        value: p.projectId,
        label: `${woId} — ${cust}`,
        subLabel: `${model} • ${p.quantity || 1} Units • [${bomStatus}]`
      };
    });
  }, [purchaseProjects]);

  // Sourcing BOM Tree & Two-Tab Data Builder
  interface SourcingNode {
    key: string;
    level: number;
    parentKey: string | null;
    parentName: string;
    itemCode: string;
    itemName: string;
    description: string;
    drawingNumber?: string;
    revision?: string;
    classification: 'ASSEMBLY' | 'SUB_ASSEMBLY' | 'COMPONENT' | 'RM_BO';
    itemType: 'FG' | 'RM-BO';
    make: string;
    category: string;
    directQty: number;
    effectiveQty: number;
    quantity: number;
    uom: string;
    assignedVendorId: string;
    assignedVendorName: string;
    assignedVendorCode: string;
    isPreferred: boolean;
    unitPrice: number;
    extendedCost: number;
    procurementStatus: 'PO_SENT' | 'RFQ_RAISED' | 'PENDING';
    procurementDocNumber: string;
    procurementStatusLabel: string;
    isLeaf: boolean;
    children?: SourcingNode[];
  }

  // Lookup map for item-level procurement status (PO Sent, RFQ Raised, Pending)
  const procurementStatusMap = useMemo(() => {
    const map = new Map<
      string,
      {
        status: 'PO_SENT' | 'RFQ_RAISED' | 'PENDING';
        documentNumber: string;
        vendorName?: string;
        date?: string;
      }
    >();

    if (!activeTargetProject) return map;

    const projectKey = (activeTargetProject.workOrderNumber || activeTargetProject.projectId || '').toUpperCase().trim();

    // 1. Check Outward RFQs for this project
    rfqs.forEach((rfq: any) => {
      const rfqProj = String(rfq.projectId || '').toUpperCase().trim();
      if (!rfqProj || rfqProj === projectKey) {
        if (Array.isArray(rfq.items)) {
          rfq.items.forEach((it: any) => {
            const code = String(it.itemCode || it.code || it.itemName || '').toUpperCase().trim();
            if (code) {
              map.set(code, {
                status: 'RFQ_RAISED',
                documentNumber: rfq.rfqNumber || 'RFQ-SENT',
                date: rfq.createdAt ? new Date(rfq.createdAt).toLocaleDateString('en-IN') : ''
              });
            }
          });
        }
      }
    });

    // 2. Check Purchase Orders for this project (PO takes precedence over RFQ)
    purchaseOrders.forEach((po: any) => {
      const poProj = String(po.projectId || '').toUpperCase().trim();
      if (!poProj || poProj === projectKey) {
        if (Array.isArray(po.items)) {
          po.items.forEach((it: any) => {
            const code = String(it.itemCode || it.code || it.itemName || '').toUpperCase().trim();
            if (code) {
              map.set(code, {
                status: 'PO_SENT',
                documentNumber: po.poNumber || 'PO-ISSUED',
                vendorName: po.vendorName || po.vendorId?.name || '',
                date: po.createdAt ? new Date(po.createdAt).toLocaleDateString('en-IN') : ''
              });
            }
          });
        }
      }
    });

    return map;
  }, [activeTargetProject, rfqs, purchaseOrders]);

  const sourcingBomData = useMemo(() => {
    if (!activeTargetProject) {
      return {
        tree: [] as SourcingNode[],
        allFlat: [] as SourcingNode[],
        designDrawingTree: [] as SourcingNode[],
        designDrawingItems: [] as SourcingNode[],
        rmBoItems: [] as SourcingNode[],
        distinctMakes: [] as string[],
        distinctCategories: [] as string[],
        designDrawingMakes: [] as string[],
        designDrawingCategories: [] as string[],
        rmBoMakes: [] as string[],
        rmBoCategories: [] as string[],
        designDrawingTotalCost: 0,
        rmBoTotalCost: 0,
        totalCost: 0,
        totalItemsCount: 0,
        pricedCount: 0,
        unpricedCount: 0
      };
    }

    const machineQty = Number(activeTargetProject.quantity || 1);
    const bom = activeTargetProject.bom;
    const rawItems: any[] = Array.isArray(bom?.items) ? bom.items : [];

    const findRm = (codeOrName: string) => {
      if (!codeOrName) return null;
      const clean = codeOrName.trim().toLowerCase();
      return (
        rmItems.find(
          (r: any) =>
            r.name?.trim().toLowerCase() === clean ||
            (r.itemCode && r.itemCode.trim().toLowerCase() === clean) ||
            r.id === codeOrName
        ) || null
      );
    };

    const findFg = (codeOrName: string) => {
      if (!codeOrName) return null;
      const clean = codeOrName.trim().toLowerCase();
      return (
        fgItems.find(
          (f: any) =>
            f.name?.trim().toLowerCase() === clean ||
            (f.itemCode && f.itemCode.trim().toLowerCase() === clean) ||
            f.id === codeOrName
        ) || null
      );
    };

    const findAgreement = (codeOrName: string, rev?: string) => {
      if (!codeOrName) return null;
      const clean = codeOrName.trim().toLowerCase();
      const cleanRev = rev ? rev.trim().toLowerCase() : '';

      if (cleanRev) {
        const exactRevPref = priceAgreements.find(
          (a: any) =>
            ((a.itemCode && a.itemCode.trim().toLowerCase() === clean) ||
              (a.itemName && a.itemName.trim().toLowerCase() === clean)) &&
            a.revisionNumber &&
            a.revisionNumber.trim().toLowerCase() === cleanRev &&
            a.isPreferred
        );
        if (exactRevPref) return exactRevPref;

        const exactRevAny = priceAgreements.find(
          (a: any) =>
            ((a.itemCode && a.itemCode.trim().toLowerCase() === clean) ||
              (a.itemName && a.itemName.trim().toLowerCase() === clean)) &&
            a.revisionNumber &&
            a.revisionNumber.trim().toLowerCase() === cleanRev
        );
        if (exactRevAny) return exactRevAny;
      }

      return (
        priceAgreements.find(
          (a: any) =>
            ((a.itemCode && a.itemCode.trim().toLowerCase() === clean) ||
              (a.itemName && a.itemName.trim().toLowerCase() === clean)) &&
            a.isPreferred
        ) ||
        priceAgreements.find(
          (a: any) =>
            (a.itemCode && a.itemCode.trim().toLowerCase() === clean) ||
            (a.itemName && a.itemName.trim().toLowerCase() === clean)
        ) ||
        null
      );
    };

    const visitedFg = new Set<string>();

    const parseLines = (
      lines: any[],
      parentName: string,
      parentQtyMultiplier: number,
      level: number,
      parentKey: string
    ): SourcingNode[] => {
      if (!Array.isArray(lines)) return [];

      return lines.map((line: any, idx: number) => {
        const itemCode = line.itemCode || line.drawingNumber || line.itemName || `ITEM-${idx + 1}`;
        const itemName = line.itemName || line.name || line.description || itemCode;
        const key = `${parentKey}-L${level}-${idx}-${itemCode}`;
        const directQty = Number(line.quantityPerMachine || line.baseQty || line.quantity || 1);
        const effectiveQty = directQty * parentQtyMultiplier;
        const isFg =
          line.itemType === 'FG' ||
          line.itemType === 'ASSEMBLY' ||
          line.itemType === 'SUB_ASSEMBLY' ||
          line.classification === 'ASSEMBLY' ||
          line.classification === 'SUB_ASSEMBLY';

        if (isFg) {
          const childFg = findFg(itemCode) || findFg(itemName);
          const rawClass = String(childFg?.classification || line.classification || 'COMPONENT').toUpperCase();
          const classification: 'ASSEMBLY' | 'SUB_ASSEMBLY' | 'COMPONENT' =
            rawClass === 'ASSEMBLY'
              ? 'ASSEMBLY'
              : rawClass === 'SUB_ASSEMBLY' || rawClass === 'SUB-ASSEMBLY'
              ? 'SUB_ASSEMBLY'
              : 'COMPONENT';

          const make = childFg?.make?.trim() || line.make?.trim() || 'In-House';
          const category =
            childFg?.categoryName ||
            childFg?.categoryCode ||
            (classification === 'ASSEMBLY'
              ? 'Assembly'
              : classification === 'SUB_ASSEMBLY'
              ? 'Sub-Assembly'
              : 'Machined Component');

          let nestedChildren: SourcingNode[] = [];
          const childBomLines = childFg?.bomItems || childFg?.childItems || line.children || [];
          if (Array.isArray(childBomLines) && childBomLines.length > 0 && !visitedFg.has(itemName)) {
            visitedFg.add(itemName);
            nestedChildren = parseLines(
              childBomLines,
              itemName,
              effectiveQty,
              level + 1,
              key
            );
            visitedFg.delete(itemName);
          }

          const itemRevision = childFg?.revision || line.revision || line.revNumber || '';
          const agreement =
            findAgreement(itemCode, itemRevision) ||
            findAgreement(itemName, itemRevision);
          const assignedVendorId = agreement?.vendorId || '';
          const assignedVendorName = agreement?.vendorName || '';
          const assignedVendorCode = agreement?.vendorCode || '';
          const isPreferred = Boolean(agreement?.isPreferred);

          const childCost = nestedChildren.reduce((sum, c) => sum + c.extendedCost, 0);
          const unitPrice =
            agreement?.unitPrice !== undefined
              ? Number(agreement.unitPrice)
              : childCost > 0 && effectiveQty > 0
              ? childCost / effectiveQty
              : Number(line.standardRateINR || childFg?.standardRateINR || 0);

          const extendedCost = nestedChildren.length > 0 ? childCost : effectiveQty * unitPrice;

          const procInfo =
            procurementStatusMap.get(itemCode.toUpperCase().trim()) ||
            procurementStatusMap.get(itemName.toUpperCase().trim());
          const procurementStatus = procInfo ? procInfo.status : 'PENDING';
          const procurementDocNumber = procInfo ? procInfo.documentNumber : '';
          const procurementStatusLabel =
            procurementStatus === 'PO_SENT'
              ? `PO Sent: ${procurementDocNumber}`
              : procurementStatus === 'RFQ_RAISED'
              ? `RFQ Raised: ${procurementDocNumber}`
              : 'Pending Sourcing';

          return {
            key,
            level,
            parentKey,
            parentName,
            itemCode,
            itemName,
            description: line.description || childFg?.description || '',
            drawingNumber: line.drawingNumber || childFg?.drawingNumber || itemCode,
            revision: itemRevision || 'Rev 1.0',
            classification,
            itemType: 'FG',
            make: make || 'In-House',
            category: category || 'Assembly',
            directQty,
            effectiveQty,
            quantity: effectiveQty,
            uom: line.uom || line.baseUom || childFg?.uom || 'Nos',
            assignedVendorId,
            assignedVendorName,
            assignedVendorCode,
            isPreferred,
            unitPrice,
            extendedCost,
            procurementStatus,
            procurementDocNumber,
            procurementStatusLabel,
            isLeaf: nestedChildren.length === 0,
            children: nestedChildren
          };
        } else {
          // RM-BO leaf item
          const matchedRm = findRm(itemCode) || findRm(itemName);
          const make = line.make?.trim() || matchedRm?.make?.trim() || 'Standard';
          const category = matchedRm?.categoryName || matchedRm?.categoryCode || line.category || 'General Sourcing';
          const agreement = findAgreement(itemCode) || findAgreement(itemName);
          const assignedVendorId = agreement?.vendorId || '';
          const assignedVendorName = agreement?.vendorName || '';
          const assignedVendorCode = agreement?.vendorCode || '';
          const isPreferred = Boolean(agreement?.isPreferred);

          const unitPrice =
            agreement?.unitPrice !== undefined
              ? Number(agreement.unitPrice)
              : Number(line.standardRateINR || matchedRm?.standardRateINR || 0);

          const extendedCost = effectiveQty * unitPrice;

          const procInfo =
            procurementStatusMap.get(itemCode.toUpperCase().trim()) ||
            procurementStatusMap.get(itemName.toUpperCase().trim());
          const procurementStatus = procInfo ? procInfo.status : 'PENDING';
          const procurementDocNumber = procInfo ? procInfo.documentNumber : '';
          const procurementStatusLabel =
            procurementStatus === 'PO_SENT'
              ? `PO Sent: ${procurementDocNumber}`
              : procurementStatus === 'RFQ_RAISED'
              ? `RFQ Raised: ${procurementDocNumber}`
              : 'Pending Sourcing';

          return {
            key,
            level,
            parentKey,
            parentName,
            itemCode,
            itemName,
            description: line.description || matchedRm?.description || '',
            drawingNumber: line.drawingNumber || line.partNumber || itemCode,
            classification: 'RM_BO',
            itemType: 'RM-BO',
            make: make || 'Standard',
            category: category || 'General Sourcing',
            directQty,
            effectiveQty,
            quantity: effectiveQty,
            uom: line.uom || line.baseUom || matchedRm?.uom || 'Nos',
            assignedVendorId,
            assignedVendorName,
            assignedVendorCode,
            isPreferred,
            unitPrice,
            extendedCost,
            procurementStatus,
            procurementDocNumber,
            procurementStatusLabel,
            isLeaf: true,
            children: []
          };
        }
      });
    };

    let sourceLines = rawItems;
    if (sourceLines.length === 0 && activeTargetProject.machineModel) {
      const modelFg = findFg(activeTargetProject.machineModel);
      if (modelFg && Array.isArray(modelFg.bomItems) && modelFg.bomItems.length > 0) {
        sourceLines = modelFg.bomItems;
      }
    }

    const tree = parseLines(
      sourceLines,
      activeTargetProject.workOrderNumber || activeTargetProject.projectId,
      machineQty,
      1,
      'root'
    );

    const flattenNodes = (nodes: SourcingNode[]): SourcingNode[] => {
      const list: SourcingNode[] = [];
      nodes.forEach((n) => {
        list.push(n);
        if (n.children && n.children.length > 0) {
          list.push(...flattenNodes(n.children));
        }
      });
      return list;
    };

    const allFlat = flattenNodes(tree);

    // Two Tab Separation: Design Drawings vs RM-BO Items
    const designDrawingTree = tree.filter((n) => n.itemType === 'FG');
    const designDrawingItems = allFlat.filter((n) => n.itemType === 'FG');
    const rmBoItems = allFlat.filter((n) => n.itemType === 'RM-BO');

    // Distinct Makes & Categories
    const allMakesSet = new Set<string>();
    const allCategoriesSet = new Set<string>();
    const designMakesSet = new Set<string>();
    const designCategoriesSet = new Set<string>();
    const rmMakesSet = new Set<string>();
    const rmCategoriesSet = new Set<string>();

    designDrawingItems.forEach((it) => {
      if (it.make?.trim()) {
        designMakesSet.add(it.make.trim());
        allMakesSet.add(it.make.trim());
      }
      if (it.category?.trim()) {
        designCategoriesSet.add(it.category.trim());
        allCategoriesSet.add(it.category.trim());
      }
    });

    rmBoItems.forEach((it) => {
      if (it.make?.trim()) {
        rmMakesSet.add(it.make.trim());
        allMakesSet.add(it.make.trim());
      }
      if (it.category?.trim()) {
        rmCategoriesSet.add(it.category.trim());
        allCategoriesSet.add(it.category.trim());
      }
    });

    const designDrawingTotalCost = designDrawingItems.reduce((sum, it) => sum + it.extendedCost, 0);
    const rmBoTotalCost = rmBoItems.reduce((sum, it) => sum + it.extendedCost, 0);
    const totalCost = rmBoTotalCost + designDrawingTotalCost;

    let pricedCount = 0;
    let unpricedCount = 0;
    allFlat.forEach((it) => {
      if (it.unitPrice > 0) pricedCount++;
      else unpricedCount++;
    });

    return {
      tree,
      allFlat,
      designDrawingTree,
      designDrawingItems,
      rmBoItems,
      distinctMakes: Array.from(allMakesSet).sort(),
      distinctCategories: Array.from(allCategoriesSet).sort(),
      designDrawingMakes: Array.from(designMakesSet).sort(),
      designDrawingCategories: Array.from(designCategoriesSet).sort(),
      rmBoMakes: Array.from(rmMakesSet).sort(),
      rmBoCategories: Array.from(rmCategoriesSet).sort(),
      designDrawingTotalCost,
      rmBoTotalCost,
      totalCost,
      totalItemsCount: allFlat.length,
      pricedCount,
      unpricedCount
    };
  }, [activeTargetProject, rmItems, fgItems, priceAgreements]);

  // Current active sub-tab dataset & filters
  const currentTabItems = useMemo(() => {
    return activeBomSubTab === 'design-drawing'
      ? sourcingBomData.designDrawingItems
      : sourcingBomData.rmBoItems;
  }, [activeBomSubTab, sourcingBomData]);

  // Distinct values for BOM Excel Column Filters
  const distinctBomItemTitles = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    currentTabItems.forEach((it) => {
      const title = it.itemName || it.itemCode || '—';
      counts.set(title, (counts.get(title) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count, label: value }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [currentTabItems]);

  const distinctBomMakes = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    currentTabItems.forEach((it) => {
      const make = it.make || 'Unspecified';
      counts.set(make, (counts.get(make) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count, label: value }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [currentTabItems]);

  const distinctBomCategories = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    currentTabItems.forEach((it) => {
      const category = it.category || 'General';
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count, label: value }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [currentTabItems]);

  const distinctBomClassifications = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    currentTabItems.forEach((it) => {
      const classification = it.classification || 'Standard';
      counts.set(classification, (counts.get(classification) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count, label: value }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [currentTabItems]);

  const distinctBomVendors = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    currentTabItems.forEach((it) => {
      const vendor = it.assignedVendorName || 'Unassigned';
      counts.set(vendor, (counts.get(vendor) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count, label: value }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [currentTabItems]);

  const distinctBomQuantities = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    currentTabItems.forEach((it) => {
      const qty = `${it.quantity} ${it.uom || 'Nos'}`;
      counts.set(qty, (counts.get(qty) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count, label: value }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [currentTabItems]);

  const distinctBomRates = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    currentTabItems.forEach((it) => {
      const rate = it.unitPrice > 0 ? `₹${it.unitPrice.toLocaleString('en-IN')}` : 'Pending Rate';
      counts.set(rate, (counts.get(rate) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count, label: value }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [currentTabItems]);

  const distinctBomTotals = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    currentTabItems.forEach((it) => {
      const total = it.extendedCost > 0 ? `₹${it.extendedCost.toLocaleString('en-IN')}` : '₹0';
      counts.set(total, (counts.get(total) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count, label: value }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [currentTabItems]);

  const distinctBomProcurementStatuses = useMemo<DistinctValueItem[]>(() => {
    const counts = new Map<string, number>();
    currentTabItems.forEach((it) => {
      const label = it.procurementStatusLabel || 'Pending Sourcing';
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count, label: value }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [currentTabItems]);

  const hasActiveBomFilters = useMemo(() => {
    if (bomSearchTerm.trim().length > 0) return true;
    return Object.values(bomColumnFilters).some((vals) => vals !== null && vals !== undefined);
  }, [bomSearchTerm, bomColumnFilters]);

  const handleResetBomFilters = () => {
    setBomSearchTerm('');
    setBomColumnFilters({});
    setBomSortConfig(null);
  };

  const filteredCurrentTabItems = useMemo(() => {
    let result = currentTabItems.filter((item) => {
      // 1. Column filters
      if (bomColumnFilters.itemTitle && !bomColumnFilters.itemTitle.includes(item.itemName || item.itemCode || '—')) {
        return false;
      }
      if (bomColumnFilters.make && !bomColumnFilters.make.includes(item.make || 'Unspecified')) {
        return false;
      }
      if (bomColumnFilters.category && !bomColumnFilters.category.includes(item.category || 'General')) {
        return false;
      }
      if (bomColumnFilters.classification && !bomColumnFilters.classification.includes(item.classification || 'Standard')) {
        return false;
      }
      if (bomColumnFilters.procurementStatus && !bomColumnFilters.procurementStatus.includes(item.procurementStatusLabel)) {
        return false;
      }
      if (bomColumnFilters.vendor && !bomColumnFilters.vendor.includes(item.assignedVendorName || 'Unassigned')) {
        return false;
      }
      if (bomColumnFilters.quantity && !bomColumnFilters.quantity.includes(`${item.quantity} ${item.uom || 'Nos'}`)) {
        return false;
      }
      if (bomColumnFilters.unitPrice) {
        const rateLabel = item.unitPrice > 0 ? `₹${item.unitPrice.toLocaleString('en-IN')}` : 'Pending Rate';
        if (!bomColumnFilters.unitPrice.includes(rateLabel)) return false;
      }
      if (bomColumnFilters.extendedCost) {
        const totalLabel = item.extendedCost > 0 ? `₹${item.extendedCost.toLocaleString('en-IN')}` : '₹0';
        if (!bomColumnFilters.extendedCost.includes(totalLabel)) return false;
      }

      // 2. Search term
      if (bomSearchTerm.trim()) {
        const q = bomSearchTerm.trim().toLowerCase();
        const matches =
          item.itemCode.toLowerCase().includes(q) ||
          item.itemName.toLowerCase().includes(q) ||
          (item.drawingNumber && item.drawingNumber.toLowerCase().includes(q)) ||
          item.make.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.assignedVendorName.toLowerCase().includes(q) ||
          item.classification.toLowerCase().includes(q) ||
          item.procurementStatusLabel.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });

    // 3. Sorting
    if (bomSortConfig) {
      result = [...result].sort((a, b) => {
        let comp = 0;
        switch (bomSortConfig.key) {
          case 'itemTitle':
            comp = (a.itemName || a.itemCode).localeCompare(b.itemName || b.itemCode);
            break;
          case 'make':
            comp = (a.make || '').localeCompare(b.make || '');
            break;
          case 'category':
            comp = (a.category || '').localeCompare(b.category || '');
            break;
          case 'classification':
            comp = (a.classification || '').localeCompare(b.classification || '');
            break;
          case 'procurementStatus':
            comp = (a.procurementStatusLabel || '').localeCompare(b.procurementStatusLabel || '');
            break;
          case 'vendor':
            comp = (a.assignedVendorName || '').localeCompare(b.assignedVendorName || '');
            break;
          case 'quantity':
            comp = Number(a.quantity || 0) - Number(b.quantity || 0);
            break;
          case 'unitPrice':
            comp = Number(a.unitPrice || 0) - Number(b.unitPrice || 0);
            break;
          case 'extendedCost':
            comp = Number(a.extendedCost || 0) - Number(b.extendedCost || 0);
            break;
          default:
            break;
        }
        return bomSortConfig.direction === 'asc' ? comp : -comp;
      });
    }

    return result;
  }, [currentTabItems, bomColumnFilters, bomSortConfig, bomSearchTerm]);

  // Filtered Tree View for Design Drawings
  const filteredDesignDrawingTree = useMemo(() => {
    if (!hasActiveBomFilters) return sourcingBomData.designDrawingTree;

    const q = bomSearchTerm.trim().toLowerCase();

    const matchesFilter = (node: SourcingNode): boolean => {
      if (bomColumnFilters.itemTitle && !bomColumnFilters.itemTitle.includes(node.itemName || node.itemCode || '—')) {
        return false;
      }
      if (bomColumnFilters.make && !bomColumnFilters.make.includes(node.make || 'Unspecified')) {
        return false;
      }
      if (bomColumnFilters.category && !bomColumnFilters.category.includes(node.category || 'General')) {
        return false;
      }
      if (bomColumnFilters.classification && !bomColumnFilters.classification.includes(node.classification || 'Standard')) {
        return false;
      }
      if (bomColumnFilters.procurementStatus && !bomColumnFilters.procurementStatus.includes(node.procurementStatusLabel)) {
        return false;
      }
      if (bomColumnFilters.vendor && !bomColumnFilters.vendor.includes(node.assignedVendorName || 'Unassigned')) {
        return false;
      }
      if (bomColumnFilters.quantity && !bomColumnFilters.quantity.includes(`${node.quantity} ${node.uom || 'Nos'}`)) {
        return false;
      }
      if (bomColumnFilters.unitPrice) {
        const rateLabel = node.unitPrice > 0 ? `₹${node.unitPrice.toLocaleString('en-IN')}` : 'Pending Rate';
        if (!bomColumnFilters.unitPrice.includes(rateLabel)) return false;
      }
      if (bomColumnFilters.extendedCost) {
        const totalLabel = node.extendedCost > 0 ? `₹${node.extendedCost.toLocaleString('en-IN')}` : '₹0';
        if (!bomColumnFilters.extendedCost.includes(totalLabel)) return false;
      }
      if (q) {
        const matches =
          node.itemCode.toLowerCase().includes(q) ||
          node.itemName.toLowerCase().includes(q) ||
          (node.drawingNumber && node.drawingNumber.toLowerCase().includes(q)) ||
          node.make.toLowerCase().includes(q) ||
          node.category.toLowerCase().includes(q) ||
          node.assignedVendorName.toLowerCase().includes(q) ||
          node.procurementStatusLabel.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    };

    const filterNode = (node: SourcingNode): SourcingNode | null => {
      const isSelfMatch = matchesFilter(node);

      let filteredChildren: SourcingNode[] = [];
      if (node.children && node.children.length > 0) {
        filteredChildren = node.children
          .map((child) => filterNode(child))
          .filter((c): c is SourcingNode => c !== null);
      }

      if (isSelfMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      return null;
    };

    return sourcingBomData.designDrawingTree
      .map((root) => filterNode(root))
      .filter((n): n is SourcingNode => n !== null);
  }, [sourcingBomData.designDrawingTree, hasActiveBomFilters, bomColumnFilters, bomSearchTerm]);

  const handleToggleExpandAll = (expand: boolean) => {
    if (!expand) {
      setExpandedTreeNodes({});
    } else {
      const nextMap: Record<string, boolean> = {};
      const markAll = (nodes: SourcingNode[]) => {
        nodes.forEach((n) => {
          if (n.children && n.children.length > 0) {
            nextMap[n.key] = true;
            markAll(n.children);
          }
        });
      };
      markAll(sourcingBomData.designDrawingTree);
      setExpandedTreeNodes(nextMap);
    }
  };

  const handleToggleTreeNode = (key: string) => {
    setExpandedTreeNodes((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Selected items list across both tabs
  const selectedItemsList = useMemo(() => {
    return sourcingBomData.allFlat.filter((it) => selectedItemKeys[it.key]);
  }, [sourcingBomData.allFlat, selectedItemKeys]);

  const selectedCount = selectedItemsList.length;
  const selectedTotalCost = useMemo(() => {
    return selectedItemsList.reduce((sum, it) => sum + it.extendedCost, 0);
  }, [selectedItemsList]);

  const isAllVisibleSelected = useMemo(() => {
    const visible = filteredCurrentTabItems;
    if (visible.length === 0) return false;
    return visible.every((it) => selectedItemKeys[it.key]);
  }, [filteredCurrentTabItems, selectedItemKeys]);

  const handleToggleSelectAllVisible = () => {
    const visible = filteredCurrentTabItems;
    if (isAllVisibleSelected) {
      setSelectedItemKeys((prev) => {
        const next = { ...prev };
        visible.forEach((it) => {
          delete next[it.key];
        });
        return next;
      });
    } else {
      setSelectedItemKeys((prev) => {
        const next = { ...prev };
        visible.forEach((it) => {
          next[it.key] = true;
        });
        return next;
      });
    }
  };

  const handleToggleSelectItem = (key: string) => {
    setSelectedItemKeys((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Open Global Price List Modal
  const handleOpenPriceListModal = (item: SourcingNode) => {
    const cleanCode = item.itemCode?.trim().toLowerCase();
    const cleanName = item.itemName?.trim().toLowerCase();
    const isRm = item.itemType === 'RM-BO';
    const itemRevision = !isRm ? (item.revision || (item as any).revNumber || 'Rev 1.0') : '';
    const cleanRev = itemRevision.trim().toLowerCase();

    const existingAgr = priceAgreements.find(
      (a: any) =>
        ((a.itemCode && a.itemCode.trim().toLowerCase() === cleanCode) ||
          (a.itemName && a.itemName.trim().toLowerCase() === cleanName) ||
          (a.itemCode && a.itemCode.trim().toLowerCase() === cleanName)) &&
        (!cleanRev || !a.revisionNumber || a.revisionNumber.trim().toLowerCase() === cleanRev)
    );

    setPriceListModal({
      isOpen: true,
      item,
      agreementId: existingAgr?.id,
      itemCode: item.itemCode || item.itemName,
      itemName: item.itemName,
      revisionNumber: itemRevision,
      description: item.description || '',
      itemType: isRm ? 'RM_BO' : 'FG',
      category: item.category || '',
      make: item.make || '',
      uom: item.uom || (isRm ? 'Kg' : 'Nos'),
      price:
        existingAgr?.unitPrice !== undefined
          ? String(existingAgr.unitPrice)
          : item.unitPrice > 0
          ? String(item.unitPrice)
          : '',
      taxRatePercent: existingAgr?.taxRatePercent || 18,
      vendorCode: existingAgr?.vendorCode || item.assignedVendorCode || '',
      vendorName: existingAgr?.vendorName || item.assignedVendorName || '',
      isPreferred: existingAgr ? existingAgr.isPreferred : true,
      remarks: existingAgr?.remarks || ''
    });
  };

  const handleSavePriceListModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceListModal) return;

    const unitPrice = parseFloat(priceListModal.price) || 0;
    const vendor = vendors.find((v: any) => v.vendorCode === priceListModal.vendorCode);

    try {
      const payload: any = {
        itemCode: priceListModal.itemCode || priceListModal.itemName,
        itemName: priceListModal.itemName || priceListModal.itemCode,
        revisionNumber: priceListModal.revisionNumber || '',
        description: priceListModal.description,
        itemType: priceListModal.itemType,
        category: priceListModal.category,
        make: priceListModal.make,
        vendorCode: priceListModal.vendorCode,
        vendorName: vendor ? vendor.name : priceListModal.vendorName || 'Standard Base Rate',
        unitPrice,
        taxRatePercent: priceListModal.taxRatePercent,
        currency: 'INR',
        uom: priceListModal.uom,
        isPreferred: priceListModal.isPreferred,
        remarks: priceListModal.remarks
      };

      if (priceListModal.agreementId) {
        await updateVendorPriceAgreement({ id: priceListModal.agreementId, ...payload }).unwrap();
      } else {
        await createVendorPriceAgreement(payload).unwrap();
      }

      showToast(`All set! Rate and vendor assigned globally for ${priceListModal.itemName}.`);
      setPriceListModal(null);
    } catch (err: any) {
      showToast(err?.data?.message || 'We could not save this price list right now. Please try again.');
    }
  };

  // RFQ Action Handlers
  const handleOpenRfqModal = () => {
    if (selectedItemsList.length === 0) return;
    setRfqTitle(
      `Sourcing RFQ for ${activeTargetProject?.workOrderNumber || 'Work Order'} - ${selectedItemsList.length} Items`
    );

    const d = new Date();
    d.setDate(d.getDate() + 7);
    setRfqDeadline(d.toISOString().split('T')[0]);

    const suggestedVendorIds = new Set<string>();
    selectedItemsList.forEach((it) => {
      if (it.assignedVendorId) suggestedVendorIds.add(it.assignedVendorId);
    });
    setRfqSelectedVendors(Array.from(suggestedVendorIds));
    setRfqNotes('');
    setIsRfqModalOpen(true);
  };

  const handleConfirmSendRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfqTitle.trim()) {
      showToast('Please provide an RFQ title.');
      return;
    }
    if (rfqSelectedVendors.length === 0) {
      showToast('Please select at least one vendor to receive this RFQ.');
      return;
    }

    try {
      await createRfqMutation({
        title: rfqTitle.trim(),
        projectId: activeTargetProject?.workOrderNumber || activeTargetProject?.projectId,
        submissionDeadline: rfqDeadline,
        vendors: rfqSelectedVendors,
        items: selectedItemsList.map((it) => ({
          itemCode: it.itemCode,
          description: it.itemName,
          qty: it.effectiveQty,
          uom: it.uom,
          make: it.make,
          category: it.category
        })),
        notes: rfqNotes
      }).unwrap();

      showToast(`All set! Outward RFQ dispatched to ${rfqSelectedVendors.length} vendor(s).`);
      setIsRfqModalOpen(false);
      setSelectedItemKeys({});
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not dispatch RFQ. Please check the fields.');
    }
  };

  // PO Action Handlers (Multi-Vendor Split Review)
  const handleOpenPoModal = () => {
    if (selectedItemsList.length === 0) return;
    setPoNotes(`Procurement for ${activeTargetProject?.workOrderNumber}`);
    setUnassignedVendorOverrides({});
    setIsPoModalOpen(true);
  };

  const poVendorGroups = useMemo(() => {
    const groupsMap: Record<string, { vendor: any; items: SourcingNode[]; subtotal: number }> = {};
    const unassigned: SourcingNode[] = [];

    for (const item of selectedItemsList) {
      const vendorId = unassignedVendorOverrides[item.key] || item.assignedVendorId;

      if (!vendorId) {
        unassigned.push(item);
      } else {
        const v = vendors.find((x: any) => x.id === vendorId);
        if (!groupsMap[vendorId]) {
          groupsMap[vendorId] = {
            vendor: v || {
              id: vendorId,
              name: item.assignedVendorName || 'Vendor',
              vendorCode: item.assignedVendorCode || 'VND'
            },
            items: [],
            subtotal: 0
          };
        }
        groupsMap[vendorId].items.push(item);
        groupsMap[vendorId].subtotal += item.extendedCost;
      }
    }

    return {
      groups: Object.values(groupsMap),
      unassigned
    };
  }, [selectedItemsList, unassignedVendorOverrides, vendors]);

  const handleConfirmGeneratePos = async () => {
    if (poVendorGroups.groups.length === 0) {
      showToast('Please assign vendors to the selected items before generating POs.');
      return;
    }

    try {
      for (const grp of poVendorGroups.groups) {
        await createPurchaseOrderMutation({
          projectId: activeTargetProject?.workOrderNumber || activeTargetProject?.projectId,
          vendorId: grp.vendor.id,
          vendorCode: grp.vendor.vendorCode || '',
          vendorName: grp.vendor.name || '',
          items: grp.items.map((it) => ({
            itemCode: it.itemCode,
            description: it.itemName,
            quantity: it.effectiveQty,
            uom: it.uom,
            unitPrice: it.unitPrice,
            totalPrice: it.extendedCost
          })),
          notes: poNotes
        }).unwrap();
      }

      showToast(`All set! Successfully created ${poVendorGroups.groups.length} Purchase Order(s).`);
      setIsPoModalOpen(false);
      setSelectedItemKeys({});
      setUnassignedVendorOverrides({});
    } catch (err: any) {
      showToast(err?.data?.message || 'Could not generate Purchase Orders. Please check the items.');
    }
  };

  // Render Tree Rows for Design Drawings
  const renderDesignDrawingTreeRows = (nodes: SourcingNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const isExpanded = Boolean(expandedTreeNodes[node.key]);
      const hasChildren = Boolean(node.children && node.children.length > 0);
      const isSelected = Boolean(selectedItemKeys[node.key]);

      return (
        <React.Fragment key={node.key}>
          <tr className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-orange-50/40' : ''}`}>
            {/* Checkbox */}
            <td className="py-2.5 px-3 text-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggleSelectItem(node.key)}
                className="w-4 h-4 rounded-md border-slate-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
              />
            </td>

            {/* Tree Indentation & Item Details */}
            <td className="py-2.5 px-3 min-w-[220px]">
              <div
                className="flex items-center gap-1.5"
                style={{ paddingLeft: `${node.level > 1 ? (node.level - 1) * 1.5 : 0}rem` }}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => handleToggleTreeNode(node.key)}
                    className="p-1 rounded-md hover:bg-slate-200 text-slate-600 cursor-pointer shrink-0 transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <span className="w-5 shrink-0 inline-block text-slate-300 text-center text-xs">•</span>
                )}

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{node.itemName}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold uppercase ${
                        node.classification === 'ASSEMBLY'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : node.classification === 'SUB_ASSEMBLY'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {node.classification === 'ASSEMBLY'
                        ? 'L1 ASM'
                        : node.classification === 'SUB_ASSEMBLY'
                        ? 'L2 SUB'
                        : 'COMPONENT'}
                    </span>
                  </div>
                  {node.itemCode !== node.itemName && (
                    <div className="text-[10px] font-mono text-slate-400">{node.itemCode}</div>
                  )}
                </div>
              </div>
            </td>

            {/* Make / Brand */}
            <td className="py-2.5 px-3 min-w-[120px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <Tag size={10} className="text-slate-400" />
                <span>{node.make}</span>
              </span>
            </td>

            {/* Category */}
            <td className="py-2.5 px-3 min-w-[120px]">
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                {node.category}
              </span>
            </td>

            {/* Classification */}
            <td className="py-2.5 px-3 min-w-[90px]">
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                {node.classification}
              </span>
            </td>

            {/* Required Qty & UOM */}
            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 min-w-[90px]">
              {node.effectiveQty}{' '}
              <span className="text-[10px] text-slate-500 font-normal">{node.uom}</span>
            </td>

            {/* Procurement Status */}
            <td className="py-2.5 px-3 min-w-[150px]">
              {node.procurementStatus === 'PO_SENT' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <Receipt size={12} className="text-emerald-600 shrink-0" />
                  <span>{node.procurementStatusLabel}</span>
                </span>
              ) : node.procurementStatus === 'RFQ_RAISED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold bg-sky-50 text-sky-800 border border-sky-300 shadow-2xs">
                  <Send size={12} className="text-sky-600 shrink-0" />
                  <span>{node.procurementStatusLabel}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                  <Clock size={10} className="text-slate-400 shrink-0" />
                  <span>Pending Sourcing</span>
                </span>
              )}
            </td>

            {/* Assigned Vendor */}
            <td className="py-2.5 px-3 min-w-[170px]">
              {node.assignedVendorName ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                  <Building2 size={11} className="text-slate-500" />
                  <span>{node.assignedVendorName}</span>
                  {node.isPreferred && <Star size={10} className="text-amber-500 fill-amber-500 ml-0.5" />}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Unassigned
                </span>
              )}
            </td>

            {/* Unit Price */}
            <td className="py-2.5 px-3 text-right min-w-[110px]">
              {node.unitPrice > 0 ? (
                <span className="font-mono font-bold text-slate-900 text-xs">
                  ₹{node.unitPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              ) : (
                <span className="text-slate-400 italic text-[11px]">Pending Rate</span>
              )}
            </td>

            {/* Extended Cost */}
            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 min-w-[110px]">
              ₹{node.extendedCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </td>

            {/* Action: Global Price List Modal Icon Button */}
            <td className="py-2.5 px-3 text-center min-w-[100px]">
              <button
                type="button"
                onClick={() => handleOpenPriceListModal(node)}
                title="Assign Price & Vendor Globally"
                className="p-1.5 px-2.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs font-bold text-[11px]"
              >
                <IndianRupee size={12} className="text-orange-600" />
                <span>Price List</span>
              </button>
            </td>
          </tr>

          {/* Children */}
          {hasChildren && isExpanded && renderDesignDrawingTreeRows(node.children!, depth + 1)}
        </React.Fragment>
      );
    });
  };

  // ========================================================
  // RENDER DEDICATED FULL-PAGE BOM & MATERIAL PLANNING WORKSPACE
  // ========================================================
  const renderMaterialPlanningWorkspace = () => {
    const p = activePlanningProject;
    if (!p) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <FileCode2 size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Work Order Selected</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Please select a Work Order from the list to view its attached BOM &amp; BOQ and plan material procurement.
          </p>
          <div className="mt-4">
            <Link
              href="/purchase/projects/work-orders"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <ArrowLeft size={14} />
              <span>Back to Work Orders List</span>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Top Work Order Selector Bar & Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          {/* Selector Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/purchase/projects/work-orders"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
              >
                <ArrowLeft size={13} />
                <span>Back to Work Orders List</span>
              </Link>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Select Work Order:</span>
                <div className="w-72 sm:w-80">
                  <SearchableSelect
                    label="Work Order"
                    placeholder="Search Work Order..."
                    value={p.projectId}
                    options={workOrderOptions}
                    onChange={(val) => {
                      setSelectedPlanningProjectId(val);
                      router.push(`/purchase/projects/material-planning?projectId=${encodeURIComponent(val)}`);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenPreviewModal(p)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Eye size={13} />
                <span>Preview Work Order</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenSubStagesModal(p)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Layers size={13} />
                <span>Sub-Stages ({p.completedCount}/{p.totalSubStages})</span>
              </button>
            </div>
          </div>

          {/* Project & BOM Sourcing Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work Order</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-extrabold text-slate-900 font-mono truncate">
                  {p.workOrderNumber || p.projectId}
                </span>
                <WorkOrderBomBadge
                  bomAttached={p.hasBom}
                  isBomLocked={p.isBomLocked}
                  bomStatus={p.drawingApprovalStatus || p.bom?.approvalStatus}
                  attachedDrawingsCount={p.drawingsCount}
                  size="sm"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
              <span className="text-xs font-bold text-slate-900 truncate block mt-1" title={p.customerName}>
                {p.customerName || '—'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Machine Model</span>
              <span className="text-xs font-bold text-slate-900 truncate block mt-1" title={p.machineModel}>
                {p.machineModel || '—'} ({p.quantity || 1} Units)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Date</span>
              <span className="text-xs font-extrabold text-slate-900 font-mono block mt-1">
                {p.targetDate || '—'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">BOM Drawings / Items</span>
              <span className="text-xs font-extrabold text-slate-900 font-mono block mt-1">
                {p.drawingsCount || 0} Drawings • {p.bom?.items?.length || 0} Items
              </span>
            </div>

            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200/80">
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">Est. Procurement</span>
              <span className="text-xs font-extrabold text-orange-950 font-mono block mt-1">
                ₹{Number(sourcingBomData?.totalCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* SOURCING CONTENT */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
<div className="space-y-4">
                  {!p.hasBom ? (
                    <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                      <FileCode2 size={32} className="mx-auto text-slate-300 mb-2" />
                      <div className="text-xs font-bold text-slate-600">No BOM attached yet</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Design engineers are currently working on drawings and BOM for this Work Order.
                      </div>
                    </div>
                  ) : !isCurrentProjectBomLive ? (
                    /* DRAFT / PENDING ENGINEERING REVIEW BANNER */
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
                            <Clock size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-amber-950">
                              Engineering BOM in Draft / Review
                            </div>
                            <div className="text-[11px] text-amber-700 mt-0.5">
                              The interactive Sourcing Tree, Multiple Make filters, and direct RFQ/PO generation unlock automatically once Engineering marks the BOM as BOM Live (Locked &amp; Approved).
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
                          {p.bom?.bomNumber || 'Draft BOM'}
                        </span>
                      </div>

                      {Array.isArray(p.bom?.items) && p.bom.items.length > 0 ? (
                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                              <tr>
                                <th className="py-2.5 px-3 w-10 text-center">#</th>
                                <th className="py-2.5 px-3 min-w-[90px]">Type</th>
                                <th className="py-2.5 px-3 min-w-[200px]">Item Description</th>
                                <th className="py-2.5 px-3 text-right min-w-[80px]">Quantity</th>
                                <th className="py-2.5 px-3 text-center min-w-[70px]">UOM</th>
                                <th className="py-2.5 px-3 min-w-[150px]">Part / Drawing No.</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {p.bom.items.map((item: any, iIdx: number) => (
                                <tr key={iIdx} className="hover:bg-slate-50/60">
                                  <td className="py-2.5 px-3 text-center font-mono text-slate-400">{iIdx + 1}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                      {item.itemType || 'RM-BO'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-900">{item.itemName}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{item.quantity}</td>
                                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">{item.uom || 'Nos'}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{item.drawingNumber || item.itemCode || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          BOM record attached with no individual line items listed.
                        </div>
                      )}
                    </div>
                  ) : (
                    /* BOM LIVE: TWO-TAB ATTACHED BOM ARCHITECTURE */
                    <div className="space-y-4">
                      {/* TWO TABS SEGMENTED BUTTON SWITCHER: DESIGN DRAWINGS vs RM-BO */}
                      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 w-fit">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBomSubTab('design-drawing');
                            setBomColumnFilters({});
                            setBomSortConfig(null);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeBomSubTab === 'design-drawing'
                              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                        >
                          <Layers size={14} />
                          <span>Design Drawings</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                              activeBomSubTab === 'design-drawing'
                                ? 'bg-white text-orange-600'
                                : 'bg-white text-slate-700 border border-slate-200'
                            }`}
                          >
                            {sourcingBomData.designDrawingItems.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveBomSubTab('rm-bo');
                            setBomColumnFilters({});
                            setBomSortConfig(null);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeBomSubTab === 'rm-bo'
                              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                        >
                          <ShoppingCart size={14} />
                          <span>RM &amp; BO Items</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                              activeBomSubTab === 'rm-bo'
                                ? 'bg-white text-orange-600'
                                : 'bg-white text-slate-700 border border-slate-200'
                            }`}
                          >
                            {sourcingBomData.rmBoItems.length}
                          </span>
                        </button>
                      </div>

                      {/* Toolbar & Search Bar */}
                      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Left: Dedicated In-Line Search Bar */}
                          <div className="relative w-full sm:w-80">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder={`Search in ${activeBomSubTab === 'design-drawing' ? 'drawings...' : 'RM-BO items...'}`}
                              value={bomSearchTerm}
                              onChange={(e) => setBomSearchTerm(e.target.value)}
                              className="w-full pl-8 pr-7 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-orange-500 font-medium"
                            />
                            {bomSearchTerm && (
                              <button
                                type="button"
                                onClick={() => setBomSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>

                          {/* Right: Subtotal + Mode Controls + Reset Filters Button */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {hasActiveBomFilters && (
                              <button
                                type="button"
                                onClick={handleResetBomFilters}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all cursor-pointer shadow-2xs"
                                title="Reset all active column filters and search"
                              >
                                <RotateCcw size={13} />
                                <span>Reset Filters</span>
                              </button>
                            )}

                            {activeBomSubTab === 'design-drawing' && (
                              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => setDesignDrawingViewMode('tree')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    designDrawingViewMode === 'tree'
                                      ? 'bg-white text-slate-900 shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Tree View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDesignDrawingViewMode('flat')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    designDrawingViewMode === 'flat'
                                      ? 'bg-white text-slate-900 shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  Flat List
                                </button>
                              </div>
                            )}

                            {activeBomSubTab === 'design-drawing' && designDrawingViewMode === 'tree' && (
                              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleExpandAll(true)}
                                  className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                                >
                                  Expand All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleExpandAll(false)}
                                  className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                                >
                                  Collapse All
                                </button>
                              </div>
                            )}

                            <span className="text-xs text-slate-600 font-medium px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                              Subtotal:{' '}
                              <strong className="text-slate-900 font-mono font-bold">
                                ₹
                                {(activeBomSubTab === 'design-drawing'
                                  ? sourcingBomData.designDrawingTotalCost
                                  : sourcingBomData.rmBoTotalCost
                                ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Selected Items Sourcing Action Bar */}
                      {selectedCount > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-150">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                              {selectedCount}
                            </div>
                            <div>
                              <div className="text-xs font-extrabold text-orange-950">
                                {selectedCount} Items Selected
                              </div>
                              <div className="text-[11px] text-orange-800 font-semibold">
                                Estimated Procurement Value:{' '}
                                <span className="font-mono font-bold text-slate-900">
                                  ₹{selectedTotalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedItemKeys({})}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                            >
                              Clear Selection
                            </button>

                            <button
                              type="button"
                              onClick={handleOpenRfqModal}
                              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Send size={13} />
                              <span>Send for Outward RFQ</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleOpenPoModal}
                              className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Receipt size={13} />
                              <span>Generate Outward PO</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Data Table / Tree */}
                      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs bg-white">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                              <tr>
                                <th className="py-2.5 px-3 w-10 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isAllVisibleSelected}
                                    onChange={handleToggleSelectAllVisible}
                                    className="w-4 h-4 rounded-md border-slate-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                                    title="Select all visible items"
                                  />
                                </th>
                                {!(activeBomSubTab === 'design-drawing' && designDrawingViewMode === 'tree') && (
                                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                                )}
                                <th className="py-2.5 px-3 min-w-[200px]">
                                  <ExcelColumnFilter
                                    title={activeBomSubTab === 'design-drawing' ? 'Drawing Name & Number' : 'Item Description & Code'}
                                    columnKey="itemTitle"
                                    distinctValues={distinctBomItemTitles}
                                    selectedValues={bomColumnFilters.itemTitle}
                                    onFilterChange={(selected) =>
                                      setBomColumnFilters((prev) => ({ ...prev, itemTitle: selected }))
                                    }
                                    currentSortField={bomSortConfig?.key}
                                    currentSortDirection={bomSortConfig?.direction}
                                    onSortChange={(k, d) => {
                                      setBomSortConfig({ key: k, direction: d });
                                      if (activeBomSubTab === 'design-drawing' && designDrawingViewMode === 'tree') {
                                        setDesignDrawingViewMode('flat');
                                      }
                                    }}
                                  />
                                </th>
                                <th className="py-2.5 px-3 min-w-[130px]">
                                  <ExcelColumnFilter
                                    title="Make / Brand"
                                    columnKey="make"
                                    distinctValues={distinctBomMakes}
                                    selectedValues={bomColumnFilters.make}
                                    onFilterChange={(selected) =>
                                      setBomColumnFilters((prev) => ({ ...prev, make: selected }))
                                    }
                                    currentSortField={bomSortConfig?.key}
                                    currentSortDirection={bomSortConfig?.direction}
                                    onSortChange={(k, d) => {
                                      setBomSortConfig({ key: k, direction: d });
                                      if (activeBomSubTab === 'design-drawing' && designDrawingViewMode === 'tree') {
                                        setDesignDrawingViewMode('flat');
                                      }
                                    }}
                                  />
                                </th>
                                <th className="py-2.5 px-3 min-w-[130px]">
                                  <ExcelColumnFilter
                                    title="Category"
                                    columnKey="category"
                                    distinctValues={distinctBomCategories}
                                    selectedValues={bomColumnFilters.category}
                                    onFilterChange={(selected) =>
                                      setBomColumnFilters((prev) => ({ ...prev, category: selected }))
                                    }
                                    currentSortField={bomSortConfig?.key}
                                    currentSortDirection={bomSortConfig?.direction}
                                    onSortChange={(k, d) => {
                                      setBomSortConfig({ key: k, direction: d });
                                      if (activeBomSubTab === 'design-drawing' && designDrawingViewMode === 'tree') {
                                        setDesignDrawingViewMode('flat');
                                      }
                                    }}
                                  />
                                </th>
                                <th className="py-2.5 px-3 min-w-[120px]">
                                  <ExcelColumnFilter
                                    title="Classification"
                                    columnKey="classification"
                                    distinctValues={distinctBomClassifications}
                                    selectedValues={bomColumnFilters.classification}
                                    onFilterChange={(selected) =>
                                      setBomColumnFilters((prev) => ({ ...prev, classification: selected }))
                                    }
                                    currentSortField={bomSortConfig?.key}
                                    currentSortDirection={bomSortConfig?.direction}
                                    onSortChange={(k, d) => {
                                      setBomSortConfig({ key: k, direction: d });
                                      if (activeBomSubTab === 'design-drawing' && designDrawingViewMode === 'tree') {
                                        setDesignDrawingViewMode('flat');
                                      }
                                    }}
                                  />
                                </th>
                                <th className="py-2.5 px-3 min-w-[110px]">
                                  <ExcelColumnFilter
                                    title="Required Qty"
                                    columnKey="quantity"
                                    distinctValues={distinctBomQuantities}
                                    selectedValues={bomColumnFilters.quantity}
                                    onFilterChange={(selected) =>
                                      setBomColumnFilters((prev) => ({ ...prev, quantity: selected }))
                                    }
                                    currentSortField={bomSortConfig?.key}
                                    currentSortDirection={bomSortConfig?.direction}
                                    onSortChange={(k, d) => {
                                      setBomSortConfig({ key: k, direction: d });
                                      if (activeBomSubTab === 'design-drawing' && designDrawingViewMode === 'tree') {
                                        setDesignDrawingViewMode('flat');
                                      }
                                    }}
                                  />
                                </th>
                                <th className="py-2.5 px-3 min-w-[160px]">
                                  <ExcelColumnFilter
                                    title="Procurement Status"
                                    columnKey="procurementStatus"
                                    distinctValues={distinctBomProcurementStatuses}
                                    selectedValues={bomColumnFilters.procurementStatus}
                                    onFilterChange={(selected) =>
                                      setBomColumnFilters((prev) => ({ ...prev, procurementStatus: selected }))
                                    }
                                    currentSortField={bomSortConfig?.key}
                                    currentSortDirection={bomSortConfig?.direction}
                                    onSortChange={(k, d) => {
                                      setBomSortConfig({ key: k, direction: d });
                                      if (activeBomSubTab === 'design-drawing' && designDrawingViewMode === 'tree') {
                                        setDesignDrawingViewMode('flat');
                                      }
                                    }}
                                  />
                                </th>
                                <th className="py-2.5 px-3 min-w-[170px]">
                                  <ExcelColumnFilter
                                    title="Assigned Vendor"
                                    columnKey="vendor"
                                    distinctValues={distinctBomVendors}
                                    selectedValues={bomColumnFilters.vendor}
                                    onFilterChange={(selected) =>
                                      setBomColumnFilters((prev) => ({ ...prev, vendor: selected }))
                                    }
                                    currentSortField={bomSortConfig?.key}
                                    currentSortDirection={bomSortConfig?.direction}
                                    onSortChange={(k, d) => {
                                      setBomSortConfig({ key: k, direction: d });
                                      if (activeBomSubTab === 'design-drawing' && designDrawingViewMode === 'tree') {
                                        setDesignDrawingViewMode('flat');
                                      }
                                    }}
                                  />
                                </th>
                                <th className="py-2.5 px-3 min-w-[120px]">
                                  <ExcelColumnFilter
                                    title="Agreed Rate"
                                    columnKey="unitPrice"
                                    distinctValues={distinctBomRates}
                                    selectedValues={bomColumnFilters.unitPrice}
                                    onFilterChange={(selected) =>
                                      setBomColumnFilters((prev) => ({ ...prev, unitPrice: selected }))
                                    }
                                    currentSortField={bomSortConfig?.key}
                                    currentSortDirection={bomSortConfig?.direction}
                                    onSortChange={(k, d) => {
                                      setBomSortConfig({ key: k, direction: d });
                                      if (activeBomSubTab === 'design-drawing' && designDrawingViewMode === 'tree') {
                                        setDesignDrawingViewMode('flat');
                                      }
                                    }}
                                  />
                                </th>
                                <th className="py-2.5 px-3 min-w-[120px]">
                                  <ExcelColumnFilter
                                    title="Extended Total"
                                    columnKey="extendedCost"
                                    distinctValues={distinctBomTotals}
                                    selectedValues={bomColumnFilters.extendedCost}
                                    onFilterChange={(selected) =>
                                      setBomColumnFilters((prev) => ({ ...prev, extendedCost: selected }))
                                    }
                                    currentSortField={bomSortConfig?.key}
                                    currentSortDirection={bomSortConfig?.direction}
                                    onSortChange={(k, d) => {
                                      setBomSortConfig({ key: k, direction: d });
                                      if (activeBomSubTab === 'design-drawing' && designDrawingViewMode === 'tree') {
                                        setDesignDrawingViewMode('flat');
                                      }
                                    }}
                                  />
                                </th>
                                <th className="py-2.5 px-3 text-center min-w-[100px]">Price &amp; Vendor</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {activeBomSubTab === 'design-drawing' && designDrawingViewMode === 'tree' ? (
                                filteredDesignDrawingTree.length === 0 ? (
                                  <tr>
                                    <td colSpan={11} className="py-12 text-center text-slate-400">
                                      No design drawings match your active filters.
                                    </td>
                                  </tr>
                                ) : (
                                  renderDesignDrawingTreeRows(filteredDesignDrawingTree)
                                )
                              ) : filteredCurrentTabItems.length === 0 ? (
                                <tr>
                                  <td colSpan={12} className="py-12 text-center text-slate-400">
                                    No items match the active make, category, or keyword filters.
                                  </td>
                                </tr>
                              ) : (
                                filteredCurrentTabItems.map((item, iIdx) => {
                                  const isSelected = Boolean(selectedItemKeys[item.key]);

                                  return (
                                    <tr
                                      key={item.key || iIdx}
                                      className={`hover:bg-slate-50/70 transition-colors ${
                                        isSelected ? 'bg-orange-50/40' : ''
                                      }`}
                                    >
                                      {/* Checkbox */}
                                      <td className="py-2.5 px-3 text-center">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleToggleSelectItem(item.key)}
                                          className="w-4 h-4 rounded-md border-slate-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                                        />
                                      </td>

                                      {/* Index */}
                                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                                        {iIdx + 1}
                                      </td>

                                      {/* Item Description & Code */}
                                      <td className="py-2.5 px-3 min-w-[190px]">
                                        <div className="font-bold text-slate-900 text-xs">{item.itemName}</div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                                          <span>{item.itemCode}</span>
                                          {item.parentName &&
                                            item.parentName !== p.workOrderNumber && (
                                              <span className="text-slate-500">• In: {item.parentName}</span>
                                            )}
                                        </div>
                                      </td>

                                      {/* Make / Brand */}
                                      <td className="py-2.5 px-3 min-w-[110px]">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                          <Tag size={10} className="text-slate-400" />
                                          <span>{item.make}</span>
                                        </span>
                                      </td>

                                      {/* Category */}
                                      <td className="py-2.5 px-3 min-w-[120px]">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                          {item.category}
                                        </span>
                                      </td>

                                      {/* Classification / Type */}
                                      <td className="py-2.5 px-3 min-w-[90px]">
                                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                          {item.classification === 'RM_BO' ? 'RM-BO' : item.classification}
                                        </span>
                                      </td>

                                      {/* Required Qty & UOM */}
                                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 min-w-[100px]">
                                        {item.effectiveQty}{' '}
                                        <span className="text-[10px] text-slate-500 font-normal">{item.uom}</span>
                                      </td>

                                      {/* Procurement Status */}
                                      <td className="py-2.5 px-3 min-w-[150px]">
                                        {item.procurementStatus === 'PO_SENT' ? (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                                            <Receipt size={12} className="text-emerald-600 shrink-0" />
                                            <span>{item.procurementStatusLabel}</span>
                                          </span>
                                        ) : item.procurementStatus === 'RFQ_RAISED' ? (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold bg-sky-50 text-sky-800 border border-sky-300 shadow-2xs">
                                            <Send size={12} className="text-sky-600 shrink-0" />
                                            <span>{item.procurementStatusLabel}</span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                            <Clock size={10} className="text-slate-400 shrink-0" />
                                            <span>Pending Sourcing</span>
                                          </span>
                                        )}
                                      </td>

                                      {/* Assigned Vendor */}
                                      <td className="py-2.5 px-3 min-w-[170px]">
                                        {item.assignedVendorName ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                            <Building2 size={11} className="text-slate-500" />
                                            <span>{item.assignedVendorName}</span>
                                            {item.isPreferred && (
                                              <Star size={10} className="text-amber-500 fill-amber-500 ml-0.5" />
                                            )}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                            Unassigned
                                          </span>
                                        )}
                                      </td>

                                      {/* Agreed Rate */}
                                      <td className="py-2.5 px-3 text-right min-w-[110px]">
                                        {item.unitPrice > 0 ? (
                                          <span className="font-mono font-bold text-slate-900 text-xs">
                                            ₹{item.unitPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 italic text-[11px]">Pending Rate</span>
                                        )}
                                      </td>

                                      {/* Extended Total */}
                                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 min-w-[110px]">
                                        ₹{item.extendedCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                      </td>

                                      {/* Action: Global Price List Modal Icon Button */}
                                      <td className="py-2.5 px-3 text-center min-w-[100px]">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenPriceListModal(item)}
                                          title="Assign Price & Vendor Globally"
                                          className="p-1.5 px-2.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs font-bold text-[11px]"
                                        >
                                          <IndianRupee size={12} className="text-orange-600" />
                                          <span>Price List</span>
                                        </button>
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
                </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Sub-Tab Switcher (Button-Type Segmented Pill Tabs) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        <Link
          href="/purchase/projects"
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
            activeSubTab === 'work-orders'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <FolderGit2 size={15} />
          <span>Work Orders List</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeSubTab === 'work-orders'
                ? 'bg-white text-orange-600'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {purchaseProjects.length}
          </span>
        </Link>

        <Link
          href="/purchase/projects/material-planning"
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
            activeSubTab === 'material-planning'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ShoppingCart size={15} />
          <span>BOM &amp; Material Planning</span>
          {activePlanningProject && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeSubTab === 'material-planning'
                  ? 'bg-white text-orange-600'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {activePlanningProject.workOrderNumber || activePlanningProject.projectId}
            </span>
          )}
        </Link>

        <Link
          href={`/purchase/projects/kanban${selectedPlanningProjectId || urlProjectId ? `?projectId=${encodeURIComponent(selectedPlanningProjectId || urlProjectId)}` : ''}`}
          className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
            activeSubTab === 'kanban'
              ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Kanban size={15} />
          <span>Procurement Kanban</span>
          {activeKanbanProject && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeSubTab === 'kanban'
                  ? 'bg-white text-orange-600'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {activeKanbanProject.workOrderNumber || activeKanbanProject.projectId}
            </span>
          )}
        </Link>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: WORK ORDERS LIST                             */}
      {/* ======================================================== */}
      {activeSubTab === 'work-orders' && (
        <div className="space-y-4">
          {/* Top Dedicated In-Line Table Toolbar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Left Side: Dedicated Search Bar */}
        <div className="relative flex-1 min-w-[260px] max-w-lg">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Work Order, Customer, Machinery Model, Sourcing Scope..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Side: Quick Action Links & Reset Filters Button */}
        <div className="flex items-center gap-2 shrink-0">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all cursor-pointer shadow-2xs"
              title="Reset all active column filters and search"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}

          <Link
            href="/purchase/masters/sub-stages"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs"
          >
            <Layers size={14} className="text-orange-500" />
            <span>Configure Sub-Stages ({subStageMasters.length})</span>
          </Link>

          <Link
            href="/purchase/rfq"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
          >
            <Inbox size={14} />
            <span>Create Outward RFQ</span>
          </Link>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
              <tr>
                <th className="py-3 px-4 w-10 text-center">#</th>

                <th className="py-3 px-4 min-w-[200px]">
                  <ExcelColumnFilter
                    title="Work Order No."
                    columnKey="workOrderNumber"
                    distinctValues={distinctWorkOrders}
                    selectedValues={columnFilters.workOrderNumber}
                    onFilterChange={(selected) =>
                      setColumnFilters((prev) => ({ ...prev, workOrderNumber: selected }))
                    }
                    currentSortField={sortConfig?.key}
                    currentSortDirection={sortConfig?.direction}
                    onSortChange={(k, d) => setSortConfig({ key: k, direction: d })}
                  />
                </th>

                <th className="py-3 px-4 min-w-[200px]">
                  <ExcelColumnFilter
                    title="Customer"
                    columnKey="customerName"
                    distinctValues={distinctCustomers}
                    selectedValues={columnFilters.customerName}
                    onFilterChange={(selected) =>
                      setColumnFilters((prev) => ({ ...prev, customerName: selected }))
                    }
                    currentSortField={sortConfig?.key}
                    currentSortDirection={sortConfig?.direction}
                    onSortChange={(k, d) => setSortConfig({ key: k, direction: d })}
                  />
                </th>

                <th className="py-3 px-4 min-w-[220px]">
                  <ExcelColumnFilter
                    title="Machinery Model"
                    columnKey="machineModel"
                    distinctValues={distinctModels}
                    selectedValues={columnFilters.machineModel}
                    onFilterChange={(selected) =>
                      setColumnFilters((prev) => ({ ...prev, machineModel: selected }))
                    }
                    currentSortField={sortConfig?.key}
                    currentSortDirection={sortConfig?.direction}
                    onSortChange={(k, d) => setSortConfig({ key: k, direction: d })}
                  />
                </th>

                <th className="py-3 px-4 min-w-[150px] text-center">
                  BOM & Sourcing Scope
                </th>

                <th className="py-3 px-4 min-w-[200px]">
                  Purchase Sub-Stages Progress
                </th>

                <th className="py-3 px-4 min-w-[130px]">
                  Target Commitment
                </th>

                <th className="py-3 px-4 min-w-[130px] text-center">
                  <ExcelColumnFilter
                    title="Status"
                    columnKey="purchaseStatus"
                    distinctValues={distinctStatuses}
                    selectedValues={columnFilters.purchaseStatus}
                    onFilterChange={(selected) =>
                      setColumnFilters((prev) => ({ ...prev, purchaseStatus: selected }))
                    }
                    currentSortField={sortConfig?.key}
                    currentSortDirection={sortConfig?.direction}
                    onSortChange={(k, d) => setSortConfig({ key: k, direction: d })}
                    align="right"
                  />
                </th>

                <th className="py-3 px-4 min-w-[130px] text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoadingProjects ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading Purchase Projects &amp; Work Orders...
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <FolderGit2 size={36} className="text-slate-300" />
                      <span className="text-xs font-semibold text-slate-600">
                        {hasActiveFilters ? 'No purchase projects match your filters' : 'No active purchase projects found'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {hasActiveFilters
                          ? 'Try resetting column filters or keyword search'
                          : 'Projects will automatically appear here once approved in Project Setup.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p: any, idx: number) => {
                  return (
                    <tr key={p.projectId || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Work Order ID + BOM Status Badge (Clickable Identifier) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleOpenPreviewModal(p)}
                              className="font-extrabold text-slate-900 hover:text-orange-600 font-mono transition-colors text-left cursor-pointer group flex items-center gap-1.5"
                              title="Click to view comprehensive project preview dossier"
                            >
                              <span className="underline decoration-slate-300 group-hover:decoration-orange-500 underline-offset-2">
                                {p.workOrderNumber || p.projectId}
                              </span>
                              <Eye size={12} className="opacity-0 group-hover:opacity-100 text-orange-500 transition-opacity" />
                            </button>

                            <Link
                              href={`/purchase/projects/kanban?projectId=${encodeURIComponent(p.projectId)}`}
                              className="p-1 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                              title={`Open Procurement Kanban for ${p.workOrderNumber || p.projectId}`}
                            >
                              <Kanban size={13} />
                            </Link>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <WorkOrderBomBadge
                              isBomLocked={p.isBomLocked}
                              bomStatus={p.drawingApprovalStatus || p.bom?.approvalStatus}
                              bomAttached={p.hasBom}
                              attachedDrawingsCount={p.drawingsCount}
                              size="sm"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{p.customerName || 'General Customer'}</div>
                        {p.customerPoNumber && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            PO: {p.customerPoNumber}
                          </div>
                        )}
                      </td>

                      {/* Machinery Model */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{p.machineModel || 'Standard Machinery'}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-semibold">
                          Quantity: <span className="text-slate-800 font-extrabold">{p.quantity || 1} Units</span>
                        </div>
                      </td>

                      {/* BOM & Sourcing Scope */}
                      <td className="py-3.5 px-4 text-center">
                        {p.hasBom ? (
                          <Link
                            href={`/purchase/projects/material-planning?projectId=${encodeURIComponent(p.projectId)}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 hover:border-sky-300 transition-all cursor-pointer shadow-2xs"
                            title="Open Material Planning for this Work Order"
                          >
                            <Layers size={13} className="text-sky-600" />
                            <span>{p.drawingsCount > 0 ? `${p.drawingsCount} Drawings` : 'BOM Attached'}</span>
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <Clock size={12} />
                            <span>BOM Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Sub-Stages Progress */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600 font-bold">
                              {p.completedCount}/{p.totalSubStages} Sub-Stages
                            </span>
                            <span className="font-extrabold text-orange-600">
                              {p.progressPercent}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-orange-500 rounded-full transition-all duration-300"
                              style={{ width: `${p.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Target Commitment Date */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-mono font-bold text-slate-900">
                          {p.targetDate}
                        </div>
                        {p.daysLeft !== null && (
                          <div className="mt-1">
                            {p.isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">
                                <AlertTriangle size={10} />
                                {Math.abs(p.daysLeft)}d Overdue
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {p.daysLeft === 0 ? 'Due Today' : `${p.daysLeft} days left`}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            p.purchaseStatus === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : p.isOverdue
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.purchaseStatus === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : p.isOverdue
                                ? 'bg-red-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span>{p.purchaseStatus}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          {/* Dedicated One-Click Icon to Move to BOM & Material Planning */}
                          <Link
                            href={`/purchase/projects/material-planning?projectId=${encodeURIComponent(p.projectId)}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 transition-all shadow-xs shadow-orange-500/20 cursor-pointer"
                            title={`Plan Material Purchase for ${p.workOrderNumber || p.projectId}`}
                          >
                            <ShoppingCart size={13} />
                            <span>Plan Purchase</span>
                          </Link>

                          {/* Dedicated Kanban Button to open that particular work order in Procurement Kanban */}
                          <Link
                            href={`/purchase/projects/kanban?projectId=${encodeURIComponent(p.projectId)}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-300 text-slate-700 hover:text-orange-600 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            title={`Open Procurement Kanban for ${p.workOrderNumber || p.projectId}`}
                          >
                            <Kanban size={13} className="text-orange-500" />
                            <span>Kanban</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleOpenSubStagesModal(p)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Manage Purchase Sub-Stages"
                          >
                            <Layers size={13} />
                            <span>Sub-Stages</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenPreviewModal(p)}
                            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Preview Dossier"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
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

  {/* ======================================================== */}
  {/* SUB-TAB 2: BOM & MATERIAL PLANNING                      */}
  {/* ======================================================== */}
  {activeSubTab === 'material-planning' && renderMaterialPlanningWorkspace()}

  {/* ======================================================== */}
  {/* SUB-TAB 3: PROCUREMENT KANBAN BOARD                     */}
  {/* ======================================================== */}
  {activeSubTab === 'kanban' && (
    <div className="space-y-4">
      <PurchaseKanbanTab initialProjectId={selectedPlanningProjectId || urlProjectId} />
    </div>
  )}

  {/* SUB-STAGES MANAGER MODAL */}
      {activeSubStagesProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold flex items-center gap-2">
                    <span>Purchase Sub-Stages Portfolio</span>
                    <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                      {activeSubStagesProject.workOrderNumber || activeSubStagesProject.projectId}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    {activeSubStagesProject.customerName} • {activeSubStagesProject.machineModel}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedProjectForSubStages(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Summary Strip */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Overall Purchase Progress
                  </span>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {activeSubStagesProject.completedCount} of {activeSubStagesProject.totalSubStages} Activities Completed
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-orange-600">
                    {activeSubStagesProject.progressPercent}%
                  </span>
                </div>
              </div>

              {/* Sub-Stages List Header & Add Button */}
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Assigned Procurement Sub-Stages ({activeSubStagesProject.subStages.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen((prev) => !prev)}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>{isAddFormOpen ? 'Close Form' : 'Add Sub-Stage'}</span>
                </button>
              </div>

              {/* Add Sub-Stage Form Card (When Open) */}
              {isAddFormOpen && (
                <form
                  onSubmit={handleCreateSubStage}
                  className="p-4 rounded-xl border border-orange-200 bg-orange-50/50 space-y-4 animate-in fade-in duration-150"
                >
                  <div className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                    <Plus size={14} className="text-orange-600" />
                    <span>Attach New Sub-Stage to Work Order</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Master Sub-Stage Picker */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Select from Purchase Masters
                      </label>
                      <select
                        value={selectedMasterSubStageId}
                        onChange={(e) => {
                          setSelectedMasterSubStageId(e.target.value);
                          if (e.target.value) setCustomSubStageTitle('');
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-orange-500"
                      >
                        <option value="">-- Choose Pre-defined Master Activity --</option>
                        {subStageMasters.map((m: any) => (
                          <option key={m.id || m._id} value={m.id || m._id}>
                            {m.name || m.subStageName || m.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Custom Title (if not picking from master) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Or Enter Custom Activity Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Expedite critical CNC shafts delivery"
                        value={customSubStageTitle}
                        disabled={Boolean(selectedMasterSubStageId)}
                        onChange={(e) => setCustomSubStageTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:border-orange-500"
                      />
                    </div>

                    {/* Assigned Purchase Executive */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Assign Purchase Executive
                      </label>
                      <select
                        value={assignedUserId}
                        onChange={(e) => setAssignedUserId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-orange-500"
                      >
                        <option value="">-- Unassigned --</option>
                        {departmentUsers.map((u: any) => (
                          <option key={u.id || u._id} value={u.id || u._id}>
                            {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target End Date */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Target Completion Date
                      </label>
                      <input
                        type="date"
                        value={targetEndDate}
                        onChange={(e) => setTargetEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddFormOpen(false)}
                      className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingSubStage}
                      className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isAddingSubStage ? 'Adding...' : 'Attach Sub-Stage'}
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-Stages Table */}
              {activeSubStagesProject.subStages.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <Layers size={28} className="mx-auto text-slate-300 mb-2" />
                  <div className="text-xs font-bold text-slate-600">No sub-stages added yet</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Click &ldquo;Add Sub-Stage&rdquo; to attach procurement activities from master or custom tasks.
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Status</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Sub-Stage Activity</th>
                        <th className="py-2.5 px-3 min-w-[170px]">Assigned Buyer</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Target Date</th>
                        <th className="py-2.5 px-3 w-14 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeSubStagesProject.subStages.map((sub: any, sIdx: number) => {
                        const isCompleted = sub.status === 'COMPLETED';
                        return (
                          <tr key={sub.id || sIdx} className="hover:bg-slate-50/60 transition-colors">
                            {/* Status Checkbox */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSubStageStatus(sub)}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                                  isCompleted
                                    ? 'bg-emerald-500 border-emerald-600 text-white'
                                    : 'border-slate-300 hover:border-orange-500 text-transparent'
                                }`}
                                title={isCompleted ? 'Mark as In-Progress' : 'Mark as Completed'}
                              >
                                <Check size={13} strokeWidth={3} className={isCompleted ? 'block' : 'hidden'} />
                              </button>
                            </td>

                            {/* Title & Code */}
                            <td className="py-2.5 px-3">
                              <div className={`font-bold text-slate-900 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                                {sub.title}
                              </div>
                              {sub.subStageCode && (
                                <div className="text-[10px] font-mono text-slate-400">
                                  {sub.subStageCode}
                                </div>
                              )}
                            </td>

                            {/* Assigned Executive */}
                            <td className="py-2.5 px-3">
                              <select
                                value={sub.assignedToUserId || ''}
                                onChange={(e) => handleAssignSubStageUser(sub, e.target.value)}
                                className="px-2 py-1 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-orange-500"
                              >
                                <option value="">-- Unassigned --</option>
                                {departmentUsers.map((u: any) => (
                                  <option key={u.id || u._id} value={u.id || u._id}>
                                    {`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Target Date */}
                            <td className="py-2.5 px-3">
                              <input
                                type="date"
                                defaultValue={sub.targetEndDate ? new Date(sub.targetEndDate).toISOString().split('T')[0] : ''}
                                onBlur={(e) => handleUpdateSubStageDate(sub, e.target.value)}
                                className="px-2 py-1 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-orange-500"
                              />
                            </td>

                            {/* Delete Action */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setDeletingSubStageId(sub.id || sub._id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                                title="Remove sub-stage"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedProjectForSubStages(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deletingSubStageId)}
        title="Remove this Purchase Sub-Stage?"
        message="This will delete the sub-stage from this Work Order and recalculate purchase progress."
        confirmText="Yes, remove"
        cancelText="Cancel"
        isLoading={isDeletingSubStage}
        onConfirm={handleConfirmDeleteSubStage}
        onClose={() => setDeletingSubStageId(null)}
      />

      {/* LARGE MASTER PREVIEW DOSSIER MODAL */}
      {activePreviewProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1560px] max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
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
                    handleOpenSubStagesModal(p);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers size={13} />
                  <span>Manage Sub-Stages</span>
                </button>
                <button
                  onClick={() => setPreviewProject(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Segmented Button Tabs */}
            <div className="bg-slate-50 px-6 lg:px-8 py-2.5 border-b border-slate-200 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTab('substages')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  previewTab === 'substages'
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Layers size={14} />
                <span>Sub-Stages Progress</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    previewTab === 'substages' ? 'bg-white text-orange-600' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {activePreviewProject.subStages.length}
                </span>
              </button>



              <button
                type="button"
                onClick={() => setPreviewTab('machines')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  previewTab === 'machines'
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <ShoppingCart size={14} />
                <span>Attached Machinery</span>
              </button>
            </div>

            {/* Scrollable Dossier Body */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
              {/* TAB 1: SUB-STAGES PROGRESS */}
              {previewTab === 'substages' && (
                <div className="space-y-5">
                  {/* BOM & Sourcing Workspace Callout Banner */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/15 text-orange-700 flex items-center justify-center shrink-0">
                        <FileCode2 size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          BOM &amp; Material Procurement Planning
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {activePreviewProject.hasBom
                            ? `BOM attached with ${activePreviewProject.drawingsCount || 0} drawings and ${activePreviewProject.bom?.items?.length || 0} line items.`
                            : 'No BOM attached yet for this Work Order.'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/purchase/kanban?projectId=${encodeURIComponent(activePreviewProject.projectId)}`}
                        onClick={() => setPreviewProject(null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                      >
                        <Kanban size={13} />
                        <span>Open in Kanban</span>
                      </Link>
                      <Link
                        href={`/purchase/projects/material-planning?projectId=${encodeURIComponent(activePreviewProject.projectId)}`}
                        onClick={() => setPreviewProject(null)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                      >
                        <span>Open Material Planning Workspace</span>
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Completion Status
                      </span>
                      <div className="text-xl font-extrabold text-slate-900 mt-1">
                        {activePreviewProject.completedCount} / {activePreviewProject.totalSubStages} Completed
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Progress Rate
                      </span>
                      <div className="text-xl font-extrabold text-orange-600 mt-1">
                        {activePreviewProject.progressPercent}%
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Target Date
                      </span>
                      <div className="text-xl font-extrabold text-slate-900 mt-1">
                        {activePreviewProject.targetDate}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Activity Title</th>
                          <th className="py-2.5 px-3 min-w-[150px]">Assigned Buyer</th>
                          <th className="py-2.5 px-3 min-w-[120px]">Target Date</th>
                          <th className="py-2.5 px-3 text-center min-w-[100px]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activePreviewProject.subStages.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              No purchase activities recorded for this Work Order.
                            </td>
                          </tr>
                        ) : (
                          activePreviewProject.subStages.map((sub: any, sIdx: number) => (
                            <tr key={sub.id || sIdx} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{sIdx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">{sub.title}</td>
                              <td className="py-2.5 px-3 text-slate-600 font-medium">
                                {sub.assignedToUserName || 'Unassigned'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700">
                                {sub.targetEndDate ? new Date(sub.targetEndDate).toLocaleDateString('en-IN') : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    sub.status === 'COMPLETED'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {sub.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}


              {/* TAB 3: ATTACHED MACHINERY */}
              {previewTab === 'machines' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Ordered Machine Model
                      </span>
                      <h4 className="text-lg font-black text-slate-900 mt-0.5">
                        {activePreviewProject.machineModel || 'Standard Machinery Model'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-lg">
                        {activePreviewProject.productDescription || 'Custom Engineer-to-Order machinery tailored to client specifications.'}
                      </p>
                    </div>

                    <div className="px-5 py-3 rounded-2xl bg-orange-500 text-white border border-orange-600 text-center shadow-xs">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-90">
                        Order Quantity
                      </span>
                      <span className="text-2xl font-black block mt-0.5">
                        {activePreviewProject.quantity || 1} Units
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <span className="text-xs font-bold text-slate-800 block mb-2">
                      Customer &amp; Commercial Particulars
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">Customer</span>
                        <span className="font-bold text-slate-800">{activePreviewProject.customerName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">Customer PO Ref</span>
                        <span className="font-bold text-slate-800 font-mono">{activePreviewProject.customerPoNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">Commitment Date</span>
                        <span className="font-bold text-slate-800 font-mono">{activePreviewProject.targetDate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">Current Stage</span>
                        <span className="font-bold text-orange-600">{activePreviewProject.currentStage || 'PURCHASE'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Universal Action Tracking Audit Section */}
              <div className="pt-4 border-t border-slate-200">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-orange-500" />
                  <span>Audit Trail &amp; Record History</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Created By
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {activePreviewProject.createdByName || 'System Provisioned'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                        <Clock size={11} className="text-slate-400" />
                        Created At
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                        {activePreviewProject.createdAt
                          ? new Date(activePreviewProject.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Last Updated By
                        </span>
                        <span className="text-xs font-bold text-slate-900 block mt-0.5">
                          {activePreviewProject.updatedByName || activePreviewProject.createdByName || 'System Provisioned'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                        <Clock size={11} className="text-slate-400" />
                        Updated At
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 block mt-0.5">
                        {activePreviewProject.updatedAt
                          ? new Date(activePreviewProject.updatedAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 lg:px-8 py-3.5 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                Work Order Reference: {activePreviewProject.workOrderNumber || activePreviewProject.projectId}
              </span>
              <button
                type="button"
                onClick={() => setPreviewProject(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OUTWARD RFQ CREATION MODAL (STANDARD EXPANSIVE FORM max-w-6xl xl:max-w-7xl) */}
      {isRfqModalOpen && activeTargetProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl xl:max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0 shadow-2xs">
                  <Send size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                      Create Outward Sourcing RFQ
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                      Standard Large Form
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {activeTargetProject.workOrderNumber} • {activeTargetProject.customerName || 'Customer'} • {selectedItemsList.length} BOM Items Selected
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRfqModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleConfirmSendRfq} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Context Summary 3-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Target Work Order &amp; Client
                  </span>
                  <div className="text-sm font-extrabold text-slate-900">
                    {activeTargetProject.workOrderNumber}
                  </div>
                  <div className="text-xs text-slate-600 font-medium">
                    {activeTargetProject.customerName || 'Client Account'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ordered Machinery Model
                  </span>
                  <div className="text-sm font-extrabold text-slate-900">
                    {activeTargetProject.machineModel || 'Standard Machinery Model'}
                  </div>
                  <div className="text-xs text-slate-600 font-medium">
                    Quantity: {activeTargetProject.quantity || 1} Machine Unit(s)
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/60 space-y-1">
                  <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                    Selected Items &amp; Target Valuation
                  </span>
                  <div className="text-sm font-extrabold text-sky-950 font-mono">
                    {selectedItemsList.length} Item(s) Selected
                  </div>
                  <div className="text-xs text-sky-800 font-semibold font-mono">
                    Est. Value: ₹{selectedTotalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* RFQ Parameters: Title & Submission Deadline */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                  RFQ Commercial Parameters
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      RFQ Title / Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={rfqTitle}
                      onChange={(e) => setRfqTitle(e.target.value)}
                      placeholder="e.g. Sourcing RFQ for Machine Components"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-orange-500 font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Submission Deadline <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={rfqDeadline}
                      onChange={(e) => setRfqDeadline(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-orange-500 font-mono transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Vendors Selection Section */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                      Target Vendors ({rfqSelectedVendors.length} Selected) <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Select all suppliers who should receive this quote invitation.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* In-Line Vendor Search */}
                    <div className="relative w-48 sm:w-60">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search vendors..."
                        value={rfqVendorSearch}
                        onChange={(e) => setRfqVendorSearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-orange-500 font-medium"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (rfqSelectedVendors.length === vendors.length) {
                          setRfqSelectedVendors([]);
                        } else {
                          setRfqSelectedVendors(vendors.map((v: any) => v.id));
                        }
                      }}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer whitespace-nowrap px-2 py-1 bg-orange-50 rounded-lg border border-orange-200"
                    >
                      {rfqSelectedVendors.length === vendors.length ? 'Clear Selection' : 'Select All Vendors'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-56 overflow-y-auto p-1">
                  {vendors
                    .filter((v: any) => {
                      if (!rfqVendorSearch.trim()) return true;
                      const q = rfqVendorSearch.trim().toLowerCase();
                      return (
                        v.name?.toLowerCase().includes(q) ||
                        v.vendorCode?.toLowerCase().includes(q) ||
                        v.email?.toLowerCase().includes(q)
                      );
                    })
                    .map((v: any) => {
                      const isChecked = rfqSelectedVendors.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isChecked
                              ? 'border-orange-300 bg-orange-50/70 shadow-2xs'
                              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setRfqSelectedVendors((prev) =>
                                prev.includes(v.id) ? prev.filter((x) => x !== v.id) : [...prev, v.id]
                              );
                            }}
                            className="w-4 h-4 mt-0.5 rounded-md border-slate-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-slate-900 text-xs truncate">{v.name}</span>
                              <span className="font-mono text-[9px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded-md shrink-0">
                                {v.vendorCode}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                              {v.email || v.phone || 'Approved Supplier'}
                            </div>
                            {v.rating && (
                              <div className="text-[9px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                                <span>★ {v.rating}</span>
                                <span className="text-slate-400">• Quality Verified</span>
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Detailed Sourcing Line Items Specification Table */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                    Line Items Included in RFQ ({selectedItemsList.length} Items)
                  </span>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    Total Estimated Sourcing Value: ₹
                    {selectedTotalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-600 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Item Description &amp; Drawing No.</th>
                        <th className="py-2.5 px-3 min-w-[110px]">Make / Brand</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Category</th>
                        <th className="py-2.5 px-3 min-w-[100px]">Classification</th>
                        <th className="py-2.5 px-3 text-right min-w-[90px]">Required Qty</th>
                        <th className="py-2.5 px-3 text-right min-w-[110px]">Target Rate (₹)</th>
                        <th className="py-2.5 px-3 text-right min-w-[110px]">Est. Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedItemsList.map((it, idx) => (
                        <tr key={it.key || idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            <div>{it.itemName}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {it.drawingNumber || it.itemCode}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <Tag size={10} className="text-slate-400" />
                              <span>{it.make}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                              {it.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                              {it.classification}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {it.effectiveQty}{' '}
                            <span className="text-[10px] text-slate-500 font-normal">{it.uom}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {it.unitPrice > 0 ? `₹${it.unitPrice.toLocaleString('en-IN')}` : 'To Quote'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{it.extendedCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sourcing Terms & Instructions */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Commercial Terms &amp; Special Sourcing Instructions
                </label>
                <textarea
                  rows={3}
                  value={rfqNotes}
                  onChange={(e) => setRfqNotes(e.target.value)}
                  placeholder="e.g. Please quote landed INR price inclusive of packing, freight, and insurance with delivery commitment at Machine House plant, Pune."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-orange-500 font-medium"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between sticky bottom-0 bg-white">
                <div className="text-xs text-slate-500">
                  Will dispatch RFQ to <strong className="text-slate-900">{rfqSelectedVendors.length} vendor(s)</strong> and update selected items to <strong className="text-sky-700">RFQ Raised</strong>.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRfqModalOpen(false)}
                    className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingRfq || rfqSelectedVendors.length === 0}
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>{isSendingRfq ? 'Dispatching RFQ...' : 'Dispatch RFQ & Update Item Status'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OUTWARD PURCHASE ORDER MODAL (STANDARD LARGE FORM WITH MASTER PREFIX & FULL DETAILS) */}
      <OutwardPurchaseOrderModal
        isOpen={isPoModalOpen && Boolean(activeTargetProject)}
        onClose={() => setIsPoModalOpen(false)}
        initialProjectId={activeTargetProject?.workOrderNumber || activeTargetProject?.projectId || ''}
        initialVendorId={selectedItemsList[0]?.assignedVendorId || ''}
        initialVendorName={selectedItemsList[0]?.assignedVendorName || ''}
        initialItems={selectedItemsList.map((item) => ({
          itemCode: item.itemCode,
          itemName: item.itemName || item.itemCode,
          description: item.drawingNumber ? `Drawing: ${item.drawingNumber} • ${item.description || item.category || ''}` : (item.description || item.category || ''),
          hsnCode: item.itemType === 'RM-BO' ? '72083800' : '84799090',
          uom: item.uom || (item.itemType === 'RM-BO' ? 'KG' : 'Nos'),
          quantity: item.effectiveQty || item.quantity || 1,
          rate: item.unitPrice || 0,
          count: 0
        }))}
        existingPos={purchaseOrdersData?.purchaseOrders || []}
        onPoCreated={() => {
          setSelectedItemKeys({});
          setIsPoModalOpen(false);
          refetchPurchaseOrders();
          showToast('All set! Outward PO released successfully.');
        }}
      />

      {/* GLOBAL PRICE LIST & VENDOR ASSIGNMENT MODAL */}
      {priceListModal && priceListModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <IndianRupee size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Global Price List &amp; Vendor Assignment
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Updates the ERP master rate &amp; preferred vendor globally
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPriceListModal(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleSavePriceListModal} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Item Info Banner */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">{priceListModal.itemName}</h4>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">{priceListModal.itemCode}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200 uppercase font-mono">
                      {priceListModal.itemType === 'RM_BO' ? 'RM & BO Item' : 'Design Drawing'}
                    </span>
                    {priceListModal.revisionNumber && (
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                        {priceListModal.revisionNumber}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-900 text-white">
                      UOM: {priceListModal.uom}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium pt-1 border-t border-slate-200/60">
                  <span>
                    Make / Brand: <strong className="text-slate-900">{priceListModal.make || 'Standard'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Category: <strong className="text-slate-900">{priceListModal.category || 'General'}</strong>
                  </span>
                </div>
              </div>

              {/* 2-Column Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Price (per UOM) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Standard Rate (₹ per {priceListModal.uom}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={priceListModal.price}
                      onChange={(e) => setPriceListModal({ ...priceListModal, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-orange-500 font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* Tax Rate (% GST) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Tax Rate (%) (GST) *
                  </label>
                  <select
                    value={priceListModal.taxRatePercent}
                    onChange={(e) =>
                      setPriceListModal({ ...priceListModal, taxRatePercent: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-orange-500 font-medium"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (Standard)</option>
                    <option value={28}>28%</option>
                  </select>
                </div>

                {/* Vendor / Supplier */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Assigned Vendor / Supplier (Optional)
                    </label>
                    <span className="text-[10px] text-slate-400">Leave blank for internal base rate</span>
                  </div>
                  <select
                    value={priceListModal.vendorCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const v = vendors.find((vend: any) => vend.vendorCode === code);
                      setPriceListModal({
                        ...priceListModal,
                        vendorCode: code,
                        vendorName: v ? v.name : ''
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-orange-500 font-medium"
                  >
                    <option value="">-- No Specific Vendor (Standard Base Rate) --</option>
                    {vendors.map((v: any) => (
                      <option key={v.id || v.vendorCode} value={v.vendorCode}>
                        {v.name} ({v.vendorCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preferred Supplier Checkbox */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-amber-900">
                  <input
                    type="checkbox"
                    checked={priceListModal.isPreferred}
                    onChange={(e) => setPriceListModal({ ...priceListModal, isPreferred: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded-md focus:ring-orange-500/20"
                  />
                  <span>⭐ Preferred Supplier for this Material</span>
                </label>
                <p className="text-[11px] text-amber-700 pl-6 leading-relaxed">
                  Procurement Workbench and BOM Costing will prioritize this vendor quote when generating Purchase Orders and cost estimations.
                </p>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Commercial Remarks / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={priceListModal.remarks}
                  onChange={(e) => setPriceListModal({ ...priceListModal, remarks: e.target.value })}
                  placeholder="e.g. Quotation reference, price validity, minimum order quantity..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPriceListModal(null)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAgreement || isUpdatingAgreement}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <IndianRupee size={14} />
                  <span>
                    {isCreatingAgreement || isUpdatingAgreement ? 'Saving Globally...' : 'Save & Assign Globally'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PurchaseProjectsTab(props: PurchaseProjectsTabProps) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 font-medium text-xs">
          Loading Purchase Projects &amp; Material Planning...
        </div>
      }
    >
      <PurchaseProjectsTabInner {...props} />
    </Suspense>
  );
}
