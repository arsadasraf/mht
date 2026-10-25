'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Filter,
  ArrowUp,
  ArrowDown,
  Search,
  Check,
  X,
  RotateCcw
} from 'lucide-react';

export interface DistinctValueItem {
  value: string;
  count: number;
}

export interface ExcelColumnFilterProps {
  title: string;
  columnKey: string;
  distinctValues: DistinctValueItem[];
  selectedValues: string[] | null; // null means no filter is applied (all values allowed)
  onFilterChange: (selected: string[] | null) => void;
  currentSortField?: string;
  currentSortDirection?: 'asc' | 'desc';
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  align?: 'left' | 'right';
  className?: string;
}

export default function ExcelColumnFilter({
  title,
  columnKey,
  distinctValues,
  selectedValues,
  onFilterChange,
  currentSortField,
  currentSortDirection,
  onSortChange,
  align = 'left',
  className = ''
}: ExcelColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Draft selection while the popover is open
  const [draftSelected, setDraftSelected] = useState<Set<string>>(() => {
    if (selectedValues === null) {
      return new Set(distinctValues.map((d) => d.value));
    }
    return new Set(selectedValues);
  });

  // When popover opens or selectedValues changes from outside, reset draft
  useEffect(() => {
    if (isOpen) {
      if (selectedValues === null) {
        setDraftSelected(new Set(distinctValues.map((d) => d.value)));
      } else {
        setDraftSelected(new Set(selectedValues));
      }
      setSearchValue('');
    }
  }, [isOpen, selectedValues, distinctValues]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Is this column currently filtered?
  const isFiltered = useMemo(() => {
    if (selectedValues === null) return false;
    // If selectedValues has fewer items than distinctValues, a filter is active
    return selectedValues.length < distinctValues.length;
  }, [selectedValues, distinctValues]);

  // Filtered distinct values based on popover search
  const visibleValues = useMemo(() => {
    if (!searchValue.trim()) return distinctValues;
    const q = searchValue.toLowerCase().trim();
    return distinctValues.filter((item) =>
      item.value.toLowerCase().includes(q)
    );
  }, [distinctValues, searchValue]);

  // Are all visible values checked?
  const isAllVisibleSelected = useMemo(() => {
    if (visibleValues.length === 0) return false;
    return visibleValues.every((item) => draftSelected.has(item.value));
  }, [visibleValues, draftSelected]);

  // Toggle "Select All"
  const handleToggleSelectAll = () => {
    setDraftSelected((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        // Deselect visible values
        visibleValues.forEach((item) => next.delete(item.value));
      } else {
        // Select all visible values
        visibleValues.forEach((item) => next.add(item.value));
      }
      return next;
    });
  };

  // Toggle single item
  const handleToggleItem = (val: string) => {
    setDraftSelected((prev) => {
      const next = new Set(prev);
      if (next.has(val)) {
        next.delete(val);
      } else {
        next.add(val);
      }
      return next;
    });
  };

  // Apply Filter
  const handleApply = () => {
    if (draftSelected.size === distinctValues.length) {
      // All selected = no filter
      onFilterChange(null);
    } else {
      onFilterChange(Array.from(draftSelected));
    }
    setIsOpen(false);
  };

  // Clear Filter for this column
  const handleClear = () => {
    onFilterChange(null);
    setDraftSelected(new Set(distinctValues.map((d) => d.value)));
    setIsOpen(false);
  };

  // Sort handlers
  const handleSortAsc = () => {
    if (onSortChange) {
      onSortChange(columnKey, 'asc');
    }
    setIsOpen(false);
  };

  const handleSortDesc = () => {
    if (onSortChange) {
      onSortChange(columnKey, 'desc');
    }
    setIsOpen(false);
  };

  const isSortedAsc = currentSortField === columnKey && currentSortDirection === 'asc';
  const isSortedDesc = currentSortField === columnKey && currentSortDirection === 'desc';

  return (
    <div className={`relative inline-flex items-center gap-1.5 select-none ${className}`} ref={popoverRef}>
      {/* Column Title with direct Sort click */}
      <span className="font-bold text-slate-700 tracking-wider text-[11px] truncate">
        {title}
      </span>

      {/* Excel Filter Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center shrink-0 ${
          isFiltered
            ? 'bg-orange-500 text-white shadow-xs hover:bg-orange-600'
            : isSortedAsc || isSortedDesc
            ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/80'
        }`}
        title={`Filter & sort by ${title}`}
      >
        <Filter className={`w-3 h-3 ${isFiltered ? 'fill-white stroke-white' : ''}`} />
      </button>

      {/* Floating Excel-Style Filter Popover */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-2 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 text-xs text-slate-800 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Popover Header: Column Name */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider truncate">
              {title}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 1. Sorting Options (A to Z / Z to A) */}
          {onSortChange && (
            <div className="p-1.5 border-b border-slate-100 space-y-0.5">
              <button
                type="button"
                onClick={handleSortAsc}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                  isSortedAsc
                    ? 'bg-orange-50 text-orange-600 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowUp className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sort A to Z (Ascending)</span>
                </div>
                {isSortedAsc && <Check className="w-3.5 h-3.5 text-orange-600" />}
              </button>

              <button
                type="button"
                onClick={handleSortDesc}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                  isSortedDesc
                    ? 'bg-orange-50 text-orange-600 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sort Z to A (Descending)</span>
                </div>
                {isSortedDesc && <Check className="w-3.5 h-3.5 text-orange-600" />}
              </button>
            </div>
          )}

          {/* 2. In-Popover Value Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search values..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:bg-white"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => setSearchValue('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Distinct Values Checklist */}
          <div className="p-2 space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
            {/* (Select All) Checkbox */}
            <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={isAllVisibleSelected}
                onChange={handleToggleSelectAll}
                className="w-3.5 h-3.5 rounded border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
              <span className="flex-1 truncate">(Select All)</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {visibleValues.length}
              </span>
            </label>

            {visibleValues.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 italic">
                No matching values found.
              </div>
            ) : (
              visibleValues.map((item) => {
                const isChecked = draftSelected.has(item.value);

                return (
                  <label
                    key={item.value}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-xs text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleItem(item.value)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="flex-1 truncate" title={item.value}>
                      {item.value || '(Blank)'}
                    </span>
                    <span className="text-[10px] text-slate-400 px-1 py-0.2 bg-slate-100 rounded font-mono">
                      {item.count}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {/* 4. Footer Actions (Clear Filter & Apply) */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-orange-600 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Filter</span>
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
