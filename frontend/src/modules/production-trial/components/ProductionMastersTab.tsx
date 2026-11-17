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
  UserCheck
} from 'lucide-react';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import ExcelColumnFilter, { DistinctValueItem } from '../../../components/ui/ExcelColumnFilter';
import {
  useGetProductionTeamQuery,
  useCreateProductionTeamMemberMutation,
  useUpdateProductionTeamMemberMutation,
  useDeleteProductionTeamMemberMutation,
  useGetProductionSubStagesQuery,
  useCreateProductionSubStageMutation,
  useUpdateProductionSubStageMutation,
  useDeleteProductionSubStageMutation
} from '../api/productionTrialApi';

export type ProductionMasterSubTab = 'team' | 'sub-stages';

interface ProductionMastersTabProps {
  initialSubTab?: ProductionMasterSubTab;
}

const DEPARTMENTS = [
  { value: 'MECHANICAL_ASSEMBLY', label: 'Mechanical Assembly' },
  { value: 'ELECTRICAL_PANEL', label: 'Electrical & Panel Wiring' },
  { value: 'PNEUMATICS_LUBRICATION', label: 'Pneumatics & Lubrication' },
  { value: 'TESTING_TRIAL', label: 'Machine Trial & Testing' },
  { value: 'TOOLING_FABRICATION', label: 'Tooling & Fabrication' }
];

const SKILL_SPECIALTIES = [
  'General Assembly',
  'Spindle & Gearbox Fitment',
  'PLC & Servo Drives',
  'Wire Harness Dressing',
  'Pneumatic Actuators & Valves',
  'Precision Laser Alignment',
  'TIG/MIG Welding',
  'QC & PDI Testing'
];

