'use client';

import React, { useState } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Clock,
  Building,
  Key,
  Plus,
  Search,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  MapPin,
  Lock,
  Mail,
  Loader2,
  RefreshCw,
  LogOut,
  Fingerprint
} from 'lucide-react';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserStatusMutation,
  useGetRolesQuery,
  useGetUserPreviewQuery,
  useLazyGetUserPreviewQuery
} from '../api/adminApi';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';

const DEPARTMENTS = [
  { id: 'ADMIN', label: 'Admin & Governance' },
  { id: 'MARKETING_SALES', label: 'Marketing & CRM' },
  { id: 'PROJECT_SETUP', label: 'Project Setup Spine' },
  { id: 'DESIGN_ENGINEERING', label: 'Design & Engineering' },
  { id: 'PURCHASE_PROCUREMENT', label: 'Purchase & Sourcing' },
  { id: 'INCOMING_QUALITY', label: 'Incoming Quality (QC)' },
  { id: 'STORES_WAREHOUSE', label: 'Stores & Warehouse' },
  { id: 'PRODUCTION_ASSEMBLY', label: 'Production & Trials' },
  { id: 'DISPATCH_LOGISTICS', label: 'Dispatch & Logistics' },
  { id: 'AFTER_SALES', label: 'After Sales & Service' }
];

const PLANT_LOCATIONS = [
  'Main Works - Unit 1 (Bengaluru)',
  'Unit 2 Machining & Assembly',
  'Corporate Office',
  'Field Service / Remote'
];

