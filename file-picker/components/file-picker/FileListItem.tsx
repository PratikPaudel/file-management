'use client';

import { Folder, FileText } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Resource, FileAction, IndexingStatus } from '@/lib/types';
import { SimpleIndexingBadge } from './SimpleIndexingBadge';
import { SimpleIndexingActions } from './SimpleIndexingActions';
import { cn } from '@/lib/utils';
import { useState } from 'react';


interface FileListItemProps {
  resource: Resource;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onNavigate: () => void;
  onAction: (action: FileAction) => void;
  indexingStatus: IndexingStatus;
  onUnindexFile: (file: Resource) => Promise<void>;
}

export function FileListItem({
  resource,
  selected,
  onSelect,
  onNavigate,
  indexingStatus,
  onUnindexFile,
}: FileListItemProps) {
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  

  const isFolder = resource.inode_type === 'directory';
  const fileName = resource.inode_path.path.split('/').pop() || 'Untitled';

  // KB action handlers
  const handleDeindex = () => {
    onUnindexFile(resource);
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

  const getFileIcon = () => {
    if (isFolder) {
      return <Folder className="w-5 h-5 text-gray-900" />;
    }
    
    // PDF files get a red icon
    if (fileName.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className={cn(
        "relative group",
        "hover:scale-[1.001] transition-transform duration-150",
        isActive && "scale-[0.98]"
      )}>
      {/* Full-width background for hover/selected states */}
      <div
        className={cn(
          "absolute inset-0",
          "transition-all duration-150",
          "hover:bg-gray-100/80 group-hover:shadow-sm",
          selected && "bg-blue-50 hover:bg-blue-100/90"
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
          {getFileIcon()}
        </div>
        
        {/* File Name */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={handleItemClick}
        >
          <p className="text-sm text-gray-900 truncate font-medium group-hover:text-gray-700">
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
            status={indexingStatus}
            onUnindex={handleDeindex}
          />
        </div>
      </div>
    </div>
  );
} 