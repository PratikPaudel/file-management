'use client';

import { Folder, FileText } from 'lucide-react';
import { Resource, FileAction } from '@/lib/types';
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

  connectionId,
}: FileListItemProps) {
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
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
        // Double click - navigate into folder and trigger animation
        setIsAnimating(true);
        // Reset animation state after animation completes
        setTimeout(() => setIsAnimating(false), 150);
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
    <div className={cn(
        "relative group",
        "hover:scale-[1.001] transition-transform duration-150",
        isAnimating && "animate-scale-click"
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