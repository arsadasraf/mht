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
  Truck
} from 'lucide-react';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';
import {
  useGetDispatchTeamQuery,
  useCreateDispatchTeamMemberMutation,
  useUpdateDispatchTeamMemberMutation,
  useDeleteDispatchTeamMemberMutation,
  useGetDispatchSubStagesQuery,
  useCreateDispatchSubStageMutation,
  useUpdateDispatchSubStageMutation,
  useDeleteDispatchSubStageMutation
} from '../api/dispatchApi';

export type DispatchMasterSubTab = 'team' | 'sub-stages';

interface DispatchMastersTabProps {
  initialSubTab?: DispatchMasterSubTab;
}

const DEPARTMENTS = [
  { value: 'TRIAL_AND_DISPATCH', label: 'Trial & Final Inspection' },
  { value: 'QUALITY_ASSURANCE', label: 'QA & Documentation' },
  { value: 'PACKING_LOGISTICS', label: 'Packing & Vehicle Loading' },
  { value: 'ELECTRICAL_SAFETY', label: 'Electrical Safety & Insulation' },
  { value: 'FIELD_SERVICE', label: 'Field Trial & Customer Handover' }
];

const SKILL_SPECIALTIES = [
  'Trial & Final QC Inspection',
  'Electrical Safety & Insulation Testing',
  'Dry Run & Continuous Endurance Run',
  'Tooling & Safety Interlock Verification',
  'Zero-Snag Clearance & Sign-off',
  'Wooden Box & Stretch Packing',
  'Logistics & Transporter Dispatch',
  'Commercial Clearance & Invoicing Verification'
];

