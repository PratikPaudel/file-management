'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import { Resource, FileAction, SortDirection } from '@/lib/types';
import { FileListItem } from './FileListItem';
import { Skeleton } from '@/components/ui/skeleton';


interface FileListProps {
  files: Resource[];
  loading: boolean;
  error?: Error | null;
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onNavigate: (resourceId: string) => void;
  onAction: (action: FileAction) => void;
  sortBy?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string) => void;
  isSearchActive?: boolean;
  searchQuery?: string;
  connectionId: string;
}

export function FileList({
  files,
  loading,
  error,
  selectedIds,
  onSelectionChange,
  onNavigate,
  onAction,
  sortBy = 'name',
  sortDirection = null,
  onSort,
  isSearchActive = false,
  searchQuery = '',
  connectionId,
}: FileListProps) {
  const handleSelection = (resourceId: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(resourceId);
    } else {
      newSelected.delete(resourceId);
    }
    onSelectionChange(newSelected);
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column || sortDirection === null) {
      return null;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1" /> : 
      <ChevronDown className="w-4 h-4 ml-1" />;
  };

  const handleKeyDown = (e: React.KeyboardEvent, column: string) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSort?.(column);
    }
  };

  const SortableHeader = ({ column, children, className }: { column: string; children: React.ReactNode; className?: string }) => (
    <button
      onClick={() => onSort?.(column)}
      onKeyDown={(e) => handleKeyDown(e, column)}
      className={`
        p-0 h-auto font-medium text-gray-700 
        hover:text-gray-900 hover:bg-gray-100 
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 
        transition-colors rounded px-2 py-1 -mx-2 -my-1
        flex items-center cursor-pointer
        ${className || ''}
      `}
      tabIndex={0}
      aria-label={`Sort by ${column}`}
    >
      {children}
    </button>
  );

  if (loading) {
    return (
      <div>
        {/* Table Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex items-center space-x-4">
            <div className="w-4"></div> {/* Checkbox column */}
            <div className="w-5"></div> {/* Icon column */}
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700">Name</div>
            </div>
            <div className="w-32">
              <div className="text-sm font-medium text-gray-700">Date modified</div>
            </div>
            <div className="w-20"></div> {/* Action column */}
          </div>
        </div>
        
        {/* Loading Skeletons */}
        <div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 py-3 px-6 border-b border-gray-100">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-16 h-6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <div className="text-center">
          <p className="text-lg font-medium">Error loading files</p>
          <p className="text-sm mt-1">Please try again later.</p>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div>
        {/* Table Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex items-center space-x-4">
            <div className="w-4"></div> {/* Checkbox column */}
            <div className="w-5"></div> {/* Icon column */}
            <div className="flex-1">
              <SortableHeader column="name">
                Name {getSortIcon('name')}
              </SortableHeader>
            </div>
            <div className="w-32">
              <SortableHeader column="date">
                Date modified {getSortIcon('date')}
              </SortableHeader>
            </div>
            <div className="w-20"></div> {/* Action column */}
          </div>
        </div>
        
        {/* Empty State */}
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            {isSearchActive ? (
              <>
                <p className="text-lg font-medium">No matching files found</p>
                <p className="text-sm mt-1">
                  No files or folders match &ldquo;{searchQuery}&rdquo;
                </p>
                <p className="text-xs mt-2 text-gray-400">
                  Try different search terms or clear the search to see all files
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">This folder is empty</p>
                <p className="text-sm mt-1">
                  There are no files or folders in this directory
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex items-center space-x-4">
          <div className="w-4"></div> {/* Checkbox column */}
          <div className="w-5"></div> {/* Icon column */}
          <div className="flex-1">
            <SortableHeader column="name">
              Name {getSortIcon('name')}
            </SortableHeader>
          </div>
          <div className="w-32">
            <SortableHeader column="date">
              Date modified {getSortIcon('date')}
            </SortableHeader>
          </div>
          <div className="w-20"></div> {/* Action column */}
        </div>
      </div>
      
      {/* File List */}
      <div>
        {files.map((file) => (
          <FileListItem
            key={file.resource_id}
            resource={file}
            selected={selectedIds.has(file.resource_id)}
            onSelect={(selected) => handleSelection(file.resource_id, selected)}
            onNavigate={() => onNavigate(file.resource_id)}
            onAction={(action) => onAction(action)}
            connectionId={connectionId}
          />
        ))}
      </div>
    </div>
  );
} 