'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  Workflow,
  Search,
  Plus,
  RotateCcw,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Wrench,
  ShieldCheck,
  AlertCircle,
  X,
  Phone,
  Mail,
  UserCheck,
  Building2,
  Sliders,
  Headphones
} from 'lucide-react';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';
import CustomerMasterSubTab from '../../crm/components/CustomerMasterSubTab';
import {
  useGetAfterSalesTeamQuery,
  useCreateAfterSalesTeamMemberMutation,
  useUpdateAfterSalesTeamMemberMutation,
  useDeleteAfterSalesTeamMemberMutation,
  useGetAfterSalesSubStagesQuery,
  useCreateAfterSalesSubStageMutation,
  useUpdateAfterSalesSubStageMutation,
  useDeleteAfterSalesSubStageMutation
} from '../api/afterSalesApi';

export type AfterSalesMasterSubTab = 'customers' | 'team' | 'sub-stages';

interface AfterSalesMastersTabProps {
  initialSubTab?: AfterSalesMasterSubTab;
}

const DEPARTMENTS = [
  { value: 'AFTER_SALES_SERVICE', label: 'Field Service & AMC' },
  { value: 'INSTALLATION_COMMISSIONING', label: 'Installation & Commissioning' },
  { value: 'WARRANTY_SUPPORT', label: 'Warranty & Breakdown Support' },
  { value: 'SPARE_PARTS', label: 'Spares & Consumables' },
  { value: 'RETROFIT_UPGRADE', label: 'Retrofit & Machine Upgrades' }
];

const SKILL_SPECIALTIES = [
  'Installation & Commissioning',
  'On-Site Machine Calibration & Leveling',
  'PLC & Drive Parameter Tuning',
  'Tension Control & Winding Synchronization',
  'Breakdown Diagnostics & Emergency Repair',
  'Preventive Maintenance & AMC Servicing',
  'Operator & Maintenance Training',
  'Spare Parts Replacement & Retrofits'
];