export default function DispatchMastersTab({ initialSubTab }: DispatchMastersTabProps) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  const currentSubTab: DispatchMasterSubTab =
    initialSubTab || (pathname?.includes('/dispatch/masters/sub-stages') ? 'sub-stages' : 'team');

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
  } = useGetDispatchTeamQuery(undefined, { skip: currentSubTab !== 'team' });

  const {
    data: subStagesData,
    isLoading: isLoadingSubStages,
    refetch: refetchSubStages
  } = useGetDispatchSubStagesQuery(undefined, { skip: currentSubTab !== 'sub-stages' });

  // Mutations
  const [createMemberTrigger, { isLoading: isCreatingMember }] = useCreateDispatchTeamMemberMutation();
  const [updateMemberTrigger, { isLoading: isUpdatingMember }] = useUpdateDispatchTeamMemberMutation();
  const [deleteMemberTrigger, { isLoading: isDeletingMember }] = useDeleteDispatchTeamMemberMutation();

  const [createSubStageTrigger, { isLoading: isCreatingSubStage }] = useCreateDispatchSubStageMutation();
  const [updateSubStageTrigger, { isLoading: isUpdatingSubStage }] = useUpdateDispatchSubStageMutation();
  const [deleteSubStageTrigger, { isLoading: isDeletingSubStage }] = useDeleteDispatchSubStageMutation();

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
    department: 'TRIAL_AND_DISPATCH',
    skillSpecialty: 'Trial & Final QC Inspection',
    notes: '',
    isActive: true
  });

  // Sub-Stage Form State
  const [subStageForm, setSubStageForm] = useState({
    subStageCode: '',
    name: '',
    parentStageCode: 'TRIAL_DISPATCH',
    defaultOrder: 1,
    standardDays: 3,
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
    while (existingCodes.has(`DSP-TM-${seq}`)) {
      seq++;
    }
    return `DSP-TM-${seq}`;
  }, [teamMembers]);

  const suggestNextSubStageCode = useMemo(() => {
    const existingCodes = new Set(subStages.map((s: any) => s.subStageCode));
    let seq = 101;
    while (existingCodes.has(`DSP-SS-${seq}`)) {
      seq++;
    }
    return `DSP-SS-${seq}`;
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
      department: 'TRIAL_AND_DISPATCH',
      skillSpecialty: 'Trial & Final QC Inspection',
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
      fullName: m.fullName,
      designation: m.designation,
      email: m.email || '',
      phone: m.phone || '',
      department: m.department || 'TRIAL_AND_DISPATCH',
      skillSpecialty: m.skillSpecialty || 'Trial & Final QC Inspection',
      notes: m.notes || '',
      isActive: m.isActive !== false
    });
    setFormError('');
    setIsTeamModalOpen(true);
  };

  const handleOpenAddSubStageModal = () => {
    setEditingSubStage(null);
    setSubStageForm({
      subStageCode: suggestNextSubStageCode,
      name: '',
      parentStageCode: 'TRIAL_DISPATCH',
      defaultOrder: subStages.length + 1,
      standardDays: 3,
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
      parentStageCode: s.parentStageCode || 'TRIAL_DISPATCH',
      defaultOrder: s.defaultOrder || 1,
      standardDays: s.standardDays || 3,
      weightPercent: s.weightPercent || 10,
      description: s.description || '',
      isActive: s.isActive !== false
    });
    setFormError('');
    setIsSubStageModalOpen(true);
  };

  // Submit Handlers
  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!teamForm.fullName.trim()) {
      setFormError('Please enter the team member full name.');
      return;
    }
    if (!teamForm.designation.trim()) {
      setFormError('Please enter a designation (e.g. QC Inspection Lead).');
      return;
    }

    try {
      if (editingTeamMember) {
        await updateMemberTrigger({ id: editingTeamMember.id || editingTeamMember._id, ...teamForm }).unwrap();
        dispatch(
          addToast({
            title: 'Team Member Updated',
            message: `All set! Details for ${teamForm.fullName} updated successfully.`,
            type: 'success'
          })
        );
      } else {
        await createMemberTrigger(teamForm).unwrap();
        dispatch(
          addToast({
            title: 'Team Member Added',
            message: `All set! ${teamForm.fullName} (${teamForm.memberCode}) added to Trial & Dispatch Team.`,
            type: 'success'
          })
        );
      }
      setIsTeamModalOpen(false);
      refetchTeam();
    } catch (err: any) {
      setFormError(err?.data?.message || 'We could not save this team member. Please try again.');
    }
  };

  const handleSaveSubStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!subStageForm.name.trim()) {
      setFormError('Please enter a descriptive inspection sub-stage name.');
      return;
    }

    try {
      if (editingSubStage) {
        await updateSubStageTrigger({
          id: editingSubStage.id || editingSubStage._id,
          ...subStageForm,
          subStageName: subStageForm.name
        }).unwrap();
        dispatch(
          addToast({
            title: 'Sub-Stage Updated',
            message: `All set! Inspection Sub-stage "${subStageForm.name}" updated successfully.`,
            type: 'success'
          })
        );
      } else {
        await createSubStageTrigger({
          ...subStageForm,
          subStageName: subStageForm.name
        }).unwrap();
        dispatch(
          addToast({
            title: 'Sub-Stage Created',
            message: `All set! Inspection Sub-stage "${subStageForm.name}" (${subStageForm.subStageCode}) created.`,
            type: 'success'
          })
        );
      }
      setIsSubStageModalOpen(false);
      refetchSubStages();
    } catch (err: any) {
      setFormError(err?.data?.message || 'We could not save this sub-stage. Please try again.');
    }
  };

  const handleConfirmDeleteTeam = async () => {
    if (!deletingTeamMember) return;
    try {
      await deleteMemberTrigger(deletingTeamMember.id || deletingTeamMember._id).unwrap();
      dispatch(
        addToast({
          title: 'Member Removed',
          message: `All set! ${deletingTeamMember.fullName} removed from Trial & Dispatch Team.`,
          type: 'success'
        })
      );
      setDeletingTeamMember(null);
      refetchTeam();
    } catch (err: any) {
      dispatch(
        addToast({
          title: 'Could Not Delete',
          message: err?.data?.message || 'Failed to remove team member.',
          type: 'error'
        })
      );
    }
  };

  const handleConfirmDeleteSubStage = async () => {
    if (!deletingSubStage) return;
    try {
      await deleteSubStageTrigger(deletingSubStage.id || deletingSubStage._id).unwrap();
      dispatch(
        addToast({
          title: 'Sub-Stage Removed',
          message: `All set! Inspection Sub-stage "${deletingSubStage.subStageName || deletingSubStage.name}" deleted.`,
          type: 'success'
        })
      );
      setDeletingSubStage(null);
      refetchSubStages();
    } catch (err: any) {
      dispatch(
        addToast({
          title: 'Could Not Delete',
          message: err?.data?.message || 'Failed to delete inspection sub-stage.',
          type: 'error'
        })
      );
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
    currentSubTab === 'team'
      ? Boolean(teamSearch.trim() || Object.keys(teamFilters).length > 0)
      : Boolean(subStageSearch.trim() || Object.keys(subStageFilters).length > 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Sub-Tab Pill Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Trials & Dispatch Masters</h1>
          </div>
        </div>

        {/* Modern Button-Type Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          <Link
            href="/dispatch/masters/team"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
              currentSubTab === 'team'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team ({teamMembers.length})</span>
          </Link>
          <Link
            href="/dispatch/masters/sub-stages"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
              currentSubTab === 'sub-stages'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Sub-Stages ({subStages.length})</span>
          </Link>
        </div>
      </div>

      {/* SUB-TAB 1: TEAM MEMBERS */}
      {currentSubTab === 'team' && (
        <div className="space-y-4">
          {/* Dedicated Table Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search inspector, code, designation or skill..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              {teamSearch && (
                <button
                  onClick={() => setTeamSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
              <button
                onClick={handleOpenAddTeamModal}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Team Member</span>
              </button>
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
                        title="Department"
                        columnKey="department"
                        distinctValues={getDistinctValues(teamMembers, 'department')}
                        selectedValues={teamFilters['department']}
                        onFilterChange={(vals) =>
                          setTeamFilters((prev) => {
                            const next = { ...prev };
                            if (!vals || vals.length === 0) delete next['department'];
                            else next['department'] = vals;
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Specialty"
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
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Status"
                        columnKey="isActive"
                        distinctValues={[
                          { value: 'true', count: teamMembers.filter((m: any) => m.isActive !== false).length },
                          { value: 'false', count: teamMembers.filter((m: any) => m.isActive === false).length }
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
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        Loading team members...
                      </td>
                    </tr>
                  ) : filteredTeam.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
                            <Users className="w-6 h-6" />
                          </div>
                          <div className="text-center">
                            <h3 className="text-sm font-bold text-slate-800">No team members found</h3>
                            <p className="text-xs text-slate-500 mt-1">
                              {teamSearch || Object.keys(teamFilters).length > 0
                                ? 'No team members match your current filter parameters.'
                                : 'Get started by onboarding your first Trial & Final QC Inspection team member.'}
                            </p>
                          </div>
                          <button
                            onClick={handleOpenAddTeamModal}
                            className="mt-2 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Team Member</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTeam.map((m: any, idx: number) => {
                      const deptObj = DEPARTMENTS.find((d) => d.value === m.department);
                      const deptLabel = deptObj ? deptObj.label : m.department || 'Trial & Final Inspection';

                      return (
                        <tr key={m.id || m._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md text-[11px]">
                              {m.memberCode}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => setPreviewTeamMember(m)}
                              className="font-bold text-slate-900 hover:text-orange-600 hover:underline text-left block"
                            >
                              {m.fullName}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-700">{m.designation}</td>
                          <td className="px-4 py-3.5 text-slate-600">{deptLabel}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                              <Wrench className="w-3 h-3" />
                              {m.skillSpecialty}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 space-y-0.5">
                            {m.phone && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-600">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {m.phone}
                              </div>
                            )}
                            {m.email && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {m.email}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {m.isActive !== false ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setPreviewTeamMember(m)}
                                title="View Dossier & Audit"
                                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditTeamModal(m)}
                                title="Edit Member"
                                className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingTeamMember(m)}
                                title="Remove Member"
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

      {/* SUB-TAB 2: SUB-STAGES */}
      {currentSubTab === 'sub-stages' && (
        <div className="space-y-4">
          {/* Dedicated Table Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search inspection sub-stage name, code or description..."
                value={subStageSearch}
                onChange={(e) => setSubStageSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              {subStageSearch && (
                <button
                  onClick={() => setSubStageSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
              <button
                onClick={handleOpenAddSubStageModal}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Sub-Stage</span>
              </button>
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
                        title="Order"
                        columnKey="defaultOrder"
                        distinctValues={getDistinctValues(subStages, 'defaultOrder')}
                        selectedValues={subStageFilters['defaultOrder']}
                        onFilterChange={(vals) =>
                          setSubStageFilters((prev) => {
                            const next = { ...prev };
                            if (!vals || vals.length === 0) delete next['defaultOrder'];
                            else next['defaultOrder'] = vals;
                            return next;
                          })
                        }
                      />
                    </th>
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Stage Code"
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
                    <th className="px-4 py-3.5">Parent Stage</th>
                    <th className="px-4 py-3.5">Standard Days</th>
                    <th className="px-4 py-3.5">Weight %</th>
                    <th className="px-4 py-3.5">
                      <ExcelColumnFilter
                        title="Status"
                        columnKey="isActive"
                        distinctValues={[
                          { value: 'true', count: subStages.filter((s: any) => s.isActive !== false).length },
                          { value: 'false', count: subStages.filter((s: any) => s.isActive === false).length }
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
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        Loading inspection sub-stages...
                      </td>
                    </tr>
                  ) : filteredSubStages.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
                            <Workflow className="w-6 h-6" />
                          </div>
                          <div className="text-center">
                            <h3 className="text-sm font-bold text-slate-800">No inspection sub-stages found</h3>
                            <p className="text-xs text-slate-500 mt-1">
                              {subStageSearch || Object.keys(subStageFilters).length > 0
                                ? 'No sub-stages match your current search query.'
                                : 'Configure inspection sub-stages (e.g. Dry Run, Electrical Safety, PDI, Gate Pass Sign-off) that can be assigned to Work Orders.'}
                            </p>
                          </div>
                          <button
                            onClick={handleOpenAddSubStageModal}
                            className="mt-2 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Sub-Stage</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSubStages.map((s: any, idx: number) => {
                      const name = s.subStageName || s.name;
                      return (
                        <tr key={s.id || s._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="px-4 py-3.5">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                              {s.defaultOrder}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md text-[11px]">
                              {s.subStageCode}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => setPreviewSubStage(s)}
                              className="font-bold text-slate-900 hover:text-orange-600 hover:underline text-left block"
                            >
                              {name}
                            </button>
                            {s.description && (
                              <p className="text-[11px] text-slate-400 truncate max-w-xs">{s.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {s.parentStageCode || 'TRIAL_DISPATCH'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {s.standardDays} days
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-800">{s.weightPercent}%</span>
                          </td>
                          <td className="px-4 py-3.5">
                            {s.isActive !== false ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setPreviewSubStage(s)}
                                title="View Dossier & Audit"
                                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditSubStageModal(s)}
                                title="Edit Sub-Stage"
                                className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingSubStage(s)}
                                title="Delete Sub-Stage"
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL 1: ADD / EDIT TEAM MEMBER */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {editingTeamMember ? 'Edit Team Member' : 'Add Team Member'}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveTeam} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Member Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={Boolean(editingTeamMember)}
                    value={teamForm.memberCode}
                    onChange={(e) => setTeamForm((p) => ({ ...p, memberCode: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={teamForm.fullName}
                    onChange={(e) => setTeamForm((p) => ({ ...p, fullName: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Inspection Engineer"
                    value={teamForm.designation}
                    onChange={(e) => setTeamForm((p) => ({ ...p, designation: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={teamForm.department}
                    onChange={(e) => setTeamForm((p) => ({ ...p, department: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Skill Specialty
                  </label>
                  <select
                    value={teamForm.skillSpecialty}
                    onChange={(e) => setTeamForm((p) => ({ ...p, skillSpecialty: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    {SKILL_SPECIALTIES.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={teamForm.phone}
                    onChange={(e) => setTeamForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="ramesh@machinehouse.in"
                    value={teamForm.email}
                    onChange={(e) => setTeamForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Key qualifications, certifications, shift availability..."
                    value={teamForm.notes}
                    onChange={(e) => setTeamForm((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {editingTeamMember && (
                  <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isActiveMember"
                      checked={teamForm.isActive}
                      onChange={(e) => setTeamForm((p) => ({ ...p, isActive: e.target.checked }))}
                      className="w-4 h-4 text-orange-600 rounded-md border-slate-300 focus:ring-orange-500"
                    />
                    <label htmlFor="isActiveMember" className="text-xs font-bold text-slate-700 cursor-pointer">
                      Active Status
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
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
                  {isCreatingMember || isUpdatingMember ? 'Saving...' : editingTeamMember ? 'Update Member' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT INSPECTION SUB-STAGE */}
      {isSubStageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {editingSubStage ? 'Edit Inspection Sub-Stage' : 'Add Inspection Sub-Stage'}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsSubStageModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveSubStage} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Sub-Stage Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={Boolean(editingSubStage)}
                    value={subStageForm.subStageCode}
                    onChange={(e) => setSubStageForm((p) => ({ ...p, subStageCode: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Default Sequence Order <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={subStageForm.defaultOrder}
                    onChange={(e) => setSubStageForm((p) => ({ ...p, defaultOrder: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Sub-Stage Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electrical Safety & Insulation Resistance Test"
                    value={subStageForm.name}
                    onChange={(e) => setSubStageForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Parent Stage Code
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="TRIAL_DISPATCH"
                    className="w-full px-3 py-2 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Standard Days
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={subStageForm.standardDays}
                    onChange={(e) => setSubStageForm((p) => ({ ...p, standardDays: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Progress Weight %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={subStageForm.weightPercent}
                    onChange={(e) => setSubStageForm((p) => ({ ...p, weightPercent: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Description & Verification Scope
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Inspection checklist items, sensor calibration standards, signoff gates..."
                    value={subStageForm.description}
                    onChange={(e) => setSubStageForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {editingSubStage && (
                  <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isActiveSubStage"
                      checked={subStageForm.isActive}
                      onChange={(e) => setSubStageForm((p) => ({ ...p, isActive: e.target.checked }))}
                      className="w-4 h-4 text-orange-600 rounded-md border-slate-300 focus:ring-orange-500"
                    />
                    <label htmlFor="isActiveSubStage" className="text-xs font-bold text-slate-700 cursor-pointer">
                      Active Status
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
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
                  {isCreatingSubStage || isUpdatingSubStage
                    ? 'Saving...'
                    : editingSubStage
                    ? 'Update Sub-Stage'
                    : 'Save Sub-Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW DOSSIER 1: TEAM MEMBER */}
      {previewTeamMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {previewTeamMember.fullName}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const m = previewTeamMember;
                    setPreviewTeamMember(null);
                    handleOpenEditTeamModal(m);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-50 border border-orange-200 rounded-xl transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setPreviewTeamMember(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Member Code</p>
                  <p className="font-mono font-bold text-orange-600 text-xs mt-0.5">{previewTeamMember.memberCode}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">
                    {previewTeamMember.isActive !== false ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation</p>
                  <p className="font-semibold text-slate-800 text-xs mt-0.5">{previewTeamMember.designation}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</p>
                  <p className="font-semibold text-slate-800 text-xs mt-0.5">
                    {DEPARTMENTS.find((d) => d.value === previewTeamMember.department)?.label ||
                      previewTeamMember.department}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Skill Specialty</p>
                  <p className="font-semibold text-sky-700 text-xs mt-0.5">{previewTeamMember.skillSpecialty}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                  <p className="font-medium text-slate-700 text-xs mt-0.5">{previewTeamMember.phone || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                  <p className="font-medium text-slate-700 text-xs mt-0.5">{previewTeamMember.email || '—'}</p>
                </div>
                {previewTeamMember.notes && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes</p>
                    <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">{previewTeamMember.notes}</p>
                  </div>
                )}
              </div>

              {/* Universal Action Tracking Audit Card */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Audit Trail</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Created By</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {previewTeamMember.createdByName || 'System'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {previewTeamMember.createdAt
                        ? new Date(previewTeamMember.createdAt).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Last Updated By</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {previewTeamMember.updatedByName || previewTeamMember.createdByName || 'System'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {previewTeamMember.updatedAt
                        ? new Date(previewTeamMember.updatedAt).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW DOSSIER 2: SUB-STAGE */}
      {previewSubStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {previewSubStage.subStageName || previewSubStage.name}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const s = previewSubStage;
                    setPreviewSubStage(null);
                    handleOpenEditSubStageModal(s);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-50 border border-orange-200 rounded-xl transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setPreviewSubStage(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sub-Stage Code</p>
                  <p className="font-mono font-bold text-orange-600 text-xs mt-0.5">{previewSubStage.subStageCode}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default Sequence</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">Step #{previewSubStage.defaultOrder}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parent Module</p>
                  <p className="font-mono font-semibold text-slate-700 text-xs mt-0.5">
                    {previewSubStage.parentStageCode || 'TRIAL_DISPATCH'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Standard Days</p>
                  <p className="font-semibold text-slate-800 text-xs mt-0.5">{previewSubStage.standardDays} days</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weight %</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{previewSubStage.weightPercent}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">
                    {previewSubStage.isActive !== false ? 'Active' : 'Inactive'}
                  </p>
                </div>
                {previewSubStage.description && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</p>
                    <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">{previewSubStage.description}</p>
                  </div>
                )}
              </div>

              {/* Universal Action Tracking Audit Card */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Audit Trail</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Created By</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {previewSubStage.createdByName || 'System'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {previewSubStage.createdAt ? new Date(previewSubStage.createdAt).toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Last Updated By</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {previewSubStage.updatedByName || previewSubStage.createdByName || 'System'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {previewSubStage.updatedAt ? new Date(previewSubStage.updatedAt).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: DELETE TEAM MEMBER */}
      {deletingTeamMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Remove Team Member?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to remove <span className="font-bold text-slate-800">{deletingTeamMember.fullName}</span> ({deletingTeamMember.memberCode}) from the Trial & Dispatch Team?
                </p>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeletingTeamMember(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Keep Member
                </button>
                <button
                  onClick={handleConfirmDeleteTeam}
                  disabled={isDeletingMember}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isDeletingMember ? 'Removing...' : 'Yes, Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: DELETE SUB-STAGE */}
      {deletingSubStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Inspection Sub-Stage?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to delete <span className="font-bold text-slate-800">{deletingSubStage.subStageName || deletingSubStage.name}</span> ({deletingSubStage.subStageCode})?
                </p>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeletingSubStage(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Keep Sub-Stage
                </button>
                <button
                  onClick={handleConfirmDeleteSubStage}
                  disabled={isDeletingSubStage}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isDeletingSubStage ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