export default function UserListTab() {
  const dispatch = useAppDispatch();
  const { data, isLoading, refetch } = useGetUsersQuery({});
  const { data: rolesData } = useGetRolesQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [toggleUserStatus, { isLoading: isToggling }] = useToggleUserStatusMutation();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  // Lazy user preview query for drawer
  const { data: previewData, isLoading: isPreviewLoading } = useGetUserPreviewQuery(
    previewUserId || '',
    { skip: !previewUserId }
  );

  // User Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: '',
    department: 'MARKETING_SALES',
    plantLocation: 'Main Works - Unit 1 (Bengaluru)',
    authMethod: 'BOTH', // 'GOOGLE_ONLY' | 'PASSWORD_ONLY' | 'BOTH'
    refreshTokenExpiry: '7d',
    isIpRestricted: false,
    whitelistedIpsText: ''
  });

  const users = data?.users || [];
  const roles = rolesData?.roles || [];

  // Filtered Users
  const filteredUsers = users.filter((u: any) => {
    const matchesSearch = searchQuery
      ? `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesDept = departmentFilter ? u.department === departmentFilter : true;
    const matchesLoc = locationFilter ? u.plantLocation === locationFilter : true;
    return matchesSearch && matchesDept && matchesLoc;
  });

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: roles[0]?._id || '',
      department: 'MARKETING_SALES',
      plantLocation: 'Main Works - Unit 1 (Bengaluru)',
      authMethod: 'BOTH',
      refreshTokenExpiry: '7d',
      isIpRestricted: false,
      whitelistedIpsText: ''
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (user: any) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '',
      role: user.role?._id || user.role || roles[0]?._id || '',
      department: user.department || 'ADMIN',
      plantLocation: user.plantLocation || 'Main Works - Unit 1 (Bengaluru)',
      authMethod: user.authMethod || 'BOTH',
      refreshTokenExpiry: user.refreshTokenExpiry || '7d',
      isIpRestricted: Boolean(user.isIpRestricted),
      whitelistedIpsText: (user.whitelistedIps || []).join(', ')
    });
    setIsAddModalOpen(true);
  };

  // Save User (Create or Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const whitelistedIps = formData.whitelistedIpsText
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);

    const payload: any = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role,
      department: formData.department,
      plantLocation: formData.plantLocation,
      authMethod: formData.authMethod,
      refreshTokenExpiry: formData.refreshTokenExpiry,
      isIpRestricted: formData.isIpRestricted,
      whitelistedIps
    };

    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    try {
      if (editingUser) {
        await updateUser({ id: editingUser._id, ...payload }).unwrap();
        dispatch(
          addToast({
            type: 'success',
            title: 'User Profile Updated',
            message: `Profile and access permissions updated for ${payload.firstName} ${payload.lastName}.`
          })
        );
      } else {
        await createUser(payload).unwrap();
        dispatch(
          addToast({
            type: 'success',
            title: 'Personnel Provisioned',
            message: `Account for ${payload.firstName} ${payload.lastName} created with ${payload.authMethod} mode.`
          })
        );
      }
      setIsAddModalOpen(false);
      refetch();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Operation Failed',
          message: err?.data?.message || 'Failed to save user account.',
          fixHint: err?.data?.fixHint || 'Ensure email is unique and all required fields are filled.'
        })
      );
    }
  };

  // Toggle User Active / Deactivated
  const handleToggle = async (userId: string, currentStatus: string, userName: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    try {
      await toggleUserStatus({ id: userId, status: nextStatus }).unwrap();
      dispatch(
        addToast({
          type: nextStatus === 'ACTIVE' ? 'success' : 'warning',
          title: nextStatus === 'ACTIVE' ? 'User Re-Activated' : 'User Deactivated',
          message: `${userName || 'User'} has been set to ${nextStatus}. Access tokens and sessions updated.`
        })
      );
      refetch();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Status Change Blocked',
          message: err?.data?.message || 'Failed to update user status.',
          fixHint: err?.data?.fixHint || 'Cannot deactivate primary system super admin.'
        })
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick KPI Stats Bar */}
      <div className="flex items-center flex-wrap gap-2 text-xs">
        <span className="font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {users.length} Total Personnel
        </span>
        <span className="font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          {users.filter((u: any) => u.status === 'ACTIVE' || u.isActive).length} Active Accounts
        </span>
        <span className="font-semibold px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
          {users.filter((u: any) => u.authMethod === 'GOOGLE_ONLY' || u.authMethod === 'BOTH').length} Google SSO Enabled
        </span>
        <span className="font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          {users.filter((u: any) => u.isIpRestricted).length} IP Restricted
        </span>
      </div>

      {/* Toolbar: Search, Filters & Add Personnel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2.5 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search personnel by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 w-full"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="">All Plant Locations</option>
            {PLANT_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-orange-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Personnel</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Personnel &amp; Email</th>
                <th className="py-3 px-4">Authentication Mode</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Department &amp; Plant</th>
                <th className="py-3 px-4">IP Security</th>
                <th className="py-3 px-4">Session Lifespan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto mb-2" />
                    <span>Loading User Directory...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    No matching personnel found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u: any) => {
                  const isActive = u.status === 'ACTIVE' || u.isActive;
                  const authMethod = u.authMethod || 'BOTH';

                  return (
                    <tr
                      key={u._id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => setPreviewUserId(u._id)}
                    >
                      {/* Name & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {u.firstName?.[0] || 'U'}{u.lastName?.[0] || ''}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                              {u.firstName} {u.lastName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Auth Mode */}
                      <td className="py-3 px-4">
                        {authMethod === 'GOOGLE_ONLY' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            <Globe className="w-3 h-3" />
                            <span>Google SSO Only</span>
                          </span>
                        ) : authMethod === 'PASSWORD_ONLY' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Key className="w-3 h-3" />
                            <span>Password Only</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Fingerprint className="w-3 h-3" />
                            <span>Dual (Google + Pass)</span>
                          </span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {u.role?.name || u.role || 'Personnel'}
                        </span>
                      </td>

                      {/* Dept & Location */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-700">
                          {DEPARTMENTS.find((d) => d.id === u.department)?.label || u.department || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          <span>{u.plantLocation || 'Main Works'}</span>
                        </div>
                      </td>

                      {/* IP Security */}
                      <td className="py-3 px-4">
                        {u.isIpRestricted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <Lock className="w-2.5 h-2.5" />
                            <span>{u.whitelistedIps?.length || 0} IPs Whitelisted</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Unrestricted</span>
                        )}
                      </td>

                      {/* Session Refresh Lifespan */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] text-slate-600 font-semibold bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {u.refreshTokenExpiry || '7d'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            DEACTIVATED
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            title="Preview User Details & Last 5 Logins"
                            onClick={() => setPreviewUserId(u._id)}
                            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            title="Edit Personnel Configuration"
                            onClick={() => handleOpenEditModal(u)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleToggle(
                                u._id,
                                u.status || (u.isActive ? 'ACTIVE' : 'DEACTIVATED'),
                                `${u.firstName} ${u.lastName}`
                              )
                            }
                            disabled={isToggling}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isActive ? 'Deactivate' : 'Reactivate'}
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

      {/* ========================================================================= */}
      {/* ADD / EDIT USER MODAL                                                     */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingUser ? `Edit Personnel: ${editingUser.firstName} ${editingUser.lastName}` : 'Provision New Personnel'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs">
              {/* Names Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="e.g. Rahul"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g. Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@machinehousetechnologies.in"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              {/* Authentication Mode (Button-Type Pill Selector) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Authentication Method &amp; Access Flow *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, authMethod: 'GOOGLE_ONLY' })}
                    className={`px-3 py-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      formData.authMethod === 'GOOGLE_ONLY'
                        ? 'bg-sky-50 border-sky-400 text-sky-800 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Globe className="w-4 h-4 mx-auto mb-1 text-sky-600" />
                    <span className="block text-[11px]">Google SSO Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, authMethod: 'PASSWORD_ONLY' })}
                    className={`px-3 py-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      formData.authMethod === 'PASSWORD_ONLY'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Key className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <span className="block text-[11px]">Password Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, authMethod: 'BOTH' })}
                    className={`px-3 py-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      formData.authMethod === 'BOTH'
                        ? 'bg-orange-50 border-orange-400 text-orange-800 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Fingerprint className="w-4 h-4 mx-auto mb-1 text-orange-600" />
                    <span className="block text-[11px]">Dual (Both)</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 mt-1.5">
                  {formData.authMethod === 'GOOGLE_ONLY'
                    ? '• User can log in ONLY via Google Single Sign-On using this email. Password entry is blocked.'
                    : formData.authMethod === 'PASSWORD_ONLY'
                    ? '• User logs in with email and password. Google Single Sign-On is disabled for this account.'
                    : '• User can freely sign in using either Google SSO or Corporate Email & Password.'}
                </p>
              </div>

              {/* Password Field (Only shown if PASSWORD_ONLY or BOTH) */}
              {formData.authMethod !== 'GOOGLE_ONLY' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {editingUser ? 'Update Password (leave blank to keep unchanged)' : 'Initial Temporary Password *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'Min. 8 characters'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              )}

              {/* Role & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Role *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                  >
                    {roles.map((r: any) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Plant Location & Refresh Token Lifespan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Plant Unit Location *</label>
                  <select
                    value={formData.plantLocation}
                    onChange={(e) => setFormData({ ...formData, plantLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {PLANT_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Session Refresh Lifespan</label>
                  <select
                    value={formData.refreshTokenExpiry}
                    onChange={(e) => setFormData({ ...formData, refreshTokenExpiry: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800"
                  >
                    <option value="8h">8 Hours (Plant Kiosk)</option>
                    <option value="24h">24 Hours (Floor Staff)</option>
                    <option value="7d">7 Days (Standard Office)</option>
                    <option value="30d">30 Days (Executive)</option>
                  </select>
                </div>
              </div>

              {/* IP Restriction Toggle & Listing */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Enforce Plant IP Whitelisting</span>
                    <span className="text-[10px] text-slate-500">Block logins from unapproved external IP addresses</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isIpRestricted}
                    onChange={(e) => setFormData({ ...formData, isIpRestricted: e.target.checked })}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-slate-300 cursor-pointer"
                  />
                </div>

                {formData.isIpRestricted && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Allowed IP Addresses (Comma-Separated)
                    </label>
                    <input
                      type="text"
                      value={formData.whitelistedIpsText}
                      onChange={(e) => setFormData({ ...formData, whitelistedIpsText: e.target.value })}
                      placeholder="e.g. 192.168.1.100, 203.0.113.50, 10.0.0.1/24"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isCreating || isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingUser ? 'Update Personnel' : 'Provision User'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* USER PREVIEW SLIDE-OUT DRAWER WITH LAST 5 LOGINS                         */}
      {/* ========================================================================= */}
      {previewUserId && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs animate-in fade-in"
          onClick={() => setPreviewUserId(null)}
        >
          <div
            className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 overflow-y-auto p-6 space-y-5 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-base">
                  {previewData?.user?.firstName?.[0] || 'U'}{previewData?.user?.lastName?.[0] || ''}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {previewData?.user?.firstName} {previewData?.user?.lastName}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">{previewData?.user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewUserId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isPreviewLoading ? (
              <div className="py-20 text-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                <span>Loading User Profile &amp; Login History...</span>
              </div>
            ) : previewData?.user ? (
              <>
                {/* Account Overview Cards */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Role</span>
                    <span className="font-bold text-slate-900">{previewData.user.role?.name || 'Personnel'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Department</span>
                    <span className="font-bold text-slate-900">
                      {DEPARTMENTS.find((d) => d.id === previewData.user.department)?.label || previewData.user.department}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Plant Location</span>
                    <span className="font-bold text-slate-900">{previewData.user.plantLocation || 'Main Works'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Auth Flow</span>
                    <span className="font-bold text-orange-600">{previewData.user.authMethod || 'BOTH'}</span>
                  </div>
                </div>

                {/* IP Security Overview */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">IP Whitelist Protection</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        previewData.user.isIpRestricted
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {previewData.user.isIpRestricted ? 'ENFORCED' : 'OFF'}
                    </span>
                  </div>
                  {previewData.user.isIpRestricted && previewData.user.whitelistedIps?.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {previewData.user.whitelistedIps.map((ip: string, idx: number) => (
                        <span key={idx} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                          {ip}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-[11px]">No IP restrictions configured.</span>
                  )}
                </div>

                {/* LAST 5 LOGINS SECTION */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Last 5 Login Audit History
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {previewData.last5Logins?.length || 0} Records
                    </span>
                  </div>

                  {previewData.last5Logins?.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                          <tr>
                            <th className="py-2 px-3">Date &amp; Time</th>
                            <th className="py-2 px-3">Method</th>
                            <th className="py-2 px-3">IP Address</th>
                            <th className="py-2 px-3">Device</th>
                            <th className="py-2 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                          {previewData.last5Logins.map((login: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-sans">
                                <div className="font-semibold text-slate-800">
                                  {new Date(login.loginAt).toLocaleDateString()}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(login.loginAt).toLocaleTimeString()}
                                </div>
                              </td>
                              <td className="py-2 px-3 font-sans">
                                {login.authMethodUsed === 'GOOGLE_SSO' ? (
                                  <span className="text-sky-700 font-semibold">Google SSO</span>
                                ) : (
                                  <span className="text-emerald-700 font-semibold">Password</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-600">{login.ipAddress || '127.0.0.1'}</td>
                              <td className="py-2 px-3 font-sans text-slate-600">{login.deviceType || 'Desktop'}</td>
                              <td className="py-2 px-3 text-right">
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {login.status || 'SUCCESS'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                      No prior login records found for this account.
                    </div>
                  )}
                </div>

                {/* Quick Action in Drawer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUserId(null);
                      handleOpenEditModal(previewData.user);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Edit Personnel Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewUserId(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
