'use client';

import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Plus,
  Search,
  X,
  RotateCcw,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';
import {
  useGetStoreLocationsQuery,
  useCreateStoreLocationMutation,
  useUpdateStoreLocationMutation,
  useDeleteStoreLocationMutation
} from '../api/storeApi';
import { ExcelColumnFilter } from '../../../components/ui/ExcelColumnFilter';

export const INDUSTRIAL_LOCATION_TYPES = [
  'Rack',
  'Bin',
  'Shelf',
  'Bay',
  'Yard',
  'Floor',
  'Cage',
  'Mezzanine',
  'Staging Area',
  'Quarantine Area',
  'Other'
];

interface LocationItem {
  id: string;
  locationName: string;
  locationType: string;
  description: string;
  isActive: boolean;
  createdByName?: string;
  createdAt?: string;
  updatedByName?: string;
  updatedAt?: string;
}

export function StoreLocationMasterSection() {
  const { data, isLoading } = useGetStoreLocationsQuery({});
  const [createLocation, { isLoading: isCreating }] = useCreateStoreLocationMutation();
  const [updateLocation, { isLoading: isUpdating }] = useUpdateStoreLocationMutation();
  const [deleteLocation] = useDeleteStoreLocationMutation();

  const locations: LocationItem[] = useMemo(() => {
    return Array.isArray(data?.locations) ? data.locations : [];
  }, [data]);

  // Search & Excel Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('locationName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LocationItem | null>(null);
  const [previewItem, setPreviewItem] = useState<LocationItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State - strictly 3 fields
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Rack');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormName('');
    setFormType('Rack');
    setFormDesc('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: LocationItem) => {
    setEditingItem(item);
    setFormName(item.locationName);
    setFormType(item.locationType || 'Rack');
    setFormDesc(item.description || '');
    setFormError('');
    setIsFormOpen(true);
  };

  // Real-time duplicate check
  const isDuplicateName = useMemo(() => {
    const trimmed = formName.trim().toUpperCase();
    if (!trimmed) return false;
    return locations.some(
      (loc) =>
        loc.locationName.trim().toUpperCase() === trimmed &&
        (!editingItem || loc.id !== editingItem.id)
    );
  }, [formName, locations, editingItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Please enter a location name.');
      return;
    }
    if (isDuplicateName) {
      setFormError(`Location name "${formName.trim()}" already exists. Please choose a unique name.`);
      return;
    }

    try {
      if (editingItem) {
        await updateLocation({
          id: editingItem.id,
          locationName: formName.trim(),
          locationType: formType,
          description: formDesc.trim()
        }).unwrap();
        showToast('All set! Location updated successfully.');
      } else {
        await createLocation({
          locationName: formName.trim(),
          locationType: formType,
          description: formDesc.trim()
        }).unwrap();
        showToast('Great! New storage location created.');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err?.data?.message || 'Unable to save location right now. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLocation(id).unwrap();
      showToast('Location removed successfully.');
      setDeleteConfirmId(null);
      if (previewItem?.id === id) setPreviewItem(null);
    } catch (err: any) {
      showToast(err?.data?.message || 'Failed to remove location.', 'error');
    }
  };

  // Distinct values for ExcelColumnFilter
  const distinctNames = useMemo(() => {
    const map: Record<string, number> = {};
    locations.forEach((l) => {
      if (l.locationName) map[l.locationName] = (map[l.locationName] || 0) + 1;
    });
    return Object.entries(map).map(([value, count]) => ({ value, count }));
  }, [locations]);

  const distinctTypes = useMemo(() => {
    const map: Record<string, number> = {};
    locations.forEach((l) => {
      if (l.locationType) map[l.locationType] = (map[l.locationType] || 0) + 1;
    });
    return Object.entries(map).map(([value, count]) => ({ value, count }));
  }, [locations]);

  const handleFilterChange = (colKey: string, values: string[] | null) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (!values || values.length === 0) {
        delete next[colKey];
      } else {
        next[colKey] = values;
      }
      return next;
    });
  };

  const handleSortChange = (colKey: string, dir: 'asc' | 'desc') => {
    setSortField(colKey);
    setSortDir(dir);
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setActiveFilters({});
    setSortField('locationName');
    setSortDir('asc');
  };

  const hasActiveFilters = searchTerm.trim().length > 0 || Object.keys(activeFilters).length > 0;

  // Filter & sort rows
  const filteredRows = useMemo(() => {
    return locations
      .filter((loc) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const match =
            loc.locationName.toLowerCase().includes(q) ||
            loc.locationType.toLowerCase().includes(q) ||
            (loc.description && loc.description.toLowerCase().includes(q));
          if (!match) return false;
        }
        if (activeFilters.locationName && !activeFilters.locationName.includes(loc.locationName)) {
          return false;
        }
        if (activeFilters.locationType && !activeFilters.locationType.includes(loc.locationType)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = (a as any)[sortField] || '';
        let valB = (b as any)[sortField] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [locations, searchTerm, activeFilters, sortField, sortDir]);

  return (
    <div className="space-y-4">
      {/* Top Dedicated In-Line Table Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search locations..."
            className="w-full pl-9 pr-8 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs shadow-orange-500/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Location Name"
                    columnKey="locationName"
                    distinctValues={distinctNames}
                    selectedValues={activeFilters.locationName || null}
                    onFilterChange={(vals) => handleFilterChange('locationName', vals)}
                    currentSortField={sortField}
                    currentSortDirection={sortField === 'locationName' ? sortDir : undefined}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDir(dir);
                    }}
                  />
                </th>
                <th className="py-3 px-4">
                  <ExcelColumnFilter
                    title="Storage Type"
                    columnKey="locationType"
                    distinctValues={distinctTypes}
                    selectedValues={activeFilters.locationType || null}
                    onFilterChange={(vals) => handleFilterChange('locationType', vals)}
                    currentSortField={sortField}
                    currentSortDirection={sortField === 'locationType' ? sortDir : undefined}
                    onSortChange={(field, dir) => {
                      setSortField(field);
                      setSortDir(dir);
                    }}
                  />
                </th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Loading storage locations...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">No storage locations found</p>
                      <button
                        onClick={handleOpenCreate}
                        className="mt-1 text-xs font-bold text-orange-600 hover:text-orange-700 underline"
                      >
                        Add your first location
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="font-bold text-slate-900 hover:text-orange-600 transition-colors text-left flex items-center gap-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>{item.locationName}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.locationType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {item.description || <span className="text-slate-300 italic">None</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewItem(item)}
                          title="Preview Location"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Location"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          title="Delete Location"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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

      {/* Add / Edit Location Modal (Strictly 3 fields) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {editingItem ? 'Edit Storage Location' : 'Add Storage Location'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Configure physical warehouse and plant store locations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body - Strictly 3 Fields */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Field 1: Location Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFormError('');
                  }}
                  placeholder="e.g. Rack A-01, Bin B-12, Shelf S-3, Bay 1"
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border ${
                    isDuplicateName
                      ? 'border-red-400 bg-red-50/60 focus:border-red-500'
                      : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                  } transition-all`}
                  required
                />
                {isDuplicateName && (
                  <p className="text-[11px] text-red-600 mt-1 font-semibold">
                    This location name already exists. Please choose a unique name.
                  </p>
                )}
              </div>

              {/* Field 2: Storage Location Type (Researched Types Dropdown) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Storage Location Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  required
                >
                  {INDUSTRIAL_LOCATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 3: Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Physical notes, aisle landmark, or capacity specifications..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating || isDuplicateName || !formName.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 rounded-xl shadow-xs shadow-orange-500/20 transition-all"
                >
                  {isCreating || isUpdating ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clickable Row Preview Dossier with Complete Audit Trail */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Crisp White Header with Amber Accent Stripe */}
            <div className="bg-white border-b border-slate-200 border-t-4 border-t-amber-400 px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-slate-900 text-base font-extrabold tracking-tight">
                    {previewItem.locationName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Storage Location Dossier</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenEdit(previewItem);
                    setPreviewItem(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Key Specs Card */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Location Name</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">{previewItem.locationName}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Storage Type</p>
                  <span className="inline-flex items-center px-2 py-0.5 mt-0.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-800 shadow-xs">
                    {previewItem.locationType}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</p>
                  <p className="text-xs font-medium text-slate-700 mt-0.5 whitespace-pre-wrap">
                    {previewItem.description || <span className="text-slate-400 italic">No description provided</span>}
                  </p>
                </div>
              </div>

              {/* Complete Audit Trail Section */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Audit Trail</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px] font-semibold text-slate-500">Created By</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{previewItem.createdByName || 'Store Admin'}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{previewItem.createdAt ? new Date(previewItem.createdAt).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px] font-semibold text-slate-500">Last Updated By</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{previewItem.updatedByName || previewItem.createdByName || 'Store Admin'}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{previewItem.updatedAt ? new Date(previewItem.updatedAt).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-base font-extrabold text-slate-900 mb-1">Delete this location?</h4>
            <p className="text-xs text-slate-500 mb-4">
              Once removed, store and inventory records will no longer have this location option.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Keep it
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-2xl animate-in slide-in-from-bottom-5">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