export default function ProductionMastersTab({ initialSubTab }: ProductionMastersTabProps) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  const currentSubTab: ProductionMasterSubTab =
    initialSubTab || (pathname?.includes('/production-trial/masters/sub-stages') ? 'sub-stages' : 'team');

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
  } = useGetProductionTeamQuery(undefined, { skip: currentSubTab !== 'team' });

  const {
    data: subStagesData,
    isLoading: isLoadingSubStages,
    refetch: refetchSubStages
  } = useGetProductionSubStagesQuery(undefined, { skip: currentSubTab !== 'sub-stages' });

  // Mutations
  const [createMemberTrigger, { isLoading: isCreatingMember }] = useCreateProductionTeamMemberMutation();
  const [updateMemberTrigger, { isLoading: isUpdatingMember }] = useUpdateProductionTeamMemberMutation();
  const [deleteMemberTrigger, { isLoading: isDeletingMember }] = useDeleteProductionTeamMemberMutation();

  const [createSubStageTrigger, { isLoading: isCreatingSubStage }] = useCreateProductionSubStageMutation();
  const [updateSubStageTrigger, { isLoading: isUpdatingSubStage }] = useUpdateProductionSubStageMutation();
  const [deleteSubStageTrigger, { isLoading: isDeletingSubStage }] = useDeleteProductionSubStageMutation();

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
    department: 'MECHANICAL_ASSEMBLY',
    skillSpecialty: 'General Assembly',
    notes: '',
    isActive: true
  });

  // Sub-Stage Form State
  const [subStageForm, setSubStageForm] = useState({
    subStageCode: '',
    name: '',
    parentStageCode: 'PRODUCTION_ASSEMBLY',
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
    return subStages.filter((s: any) => {
      if (subStageSearch.trim()) {
        const q = subStageSearch.toLowerCase();
        const code = (s.subStageCode || '').toLowerCase();
        const name = (s.subStageName || s.name || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !desc.includes(q)) return false;
      }
      for (const [key, vals] of Object.entries(subStageFilters)) {
        const itemVal = String(s[key] || '');
        if (!vals.includes(itemVal)) return false;
      }
      return true;
    });
  }, [subStages, subStageSearch, subStageFilters]);

  // Handlers for Team Member
  const handleOpenAddTeam = () => {
    setTeamForm({
      memberCode: '',
      fullName: '',
      designation: '',
      email: '',
      phone: '',
      department: 'MECHANICAL_ASSEMBLY',
      skillSpecialty: 'General Assembly',
      notes: '',
      isActive: true
    });
    setEditingTeamMember(null);
    setFormError('');
    setIsTeamModalOpen(true);
  };

  const handleOpenEditTeam = (m: any) => {
    setTeamForm({
      memberCode: m.memberCode || '',
      fullName: m.fullName || '',
      designation: m.designation || '',
      email: m.email || '',
      phone: m.phone || '',
      department: m.department || 'MECHANICAL_ASSEMBLY',
      skillSpecialty: m.skillSpecialty || 'General Assembly',
      notes: m.notes || '',
      isActive: m.isActive !== false
    });
    setEditingTeamMember(m);
    setFormError('');
    setIsTeamModalOpen(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!teamForm.fullName.trim()) {
      setFormError('Please enter the team member full name.');
      return;
    }
    if (!teamForm.designation.trim()) {
      setFormError('Please enter the designation.');
      return;
    }

    try {
      if (editingTeamMember) {
        await updateMemberTrigger({ id: editingTeamMember.id, ...teamForm }).unwrap();
        dispatch(
          addToast({
            type: 'success',
            message: `All set! Details updated for ${teamForm.fullName}.`
          })
        );
      } else {
        await createMemberTrigger(teamForm).unwrap();
        dispatch(
          addToast({
            type: 'success',
            message: `All set! ${teamForm.fullName} added to Production Team.`
          })
        );
      }
      setIsTeamModalOpen(false);
      refetchTeam();
    } catch (err: any) {
      setFormError(err?.data?.message || 'We could not save this team member. Please check required fields.');
    }
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeamMember) return;
    try {
      await deleteMemberTrigger(deletingTeamMember.id).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: `All set! ${deletingTeamMember.fullName} removed from Production Team.`
        })
      );
      setDeletingTeamMember(null);
      refetchTeam();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || 'Could not delete team member right now.'
        })
      );
    }
  };

  // Handlers for Sub-Stages
  const handleOpenAddSubStage = () => {
    setSubStageForm({
      subStageCode: '',
      name: '',
      parentStageCode: 'PRODUCTION_ASSEMBLY',
      defaultOrder: subStages.length + 1,
      standardDays: 5,
      weightPercent: 10,
      description: '',
      isActive: true
    });
    setEditingSubStage(null);
    setFormError('');
    setIsSubStageModalOpen(true);
  };

  const handleOpenEditSubStage = (s: any) => {
    setSubStageForm({
      subStageCode: s.subStageCode || '',
      name: s.subStageName || s.name || '',
      parentStageCode: s.parentStageCode || 'PRODUCTION_ASSEMBLY',
      defaultOrder: Number(s.defaultOrder) || 1,
      standardDays: Number(s.standardDays) || 5,
      weightPercent: Number(s.weightPercent) || 10,
      description: s.description || '',
      isActive: s.isActive !== false
    });
    setEditingSubStage(s);
    setFormError('');
    setIsSubStageModalOpen(true);
  };

  const handleSaveSubStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!subStageForm.name.trim()) {
      setFormError('Please enter the sub-stage name.');
      return;
    }

    try {
      if (editingSubStage) {
        await updateSubStageTrigger({ id: editingSubStage.id, ...subStageForm }).unwrap();
        dispatch(
          addToast({
            type: 'success',
            message: `All set! Sub-Stage ${subStageForm.name} updated.`
          })
        );
      } else {
        await createSubStageTrigger(subStageForm).unwrap();
        dispatch(
          addToast({
            type: 'success',
            message: `All set! Production Sub-Stage ${subStageForm.name} created.`
          })
        );
      }
      setIsSubStageModalOpen(false);
      refetchSubStages();
    } catch (err: any) {
      setFormError(err?.data?.message || 'We could not save this sub-stage. Please check your inputs.');
    }
  };

  const handleDeleteSubStage = async () => {
    if (!deletingSubStage) return;
    try {
      await deleteSubStageTrigger(deletingSubStage.id).unwrap();
      dispatch(
        addToast({
          type: 'success',
          message: `All set! Sub-stage ${deletingSubStage.subStageName || deletingSubStage.name} deleted.`
        })
      );
      setDeletingSubStage(null);
      refetchSubStages();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          message: err?.data?.message || 'Could not delete sub-stage right now.'
        })
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Masters Navigation Ribbon: Pure Button-Type Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <Link
            href="/production-trial/masters/team"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentSubTab === 'team'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users size={14} />
            <span>Team Members ({teamMembers.length})</span>
          </Link>

          <Link
            href="/production-trial/masters/sub-stages"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentSubTab === 'sub-stages'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Workflow size={14} />
            <span>Production Sub-Stages ({subStages.length})</span>
          </Link>
        </div>

        {/* Primary Action Button */}
        <div>
          {currentSubTab === 'team' ? (
            <button
              type="button"
              onClick={handleOpenAddTeam}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Team Member</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddSubStage}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Sub-Stage</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: TEAM MEMBERS                                  */}
      {/* ======================================================== */}
      {currentSubTab === 'team' && (
        <div className="space-y-4">
          {/* Top In-Line Search & Metrics Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                placeholder="Search team member by name, code, designation, skills..."
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
              {(teamSearch || Object.keys(teamFilters).length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setTeamSearch('');
                    setTeamFilters({});
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
              <span className="text-xs font-bold text-slate-600 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl">
                {filteredTeam.length} Active Members
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 uppercase text-[10px] font-bold tracking-wider select-none">
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th className="py-3 px-3 min-w-[140px]">
                      <ExcelColumnFilter
                        title="Member Code"
                        columnKey="memberCode"
                        selectedValues={teamFilters['memberCode'] || null}
                        distinctValues={getDistinctValues(teamMembers, 'memberCode')}
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
                    <th className="py-3 px-3 min-w-[200px]">
                      <ExcelColumnFilter
                        title="Full Name"
                        columnKey="fullName"
                        selectedValues={teamFilters['fullName'] || null}
                        distinctValues={getDistinctValues(teamMembers, 'fullName')}
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
                    <th className="py-3 px-3 min-w-[180px]">
                      <ExcelColumnFilter
                        title="Designation"
                        columnKey="designation"
                        selectedValues={teamFilters['designation'] || null}
                        distinctValues={getDistinctValues(teamMembers, 'designation')}
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
                    <th className="py-3 px-3 min-w-[180px]">
                      <ExcelColumnFilter
                        title="Department / Bay"
                        columnKey="department"
                        selectedValues={teamFilters['department'] || null}
                        distinctValues={getDistinctValues(teamMembers, 'department')}
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
                    <th className="py-3 px-3 min-w-[170px]">Skill Specialty</th>
                    <th className="py-3 px-3 min-w-[160px]">Contact Info</th>
                    <th className="py-3 px-3 w-28 text-center">
                      <ExcelColumnFilter
                        title="Status"
                        columnKey="isActive"
                        selectedValues={teamFilters['isActive'] || null}
                        distinctValues={[
                          { value: 'true', count: teamMembers.filter((m) => m.isActive).length },
                          { value: 'false', count: teamMembers.filter((m) => !m.isActive).length }
                        ]}
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
                    <th className="py-3 px-3 w-28 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoadingTeam ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-slate-500">
                        Loading team members...
                      </td>
                    </tr>
                  ) : filteredTeam.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-14 text-center">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">No production team members found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Click "Add Team Member" above to register assembly technicians and engineers.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTeam.map((m: any, idx: number) => (
                      <tr
                        key={m.id}
                        onDoubleClick={() => setPreviewTeamMember(m)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        title="Double-click to inspect full profile & audit log"
                      >
                        <td className="py-3 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-extrabold text-orange-600 bg-orange-50/80 border border-orange-200/80 px-2 py-0.5 rounded-lg text-xs">
                            {m.memberCode}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900">{m.fullName}</div>
                          {m.notes && <div className="text-[11px] text-slate-400 truncate max-w-xs">{m.notes}</div>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg text-xs">
                            {m.designation}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {DEPARTMENTS.find((d) => d.value === m.department)?.label || m.department}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-600">{m.skillSpecialty}</td>
                        <td className="py-3 px-3 text-slate-600 text-[11px]">
                          {m.phone && <div className="font-mono">{m.phone}</div>}
                          {m.email && <div className="text-slate-400 truncate max-w-xs">{m.email}</div>}
                          {!m.phone && !m.email && <span className="text-slate-300 italic">—</span>}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {m.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewTeamMember(m)}
                              className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                              title="View dossier"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditTeam(m)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit member"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTeamMember(m)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove member"
                            >
                              <Trash2 size={14} />
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

      {/* ======================================================== */}
      {/* SUB-TAB 2: PRODUCTION SUB-STAGES                         */}
      {/* ======================================================== */}
      {currentSubTab === 'sub-stages' && (
        <div className="space-y-4">
          {/* Top In-Line Search Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={subStageSearch}
                onChange={(e) => setSubStageSearch(e.target.value)}
                placeholder="Search sub-stages by code, name, description..."
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
              {(subStageSearch || Object.keys(subStageFilters).length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSubStageSearch('');
                    setSubStageFilters({});
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
              <span className="text-xs font-bold text-slate-600 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl">
                {filteredSubStages.length} Configured Sub-Stages
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 uppercase text-[10px] font-bold tracking-wider select-none">
                    <th className="py-3 px-3 w-14 text-center">Seq</th>
                    <th className="py-3 px-3 min-w-[140px]">
                      <ExcelColumnFilter
                        title="Sub-Stage Code"
                        columnKey="subStageCode"
                        selectedValues={subStageFilters['subStageCode'] || null}
                        distinctValues={getDistinctValues(subStages, 'subStageCode')}
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
                    <th className="py-3 px-3 min-w-[240px]">
                      <ExcelColumnFilter
                        title="Sub-Stage Name"
                        columnKey="subStageName"
                        selectedValues={subStageFilters['subStageName'] || null}
                        distinctValues={getDistinctValues(subStages, 'subStageName')}
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
                    <th className="py-3 px-3 min-w-[160px]">Parent Stage</th>
                    <th className="py-3 px-3 min-w-[120px] text-center">Standard Days</th>
                    <th className="py-3 px-3 min-w-[110px] text-center">Weight %</th>
                    <th className="py-3 px-3 w-28 text-center">Status</th>
                    <th className="py-3 px-3 w-28 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoadingSubStages ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                        Loading production sub-stages...
                      </td>
                    </tr>
                  ) : filteredSubStages.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-14 text-center">
                        <Workflow className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">No production sub-stages configured</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Click "Add Sub-Stage" above to configure assembly stations that get attached to Work Orders.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredSubStages.map((s: any) => (
                      <tr
                        key={s.id}
                        onDoubleClick={() => handleOpenEditSubStage(s)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        title="Double-click to edit sub-stage"
                      >
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{s.defaultOrder}</td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-extrabold text-orange-600 bg-orange-50/80 border border-orange-200/80 px-2 py-0.5 rounded-lg text-xs">
                            {s.subStageCode}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900">{s.subStageName || s.name}</div>
                          {s.description && (
                            <div className="text-[11px] text-slate-400 truncate max-w-sm">{s.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{s.parentStageCode}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {s.standardDays} {s.standardDays === 1 ? 'day' : 'days'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">{s.weightPercent}%</td>
                        <td className="py-3 px-3 text-center">
                          {s.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSubStage(s)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit sub-stage"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingSubStage(s)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete sub-stage"
                            >
                              <Trash2 size={14} />
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

      {/* ======================================================== */}
      {/* MODAL 1: ADD/EDIT TEAM MEMBER                            */}
      {/* ======================================================== */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {editingTeamMember ? `Edit Team Member (${editingTeamMember.memberCode})` : 'Add Production Team Member'}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Register shopfloor technicians and assembly engineers for Work Order task assignment
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-medium">
                  <AlertCircle size={15} className="shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Member Code */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Member Code (Auto-Sequenced)
                  </label>
                  <input
                    type="text"
                    value={teamForm.memberCode}
                    onChange={(e) => setTeamForm({ ...teamForm, memberCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. PRD-TM-101 (Auto if blank)"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={teamForm.fullName}
                    onChange={(e) => setTeamForm({ ...teamForm, fullName: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={teamForm.designation}
                    onChange={(e) => setTeamForm({ ...teamForm, designation: e.target.value })}
                    placeholder="e.g. Senior Assembly Technician"
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Department / Primary Bay */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Department / Bay <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={teamForm.department}
                    onChange={(e) => setTeamForm({ ...teamForm, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none cursor-pointer"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Skill Specialty */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Skill Specialty
                  </label>
                  <select
                    value={teamForm.skillSpecialty}
                    onChange={(e) => setTeamForm({ ...teamForm, skillSpecialty: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none cursor-pointer"
                  >
                    {SKILL_SPECIALTIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={teamForm.phone}
                    onChange={(e) => setTeamForm({ ...teamForm, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Corporate Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={teamForm.email}
                    onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                    placeholder="e.g. rajesh.kumar@machinehouse.in"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={teamForm.notes}
                    onChange={(e) => setTeamForm({ ...teamForm, notes: e.target.value })}
                    placeholder="e.g. Specialized in flyer winder spindle head laser calibration."
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 -mx-6 -mb-6 mt-6 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingMember || isUpdatingMember}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isCreatingMember || isUpdatingMember ? 'Saving...' : editingTeamMember ? 'Save Changes' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD/EDIT SUB-STAGE                              */}
      {/* ======================================================== */}
      {isSubStageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Workflow size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {editingSubStage ? `Edit Sub-Stage (${editingSubStage.subStageCode})` : 'New Production Sub-Stage'}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Configure standardized assembly stations that can be assigned to Work Orders
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSubStageModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSubStage} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-medium">
                  <AlertCircle size={15} className="shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sub-Stage Code */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Sub-Stage Code
                  </label>
                  <input
                    type="text"
                    value={subStageForm.subStageCode}
                    onChange={(e) => setSubStageForm({ ...subStageForm, subStageCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. PRD-SS-101 (Auto if blank)"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Sequence Order */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Sequence Order # <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={subStageForm.defaultOrder}
                    onChange={(e) => setSubStageForm({ ...subStageForm, defaultOrder: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Sub-Stage Name */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Sub-Stage Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subStageForm.name}
                    onChange={(e) => setSubStageForm({ ...subStageForm, name: e.target.value })}
                    placeholder="e.g. Spindle Head Mounting & Laser Alignment"
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Standard Days */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Standard Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={subStageForm.standardDays}
                    onChange={(e) => setSubStageForm({ ...subStageForm, standardDays: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Weight % */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Weight Percent (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={subStageForm.weightPercent}
                    onChange={(e) => setSubStageForm({ ...subStageForm, weightPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Description & Inspection Checklist
                  </label>
                  <textarea
                    rows={2}
                    value={subStageForm.description}
                    onChange={(e) => setSubStageForm({ ...subStageForm, description: e.target.value })}
                    placeholder="e.g. Precision spindle alignment, torque verification, and dial indicator runout check."
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 -mx-6 -mb-6 mt-6 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSubStageModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSubStage || isUpdatingSubStage}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isCreatingSubStage || isUpdatingSubStage ? 'Saving...' : editingSubStage ? 'Save Changes' : 'Create Sub-Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PREVIEW DOSSIER MODAL: TEAM MEMBER                       */}
      {/* ======================================================== */}
      {previewTeamMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0 font-bold">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {previewTeamMember.fullName} ({previewTeamMember.memberCode})
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium">{previewTeamMember.designation}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTeamMember(null)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Department / Bay</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    {DEPARTMENTS.find((d) => d.value === previewTeamMember.department)?.label ||
                      previewTeamMember.department}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Skill Specialty</div>
                  <div className="text-xs font-bold text-orange-600 mt-0.5">
                    {previewTeamMember.skillSpecialty || 'General Assembly'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Phone</div>
                  <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                    {previewTeamMember.phone || '—'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Email</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                    {previewTeamMember.email || '—'}
                  </div>
                </div>
              </div>

              {previewTeamMember.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <strong className="text-slate-700">Remarks: </strong>
                  <span className="text-slate-600">{previewTeamMember.notes}</span>
                </div>
              )}

              {/* Mandatory Universal Audit Trail Section */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="text-slate-400 font-bold uppercase text-[9px]">Created By</div>
                  <div className="font-semibold text-slate-700 mt-0.5">
                    {previewTeamMember.createdByName || 'System'}
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    {new Date(previewTeamMember.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-bold uppercase text-[9px]">Last Updated By</div>
                  <div className="font-semibold text-slate-700 mt-0.5">
                    {previewTeamMember.updatedByName || 'System'}
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    {new Date(previewTeamMember.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTeamMember(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const m = previewTeamMember;
                  setPreviewTeamMember(null);
                  handleOpenEditTeam(m);
                }}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Edit Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete Team Member */}
      {deletingTeamMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between">
              <h3 className="text-slate-900 text-sm font-extrabold tracking-tight">Remove Team Member?</h3>
              <button
                type="button"
                onClick={() => setDeletingTeamMember(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-600 leading-relaxed">
                Delete <strong className="text-slate-900">{deletingTeamMember.fullName}</strong> (
                {deletingTeamMember.memberCode}) from the Production Team roster?
              </p>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingTeamMember(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={isDeletingMember}
                onClick={handleDeleteTeam}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeletingMember ? 'Removing...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete Sub-Stage */}
      {deletingSubStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between">
              <h3 className="text-slate-900 text-sm font-extrabold tracking-tight">Delete Sub-Stage?</h3>
              <button
                type="button"
                onClick={() => setDeletingSubStage(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-600 leading-relaxed">
                Delete sub-stage{' '}
                <strong className="text-slate-900">
                  {deletingSubStage.subStageName || deletingSubStage.name}
                </strong>{' '}
                ({deletingSubStage.subStageCode}) from Master configuration?
              </p>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingSubStage(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={isDeletingSubStage}
                onClick={handleDeleteSubStage}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeletingSubStage ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

