'use client';

import { Resource, FileAction } from '@/lib/types';
import { IndexingStatus } from '@/hooks/use-file-indexing';
import { FileGridItem } from './FileGridItem';
import { Skeleton } from '@/components/ui/skeleton';

interface FileGridProps {
  files: Resource[];
  loading: boolean;
  view?: 'grid' | 'list';
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onNavigate: (resourceId: string) => void;
  onAction: (action: FileAction) => void;
  fileIndexingStatus: Map<string, IndexingStatus>;
  onUnindexFile: (file: Resource) => Promise<void>;
}

export function FileGrid({
  files,
  loading,
  selectedIds,
  onSelectionChange,
  onNavigate,
  onAction,
  fileIndexingStatus,
  onUnindexFile,
}: FileGridProps) {
  const handleSelection = (resourceId: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(resourceId);
    } else {
      newSelected.delete(resourceId);
    }
    onSelectionChange(newSelected);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">No files found</p>
          <p className="text-sm mt-1">This folder is empty or no files match your search.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-6 gap-4">
        {files.map((file) => (
          <FileGridItem
            key={file.resource_id}
            resource={file}
            selected={selectedIds.has(file.resource_id)}
            onSelect={(selected) => handleSelection(file.resource_id, selected)}
            onNavigate={() => onNavigate(file.resource_id)}
            onAction={(action) => onAction(action)}
            indexingStatus={fileIndexingStatus.get(file.resource_id) || 'not_indexed'}
            onUnindexFile={onUnindexFile}
          />
        ))}
      </div>
    </div>
  );
} 