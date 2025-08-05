
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { FilePickerProps, ViewMode, Resource, SortDirection, IndexingStatus } from '@/lib/types';
import { useConnectionFiles } from '@/hooks/use-connection';
import { useKnowledgeBase } from '@/hooks/use-knowledge-base';
import { useDeindexResource } from '@/hooks/use-deindex-resource';
import { FilePickerHeader } from '@/components/file-picker/FilePickerHeader';
import { FileListControls } from '@/components/file-picker/FileListControls';
import { FileList } from '@/components/file-picker/FileList';
import { FileGrid } from '@/components/file-picker/FileGrid';
import { FilePickerFooter } from '@/components/file-picker/FilePickerFooter';
import { useBatchKnowledgeBase } from '@/hooks/use-batch-knowledge-base';
import { useResourceSelection } from '@/hooks/use-resource-selection';
import { toast } from '@/lib/toast';

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
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { name: 'My Drive', path: '/', resourceId: undefined }
  ]);
  const [showNoFilesError, setShowNoFilesError] = useState(false);

  // Handle error toast in useEffect to avoid render cycle issues
  useEffect(() => {
    if (showNoFilesError) {
      toast.error('Please select at least one file to index.');
      setShowNoFilesError(false);
    }
  }, [showNoFilesError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setTypeFilter('all');
  }, [currentResourceId]);

  const { data: filesData, isLoading, error } = useConnectionFiles({
    connectionId,
    resourceId: currentResourceId,
  });

  const { data: knowledgeBase } = useKnowledgeBase();
  const { mutate: deindexResource, isPending: isDeindexing } = useDeindexResource();

  const {
    status: knowledgeBaseStatus,
    error: knowledgeBaseError,
    addResourcesToKnowledgeBase,
  } = useBatchKnowledgeBase();

  const {
    selectedResourceIds,
    clearSelection,
    getSelectedFiles,
    selectMultiple,
  } = useResourceSelection();

  const getFileExtension = useCallback((fileName: string): string => {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : '';
  }, []);

  const matchesSearchQuery = useCallback((file: Resource, query: string): boolean => {
    const fileName = file.inode_path.path.split('/').pop() || '';
    const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
    if (searchTerms.length === 0) return true;
    return searchTerms.every(term => {
      const lowerFileName = fileName.toLowerCase();
      return lowerFileName.includes(term);
    });
  }, []);

  const files = useMemo(() => {
    const rawFiles = filesData?.data || [];
    let filtered = [...rawFiles];
    
    if (debouncedSearchQuery.trim()) {
      filtered = filtered.filter(file => matchesSearchQuery(file, debouncedSearchQuery));
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(file => {
        if (typeFilter === 'folders') {
          return file.inode_type === 'directory';
        } else if (typeFilter === 'files') {
          return file.inode_type === 'file';
        } else {
          return file.inode_type === 'file' && getFileExtension(file.inode_path.path.split('/').pop() || '') === typeFilter;
        }
      });
    }
    
    filtered.sort((a, b) => {
      if (a.inode_type !== b.inode_type) {
        return a.inode_type === 'directory' ? -1 : 1;
      }
      
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
        const aName = a.inode_path.path.split('/').pop()?.toLowerCase() || '';
        const bName = b.inode_path.path.split('/').pop()?.toLowerCase() || '';
        return aName.localeCompare(bName);
      }
    });
    
    return filtered;
  }, [filesData?.data, debouncedSearchQuery, typeFilter, sortBy, sortDirection, matchesSearchQuery, getFileExtension]);

  const fileIndexingStatus = useMemo(() => {
    const indexedIds = new Set(knowledgeBase?.connection_source_ids || []);
    const statusMap = new Map<string, IndexingStatus>();
    files.forEach(file => {
      if (file.inode_type === 'file') {
        const status: IndexingStatus = indexedIds.has(file.resource_id) ? 'indexed' : 'not-indexed';
        statusMap.set(file.resource_id, status);
      }
    });
    return statusMap;
  }, [files, knowledgeBase]);

  const handleDeindex = useCallback(async (resource: Resource) => {
    deindexResource(resource.resource_id);
  }, [deindexResource]);

  const totalFiles = filesData?.data?.length || 0;
  const filteredFiles = files.length;
  const isSearchActive = debouncedSearchQuery.trim().length > 0;
  const isTypeFilterActive = typeFilter !== 'all';

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

  const allSelected = files.length > 0 && selectedIds.size === files.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < files.length;

  const handleSort = (column: string) => {
    if (sortBy === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortBy('name');
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
    
    const selectedFiles = files.filter(file => newSelectedIds.has(file.resource_id));
    
    // Use selectMultiple instead of forEach loop
    selectMultiple(selectedFiles);
    
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

  const handleAddResources = useCallback(async () => {
    const filesToIndex = getSelectedFiles().filter(file => file.inode_type === 'file');
    if (filesToIndex.length === 0) {
      setShowNoFilesError(true);
      return;
    }
    
    await addResourcesToKnowledgeBase(filesToIndex);
    clearSelection();
    setSelectedIds(new Set());
  }, [getSelectedFiles, addResourcesToKnowledgeBase, clearSelection]);

  const handleCancel = () => {
    setSelectedIds(new Set());
    if (onSelectionChange) {
      onSelectionChange([]);
    }
    clearSelection();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <FilePickerHeader />
      
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
        onSortClick={() => handleSort(sortBy === 'name' ? 'date' : 'name')}
        onFilterClick={() => {}}
        totalFiles={totalFiles}
        filteredFiles={filteredFiles}
        isSearchActive={isSearchActive}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        availableFileTypes={availableFileTypes}
        isTypeFilterActive={isTypeFilterActive}
      />
      
      {knowledgeBaseError && (
        <div className="px-6 py-3 border-b bg-red-50">
          <p className="text-sm text-red-600">
            {knowledgeBaseError}
          </p>
        </div>
      )}

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
            loading={isLoading || isDeindexing}
            error={error}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            onNavigate={handleNavigate}
            onAction={() => {}}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
            isSearchActive={isSearchActive}
            searchQuery={debouncedSearchQuery}
            fileIndexingStatus={fileIndexingStatus}
            onUnindexFile={handleDeindex}
          />
        ) : (
          <FileGrid
            files={files}
            loading={isLoading || isDeindexing}
            view={viewMode}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            onNavigate={handleNavigate}
            onAction={() => {}}
            fileIndexingStatus={fileIndexingStatus}
            onUnindexFile={handleDeindex}
                    />
        )}
      </div>
      
      <FilePickerFooter
        selectedCount={selectedResourceIds.size}
        onCancel={handleCancel}
        onAddResources={handleAddResources}
        isLoading={knowledgeBaseStatus === 'adding'}
      />
    </div>
  );
}
