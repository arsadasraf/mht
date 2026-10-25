'use client';

import React, { useState } from 'react';
import {
  Activity,
  Users,
  Clock,
  Shield,
  ShieldAlert,
  Search,
  RefreshCw,
  LogOut,
  MapPin,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Key,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Mail,
  Building
} from 'lucide-react';
import {
  useGetActiveSessionsQuery,
  useTerminateSessionMutation,
  useLazyGetUserPreviewQuery
} from '../api/adminApi';
import { useAppDispatch } from '../../../store/hooks';
import { addToast } from '../../../store/uiSlice';

export default function SessionsTab() {
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPresence, setFilterPresence] = useState<'ALL' | 'ONLINE' | 'IDLE'>('ALL');
  const [selectedUserForTerminate, setSelectedUserForTerminate] = useState<any | null>(null);

  // User Preview Drawer State
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [triggerPreview, { data: previewData, isFetching: isFetchingPreview }] = useLazyGetUserPreviewQuery();

  // RTK Query: Poll sessions every 30 seconds for live updates
  const {
    data: sessionsData,
    isLoading,
    isFetching,
    refetch
  } = useGetActiveSessionsQuery(undefined, {
    pollingInterval: 30000
  });

  const [terminateSession, { isLoading: isTerminating }] = useTerminateSessionMutation();

  const sessions: any[] = sessionsData?.sessions || [];
  const activeNowCount = sessionsData?.activeNowCount || 0;
  const totalSessionsCount = sessions.length;

  const totalUsageMinutesAll = sessions.reduce((acc, s) => acc + (s.totalUsageMinutes || 0), 0);
  const totalUsageHoursFormatted = `${Math.floor(totalUsageMinutesAll / 60)}h ${totalUsageMinutesAll % 60}m`;
  const ipRestrictedCount = sessions.filter((s) => s.isIpRestricted).length;

  // Filtered Sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      searchTerm === '' ||
      s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.plantLocation?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPresence =
      filterPresence === 'ALL' ||
      (filterPresence === 'ONLINE' && s.isOnline) ||
      (filterPresence === 'IDLE' && !s.isOnline);

    return matchesSearch && matchesPresence;
  });

  const handleOpenPreview = async (userId: string) => {
    setPreviewUserId(userId);
    try {
      await triggerPreview(userId).unwrap();
    } catch {
      dispatch(
        addToast({
          type: 'error',
          title: 'Preview Failed',
          message: 'Unable to load user profile audit details.'
        })
      );
    }
  };

  const handleTerminateSession = async () => {
    if (!selectedUserForTerminate) return;

    try {
      await terminateSession(selectedUserForTerminate._id).unwrap();
      dispatch(
        addToast({
          type: 'success',
          title: 'Session Terminated',
          message: `Active session for ${selectedUserForTerminate.fullName} has been remotely terminated.`
        })
      );
      setSelectedUserForTerminate(null);
      refetch();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Termination Failed',
          message: err?.data?.message || 'Failed to terminate user session.'
        })
      );
    }
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes <= 0) return 'Just started';
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return `${hrs}h ${rem}m`;
  };

  const formatLastActive = (dateStr: string) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* 1. Quick Stats KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Activity className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-ping" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">{activeNowCount}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Online Personnel Now</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">{totalSessionsCount}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Active Today</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">{totalUsageHoursFormatted}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Total System Time</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">{ipRestrictedCount}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">IP-Restricted Sessions</div>
          </div>
        </div>
      </div>

      {/* 2. Search & Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search active personnel by name, email, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Filter Pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterPresence('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterPresence === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({sessions.length})
              </button>
              <button
                onClick={() => setFilterPresence('ONLINE')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                  filterPresence === 'ONLINE'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Online ({activeNowCount})
              </button>
              <button
                onClick={() => setFilterPresence('IDLE')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterPresence === 'IDLE'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Idle ({sessions.length - activeNowCount})
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh live session data"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-orange-500' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Live Sessions Table / List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Personnel & Role</th>
                <th className="py-3 px-4">Presence Status</th>
                <th className="py-3 px-4">Current Active Tab</th>
                <th className="py-3 px-4">Plant & Network</th>
                <th className="py-3 px-4">Auth Mode</th>
                <th className="py-3 px-4">Daily Usage</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                      <span className="text-xs font-medium">Loading live personnel sessions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <div className="font-semibold text-slate-700">No matching active sessions found</div>
                      <div className="text-xs text-slate-400">Try adjusting your search criteria or refresh the monitor.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => (
                  <tr
                    key={session._id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => handleOpenPreview(session._id)}
                  >
                    {/* Personnel & Role */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {session.firstName?.[0]}
                          {session.lastName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                            {session.fullName}
                            {session.role?.slug === 'super-admin' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Super Admin
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{session.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Presence Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {session.isOnline ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Online Now
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Idle ({formatLastActive(session.lastActiveAt)})
                        </div>
                      )}
                    </td>

                    {/* Current Active Tab */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        <Activity className="w-3 h-3 text-orange-500" />
                        {session.currentActiveTab || '/crm/dashboard'}
                      </span>
                    </td>

                    {/* Plant Location & Network */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {session.plantLocation || 'Unit 1 (Bengaluru)'}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>{session.lastLogin?.ipAddress || 'Internal Network'}</span>
                          {session.isIpRestricted && (
                            <span
                              title="IP Whitelist Restricted"
                              className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200 flex items-center gap-0.5 ml-1"
                            >
                              <Lock className="w-2.5 h-2.5" /> IP Locked
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Auth Mode */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {session.authMethod === 'GOOGLE_ONLY' ? (
                        <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1 w-fit">
                          <Globe className="w-3 h-3" /> Google SSO
                        </span>
                      ) : session.authMethod === 'PASSWORD_ONLY' ? (
                        <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 w-fit">
                          <Key className="w-3 h-3" /> Password
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1 w-fit">
                          <Shield className="w-3 h-3" /> Dual (SSO + Pwd)
                        </span>
                      )}
                    </td>

                    {/* Daily Usage */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-slate-900">
                        {formatDuration(session.totalUsageMinutes)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Login: {session.lastLoginAt ? new Date(session.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenPreview(session._id)}
                          title="Inspect User Audit & Last 5 Logins"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden lg:inline">Audit</span>
                        </button>

                        <button
                          onClick={() => setSelectedUserForTerminate(session)}
                          title="Force Terminate Session (Remote Logout)"
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
                        >
                          <LogOut className="w-3.5 h-3.5 text-red-600" />
                          <span className="hidden lg:inline">Terminate</span>
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

      {/* 4. Remote Session Termination Confirmation Modal */}
      {selectedUserForTerminate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Terminate Active Session?</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to remotely terminate the session for{' '}
              <strong className="text-slate-900">{selectedUserForTerminate.fullName}</strong> ({selectedUserForTerminate.email})?
            </p>
            <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              This will instantly revoke their active refresh token, disconnect their session across plant kiosks and terminals, and require them to re-authenticate.
            </p>

            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setSelectedUserForTerminate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTerminateSession}
                disabled={isTerminating}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                {isTerminating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Terminating...
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    Confirm Force Logout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. User Preview Slide-Out Drawer (with Last 5 Logins Audit Table) */}
      {previewUserId && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setPreviewUserId(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white border-l border-slate-200 shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-orange-500 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                    {previewData?.user?.firstName?.[0]}
                    {previewData?.user?.lastName?.[0]}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {previewData?.user ? `${previewData.user.firstName} ${previewData.user.lastName}` : 'Personnel Profile'}
                    </h2>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{previewData?.user?.email}</span>
                      {previewData?.user?.isOnline ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                          Offline
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setPreviewUserId(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isFetchingPreview ? (
                  <div className="py-20 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                    <span className="text-xs font-semibold">Loading security audit records...</span>
                  </div>
                ) : !previewData?.user ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    No profile details available.
                  </div>
                ) : (
                  <>
                    {/* Personnel Summary Grid */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Assigned Role</div>
                        <div className="text-sm font-semibold text-slate-900 mt-0.5">
                          {previewData.user.role?.name || 'Standard User'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Department</div>
                        <div className="text-sm font-semibold text-slate-900 mt-0.5">
                          {previewData.user.department || 'Plant Operations'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Plant Location</div>
                        <div className="text-sm font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-orange-500" />
                          {previewData.user.plantLocation || 'Unit 1 (Bengaluru)'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Session Refresh Lifespan</div>
                        <div className="text-sm font-semibold text-slate-900 mt-0.5">
                          {previewData.user.refreshTokenExpiry || '7d'}
                        </div>
                      </div>
                    </div>

                    {/* Auth & IP Restriction Card */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-orange-500" />
                        Authentication & Access Security
                      </h4>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="font-semibold text-slate-700">Authentication Method</div>
                          <div className="mt-1 font-bold text-slate-900">
                            {previewData.user.authMethod === 'GOOGLE_ONLY'
                              ? 'Google Single Sign-On Only'
                              : previewData.user.authMethod === 'PASSWORD_ONLY'
                              ? 'Corporate Password Only'
                              : 'Dual Mode (Google SSO + Password)'}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="font-semibold text-slate-700">IP Whitelist Restriction</div>
                          <div className="mt-1 font-bold text-slate-900 flex items-center gap-1">
                            {previewData.user.isIpRestricted ? (
                              <span className="text-amber-700 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Enforced ({previewData.user.whitelistedIps?.length || 0} IPs)
                              </span>
                            ) : (
                              <span className="text-slate-500">Unrestricted (Any IP)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {previewData.user.isIpRestricted && previewData.user.whitelistedIps?.length > 0 && (
                        <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-xs">
                          <div className="font-semibold text-amber-900 mb-1">Whitelisted IP Addresses:</div>
                          <div className="flex flex-wrap gap-1.5">
                            {previewData.user.whitelistedIps.map((ip: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-white text-slate-800 rounded border border-amber-200 font-mono text-[11px]"
                              >
                                {ip}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Last 5 Logins Audit Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-orange-500" />
                          Last 5 Login Audit History
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {previewData.last5Logins?.length || 0} recent sessions
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                              <th className="py-2.5 px-3">Date & Time</th>
                              <th className="py-2.5 px-3">Auth Method</th>
                              <th className="py-2.5 px-3">IP Address</th>
                              <th className="py-2.5 px-3">Device</th>
                              <th className="py-2.5 px-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {!previewData.last5Logins || previewData.last5Logins.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-slate-400">
                                  No previous login history recorded yet.
                                </td>
                              </tr>
                            ) : (
                              previewData.last5Logins.map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                                    {new Date(item.loginAt).toLocaleDateString('en-IN', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    {item.authMethodUsed === 'GOOGLE_SSO' ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                        Google SSO
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                        Email / Password
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600">
                                    {item.ipAddress || '127.0.0.1'}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600">
                                    <div className="flex items-center gap-1">
                                      {item.deviceType === 'Mobile' ? (
                                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                                      ) : item.deviceType === 'Tablet' ? (
                                        <Tablet className="w-3.5 h-3.5 text-slate-400" />
                                      ) : (
                                        <Laptop className="w-3.5 h-3.5 text-slate-400" />
                                      )}
                                      <span>{item.deviceType || 'Desktop'}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                    {item.status === 'SUCCESS' ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Success
                                      </span>
                                    ) : item.status === 'BLOCKED_IP' ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        IP Blocked
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                        Failed
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500">ISO 27001 Access Control & Login Auditing</span>
                <button
                  onClick={() => setPreviewUserId(null)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-all shadow-xs"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
