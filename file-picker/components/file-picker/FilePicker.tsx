'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { FilePickerProps, ViewMode, Resource, SortDirection } from '@/lib/types';
import { useConnectionFiles } from '@/hooks/use-connection';
// import { useFileIndexing, IndexingStatus } from '@/hooks/use-file-indexing'; // Replaced with batch workflow

import { FilePickerHeader } from '@/components/file-picker/FilePickerHeader';
import { FileListControls } from '@/components/file-picker/FileListControls';
import { FileList } from '@/components/file-picker/FileList';
import { FileGrid } from '@/components/file-picker/FileGrid';
import { FilePickerFooter } from '@/components/file-picker/FilePickerFooter';
// BatchIndexingActions now imported in Footer
import { useBatchKnowledgeBase } from '@/hooks/use-batch-knowledge-base';
import { useResourceSelection } from '@/hooks/use-resource-selection';
import { useFileStatus } from '@/hooks/use-file-status';
import { useKnowledgeBasePersistence } from '@/hooks/use-knowledge-base-persistence';

interface BreadcrumbItem {
  name: string;
  path: string;
  resourceId?: string;
}

export function FilePicker({
  connectionId,
  onSelectionChange,
}: FilePickerProps) {
  const [currentResourceId, setCurrentResourceId] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc'); // Default to Name A-Z
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [typeFilter, setTypeFilter] = useState<string>('all'); // 'all', 'folders', 'files', or specific extensions
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { name: 'My Drive', path: '/', resourceId: undefined }
  ]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Clear search and filters when navigating to any folder (including back to root)
  useEffect(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setTypeFilter('all');
  }, [currentResourceId]);

  // Fetch files for current directory
  const { data: filesData, isLoading, error } = useConnectionFiles({
    connectionId,
    resourceId: currentResourceId,
  });

  // Get raw files from API
  const rawFiles = filesData?.data || [];
  
  // New batch knowledge base workflow following Knowledge_Base_Workflow.ipynb
  const {
    status: knowledgeBaseStatus,
    error: knowledgeBaseError,
    createKnowledgeBaseWithResources,
    triggerSync,
    resetKnowledgeBase,
    setKnowledgeBaseId,
    setStatus,
  } = useBatchKnowledgeBase({ connectionId });

  // Resource selection for batch operations
  const {
    selectedResources,
    selectedResourceIds,
    toggleResourceSelection,
    clearSelection,
    getSelectedFiles,
  } = useResourceSelection();

  // Individual file status tracking
  const {
    fileStatuses,
    setFileStatus,
    setMultipleFileStatuses,
    getFileStatus,
  } = useFileStatus();

  // Remove from here - will add after files is declared

  // Convert FileStatus to IndexingStatus with synced support
  const convertedFileStatuses = useMemo(() => {
    const converted = new Map<string, 'indexed' | 'not_indexed' | 'indexing' | 'unindexing' | 'synced'>();
    fileStatuses.forEach((status, resourceId) => {
      switch (status) {
        case 'not_indexed':
          converted.set(resourceId, 'not_indexed');
          break;
        case 'indexed':
          converted.set(resourceId, 'indexed');
          break;
        case 'synced':
          converted.set(resourceId, 'synced');
          break;
        default:
          converted.set(resourceId, 'not_indexed');
      }
    });
    return converted;
  }, [fileStatuses]);

  // Helper functions for filtering
  const getFileExtension = useCallback((fileName: string): string => {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : '';
  }, []);

  const matchesSearchQuery = useCallback((file: Resource, query: string): boolean => {
    const fileName = file.inode_path.path.split('/').pop() || '';
    const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
    
    // If no search terms, show all files
    if (searchTerms.length === 0) return true;
    
    // All search terms must match (AND logic) - name-based search focus
    return searchTerms.every(term => {
      const lowerFileName = fileName.toLowerCase();
      const fileExtension = getFileExtension(fileName);
      
      return (
        lowerFileName.includes(term) ||
        fileExtension.includes(term) ||
        // Allow searching for "folder" or "file" to filter by type
        (file.inode_type === 'directory' && term === 'folder') ||
        (file.inode_type === 'file' && term === 'file')
      );
    });
  }, [getFileExtension]);

  // Sort and filter files
  const files = useMemo(() => {
    const rawFiles = filesData?.data || [];
    let filtered = [...rawFiles];
    
    // Apply search filter - enhanced with multi-term search and file type matching
    if (debouncedSearchQuery.trim()) {
      filtered = filtered.filter(file => matchesSearchQuery(file, debouncedSearchQuery));
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(file => {
        if (typeFilter === 'folders') {
          return file.inode_type === 'directory';
        } else if (typeFilter === 'files') {
          return file.inode_type === 'file';
        } else {
          // Specific file extension filter
          return file.inode_type === 'file' && getFileExtension(file.inode_path.path.split('/').pop() || '') === typeFilter;
        }
      });
    }
    
    // Apply sorting with folders first
    filtered.sort((a, b) => {
      // Always show folders first, then files
      if (a.inode_type !== b.inode_type) {
        return a.inode_type === 'directory' ? -1 : 1;
      }
      
      // Within the same type (folder or file), apply user sorting
      if (sortBy && sortDirection) {
        let aValue: string | number;
        let bValue: string | number;
        
        if (sortBy === 'name') {
          aValue = a.inode_path.path.split('/').pop()?.toLowerCase() || '';
          bValue = b.inode_path.path.split('/').pop()?.toLowerCase() || '';
        } else if (sortBy === 'date') {
          aValue = new Date(a.modified_at || a.created_at || 0).getTime();
          bValue = new Date(b.modified_at || b.created_at || 0).getTime();
        } else {
          return 0;
        }
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      } else {
        // Default sorting by name when no user sorting is applied
        const aName = a.inode_path.path.split('/').pop()?.toLowerCase() || '';
        const bName = b.inode_path.path.split('/').pop()?.toLowerCase() || '';
        return aName.localeCompare(bName);
      }
    });
    
    return filtered;
  }, [filesData?.data, debouncedSearchQuery, typeFilter, sortBy, sortDirection, matchesSearchQuery, getFileExtension]);

  // Calculate totals for display
  const totalFiles = filesData?.data?.length || 0;
  const filteredFiles = files.length;
  const isSearchActive = debouncedSearchQuery.trim().length > 0;
  const isTypeFilterActive = typeFilter !== 'all';
  
  // Get available file extensions for filter options
  const availableFileTypes = useMemo(() => {
    const rawFiles = filesData?.data || [];
    const extensions = new Set<string>();
    
    rawFiles.forEach(file => {
      if (file.inode_type === 'file') {
        const ext = getFileExtension(file.inode_path.path.split('/').pop() || '');
        if (ext) {
          extensions.add(ext);
        }
      }
    });
    
    return Array.from(extensions).sort();
  }, [filesData?.data, getFileExtension]);

  // Knowledge base persistence - restore status on refresh (after files is calculated)
  useKnowledgeBasePersistence({
    connectionId,
    files,
    setMultipleFileStatuses,
    setKnowledgeBaseId,
    setStatus,
  });

  const allSelected = files.length > 0 && selectedIds.size === files.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < files.length;

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Cycle through: asc -> desc -> null -> asc
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortBy('name'); // Reset to default
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const handleSelectionChange = (newSelectedIds: Set<string>) => {
    setSelectedIds(newSelectedIds);
    
    // Update batch resource selection
    const selectedFiles = files.filter(file => newSelectedIds.has(file.resource_id));
    
    // Clear existing selection and add new ones
    clearSelection();
    selectedFiles.forEach(file => {
      toggleResourceSelection(file);
    });
    
    if (onSelectionChange) {
      onSelectionChange(selectedFiles);
    }
  };

  const handleSelectAll = () => {
    if (allSelected) {
      handleSelectionChange(new Set());
    } else {
      handleSelectionChange(new Set(files.map(f => f.resource_id)));
    }
  };

  const handleNavigate = (resourceId: string) => {
    const targetFile = files.find(f => f.resource_id === resourceId);
    if (targetFile && targetFile.inode_type === 'directory') {
      setCurrentResourceId(resourceId);
      const folderName = targetFile.inode_path.path.split('/').pop() || 'Folder';
      setBreadcrumbs(prev => [...prev, { 
        name: folderName,
        path: targetFile.inode_path.path,
        resourceId
      }]);
    }
  };

  const handleBreadcrumbNavigate = (index: number) => {
    const targetBreadcrumb = breadcrumbs[index];
    setCurrentResourceId(targetBreadcrumb.resourceId);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const handleAction = () => {
    // TODO: Implement actual actions
  };

  // Handle batch knowledge base operations following Knowledge_Base_Workflow.ipynb
  const handleCreateKnowledgeBase = useCallback(async () => {
    const filesToIndex = getSelectedFiles();
    if (filesToIndex.length === 0) {
      alert('Please select at least one file to index');
      return;
    }
    
    await createKnowledgeBaseWithResources(selectedResources, (resourceIds, status) => {
      setMultipleFileStatuses(resourceIds, status);
    });
  }, [selectedResources, getSelectedFiles, createKnowledgeBaseWithResources, setMultipleFileStatuses]);

  const handleTriggerSync = useCallback(async () => {
    await triggerSync((resourceIds, status) => {
      setMultipleFileStatuses(resourceIds, status);
    });
    
    // Update all files in the knowledge base to 'synced' status
    // Since we don't track which specific files are in the KB, 
    // we'll update all files that are currently 'indexed'
    const fileResourceIds = files
      .filter(file => getFileStatus(file.resource_id) === 'indexed')
      .map(file => file.resource_id);
    
    if (fileResourceIds.length > 0) {
      setMultipleFileStatuses(fileResourceIds, 'synced');
    }
  }, [triggerSync, setMultipleFileStatuses, files, getFileStatus]);

  // Removed handleNewKnowledgeBase - no longer supporting multiple KBs

  const handleCancel = () => {
    setSelectedIds(new Set());
    if (onSelectionChange) {
      onSelectionChange([]);
    }
  };

  const handleSelect = () => {
    // TODO: Implement actual selection logic
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <FilePickerHeader />
      
      {/* File List Controls with Breadcrumbs */}
      <FileListControls
        allSelected={allSelected}
        someSelected={someSelected}
        onSelectAll={handleSelectAll}
        selectedCount={selectedResourceIds.size}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        breadcrumbs={breadcrumbs}
        onBreadcrumbNavigate={handleBreadcrumbNavigate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSortClick={() => {
          // Toggle between different sort states
          if (sortBy === 'name' && sortDirection === 'asc') {
            handleSort('date');
          } else if (sortBy === 'date' && sortDirection === 'asc') {
            setSortDirection('desc');
          } else {
            handleSort('name');
          }
        }}
        onFilterClick={() => {
          // This will be handled by the dropdown in FileListControls
        }}
        totalFiles={totalFiles}
        filteredFiles={filteredFiles}
        isSearchActive={isSearchActive}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        availableFileTypes={availableFileTypes}
        isTypeFilterActive={isTypeFilterActive}
      />
      
      {/* Status Messages - Only show at top when needed */}
      {knowledgeBaseError && (
        <div className="px-6 py-3 border-b bg-red-50">
          <p className="text-sm text-red-600">
            {knowledgeBaseError}
          </p>
        </div>
      )}
      {knowledgeBaseStatus === 'created' && (
        <div className="px-6 py-3 border-b bg-blue-50">
          <p className="text-sm text-blue-600">
            Files added to knowledge base. Click &ldquo;Sync&rdquo; in the footer to process them for search.
          </p>
        </div>
      )}
      {knowledgeBaseStatus === 'synced' && (
        <div className="px-6 py-3 border-b bg-green-50">
          <p className="text-sm text-green-600">
            Files synced successfully! Your files are now searchable.
          </p>
        </div>
      )}

      {/* File List or Grid */}
      <div className="flex-1 overflow-auto">
        {files.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium text-gray-900">No files available</h3>
              <p className="text-sm">
                Connect to a data source or navigate to a folder with files to get started.
              </p>
            </div>
          </div>
        )}
        {viewMode === 'list' ? (
          <FileList
            files={files}
            loading={isLoading}
            error={error}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            onNavigate={handleNavigate}
            onAction={handleAction}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
            isSearchActive={isSearchActive}
            searchQuery={debouncedSearchQuery}
            connectionId={connectionId}
            fileIndexingStatus={convertedFileStatuses}
            onIndexFile={async () => {}} // Batch mode - no individual actions
            onUnindexFile={async () => {}} // Batch mode - no individual actions
          />
        ) : (
          <FileGrid
            files={files}
            loading={isLoading}
            view={viewMode}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            onNavigate={handleNavigate}
            onAction={handleAction}
            connectionId={connectionId}
            fileIndexingStatus={convertedFileStatuses}
            onIndexFile={async () => {}} // Batch mode - no individual actions
            onUnindexFile={async () => {}} // Batch mode - no individual actions
          />
        )}
      </div>
      
      {/* Footer */}
      <FilePickerFooter
        selectedCount={selectedResourceIds.size}
        onCancel={handleCancel}
        knowledgeBaseStatus={knowledgeBaseStatus}
        onCreateKnowledgeBase={handleCreateKnowledgeBase}
        onTriggerSync={handleTriggerSync}
      />
    </div>
  );
} 