'use client';

import { Folder, FileText } from 'lucide-react';
import { Resource, FileAction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { IndexingStatus } from '@/hooks/use-file-indexing';
import { SimpleIndexingBadge } from './SimpleIndexingBadge';
import { SimpleIndexingActions } from './SimpleIndexingActions';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const getFileIcon = (resource: Resource) => {
  const isFolder = resource.inode_type === 'directory';
  const fileName = resource.inode_path.path.split('/').pop() || 'Untitled';

  if (isFolder) {
    return <Folder className="w-5 h-5 text-gray-900" />;
  }

  if (fileName.endsWith('.pdf')) {
    return <FileText className="w-5 h-5 text-red-500" />;
  }

  return <FileText className="w-5 h-5 text-gray-500" />;
};

interface FileListItemProps {
  resource: Resource;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onNavigate: () => void;
  onAction: (action: FileAction) => void;
  connectionId: string;
  indexingStatus: IndexingStatus;
  onIndexFile: (file: Resource) => Promise<void>;
  onUnindexFile: (file: Resource) => Promise<void>;
}

export function FileListItem({
  resource,
  selected,
  onSelect,
  onNavigate,
  onAction,
  connectionId,
  indexingStatus,
  onIndexFile,
  onUnindexFile,
}: FileListItemProps) {
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  
  const isFolder = resource.inode_type === 'directory';
  const fileName = resource.inode_path.path.split('/').pop() || 'Untitled';

  // KB action handlers
  const handleIndex = () => {
    onIndexFile(resource);
  };

  const handleDeindex = () => {
    onUnindexFile(resource);
  };

  const handleRetry = () => {
    onIndexFile(resource);
  };
  
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const [isActive, setIsActive] = useState(false);

  const handleItemClick = () => {
    if (!isFolder) return;

    if (clickTimer) {
      clearTimeout(clickTimer);
      setClickTimer(null);
      // Double click
      setIsActive(true);
      setTimeout(() => onNavigate(), 150); // Navigate after a short delay for animation
      setTimeout(() => setIsActive(false), 300); // Reset animation state
    } else {
      // Single click
      const timer = setTimeout(() => {
        onSelect(!selected);
        setClickTimer(null);
      }, 250);
      setClickTimer(timer);
    }
  };

  return (
    <div
      className={cn(
        'relative transform transition-transform duration-150',
        isActive && 'scale-[0.98]'
      )}
      onMouseDown={(e) => {
        if (isFolder) e.preventDefault();
      }}
    >
      {/* Full-width background for hover/selected states */}
      <div
        className={cn(
          'absolute inset-0 transition-colors',
          'hover:bg-gray-100',
          selected && 'bg-blue-50 hover:bg-blue-100'
        )}
      />

      {/* Content with table layout */}
      <div
        className={cn(
          'relative flex items-center space-x-4 py-3 px-6 transition-colors',
          'border-b border-gray-100 last:border-b-0',
          'select-none'
        )}
      >
        {/* Checkbox */}
        <div className="w-4 flex justify-center">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            className="w-4 h-4"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        
        {/* File Icon */}
        <div className="w-5 flex justify-center">
          {getFileIcon(resource)}
        </div>
        
        {/* File Name */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={handleItemClick}
        >
          <p className="text-sm text-gray-900 truncate font-medium">
            {fileName}
          </p>
        </div>
        
        {/* Date Modified */}
        <div className="w-32">
          <p className="text-sm text-gray-500">
            {formatDate(resource.modified_at)}
          </p>
        </div>
        
        {/* Knowledge Base Status and Actions */}
        <div className="w-40 flex items-center justify-end gap-2">
          <SimpleIndexingBadge status={indexingStatus} />
          <SimpleIndexingActions
            resource={resource}
            status={indexingStatus}
            onIndex={handleIndex}
            onUnindex={handleDeindex}
            onRetry={handleRetry}
          />
        </div>
      </div>
    </div>
  );
} 