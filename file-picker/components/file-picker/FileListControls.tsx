'use client';

import { Grid, List, Search, Filter, ArrowUpDown, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { BreadcrumbNavigation } from './BreadcrumbNavigation';
import { useState, useRef, useEffect } from 'react';

interface BreadcrumbItem {
  name: string;
  path: string;
  resourceId?: string;
}

interface FileListControlsProps {
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: () => void;
  selectedCount: number;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  breadcrumbs?: BreadcrumbItem[];
  onBreadcrumbNavigate?: (index: number) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSortClick?: () => void;
  onFilterClick?: () => void;
  totalFiles?: number;
  filteredFiles?: number;
  isSearchActive?: boolean;
  typeFilter?: string;
  onTypeFilterChange?: (filter: string) => void;
  availableFileTypes?: string[];
  isTypeFilterActive?: boolean;
}

export function FileListControls({
  allSelected,
  someSelected,
  onSelectAll,
  selectedCount,
  viewMode = 'list',
  onViewModeChange,
  breadcrumbs = [],
  onBreadcrumbNavigate,
  searchQuery = '',
  onSearchChange,
  onSortClick,
  totalFiles = 0,
  filteredFiles = 0,
  isSearchActive = false,
  typeFilter = 'all',
  onTypeFilterChange,
  availableFileTypes = [],
  isTypeFilterActive = false,
}: FileListControlsProps) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFilterLabel = () => {
    if (typeFilter === 'all') return 'Filter';
    if (typeFilter === 'folders') return 'Folders';
    if (typeFilter === 'files') return 'Files';
    return typeFilter.toUpperCase();
  };

  const handleFilterSelect = (filter: string) => {
    onTypeFilterChange?.(filter);
    setShowFilterDropdown(false);
  };
  return (
    <div className="border-b border-gray-200 bg-gray-50">
      {/* Breadcrumb Navigation Row */}
      {breadcrumbs.length > 0 && onBreadcrumbNavigate && (
        <div className="px-6 py-3 bg-gray-50">
          <BreadcrumbNavigation 
            breadcrumbs={breadcrumbs}
            onNavigateTo={onBreadcrumbNavigate}
          />
        </div>
      )}
      
      {/* Controls Row */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Select All */}
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={allSelected}
                ref={(el: HTMLButtonElement | null) => {
                  if (el) {
                    const input = el.querySelector('input');
                    if (input) {
                      input.indeterminate = someSelected && !allSelected;
                    }
                  }
                }}
                onCheckedChange={() => onSelectAll()}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Select all</span>
              {selectedCount > 0 && (
                <span className="text-sm text-gray-500">({selectedCount})</span>
              )}
            </div>

            {/* Sort and Filter Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSortClick}
                className="h-8 px-3 text-gray-600 hover:text-gray-900"
              >
                <ArrowUpDown className="w-4 h-4 mr-1" />
                Sort
              </Button>
              
              {/* Filter Dropdown */}
              <div className="relative" ref={filterDropdownRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`h-8 px-3 text-gray-600 hover:text-gray-900 ${
                    isTypeFilterActive ? 'bg-blue-100 text-blue-700 border-blue-300' : ''
                  }`}
                >
                  <Filter className="w-4 h-4 mr-1" />
                  {getFilterLabel()}
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>

                {showFilterDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <div className="py-1">
                      {/* Clear Filter */}
                      {isTypeFilterActive && (
                        <>
                          <button
                            onClick={() => handleFilterSelect('all')}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Clear filter
                          </button>
                          <hr className="my-1" />
                        </>
                      )}
                      
                      {/* Basic Filters */}
                      <button
                        onClick={() => handleFilterSelect('all')}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                          typeFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        All items
                      </button>
                      <button
                        onClick={() => handleFilterSelect('folders')}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                          typeFilter === 'folders' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        📁 Folders only
                      </button>
                      <button
                        onClick={() => handleFilterSelect('files')}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                          typeFilter === 'files' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        📄 Files only
                      </button>

                      {/* File Type Filters */}
                      {availableFileTypes.length > 0 && (
                        <>
                          <hr className="my-1" />
                          <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            File Types
                          </div>
                          {availableFileTypes.map(fileType => (
                            <button
                              key={fileType}
                              onClick={() => handleFilterSelect(fileType)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                                typeFilter === fileType ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                              }`}
                            >
                              .{fileType.toUpperCase()} files
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Search Input with Results Counter */}
            {onSearchChange && (
              <div className="flex items-center space-x-3">
                {/* Search/Filter Result Counter */}
                {(isSearchActive || isTypeFilterActive) && (
                  <div className={`text-sm whitespace-nowrap ${
                    filteredFiles === 0 ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {filteredFiles === 0 ? 'No matches' : `${filteredFiles} of ${totalFiles} items`}
                    {isTypeFilterActive && !isSearchActive && (
                      <span className="text-xs text-gray-400 ml-1">
                        (filtered)
                      </span>
                    )}
                  </div>
                )}
                
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search files and folders..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
                    className={`h-8 pl-9 pr-8 text-sm transition-all ${
                      isSearchActive 
                        ? filteredFiles === 0 
                          ? 'w-72 border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500' 
                          : 'w-72 border-blue-300 bg-blue-50 focus:border-blue-500 focus:ring-blue-500'
                        : 'w-64 border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    title="Search by filename (case-insensitive). Use spaces for multiple terms. Type 'folder' or 'file' to filter by type."
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearchChange('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors w-4 h-4 flex items-center justify-center rounded hover:bg-gray-100"
                      title="Clear search"
                    >
                      <span className="sr-only">Clear search</span>
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* View Toggle Buttons */}
            {onViewModeChange && (
              <div className="flex items-center border border-gray-300 rounded">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange('list')}
                  className="h-8 px-3 rounded-r-none border-r"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange('grid')}
                  className="h-8 px-3 rounded-l-none"
                >
                  <Grid className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 