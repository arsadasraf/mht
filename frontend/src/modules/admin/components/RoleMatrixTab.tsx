'use client';

import React, { useState } from 'react';
import {
  KeyRound,
  Shield,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Plus,
  Save,
  Loader2,
  Check,
  X,
  Layers,
  ChevronRight,
  ArrowLeft,
  Briefcase,
  Cpu,
  Compass,
  ShoppingBag,
  ClipboardCheck,
  PackageCheck,
  Wrench,
  Truck,
  Headphones,
  Settings,
  Search,
  Users,
  CheckSquare,
  Square
} from 'lucide-react';
import { useGetRolesQuery, useUpdateRolePermissionsMutation, useCreateRoleMutation } from '../api/adminApi';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';
import { CORE_MODULES } from '../../../config/modules.config';

const MODULE_ICONS: Record<string, any> = {
  crm: Briefcase,
  'project-setup': Cpu,
  design: Compass,
  purchase: ShoppingBag,
  'incoming-quality': ClipboardCheck,
  store: PackageCheck,
  'production-trial': Wrench,
  dispatch: Truck,
  'after-sales': Headphones,
  admin: Settings
};

export default function RoleMatrixTab() {
  const dispatch = useAppDispatch();
  const { data, isLoading, refetch } = useGetRolesQuery();
  const [updateRolePermissions, { isLoading: isSaving }] = useUpdateRolePermissionsMutation();
  const [createRole, { isLoading: isCreating }] = useCreateRoleMutation();

  const roles = data?.roles || [];
  const [searchTerm, setSearchTerm] = useState('');

  // View state: 'TABLE' (all roles in a table list) vs 'CONFIGURE' (configuring tabs for selected role)
  const [viewMode, setViewMode] = useState<'TABLE' | 'CONFIGURE'>('TABLE');
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([]);

  // Create Role Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    slug: '',
    description: ''
  });

  // Calculate total system tab routes
  const allSystemTabs = CORE_MODULES.flatMap((m) => m.tabs.map((t) => t.path));
  const totalSystemTabsCount = allSystemTabs.length;

  // Filtered Roles for Table
  const filteredRoles = roles.filter((r: any) => {
    const term = searchTerm.toLowerCase();
    return (
      r.name?.toLowerCase().includes(term) ||
      r.slug?.toLowerCase().includes(term) ||
      r.description?.toLowerCase().includes(term)
    );
  });

  // Open Configure Permissions for a role
  const handleOpenConfigure = (role: any) => {
    setSelectedRole(role);
    setAllowedRoutes(role.allowedRoutes || []);
    setViewMode('CONFIGURE');
  };

  // Toggle single route
  const handleToggleRoute = (routePath: string) => {
    setAllowedRoutes((prev) =>
      prev.includes(routePath) ? prev.filter((r) => r !== routePath) : [...prev, routePath]
    );
  };

  // Batch toggle all tabs in a module
  const handleBatchToggleModule = (moduleSlug: string, selectAll: boolean) => {
    const mod = CORE_MODULES.find((m) => m.slug === moduleSlug);
    if (!mod) return;
    const moduleTabPaths = mod.tabs.map((t) => t.path);

    setAllowedRoutes((prev) => {
      if (selectAll) {
        const combined = new Set([...prev, ...moduleTabPaths]);
        return Array.from(combined);
      } else {
        return prev.filter((path) => !moduleTabPaths.includes(path));
      }
    });
  };

  // 1-Click Select All System Tabs
  const handleSelectAllSystemTabs = () => {
    setAllowedRoutes(allSystemTabs);
  };

  // 1-Click Deselect All Tabs
  const handleClearAllTabs = () => {
    setAllowedRoutes([]);
  };

  // Save Permissions
  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    try {
      await updateRolePermissions({
        id: selectedRole._id,
        allowedRoutes
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          title: 'Role Permissions Saved',
          message: `Permissions updated successfully for role "${selectedRole.name}".`
        })
      );
      refetch();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Save Failed',
          message: err?.data?.message || 'Failed to update role permissions.'
        })
      );
    }
  };

  // Create Custom Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleForm.name.trim() || !newRoleForm.slug.trim()) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: 'Role Name and unique slug are required.'
        })
      );
      return;
    }

    try {
      const res = await createRole({
        name: newRoleForm.name.trim(),
        slug: newRoleForm.slug.trim().toLowerCase(),
        description: newRoleForm.description.trim(),
        allowedRoutes: []
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          title: 'Custom Role Created',
          message: `Role "${res.role.name}" created. You can now select and configure its module tabs below.`
        })
      );
      setIsCreateModalOpen(false);
      setNewRoleForm({ name: '', slug: '', description: '' });
      refetch();

      // Automatically switch to configure view for the newly created role
      if (res?.role) {
        setSelectedRole(res.role);
        setAllowedRoutes([]);
        setViewMode('CONFIGURE');
      }
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Role Creation Failed',
          message: err?.data?.message || 'Could not create role.'
        })
      );
    }
  };

  // Count tabs configured for a role
  const getRoleTabCount = (role: any) => {
    if (role.slug === 'super-admin' || role.allowedRoutes?.includes('*')) {
      return 'All Modules (Root Access)';
    }
    const count = role.allowedRoutes?.length || 0;
    return `${count} of ${totalSystemTabsCount} Tabs`;
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          VIEW 1: ROLES TABLE LIST VIEW
         ========================================================================= */}
      {viewMode === 'TABLE' && (
        <>
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-none">{roles.length}</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">Total RBAC Roles</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-none">
                  {roles.filter((r: any) => r.isSystemRole || r.slug === 'super-admin').length}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">Master Root Roles</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-none">
                  {roles.filter((r: any) => !r.isSystemRole && r.slug !== 'super-admin').length}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">Custom Roles</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-none">{totalSystemTabsCount}</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">Configurable Tabs</div>
              </div>
            </div>
          </div>

          {/* Search Bar & Create Role Action Button */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search roles by title, slug, or responsibilities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900 placeholder-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Role</span>
            </button>
          </div>

          {/* Roles Table List */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Role Title & Slug</th>
                    <th className="py-3 px-4">Description & Scope</th>
                    <th className="py-3 px-4">Allowed Tab Access</th>
                    <th className="py-3 px-4">Role Type</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                          <span className="text-xs font-medium">Loading system roles...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <KeyRound className="w-8 h-8 text-slate-300" />
                          <div className="font-semibold text-slate-700">No matching roles found</div>
                          <div className="text-xs text-slate-400">Try adjusting your search criteria or create a new role.</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.map((role: any) => {
                      const isSuperAdmin = role.slug === 'super-admin' || role.allowedRoutes?.includes('*');
                      return (
                        <tr
                          key={role._id}
                          className="hover:bg-slate-50/70 transition-colors group"
                        >
                          {/* Role Title & Slug */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isSuperAdmin
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-orange-100 text-orange-700'
                                }`}
                              >
                                <KeyRound className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                                  {role.name}
                                </div>
                                <div className="font-mono text-[11px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 w-fit mt-0.5">
                                  {role.slug}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                            {role.description || 'Custom role permissions across machine execution modules.'}
                          </td>

                          {/* Allowed Tab Access */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isSuperAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                <Shield className="w-3 h-3" /> Root Access (All 10 Modules)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <Layers className="w-3 h-3 text-orange-500" />
                                {getRoleTabCount(role)}
                              </span>
                            )}
                          </td>

                          {/* Role Type */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isSuperAdmin || role.isSystemRole ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                System Master
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Configurable Custom
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenConfigure(role)}
                              className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ml-auto shadow-2xs hover:shadow-xs cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-orange-600" />
                              <span>Configure Permissions</span>
                              <ChevronRight className="w-3.5 h-3.5" />
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
        </>
      )}

      {/* =========================================================================
          VIEW 2: CONFIGURE MODULE & TAB PERMISSIONS MATRIX (FOR SELECTED ROLE)
         ========================================================================= */}
      {viewMode === 'CONFIGURE' && selectedRole && (
        <div className="space-y-6">
          {/* Top Bar: Back to Roles Table + Active Role Meta + Global Save Action */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Back to Roles Table"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Configuring Permissions: {selectedRole.name}
                  </h2>
                  <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                    {selectedRole.slug}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Select and toggle the specific module tabs this role is authorized to access.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="hidden lg:flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllSystemTabs}
                  className="px-2.5 py-1 font-semibold rounded-lg text-slate-700 hover:bg-white hover:shadow-2xs transition-all"
                >
                  Select All 25+ Tabs
                </button>
                <button
                  type="button"
                  onClick={handleClearAllTabs}
                  className="px-2.5 py-1 font-semibold rounded-lg text-slate-700 hover:bg-white hover:shadow-2xs transition-all"
                >
                  Clear All
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Back to Roles List
              </button>

              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Role Permissions</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Root Role Notice */}
          {selectedRole.slug === 'super-admin' && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-2.5 text-xs text-purple-900">
              <Shield className="w-4 h-4 text-purple-700 shrink-0" />
              <span>
                <strong>System Root Role:</strong> The Super Admin account possesses unconditional global bypass access across all 10 modules and cannot be restricted.
              </span>
            </div>
          )}

          {/* 10 Operational Modules Tabs Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CORE_MODULES.map((module) => {
              const IconComp = MODULE_ICONS[module.slug] || Cpu;
              const moduleTabPaths = module.tabs.map((t) => t.path);
              const allowedInModule = moduleTabPaths.filter((path) => allowedRoutes.includes(path));
              const isAllModuleSelected =
                moduleTabPaths.length > 0 && allowedInModule.length === moduleTabPaths.length;

              return (
                <div
                  key={module.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col"
                >
                  {/* Module Header with Batch Toggles */}
                  <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-xs truncate">{module.name}</h3>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {allowedInModule.length} of {module.tabs.length} tabs enabled
                        </span>
                      </div>
                    </div>

                    {/* Module Batch Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleBatchToggleModule(module.slug, true)}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchToggleModule(module.slug, false)}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Sub-Tabs Grid Checkboxes */}
                  <div className="p-4 flex-1 space-y-2">
                    {module.tabs.map((tab) => {
                      const isChecked = allowedRoutes.includes(tab.path);
                      return (
                        <label
                          key={tab.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-orange-50/60 border-orange-200 text-slate-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRoute(tab.path)}
                              className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                            />
                            <span className="truncate">{tab.label}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0 ml-2">
                            {tab.path}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Save Action */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {allowedRoutes.length} of {totalSystemTabsCount} tabs allowed for <strong>{selectedRole.name}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Back to Roles Table
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-5 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Role Permissions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CREATE NEW ROLE MODAL
         ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create Custom RBAC Role</h3>
                  <div className="text-[11px] text-slate-500">Add role title and unique slug identifier</div>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Quality Auditor"
                  value={newRoleForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, '-')
                      .replace(/-+/g, '-')
                      .replace(/^-|-$/g, '');
                    setNewRoleForm({
                      ...newRoleForm,
                      name,
                      slug: newRoleForm.slug ? newRoleForm.slug : autoSlug
                    });
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role Slug Identifier <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. quality-auditor"
                  value={newRoleForm.slug}
                  onChange={(e) =>
                    setNewRoleForm({
                      ...newRoleForm,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Unique system identifier for programmatic role assignment.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role Description & Responsibilities
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe operational duties and machine execution scope..."
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create & Configure Tabs</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
