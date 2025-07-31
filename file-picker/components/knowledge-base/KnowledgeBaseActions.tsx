'use client';

import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { KnowledgeBaseItemStatus, Resource } from '@/lib/types';

interface KnowledgeBaseActionsProps {
  resource: Resource;
  status: KnowledgeBaseItemStatus;
  onIndex: (resource: Resource) => void;
  onDeindex: (resource: Resource) => void;
  onRetry: (resource: Resource) => void;
  className?: string;
}

export function KnowledgeBaseActions({
  resource,
  status,
  onIndex,
  onDeindex,
  onRetry,
  className
}: KnowledgeBaseActionsProps) {
  const isFolder = resource.inode_type === 'directory';
  const fileName = resource.inode_path.path.split('/').pop() || 'Untitled';

  const handleDeindex = () => {
    const confirmMessage = isFolder 
      ? `Are you sure you want to de-index the entire "${fileName}" folder? This will remove all files in this folder from your knowledge base.`
      : `Are you sure you want to remove "${fileName}" from your knowledge base? This action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      onDeindex(resource);
    }
  };

  const getActionButton = () => {
    switch (status.state) {
      case 'pristine':
        return (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 px-3 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"
            onClick={() => onIndex(resource)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Index
          </Button>
        );

      case 'failed':
        return (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 px-3 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
            onClick={() => onRetry(resource)}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        );

      case 'indexed':
      case 'indexed-full':
      case 'indexed-partial':
        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
            onClick={handleDeindex}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        );

      case 'indexing':
      case 'indexing-folder':
      case 'deindexing':
        // No action button during operations
        return null;

      default:
        return null;
    }
  };

  const actionButton = getActionButton();

  return (
    <div className={cn('flex justify-end', className)}>
      {actionButton}
    </div>
  );
}