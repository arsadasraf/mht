'use client';

import React, { useState, useMemo } from 'react';
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
  RotateCcw,
  Kanban,
  FileText,
  UserCheck,
  Building2,
  Check,
  Eye,
  Layers,
  Boxes,
  Briefcase,
  AlertCircle,
  Tag,
  ShieldCheck,
  Info,
  Edit2,
  Trash2,
  ListPlus
} from 'lucide-react';
import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetAvailableCustomerPosQuery,
  useGetStageMastersQuery
} from '../api/projectApi';
import { setActiveProjectId, addToast } from '../../../store/uiSlice';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';

export default function ProjectsTab() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Queries & Mutations
  const { data, isLoading } = useGetProjectsQuery({});
  const { data: customerPoData } = useGetAvailableCustomerPosQuery();
  const { data: stageMastersData } = useGetStageMastersQuery();
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  const projects = data?.projects || [];
  const availablePos = customerPoData?.customerPos || [];
  const stageMasters = stageMastersData?.stages || [];

  // Dedicated In-Line Search Bar State
  const [searchTerm, setSearchTerm] = useState('');

  // Column-Based Excel Filters State
  const [excelFilters, setExcelFilters] = useState<{
    workOrderNumber: string[] | null;
    projectId: string[] | null;
    customerPoNumber: string[] | null;
    customerName: string[] | null;
    machineModel: string[] | null;
    currentStage: string[] | null;
    status: string[] | null;
  }>({
    workOrderNumber: null,
    projectId: null,
    customerPoNumber: null,
    customerName: null,
    machineModel: null,
    currentStage: null,
    status: null
  });

  // Sorting State
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  // Clickable Preview Dossier Modal State (with 3 tabbed views)
  const [previewProject, setPreviewProject] = useState<any | null>(null);
  const [dossierActiveTab, setDossierActiveTab] = useState<'basic' | 'stages' | 'design-substages'>('basic');

  // Create / Edit Project Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<'CUSTOMER_PO' | 'DIRECT'>('CUSTOMER_PO');
  const [selectedPoId, setSelectedPoId] = useState('');

  // Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    project: any;
  } | null>(null);

  // Form State
  const [workOrderNumber, setWorkOrderNumber] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [machineModel, setMachineModel] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [deliveryCommitmentDate, setDeliveryCommitmentDate] = useState('');
  const [targetDispatchDate, setTargetDispatchDate] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(1.0);

  // Department Stages State (Self-added by user, not pre-populated by default)
  const [configuredStages, setConfiguredStages] = useState<
    Array<{
      stageCode: string;
      title: string;
      leadRole: string;
      weightPercent: number;
      targetDate: string;
      notes: string;
    }>
  >([]);

  // Standard Stages Template Reference (Available for on-demand loading)
  const standardTemplateStages = useMemo(() => [
    {
      stageCode: 'DESIGN_BOM',
      title: 'Design & Engineering (BOM)',
      leadRole: 'Lead Design Engineer',
      weightPercent: 20,
      daysOffset: 14,
      defaultNotes: 'Complete 3D CAD modeling, component selection, and BOM release.'
    },
    {
      stageCode: 'PURCHASE_DEMAND',
      title: 'Procurement & Sourcing',
      leadRole: 'Purchase Officer',
      weightPercent: 20,
      daysOffset: 30,
      defaultNotes: 'Issue POs for long-lead bought-out items and raw materials.'
    },
    {
      stageCode: 'STORE_ISSUE',
      title: 'Store & Material Kitting',
      leadRole: 'Store In-Charge',
      weightPercent: 15,
      daysOffset: 45,
      defaultNotes: 'Verify inward QC gate entries and kit mechanical/electrical sub-assemblies.'
    },
    {
      stageCode: 'PRODUCTION',
      title: 'Production & Machining',
      leadRole: 'Production Manager',
      weightPercent: 25,
      daysOffset: 70,
      defaultNotes: 'Base frame welding, machining, and sub-assembly integration.'
    },
    {
      stageCode: 'QUALITY_PDI',
      title: 'Quality Testing & PDI',
      leadRole: 'Quality Head',
      weightPercent: 10,
      daysOffset: 80,
      defaultNotes: 'Run dry cycle trial, calibration, electrical safety, and customer inspection.'
    },
    {
      stageCode: 'DISPATCH_READY',
      title: 'Packaging & Final Dispatch',
      leadRole: 'Dispatch In-Charge',
      weightPercent: 10,
      daysOffset: 90,
      defaultNotes: 'Anti-rust packing, wooden crating, dispatch documentation, and transport.'
    }
  ], []);

  // Add a new department stage row
  const handleAddStage = () => {
    const nextOrder = configuredStages.length + 1;
    const target = new Date();
    target.setDate(target.getDate() + nextOrder * 14);

    const usedCodes = new Set(configuredStages.map((s) => s.stageCode));
    const candidate = stageMasters.find((sm: any) => !usedCodes.has(sm.stageCode));

    setConfiguredStages((prev) => [
      ...prev,
      {
        stageCode: candidate?.stageCode || (nextOrder === 1 ? 'DESIGN_BOM' : `STAGE_${nextOrder}`),
        title: candidate?.stageName || (nextOrder === 1 ? 'Design & Engineering (BOM)' : `Department Stage ${nextOrder}`),
        leadRole: candidate?.leadRole || 'Project Lead',
        weightPercent: candidate?.weightPercent || 15,
        targetDate: target.toISOString().split('T')[0],
        notes: ''
      }
    ]);
  };

  // Remove a stage row
  const handleRemoveStage = (index: number) => {
    setConfiguredStages((prev) => prev.filter((_, i) => i !== index));
  };

  // Optional: Load template stages on demand
  const handleLoadStandardStages = () => {
    const stagesToUse = stageMasters.length > 0
      ? stageMasters.map((sm: any, idx: number) => {
          const target = new Date();
          target.setDate(target.getDate() + (sm.standardDaysOffset || (idx + 1) * 14));
          return {
            stageCode: sm.stageCode,
            title: sm.stageName,
            leadRole: sm.leadRole || 'Department Lead',
            weightPercent: sm.weightPercent || 15,
            targetDate: target.toISOString().split('T')[0],
            notes: sm.description || ''
          };
        })
      : standardTemplateStages.map((st) => {
          const target = new Date();
          target.setDate(target.getDate() + st.daysOffset);
          return {
            stageCode: st.stageCode,
            title: st.title,
            leadRole: st.leadRole,
            weightPercent: st.weightPercent,
            targetDate: target.toISOString().split('T')[0],
            notes: st.defaultNotes
          };
        });

    setConfiguredStages(stagesToUse);
  };

  // Generate Suggested Next WO & Project IDs
  const generateSuggestedIds = () => {
    const currentYear = new Date().getFullYear();
    const count = projects.length + 1;
    const seq = String(1000 + count).padStart(4, '0');
    setWorkOrderNumber(`WO-${currentYear}-${seq}`);
    setProjectId(`PRJ-${currentYear}-${seq}`);
  };

  // Open Create Modal (Empty stages by default)
  const handleOpenCreateModal = () => {
    setModalMode('CREATE');
    setEditProjectId(null);
    generateSuggestedIds();
    setConfiguredStages([]); // User adds their own stages, not by default!
    setSelectedPoId('');
    setProjectName('');
    setCustomerName('');
    setMachineModel('');
    setProductDescription('');
    setDeliveryCommitmentDate('');
    setTargetDispatchDate('');
    setAmount('');
    setCreationMode('CUSTOMER_PO');
    setIsModalOpen(true);
  };

  // Open Edit Modal pre-filled
  const handleOpenEditModal = (project: any) => {
    setModalMode('EDIT');
    setEditProjectId(project.id || project.projectId);
    setWorkOrderNumber(project.workOrderNumber || '');
    setProjectId(project.projectId || '');
    setProjectName(project.projectName || '');
    setCustomerName(project.customerName || '');
    setMachineModel(project.machineModel || '');
    setProductDescription(project.productDescription || '');
    setDeliveryCommitmentDate(
      project.deliveryCommitmentDate
        ? new Date(project.deliveryCommitmentDate).toISOString().split('T')[0]
        : ''
    );
    setTargetDispatchDate(
      project.targetDispatchDate
        ? new Date(project.targetDispatchDate).toISOString().split('T')[0]
        : ''
    );
    setCurrency(project.contractValue?.currency || 'INR');
    setAmount(String(project.contractValue?.amount || ''));
    setExchangeRate(Number(project.contractValue?.exchangeRate || 1.0));
    setSelectedPoId(project.customerPoId || '');
    setCreationMode(project.customerPoNumber ? 'CUSTOMER_PO' : 'DIRECT');

    if (project.milestones && project.milestones.length > 0) {
      setConfiguredStages(
        project.milestones.map((m: any) => ({
          stageCode: m.stageCode || m.stage,
          title: m.title || m.stageCode,
          leadRole: m.leadRole || 'Project Manager',
          weightPercent: m.weightPercent || 10,
          targetDate: m.projectedDate || m.baselineDate
            ? new Date(m.projectedDate || m.baselineDate).toISOString().split('T')[0]
            : '',
          notes: m.notes || m.remarks?.[0]?.text || ''
        }))
      );
    } else {
      setConfiguredStages([]);
    }

    setIsModalOpen(true);
  };

  // Handle PO Selection & Auto-fill
  const handleSelectPo = (poId: string) => {
    setSelectedPoId(poId);
    if (!poId) {
      setCustomerName('');
      setMachineModel('');
      setProductDescription('');
      setDeliveryCommitmentDate('');
      setTargetDispatchDate('');
      setAmount('');
      return;
    }

    const po = availablePos.find((p: any) => p._id === poId || p.id === poId);
    if (po) {
      const cust = po.companyName || po.customerName || '';
      const firstItem = po.items?.[0];
      const model = firstItem?.modelCode || firstItem?.description || 'Precision Winding Machine';

      const fullDesc = (po.items || [])
        .map((it: any, idx: number) => {
          const parts: string[] = [];
          if (it.modelCode) parts.push(`Model: ${it.modelCode}`);
          if (it.description) parts.push(it.description);
          if (it.specifications) parts.push(`Specs: ${it.specifications}`);
          if (it.quantity) parts.push(`Qty: ${it.quantity} ${it.uom || 'Nos'}`);
          return `#${idx + 1} — ${parts.join(' | ')}`;
        })
        .join('\n');

      setCustomerName(cust);
      setMachineModel(model);
      setProductDescription(fullDesc);
      setProjectName(`${cust} — ${model} Execution`);

      if (po.totalAmount) {
        setCurrency(po.totalAmount.currency || 'INR');
        setAmount(String(po.totalAmount.amount || ''));
        setExchangeRate(po.totalAmount.exchangeRate || 1.0);
      }

      if (po.deliveryCommitmentDate) {
        const commDate = new Date(po.deliveryCommitmentDate).toISOString().split('T')[0];
        setDeliveryCommitmentDate(commDate);
        setTargetDispatchDate(commDate);
      }
    }
  };

  // Submit Create or Update Project
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (creationMode === 'CUSTOMER_PO' && !selectedPoId && !customerName) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Please pick a confirmed customer purchase order or switch to direct entry.'
        })
      );
      return;
    }

    if (!customerName.trim() || !machineModel.trim()) {
      dispatch(
        addToast({
          type: 'warning',
          message: 'Customer Name and Machine Model are required.'
        })
      );
      return;
    }

    try {
      const payload: any = {
        workOrderNumber: workOrderNumber.trim(),
        projectId: projectId.trim(),
        projectName: projectName.trim() || `${customerName} — ${machineModel}`,
        customerName: customerName.trim(),
        machineModel: machineModel.trim(),
        productDescription: productDescription.trim(),
        deliveryCommitmentDate: deliveryCommitmentDate ? new Date(deliveryCommitmentDate) : undefined,
        targetDispatchDate: targetDispatchDate ? new Date(targetDispatchDate) : undefined,
        customerPoId: creationMode === 'CUSTOMER_PO' ? selectedPoId : undefined,
        contractValue: {
          currency,
          amount: Number(amount) || 0,
          exchangeRate: Number(exchangeRate) || 1.0
        },
        stages: configuredStages.map((st, idx) => ({
          stageCode: st.stageCode,
          title: st.title,
          leadRole: st.leadRole,
          weightPercent: st.weightPercent,
          targetDate: st.targetDate,
          notes: st.notes,
          order: idx + 1
        }))
      };

      if (modalMode === 'EDIT' && editProjectId) {
        const res = await updateProject({ id: editProjectId, ...payload }).unwrap();
        dispatch(
          addToast({
            type: 'success',
            message: `All set! Project ${res.project?.workOrderNumber || workOrderNumber} updated successfully.`
          })
        );
        if (previewProject && (previewProject.id === editProjectId || previewProject.projectId === editProjectId)) {
          setPreviewProject(res.project);
        }
      } else {
        const res = await createProject(payload).unwrap();
        dispatch(setActiveProjectId(res.project?.projectId));
        dispatch(
          addToast({
            type: 'success',
            message: `All set! Master Work Order ${res.project?.workOrderNumber} created successfully.`
          })
        );
      }

      setIsModalOpen(false);
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || 'We could not save this project right now. Please try again.'
        })
      );
    }
  };

  // Delete Project Handler
  const handleDeleteProject = async () => {
    if (!deleteConfirm?.project) return;
    const target = deleteConfirm.project;

    try {
      await deleteProject(target.id || target.projectId).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: `All set! Project ${target.workOrderNumber} deleted successfully.`
        })
      );
      setDeleteConfirm(null);
      if (previewProject?.id === target.id || previewProject?.projectId === target.projectId) {
        setPreviewProject(null);
      }
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || 'We could not delete this project right now. Please try again.'
        })
      );
    }
  };

  // Distinct Values for Excel Column Filters
  const distinctValues = useMemo(() => {
    const build = (getter: (r: any) => string) => {
      const map: Record<string, number> = {};
      projects.forEach((r: any) => {
        const v = getter(r) || '(Blanks)';
        map[v] = (map[v] || 0) + 1;
      });
      return Object.entries(map)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      workOrderNumber: build((r) => r.workOrderNumber),
      projectId: build((r) => r.projectId),
      customerPoNumber: build((r) => r.customerPoNumber || r.customerPoRef?.poNumber),
      customerName: build((r) => r.customerName),
      machineModel: build((r) => r.machineModel),
      currentStage: build((r) => r.currentStage?.replace(/_/g, ' ')),
      status: build((r) => r.status)
    };
  }, [projects]);

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    let result = projects.filter((r: any) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          r.workOrderNumber?.toLowerCase().includes(q) ||
          r.projectId?.toLowerCase().includes(q) ||
          r.customerName?.toLowerCase().includes(q) ||
          r.machineModel?.toLowerCase().includes(q) ||
          r.customerPoNumber?.toLowerCase().includes(q) ||
          r.projectName?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (excelFilters.workOrderNumber && !excelFilters.workOrderNumber.includes(r.workOrderNumber || '(Blanks)')) return false;
      if (excelFilters.projectId && !excelFilters.projectId.includes(r.projectId || '(Blanks)')) return false;
      if (excelFilters.customerPoNumber && !excelFilters.customerPoNumber.includes(r.customerPoNumber || r.customerPoRef?.poNumber || '(Blanks)')) return false;
      if (excelFilters.customerName && !excelFilters.customerName.includes(r.customerName || '(Blanks)')) return false;
      if (excelFilters.machineModel && !excelFilters.machineModel.includes(r.machineModel || '(Blanks)')) return false;
      if (excelFilters.currentStage && !excelFilters.currentStage.includes(r.currentStage?.replace(/_/g, ' ') || '(Blanks)')) return false;
      if (excelFilters.status && !excelFilters.status.includes(r.status || '(Blanks)')) return false;

      return true;
    });

    result.sort((a: any, b: any) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDirection === 'asc' ? -1 : 1;
      if (va > vb) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [projects, searchTerm, excelFilters, sortField, sortDirection]);

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    Object.values(excelFilters).some((f) => f !== null);

  const handleResetFilters = () => {
    setSearchTerm('');
    setExcelFilters({
      workOrderNumber: null,
      projectId: null,
      customerPoNumber: null,
      customerName: null,
      machineModel: null,
      currentStage: null,
      status: null
    });
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const previewDesignSubStages = useMemo(() => {
    if (!previewProject?.milestones) return [];
    const designMilestone = previewProject.milestones.find(
      (m: any) =>
        m.stageCode === 'DESIGN_BOM' ||
        m.stage === 'DESIGN_BOM' ||
        m.departmentModule === 'design'
    );
    return designMilestone?.subStages || [];
  }, [previewProject]);

  return (
    <div className="space-y-4">
      {/* Top Dedicated In-Line Table Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left Side: Dedicated Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects by WO, Project ID, Customer, Machine, PO..."
            className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Side: Reset Filters, Kanban & Primary Create Button */}
        <div className="flex items-center gap-2 justify-end">
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}

          <button
            onClick={() => router.push('/project-setup/kanban')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-all"
          >
            <Kanban className="w-3.5 h-3.5 text-orange-500" />
            <span>Kanban Board</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs shadow-orange-500/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {/* Universal Projects Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Work Order No"
                    columnKey="workOrderNumber"
                    distinctValues={distinctValues.workOrderNumber}
                    selectedValues={excelFilters.workOrderNumber}
                    onFilterChange={(selected) =>
                      setExcelFilters((prev) => ({ ...prev, workOrderNumber: selected }))
                    }
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-3 px-3">
                  <ExcelColumnFilter
                    title="Project ID"
                    columnKey="projectId"
                    distinctValues={distinctValues.projectId}
                    selectedValues={excelFilters.projectId}
                    onFilterChange={(selected) =>
                      setExcelFilters((prev) => ({ ...prev, projectId: selected }))
                    }
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-3 px-3">
                  <ExcelColumnFilter
                    title="Customer PO"
                    columnKey="customerPoNumber"
                    distinctValues={distinctValues.customerPoNumber}
                    selectedValues={excelFilters.customerPoNumber}
                    onFilterChange={(selected) =>
                      setExcelFilters((prev) => ({ ...prev, customerPoNumber: selected }))
                    }
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Customer Name"
                    columnKey="customerName"
                    distinctValues={distinctValues.customerName}
                    selectedValues={excelFilters.customerName}
                    onFilterChange={(selected) =>
                      setExcelFilters((prev) => ({ ...prev, customerName: selected }))
                    }
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Machine / Product"
                    columnKey="machineModel"
                    distinctValues={distinctValues.machineModel}
                    selectedValues={excelFilters.machineModel}
                    onFilterChange={(selected) =>
                      setExcelFilters((prev) => ({ ...prev, machineModel: selected }))
                    }
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Commitment Date</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Contract Value</th>
                <th className="py-3 px-3">
                  <ExcelColumnFilter
                    title="Stage"
                    columnKey="currentStage"
                    distinctValues={distinctValues.currentStage}
                    selectedValues={excelFilters.currentStage}
                    onFilterChange={(selected) =>
                      setExcelFilters((prev) => ({ ...prev, currentStage: selected }))
                    }
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-3 px-3">
                  <ExcelColumnFilter
                    title="Status"
                    columnKey="status"
                    distinctValues={distinctValues.status}
                    selectedValues={excelFilters.status}
                    onFilterChange={(selected) =>
                      setExcelFilters((prev) => ({ ...prev, status: selected }))
                    }
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSortChange={handleSortChange}
                  />
                </th>
                <th className="py-3 px-4 text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Loading project records...
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <div className="max-w-sm mx-auto text-center space-y-2">
                      <Cpu className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">No project records match criteria.</p>
                      <p className="text-[11px] text-slate-400">
                        Mint a new project using the "Create Project" button above.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((row: any, idx: number) => {
                  const poNum = row.customerPoNumber || row.customerPoRef?.poNumber;
                  const commDate = row.deliveryCommitmentDate || row.targetDispatchDate;

                  return (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => {
                        setPreviewProject(row);
                        setDossierActiveTab('basic');
                      }}
                    >
                      <td className="py-3.5 px-3 text-center text-slate-400 text-[11px] font-mono">
                        {idx + 1}
                      </td>

                      {/* Clickable Work Order Identifier */}
                      <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-xs">
                            {row.workOrderNumber}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono font-semibold text-slate-700">
                        {row.projectId}
                      </td>

                      <td className="py-3.5 px-3">
                        {poNum ? (
                          <div className="flex items-center gap-1 text-slate-800 font-mono text-[11px]">
                            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{poNum}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Direct Entry</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {row.customerName}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="max-w-xs">
                          <span className="font-semibold text-slate-800">{row.machineModel}</span>
                          {row.productDescription && (
                            <p className="text-[11px] text-slate-400 italic truncate">
                              {row.productDescription}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-700">
                        {formatDate(commDate)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(row.contractValue?.amount || 0)}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {row.currentStage?.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {/* Preview Button */}
                          <button
                            onClick={() => {
                              setPreviewProject(row);
                              setDossierActiveTab('basic');
                            }}
                            title="Preview Dossier"
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(row)}
                            title="Edit Project"
                            className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteConfirm({ isOpen: true, project: row })}
                            title="Delete Project"
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Kanban Button */}
                          <button
                            onClick={() => {
                              dispatch(setActiveProjectId(row.projectId));
                              router.push('/project-setup/kanban');
                            }}
                            title="Open in Kanban"
                            className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <Kanban className="w-4 h-4" />
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

      {/* Create / Edit Project Modal (Spacious standard width w-full max-w-6xl xl:max-w-7xl) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl xl:max-w-7xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Crisp White Header Ribbon with Amber/Yellow Top Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {modalMode === 'EDIT' ? `Edit Project — ${workOrderNumber}` : 'Create Project — Mint Master Work Order'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {modalMode === 'EDIT'
                      ? 'Update project commercial terms, commitment dates, and milestone directives'
                      : 'Work order generation with Customer PO sync and custom department stages'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Expansive Form Body */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
              {/* Section 1: Creation Source & Customer PO Selection */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800">
                    Project Creation Source *
                  </label>
                  <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCreationMode('CUSTOMER_PO')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        creationMode === 'CUSTOMER_PO'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      From Customer PO
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreationMode('DIRECT');
                        setSelectedPoId('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        creationMode === 'DIRECT'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Direct Project Entry
                    </button>
                  </div>
                </div>

                {creationMode === 'CUSTOMER_PO' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Select Confirmed Customer PO *
                    </label>
                    <select
                      value={selectedPoId}
                      onChange={(e) => handleSelectPo(e.target.value)}
                      required={modalMode === 'CREATE'}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
                    >
                      <option value="">-- Choose Approved Customer Purchase Order --</option>
                      {availablePos.map((po: any) => (
                        <option key={po._id || po.id} value={po._id || po.id}>
                          {po.poNumber} • {po.companyName || po.customerName} • ({po.items?.[0]?.modelCode || 'Machine'}) • {po.deliveryCommitmentDate ? `Commitment: ${formatDate(po.deliveryCommitmentDate)}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Section 2: Work Order, Project ID & Commitment Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Work Order Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={workOrderNumber}
                    onChange={(e) => setWorkOrderNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono font-bold text-orange-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Project ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Delivery Commitment Date
                  </label>
                  <input
                    type="date"
                    value={deliveryCommitmentDate}
                    onChange={(e) => {
                      setDeliveryCommitmentDate(e.target.value);
                      if (!targetDispatchDate) setTargetDispatchDate(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Target Dispatch Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={targetDispatchDate}
                    onChange={(e) => setTargetDispatchDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Section 3: Customer, Machine Model & Contract Value (Clean 3-column layout without Plant Location) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Customer / Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Apex Transformers & Electricals Ltd"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Product / Machine Model *
                  </label>
                  <input
                    type="text"
                    required
                    value={machineModel}
                    onChange={(e) => setMachineModel(e.target.value)}
                    placeholder="e.g. RRO420-01-02-00-01 Precision SPM"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Contract Value (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Full Product Technical Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Product Complete Description & Specifications (Auto-fetched from PO)
                </label>
                <textarea
                  rows={3}
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Full product technical specifications, model code, and custom attachments..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Section 5: Department Stages Configuration (Self-added by user, not pre-populated by default) */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Department Stages Configuration
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Add milestones, target dates, and instructions for each department
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {configuredStages.length === 0 && (
                      <button
                        type="button"
                        onClick={handleLoadStandardStages}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                        <span>Load Standard Template</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleAddStage}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs shadow-orange-500/20 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Stage</span>
                    </button>
                  </div>
                </div>

                {configuredStages.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-300 space-y-2">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No Department Stages Added Yet</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Click the &ldquo;Add Stage&rdquo; button above to configure milestones for Design, Purchase, Production, Quality, etc.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddStage}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Stage</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {configuredStages.map((st, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          {/* Stage Number & Title / Dropdown */}
                          <div className="sm:col-span-5 flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Stage Name *
                              </label>
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={st.stageCode}
                                  onChange={(e) => {
                                    const code = e.target.value;
                                    const found = stageMasters.find((sm: any) => sm.stageCode === code);
                                    setConfiguredStages((prev) =>
                                      prev.map((s, i) =>
                                        i === idx
                                          ? {
                                              ...s,
                                              stageCode: code,
                                              title: found ? found.stageName : s.title,
                                              leadRole: found ? found.leadRole : s.leadRole
                                            }
                                          : s
                                      )
                                    );
                                  }}
                                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold"
                                >
                                  <option value={st.stageCode}>{st.title || st.stageCode}</option>
                                  {stageMasters.map((sm: any) => (
                                    <option key={sm.stageCode} value={sm.stageCode}>
                                      {sm.stageName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Lead Role */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Lead Role
                            </label>
                            <input
                              type="text"
                              value={st.leadRole}
                              onChange={(e) => {
                                const val = e.target.value;
                                setConfiguredStages((prev) =>
                                  prev.map((s, i) => (i === idx ? { ...s, leadRole: val } : s))
                                );
                              }}
                              placeholder="e.g. Lead Engineer"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          </div>

                          {/* Target Date */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Target Date *
                            </label>
                            <input
                              type="date"
                              required
                              value={st.targetDate}
                              onChange={(e) => {
                                const val = e.target.value;
                                setConfiguredStages((prev) =>
                                  prev.map((s, i) => (i === idx ? { ...s, targetDate: val } : s))
                                );
                              }}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono font-semibold"
                            />
                          </div>

                          {/* Remove Button */}
                          <div className="sm:col-span-1 flex justify-end items-end pt-4 sm:pt-0">
                            <button
                              type="button"
                              onClick={() => handleRemoveStage(idx)}
                              title="Remove Stage"
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Notes Row */}
                        <div>
                          <input
                            type="text"
                            value={st.notes}
                            onChange={(e) => {
                              const val = e.target.value;
                              setConfiguredStages((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, notes: val } : s))
                              );
                            }}
                            placeholder="Department directives or milestone instructions..."
                            className="w-full px-3.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>
                    {isCreating || isUpdating
                      ? 'Saving...'
                      : modalMode === 'EDIT'
                      ? 'Save Changes'
                      : 'Mint Master Project'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clickable Preview Dossier Modal (Spacious width w-full max-w-5xl xl:max-w-6xl) */}
      {previewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl xl:max-w-6xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Crisp White Header Ribbon with Amber/Yellow Top Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                      {previewProject.workOrderNumber} — {previewProject.customerName}
                    </h3>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-orange-100 text-orange-700">
                      {previewProject.projectId}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {previewProject.machineModel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Edit from Dossier */}
                <button
                  type="button"
                  onClick={() => {
                    const p = previewProject;
                    setPreviewProject(null);
                    handleOpenEditModal(p);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Project</span>
                </button>

                {/* Delete from Dossier */}
                <button
                  type="button"
                  onClick={() => {
                    const p = previewProject;
                    setDeleteConfirm({ isOpen: true, project: p });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all border border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                {/* Kanban from Dossier */}
                <button
                  type="button"
                  onClick={() => {
                    dispatch(setActiveProjectId(previewProject.projectId));
                    router.push('/project-setup/kanban');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-all"
                >
                  <Kanban className="w-3.5 h-3.5 text-orange-500" />
                  <span>Kanban</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewProject(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dossier Navigation: 3 Button-Type Tabs */}
            <div className="px-6 pt-4 pb-2 bg-slate-50/50 border-b border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDossierActiveTab('basic')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  dossierActiveTab === 'basic'
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Basic Details & Product</span>
              </button>

              <button
                type="button"
                onClick={() => setDossierActiveTab('stages')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  dossierActiveTab === 'stages'
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Department Stages & Status</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {previewProject.milestones?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDossierActiveTab('design-substages')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  dossierActiveTab === 'design-substages'
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Design Sub-Stages</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {previewDesignSubStages.length}
                </span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 max-h-[76vh] overflow-y-auto">
              {/* Tab 1: Basic Details & Complete Product Description */}
              {dossierActiveTab === 'basic' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Project & Order Spine */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Order & Identification Spine
                      </h4>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Work Order No:</span>
                          <span className="font-mono font-bold text-orange-600">
                            {previewProject.workOrderNumber}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Project ID:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {previewProject.projectId}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Customer PO Number:</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {previewProject.customerPoNumber || previewProject.customerPoRef?.poNumber || 'Direct Minting'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Customer Name:</span>
                          <span className="font-bold text-slate-900">{previewProject.customerName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline & Commercial Terms */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Timeline & Commercials
                      </h4>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Delivery Commitment Date:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {formatDate(previewProject.deliveryCommitmentDate)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Target Dispatch Date:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatDate(previewProject.targetDispatchDate)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Project Start Date:</span>
                          <span className="font-mono text-slate-700">
                            {formatDate(previewProject.startDate)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Contract Value:</span>
                          <span className="font-mono font-extrabold text-slate-900 text-sm">
                            {formatCurrency(previewProject.contractValue?.amount || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Current Stage:</span>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-200 text-slate-800 uppercase">
                            {previewProject.currentStage?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Complete Product Description Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Product Technical Description & Specifications
                    </h4>
                    <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-bold text-slate-900">
                          {previewProject.machineModel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-mono">
                        {previewProject.productDescription || 'No detailed technical specification attached.'}
                      </p>
                    </div>
                  </div>

                  {/* Mandatory Universal Action Tracking / Dual-Card Audit Section */}
                  <div className="border-t border-slate-200 pt-4">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">
                      Audit Trail
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Created By</p>
                          <p className="text-xs font-bold text-slate-800">
                            {previewProject.createdByName || 'System'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatDateTime(previewProject.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Last Updated By</p>
                          <p className="text-xs font-bold text-slate-800">
                            {previewProject.updatedByName || 'System'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatDateTime(previewProject.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Department Stages & Status */}
              {dossierActiveTab === 'stages' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Department Operational Milestones
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Target dates, lead roles, and progress status across all plant departments
                      </p>
                    </div>
                  </div>

                  {(!previewProject.milestones || previewProject.milestones.length === 0) ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">No milestones initialized.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {previewProject.milestones.map((m: any, idx: number) => {
                        const isDone = m.status === 'COMPLETED';
                        const inProgress = m.status === 'IN_PROGRESS';

                        return (
                          <div
                            key={m._id || m.id || idx}
                            className={`p-4 rounded-2xl border transition-all ${
                              isDone
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : inProgress
                                ? 'bg-orange-50/40 border-orange-200 shadow-xs'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                                    isDone
                                      ? 'bg-emerald-600 text-white'
                                      : inProgress
                                      ? 'bg-orange-500 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <div>
                                  <h5 className="text-xs font-extrabold text-slate-900">
                                    {m.title || m.stageCode}
                                  </h5>
                                  <p className="text-[11px] text-slate-500">
                                    Department: <span className="capitalize">{m.departmentModule || 'Project'}</span> • Lead: {m.leadRole || 'Project Manager'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block uppercase font-medium">
                                    Target Date
                                  </span>
                                  <span className="font-mono text-xs font-bold text-slate-800">
                                    {formatDate(m.projectedDate || m.baselineDate)}
                                  </span>
                                </div>

                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    isDone
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : inProgress
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {m.status?.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>

                            {/* Milestone Notes */}
                            {(m.notes || (m.remarks && m.remarks.length > 0)) && (
                              <div className="mt-2 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                                <span className="font-semibold text-slate-700">Notes: </span>
                                <span>{m.notes || m.remarks?.[0]?.text}</span>
                              </div>
                            )}

                            {/* Sub-stages count badge if present */}
                            {m.subStages && m.subStages.length > 0 && (
                              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                <Boxes className="w-3.5 h-3.5 text-slate-400" />
                                <span>{m.subStages.length} Sub-Stages configured for this department</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Design Sub-Stages Status */}
              {dossierActiveTab === 'design-substages' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Design Department Sub-Stages
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Detailed engineering execution stages from Design & BOM team
                      </p>
                    </div>
                  </div>

                  {previewDesignSubStages.length === 0 ? (
                    <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <Boxes className="w-9 h-9 text-slate-300 mx-auto" />
                      <h5 className="text-xs font-bold text-slate-700">No Design Sub-Stages Initialized</h5>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Sub-stages defined in Design &gt; Masters &gt; Sub-Stages will appear here once attached to this project.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {previewDesignSubStages.map((ss: any, sIdx: number) => {
                        const isDone = ss.status === 'COMPLETED';
                        const inProgress = ss.status === 'IN_PROGRESS';

                        return (
                          <div
                            key={ss._id || ss.id || sIdx}
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                              isDone
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : inProgress
                                ? 'bg-orange-50/30 border-orange-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {sIdx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h6 className="text-xs font-bold text-slate-900">{ss.title}</h6>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    [{ss.subStageCode}]
                                  </span>
                                </div>
                                {ss.assignedToUserName && (
                                  <p className="text-[11px] text-slate-500">
                                    Assigned: {ss.assignedToUserName}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                                  Target Date
                                </span>
                                <span className="font-mono text-xs font-bold text-slate-800">
                                  {formatDate(ss.targetEndDate || ss.baselineStartDate)}
                                </span>
                              </div>

                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : inProgress
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {ss.status?.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Standard MH Confirmation Dialog — Zero Native Browser Popups) */}
      {deleteConfirm?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Crisp White Header Ribbon with Amber Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-200/50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    Delete Project?
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Delete work order{' '}
                <strong className="text-slate-900 font-mono font-bold">
                  {deleteConfirm.project.workOrderNumber}
                </strong>{' '}
                ({deleteConfirm.project.projectName})? Once removed, you won&apos;t be able to recover this project record, and any linked Customer PO will be reverted to unlinked status.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteProject}
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