export default function AfterSalesMastersTab({ initialSubTab }: AfterSalesMastersTabProps) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  const currentSubTab: AfterSalesMasterSubTab =
    initialSubTab ||
    (pathname?.includes('/after-sales/masters/team')
      ? 'team'
      : pathname?.includes('/after-sales/masters/sub-stages')
      ? 'sub-stages'
      : 'customers');

  // Search States
  const [teamSearch, setTeamSearch] = useState('');
  const [subStageSearch, setSubStageSearch] = useState('');

  // Column Filter States
  const [teamFilters, setTeamFilters] = useState<Record<string, string[]>>({});
  const [subStageFilters, setSubStageFilters] = useState<Record<string, string[]>>({});
  const [sortField, setSortField] = useState('defaultOrder');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & Drawers
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<any | null>(null);
  const [previewTeamMember, setPreviewTeamMember] = useState<any | null>(null);
  const [deletingTeamMember, setDeletingTeamMember] = useState<any | null>(null);

  const [isSubStageModalOpen, setIsSubStageModalOpen] = useState(false);
  const [editingSubStage, setEditingSubStage] = useState<any | null>(null);
  const [previewSubStage, setPreviewSubStage] = useState<any | null>(null);
  const [deletingSubStage, setDeletingSubStage] = useState<any | null>(null);

  // Queries
  const {
    data: teamData,
    isLoading: isLoadingTeam,
    refetch: refetchTeam
  } = useGetAfterSalesTeamQuery(undefined, { skip: currentSubTab !== 'team' });

  const {
    data: subStagesData,
    isLoading: isLoadingSubStages,
    refetch: refetchSubStages
  } = useGetAfterSalesSubStagesQuery(undefined, { skip: currentSubTab !== 'sub-stages' });

  // Mutations
  const [createMemberTrigger, { isLoading: isCreatingMember }] = useCreateAfterSalesTeamMemberMutation();
  const [updateMemberTrigger, { isLoading: isUpdatingMember }] = useUpdateAfterSalesTeamMemberMutation();
  const [deleteMemberTrigger, { isLoading: isDeletingMember }] = useDeleteAfterSalesTeamMemberMutation();

  const [createSubStageTrigger, { isLoading: isCreatingSubStage }] = useCreateAfterSalesSubStageMutation();
  const [updateSubStageTrigger, { isLoading: isUpdatingSubStage }] = useUpdateAfterSalesSubStageMutation();
  const [deleteSubStageTrigger, { isLoading: isDeletingSubStage }] = useDeleteAfterSalesSubStageMutation();

  // Data
  const teamMembers = useMemo(() => teamData?.members || [], [teamData]);
  const subStages = useMemo(() => subStagesData?.subStages || [], [subStagesData]);

  // Team Form State
  const [teamForm, setTeamForm] = useState({
    memberCode: '',
    fullName: '',
    designation: '',
    email: '',
    phone: '',
    department: 'AFTER_SALES_SERVICE',
    skillSpecialty: 'Installation & Commissioning',
    notes: '',
    isActive: true
  });

  // Sub-Stage Form State
  const [subStageForm, setSubStageForm] = useState({
    subStageCode: '',
    name: '',
    parentStageCode: 'AFTER_SALES_SERVICE',
    defaultOrder: 1,
    standardDays: 5,
    weightPercent: 10,
    description: '',
    isActive: true
  });

  const [formError, setFormError] = useState('');

  // Distinct values helper
  const getDistinctValues = (dataset: any[], field: string): DistinctValueItem[] => {
    const map: Record<string, number> = {};
    dataset.forEach((it: any) => {
      const val = String(it[field] || '');
      if (val) map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map).map(([value, count]) => ({ value, count }));
  };

  // Filtered Team
  const filteredTeam = useMemo(() => {
    return teamMembers.filter((m: any) => {
      if (teamSearch.trim()) {
        const q = teamSearch.toLowerCase();
        const code = (m.memberCode || '').toLowerCase();
        const name = (m.fullName || '').toLowerCase();
        const desig = (m.designation || '').toLowerCase();
        const spec = (m.skillSpecialty || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !desig.includes(q) && !spec.includes(q)) {
          return false;
        }
      }
      for (const [key, vals] of Object.entries(teamFilters)) {
        const itemVal = String(m[key] || '');
        if (!vals.includes(itemVal)) return false;
      }
      return true;
    });
  }, [teamMembers, teamSearch, teamFilters]);

  // Filtered Sub-Stages
  const filteredSubStages = useMemo(() => {
    return subStages
      .filter((s: any) => {
        if (subStageSearch.trim()) {
          const q = subStageSearch.toLowerCase();
          const code = (s.subStageCode || '').toLowerCase();
          const name = (s.subStageName || s.name || '').toLowerCase();
          const desc = (s.description || '').toLowerCase();
          if (!code.includes(q) && !name.includes(q) && !desc.includes(q)) {
            return false;
          }
        }
        for (const [key, vals] of Object.entries(subStageFilters)) {
          const itemVal = String(s[key] || '');
          if (!vals.includes(itemVal)) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        const valA = a[sortField] ?? '';
        const valB = b[sortField] ?? '';
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
        return sortDir === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
  }, [subStages, subStageSearch, subStageFilters, sortField, sortDir]);

  // Auto-generate code candidate
  const suggestNextTeamCode = useMemo(() => {
    const existingCodes = new Set(teamMembers.map((m: any) => m.memberCode));
    let seq = 101;
    while (existingCodes.has(`AST-TM-${seq}`)) {
      seq++;
    }
    return `AST-TM-${seq}`;
  }, [teamMembers]);

  const suggestNextSubStageCode = useMemo(() => {
    const existingCodes = new Set(subStages.map((s: any) => s.subStageCode));
    let seq = 101;
    while (existingCodes.has(`AST-SS-${seq}`)) {
      seq++;
    }
    return `AST-SS-${seq}`;
  }, [subStages]);

  // Open Handlers
  const handleOpenAddTeamModal = () => {
    setEditingTeamMember(null);
    setTeamForm({
      memberCode: suggestNextTeamCode,
      fullName: '',
      designation: '',
      email: '',
      phone: '',
      department: 'AFTER_SALES_SERVICE',
      skillSpecialty: 'Installation & Commissioning',
      notes: '',
      isActive: true
    });
    setFormError('');
    setIsTeamModalOpen(true);
  };

  const handleOpenEditTeamModal = (m: any) => {
    setEditingTeamMember(m);
    setTeamForm({
      memberCode: m.memberCode,
      fullName: m.fullName || '',
      designation: m.designation || '',
      email: m.email || '',
      phone: m.phone || '',
      department: m.department || 'AFTER_SALES_SERVICE',
      skillSpecialty: m.skillSpecialty || 'Installation & Commissioning',
      notes: m.notes || '',
      isActive: m.isActive !== undefined ? m.isActive : true
    });
    setFormError('');
    setIsTeamModalOpen(true);
  };

  const handleOpenAddSubStageModal = () => {
    setEditingSubStage(null);
    setSubStageForm({
      subStageCode: suggestNextSubStageCode,
      name: '',
      parentStageCode: 'AFTER_SALES_SERVICE',
      defaultOrder: subStages.length + 1,
      standardDays: 5,
      weightPercent: 10,
      description: '',
      isActive: true
    });
    setFormError('');
    setIsSubStageModalOpen(true);
  };

  const handleOpenEditSubStageModal = (s: any) => {
    setEditingSubStage(s);
    setSubStageForm({
      subStageCode: s.subStageCode,
      name: s.subStageName || s.name || '',
      parentStageCode: s.parentStageCode || 'AFTER_SALES_SERVICE',
      defaultOrder: s.defaultOrder || 1,
      standardDays: s.standardDays || 5,
      weightPercent: s.weightPercent || 10,
      description: s.description || '',
      isActive: s.isActive !== undefined ? s.isActive : true
    });
    setFormError('');
    setIsSubStageModalOpen(true);
  };

  // Submit Handlers
  const handleSaveTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!teamForm.fullName.trim()) {
      setFormError('Please enter the team member full name.');
      return;
    }
    if (!teamForm.designation.trim()) {
      setFormError('Please specify the engineer designation.');
      return;
    }

    try {
      if (editingTeamMember) {
        await updateMemberTrigger({
          id: editingTeamMember.id,
          ...teamForm
        }).unwrap();
        dispatch(addToast({ type: 'success', message: 'All set! Team member details updated.' }));
      } else {
        await createMemberTrigger(teamForm).unwrap();
        dispatch(addToast({ type: 'success', message: 'Great! New engineer added to Field Service Team.' }));
      }
      setIsTeamModalOpen(false);
      refetchTeam();
    } catch (err: any) {
      setFormError(err?.data?.message || 'We could not save this team member. Please try again.');
    }
  };

  const handleDeleteTeamMember = async () => {
    if (!deletingTeamMember) return;
    try {
      await deleteMemberTrigger(deletingTeamMember.id).unwrap();
      dispatch(addToast({ type: 'success', message: 'All set! Team member removed.' }));
      setDeletingTeamMember(null);
      refetchTeam();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err?.data?.message || 'Failed to remove team member.' }));
    }
  };

  const handleSaveSubStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!subStageForm.name.trim()) {
      setFormError('Please enter the sub-stage title.');
      return;
    }

    try {
      if (editingSubStage) {
        await updateSubStageTrigger({
          id: editingSubStage.id,
          subStageName: subStageForm.name.trim(),
          ...subStageForm
        }).unwrap();
        dispatch(addToast({ type: 'success', message: 'All set! Service sub-stage updated.' }));
      } else {
        await createSubStageTrigger({
          subStageName: subStageForm.name.trim(),
          ...subStageForm
        }).unwrap();
        dispatch(addToast({ type: 'success', message: 'Great! New service sub-stage created.' }));
      }
      setIsSubStageModalOpen(false);
      refetchSubStages();
    } catch (err: any) {
      setFormError(err?.data?.message || 'We could not save this sub-stage. Please try again.');
    }
  };

  const handleDeleteSubStage = async () => {
    if (!deletingSubStage) return;
    try {
      await deleteSubStageTrigger(deletingSubStage.id).unwrap();
      dispatch(addToast({ type: 'success', message: 'All set! Service sub-stage deleted.' }));
      setDeletingSubStage(null);
      refetchSubStages();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err?.data?.message || 'Failed to delete sub-stage.' }));
    }
  };

  const handleResetFilters = () => {
    if (currentSubTab === 'team') {
      setTeamSearch('');
      setTeamFilters({});
    } else {
      setSubStageSearch('');
      setSubStageFilters({});
    }
  };

  const hasActiveFilters =
    (currentSubTab === 'team' && (teamSearch.trim() || Object.keys(teamFilters).length > 0)) ||
    (currentSubTab === 'sub-stages' && (subStageSearch.trim() || Object.keys(subStageFilters).length > 0));

  return (
    <div className="space-y-4">
      {/* Top Masters Navigation Ribbon: Pure Button-Type Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <Link
            href="/after-sales/masters/customers"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentSubTab === 'customers'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 size={14} />
            <span>Customers</span>
          </Link>
          <Link
            href="/after-sales/masters/team"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentSubTab === 'team'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users size={14} />
            <span>Field Service Team ({teamMembers.length})</span>
          </Link>
          <Link
            href="/after-sales/masters/sub-stages"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentSubTab === 'sub-stages'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Workflow size={14} />
            <span>Service Sub-Stages ({subStages.length})</span>
          </Link>
        </div>

        {/* Primary Action Button */}
        <div>
          {currentSubTab === 'team' && (
            <button
              type="button"
              onClick={handleOpenAddTeamModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Team Member</span>
            </button>
          )}
          {currentSubTab === 'sub-stages' && (
            <button
              type="button"
              onClick={handleOpenAddSubStageModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Sub-Stage</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: CUSTOMERS (Shared Live with CRM Master) */}
      {currentSubTab === 'customers' && (
        <div className="space-y-4">
          <CustomerMasterSubTab />
        </div>
      )}

      {/* SUB-TAB 2: FIELD SERVICE TEAM */}
      {currentSubTab === 'team' && (
        <div className="space-y-4">
          {/* Top In-Line Search & Metrics Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search engineer by name, code, designation, skills..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition-all"
              />
              {teamSearch && (
                <button
                  type="button"
                  onClick={() => setTeamSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
              <span className="text-xs font-bold text-slate-600 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl">
                {filteredTeam.length} Active Members
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">#</th>
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Member Code"
                        columnKey="memberCode"
                        distinctValues={getDistinctValues(teamMembers, 'memberCode')}
                        selectedValues={teamFilters['memberCode']}
                        onFilterChange={(vals) =>
                          setTeamFilters((prev) => {
                            const next = { ...prev };
                            if (!vals || vals.length === 0) delete next['memberCode'];
                            else next['memberCode'] = vals;
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Full Name"
                        columnKey="fullName"
                        distinctValues={getDistinctValues(teamMembers, 'fullName')}
                        selectedValues={teamFilters['fullName']}
                        onFilterChange={(vals) =>
                          setTeamFilters((prev) => {
                            const next = { ...prev };
                            if (!vals || vals.length === 0) delete next['fullName'];
                            else next['fullName'] = vals;
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Designation"
                        columnKey="designation"
                        distinctValues={getDistinctValues(teamMembers, 'designation')}
                        selectedValues={teamFilters['designation']}
                        onFilterChange={(vals) =>
                          setTeamFilters((prev) => {
                            const next = { ...prev };
                            if (!vals || vals.length === 0) delete next['designation'];
                            else next['designation'] = vals;
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Skill Specialty"
                        columnKey="skillSpecialty"
                        distinctValues={getDistinctValues(teamMembers, 'skillSpecialty')}
                        selectedValues={teamFilters['skillSpecialty']}
                        onFilterChange={(vals) =>
                          setTeamFilters((prev) => {
                            const next = { ...prev };
                            if (!vals || vals.length === 0) delete next['skillSpecialty'];
                            else next['skillSpecialty'] = vals;
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="px-4 py-3.5">Contact</th>
                    <th className="px-4 py-3.5 text-center">
                      <ExcelColumnFilter
                        title="Status"
                        columnKey="isActive"
                        distinctValues={[
                          { value: 'true', count: teamMembers.filter((m: any) => m.isActive).length },
                          { value: 'false', count: teamMembers.filter((m: any) => !m.isActive).length }
                        ]}
                        selectedValues={teamFilters['isActive']}
                        onFilterChange={(vals) =>
                          setTeamFilters((prev) => {
                            const next = { ...prev };
                            if (!vals || vals.length === 0) delete next['isActive'];
                            else next['isActive'] = vals;
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="px-4 py-3.5 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingTeam ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Loading field service team...
                      </td>
                    </tr>
                  ) : filteredTeam.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-600">No field service engineers found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click &quot;Add Team Member&quot; above to register field engineers.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTeam.map((member: any, idx: number) => (
                      <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400 text-[11px] font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          <button
                            onClick={() => setPreviewTeamMember(member)}
                            className="text-left font-mono text-orange-600 hover:text-orange-700 hover:underline"
                          >
                            {member.memberCode}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{member.fullName}</td>
                        <td className="px-4 py-3 text-slate-600">{member.designation}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {member.skillSpecialty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            {member.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {member.email}
                              </span>
                            )}
                            {member.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {member.phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {member.isActive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setPreviewTeamMember(member)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Preview Member"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditTeamModal(member)}
                              className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Edit Member"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingTeamMember(member)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* SUB-TAB 3: SERVICE SUB-STAGES */}
      {currentSubTab === 'sub-stages' && (
        <div className="space-y-4">
          {/* Top In-Line Search & Metrics Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search service sub-stage by title, code or description..."
                value={subStageSearch}
                onChange={(e) => setSubStageSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:outline-none transition-all"
              />
              {subStageSearch && (
                <button
                  type="button"
                  onClick={() => setSubStageSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
              <span className="text-xs font-bold text-slate-600 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl">
                {filteredSubStages.length} Configured Sub-Stages
              </span>
            </div>
          </div>

          {/* Sub-Stages Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">#</th>
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Sub-Stage Code"
                        columnKey="subStageCode"
                        distinctValues={getDistinctValues(subStages, 'subStageCode')}
                        selectedValues={subStageFilters['subStageCode']}
                        onFilterChange={(vals) =>
                          setSubStageFilters((prev) => {
                            const next = { ...prev };
                            if (!vals || vals.length === 0) delete next['subStageCode'];
                            else next['subStageCode'] = vals;
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Sub-Stage Name"
                        columnKey="subStageName"
                        distinctValues={getDistinctValues(subStages, 'subStageName')}
                        selectedValues={subStageFilters['subStageName']}
                        onFilterChange={(vals) =>
                          setSubStageFilters((prev) => {
                            const next = { ...prev };
                            if (!vals || vals.length === 0) delete next['subStageName'];
                            else next['subStageName'] = vals;
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="px-4 py-3.5 text-center">Order</th>
                    <th className="px-4 py-3.5 text-center">Duration</th>
                    <th className="px-4 py-3.5 text-center">Weight %</th>
                    <th className="px-4 py-3.5 text-center">
                      <ExcelColumnFilter
                        title="Status"
                        columnKey="isActive"
                        distinctValues={[
                          { value: 'true', count: subStages.filter((s: any) => s.isActive).length },
                          { value: 'false', count: subStages.filter((s: any) => !s.isActive).length }
                        ]}
                        selectedValues={subStageFilters['isActive']}
                        onFilterChange={(vals) =>
                          setSubStageFilters((prev) => {
                            const next = { ...prev };
                            if (!vals || vals.length === 0) delete next['isActive'];
                            else next['isActive'] = vals;
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="px-4 py-3.5 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingSubStages ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Loading service sub-stages...
                      </td>
                    </tr>
                  ) : filteredSubStages.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <Workflow className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-600">No service sub-stages configured</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click &quot;Add Sub-Stage&quot; to configure after sales & service workflow stages.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredSubStages.map((stage: any, idx: number) => (
                      <tr key={stage.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400 text-[11px] font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          <button
                            onClick={() => setPreviewSubStage(stage)}
                            className="text-left font-mono text-orange-600 hover:text-orange-700 hover:underline"
                          >
                            {stage.subStageCode}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{stage.subStageName || stage.name}</div>
                          {stage.description && (
                            <div className="text-[11px] text-slate-500 line-clamp-1">{stage.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">#{stage.defaultOrder}</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-600">
                          {stage.standardDays} days
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-orange-600">{stage.weightPercent}%</td>
                        <td className="px-4 py-3 text-center">
                          {stage.isActive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setPreviewSubStage(stage)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Preview Sub-Stage"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditSubStageModal(stage)}
                              className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Edit Sub-Stage"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingSubStage(stage)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Sub-Stage"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* MODAL: ADD / EDIT TEAM MEMBER */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {editingTeamMember ? 'Edit Field Service Engineer' : 'Add Field Service Engineer'}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTeamMember} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Member Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teamForm.memberCode}
                    onChange={(e) => setTeamForm({ ...teamForm, memberCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={teamForm.fullName}
                    onChange={(e) => setTeamForm({ ...teamForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Commissioning Engineer"
                    value={teamForm.designation}
                    onChange={(e) => setTeamForm({ ...teamForm, designation: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={teamForm.department}
                    onChange={(e) => setTeamForm({ ...teamForm, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Skill Specialty</label>
                  <select
                    value={teamForm.skillSpecialty}
                    onChange={(e) => setTeamForm({ ...teamForm, skillSpecialty: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  >
                    {SKILL_SPECIALTIES.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={teamForm.phone}
                    onChange={(e) => setTeamForm({ ...teamForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    placeholder="engineer@machinehouse.in"
                    value={teamForm.email}
                    onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Special Notes / Certifications</label>
                  <textarea
                    rows={2}
                    placeholder="Field commissioning authorization, international passport, Siemens PLC certified..."
                    value={teamForm.notes}
                    onChange={(e) => setTeamForm({ ...teamForm, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveMember"
                    checked={teamForm.isActive}
                    onChange={(e) => setTeamForm({ ...teamForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                  />
                  <label htmlFor="isActiveMember" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Active on field roster & commissioning assignments
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingMember || isUpdatingMember}
                  className="px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isCreatingMember || isUpdatingMember ? 'Saving...' : editingTeamMember ? 'Save Changes' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SUB-STAGE */}
      {isSubStageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {editingSubStage ? 'Edit Service Sub-Stage' : 'Add Service Sub-Stage'}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsSubStageModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSubStage} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sub-Stage Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subStageForm.subStageCode}
                    onChange={(e) => setSubStageForm({ ...subStageForm, subStageCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sub-Stage Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. On-Site Mechanical Installation"
                    value={subStageForm.name}
                    onChange={(e) => setSubStageForm({ ...subStageForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Execution Sequence (#)</label>
                  <input
                    type="number"
                    min={1}
                    value={subStageForm.defaultOrder}
                    onChange={(e) => setSubStageForm({ ...subStageForm, defaultOrder: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Standard Duration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={subStageForm.standardDays}
                    onChange={(e) => setSubStageForm({ ...subStageForm, standardDays: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Milestone Weight (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={subStageForm.weightPercent}
                    onChange={(e) => setSubStageForm({ ...subStageForm, weightPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isActiveSubStage"
                    checked={subStageForm.isActive}
                    onChange={(e) => setSubStageForm({ ...subStageForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                  />
                  <label htmlFor="isActiveSubStage" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Active in Service Lifecycle
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description / Deliverables</label>
                  <textarea
                    rows={2}
                    placeholder="Sign-off criteria, customer acceptance protocol, handover documentation..."
                    value={subStageForm.description}
                    onChange={(e) => setSubStageForm({ ...subStageForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubStageModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSubStage || isUpdatingSubStage}
                  className="px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isCreatingSubStage || isUpdatingSubStage ? 'Saving...' : editingSubStage ? 'Save Changes' : 'Add Sub-Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL: TEAM MEMBER DOSSIER */}
      {previewTeamMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {previewTeamMember.fullName}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-mono font-medium">{previewTeamMember.memberCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const m = previewTeamMember;
                    setPreviewTeamMember(null);
                    handleOpenEditTeamModal(m);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setPreviewTeamMember(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Designation
                  </span>
                  <span className="text-xs font-bold text-slate-800">{previewTeamMember.designation}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Department
                  </span>
                  <span className="text-xs font-bold text-slate-800">{previewTeamMember.department}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Skill Specialty
                  </span>
                  <span className="text-xs font-bold text-slate-800">{previewTeamMember.skillSpecialty}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Email</span>
                  <span className="text-xs text-slate-700">{previewTeamMember.email || '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Phone</span>
                  <span className="text-xs text-slate-700">{previewTeamMember.phone || '—'}</span>
                </div>
              </div>

              {previewTeamMember.notes && (
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Notes & Certifications
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">{previewTeamMember.notes}</p>
                </div>
              )}

              {/* Mandatory Universal Audit Trail Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Created By & Timestamp
                  </span>
                  <span className="text-xs font-bold text-slate-800 block mt-0.5">
                    {previewTeamMember.createdByName || 'System'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {previewTeamMember.createdAt ? new Date(previewTeamMember.createdAt).toLocaleString() : '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Last Updated By & Timestamp
                  </span>
                  <span className="text-xs font-bold text-slate-800 block mt-0.5">
                    {previewTeamMember.updatedByName || 'System'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {previewTeamMember.updatedAt ? new Date(previewTeamMember.updatedAt).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL: SERVICE SUB-STAGE DOSSIER */}
      {previewSubStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {previewSubStage.subStageName || previewSubStage.name}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-mono font-medium">{previewSubStage.subStageCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const s = previewSubStage;
                    setPreviewSubStage(null);
                    handleOpenEditSubStageModal(s);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setPreviewSubStage(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sequence</span>
                  <span className="text-sm font-extrabold text-slate-800">#{previewSubStage.defaultOrder}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                  <span className="text-sm font-extrabold text-slate-800">{previewSubStage.standardDays} Days</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Weight %</span>
                  <span className="text-sm font-extrabold text-orange-600">{previewSubStage.weightPercent}%</span>
                </div>
              </div>

              {previewSubStage.description && (
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Deliverables & Protocol
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">{previewSubStage.description}</p>
                </div>
              )}

              {/* Mandatory Universal Audit Trail Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Created By & Timestamp
                  </span>
                  <span className="text-xs font-bold text-slate-800 block mt-0.5">
                    {previewSubStage.createdByName || 'System'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {previewSubStage.createdAt ? new Date(previewSubStage.createdAt).toLocaleString() : '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Last Updated By & Timestamp
                  </span>
                  <span className="text-xs font-bold text-slate-800 block mt-0.5">
                    {previewSubStage.updatedByName || 'System'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {previewSubStage.updatedAt ? new Date(previewSubStage.updatedAt).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: DELETE TEAM MEMBER */}
      {deletingTeamMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Remove Field Service Engineer?</h3>
                <p className="text-xs text-slate-500">{deletingTeamMember.fullName} ({deletingTeamMember.memberCode})</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove this engineer from the after-sales roster? Once deleted, you will need to re-add them manually.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingTeamMember(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Keep it
              </button>
              <button
                onClick={handleDeleteTeamMember}
                disabled={isDeletingMember}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeletingMember ? 'Removing...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: DELETE SERVICE SUB-STAGE */}
      {deletingSubStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Service Sub-Stage?</h3>
                <p className="text-xs text-slate-500">
                  {deletingSubStage.subStageName || deletingSubStage.name} ({deletingSubStage.subStageCode})
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this sub-stage? It will be permanently removed from after-sales workflows.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingSubStage(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Keep it
              </button>
              <button
                onClick={handleDeleteSubStage}
                disabled={isDeletingSubStage}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeletingSubStage ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
