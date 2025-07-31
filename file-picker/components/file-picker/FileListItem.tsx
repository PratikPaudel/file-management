'use client';

import { Folder, FileText } from 'lucide-react';
import { Resource, FileAction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { IndexStatusBadge } from '@/components/knowledge-base/IndexStatusBadge';
import { KnowledgeBaseActions } from '@/components/knowledge-base/KnowledgeBaseActions';
import { useKnowledgeBaseOperations } from '@/hooks/use-knowledge-base';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ResourceStatusPoller } from '@/components/knowledge-base/ResourceStatusPoller';

interface FileListItemProps {
  resource: Resource;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onNavigate: () => void;
  onAction: (action: FileAction) => void;
  connectionId: string;
}

export function FileListItem({
  resource,
  selected,
  onSelect,
  onNavigate,
  onAction,
  connectionId,
}: FileListItemProps) {
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Knowledge Base operations
  const {
    indexResource,
    deindexResource,
    getResourceStatus,
  } = useKnowledgeBaseOperations(connectionId);
  
  const kbStatus = getResourceStatus(resource.resource_id);
  const isPolling = kbStatus.state === 'indexing' || kbStatus.state === 'indexing-folder';
  const isFolder = resource.inode_type === 'directory';
  const fileName = resource.inode_path.path.split('/').pop() || 'Untitled';

  // KB action handlers
  const handleIndex = () => {
    indexResource(resource);
  };

  const handleDeindex = () => {
    deindexResource(resource);
  };

  const handleRetry = () => {
    indexResource(resource);
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

  const handleItemClick = () => {
    if (!isFolder) return;
    
    setClickCount(prev => prev + 1);
    
    if (clickTimer) {
      clearTimeout(clickTimer);
    }
    
    const timer = setTimeout(() => {
      if (clickCount === 0) {
        // Single click - select folder
        onSelect(!selected);
      } else if (clickCount === 1) {
        // Double click - navigate into folder
        onNavigate();
      }
      setClickCount(0);
    }, 300);
    
    setClickTimer(timer);
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
    <>
          {isPolling && <ResourceStatusPoller resource={resource} connectionId={connectionId} />}
    <div className="relative">
      {/* Full-width background for hover/selected states */}
      <div 
        className={cn(
          "absolute inset-0 transition-colors",
          "hover:bg-gray-100",
          selected && "bg-blue-50 hover:bg-blue-100"
        )}
      />
      
      {/* Content with table layout */}
      <div 
        className={cn(
          "relative flex items-center space-x-4 py-3 px-6 transition-colors",
          "border-b border-gray-100 last:border-b-0"
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
          <IndexStatusBadge status={kbStatus} />
          <KnowledgeBaseActions
            resource={resource}
            status={kbStatus}
            onIndex={handleIndex}
            onDeindex={handleDeindex}
            onRetry={handleRetry}
          />
        </div>
      </div>
    </div>
    </>
  );
} 