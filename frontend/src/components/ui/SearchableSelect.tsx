'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, LucideIcon } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

export interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  allOptionLabel?: string;
  placeholder?: string;
  icon?: LucideIcon;
  align?: 'left' | 'right';
  className?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  label,
  value,
  onChange,
  options,
  allOptionLabel = 'All',
  placeholder = 'Search...',
  icon: IconComponent,
  align = 'left',
  className = '',
  disabled = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check if current value is filtered (non-default)
  const isFiltered = value !== 'ALL' && value !== '';

  // Current selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  // Display label on trigger button
  const triggerDisplayLabel = useMemo(() => {
    if (!isFiltered) return allOptionLabel;
    if (selectedOption) return selectedOption.label;
    return value;
  }, [isFiltered, allOptionLabel, selectedOption, value]);

  // Filter options based on live search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(q) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
      return matchLabel || matchSub || matchBadge;
    });
  }, [options, searchQuery]);

  // Click outside listener to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Autofocus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('ALL');
    setSearchQuery('');
  };

  const isFullWidth = className.includes('w-full');

  return (
    <div className={`relative ${isFullWidth ? 'block w-full' : 'inline-block'} select-none ${className}`} ref={containerRef}>
      {/* Trigger Pill Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery('');
        }}
        className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border ${
          isFullWidth ? 'w-full justify-between' : ''
        } ${
          isFiltered
            ? 'bg-orange-50/80 border-orange-300 text-orange-950 shadow-xs'
            : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-800 hover:border-slate-300'
        } ${isOpen ? 'ring-2 ring-orange-500/20 border-orange-400 bg-white' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate text-left">
          {IconComponent && (
            <IconComponent
              size={14}
              className={`shrink-0 ${isFiltered ? 'text-orange-600' : 'text-slate-400'}`}
            />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            {label}:
          </span>
          <span className="truncate font-bold text-slate-800">
            {triggerDisplayLabel}
          </span>
        </div>

        {/* Clear (X) icon when filtered, otherwise rotating Chevron */}
        {isFiltered ? (
          <span
            onClick={handleClear}
            className="p-0.5 rounded-md hover:bg-orange-200 text-orange-700 transition-colors shrink-0"
            title={`Clear ${label} filter`}
          >
            <X size={13} />
          </span>
        ) : (
          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform duration-150 shrink-0 ${
              isOpen ? 'rotate-180 text-orange-600' : ''
            }`}
          />
        )}
      </button>

      {/* Floating Searchable Popover */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 ${
            isFullWidth ? 'w-full' : 'w-72 sm:w-80'
          } min-w-[320px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Top Live Search Bar */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-orange-500 font-medium placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Options Scroll List */}
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-100/60">
            {/* "All" Option (Default Reset) */}
            <button
              type="button"
              onClick={() => handleSelect('ALL')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                !isFiltered
                  ? 'bg-orange-50 text-orange-900 font-bold'
                  : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <span className="truncate">{allOptionLabel}</span>
              {!isFiltered && <Check size={14} className="text-orange-600 shrink-0" />}
            </button>

            {/* Filtered Dynamic Options */}
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-slate-400">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50 text-orange-950 font-bold'
                        : 'text-slate-800 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-bold">{opt.label}</span>
                        {opt.badge && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subLabel && (
                        <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                          {opt.subLabel}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-orange-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

