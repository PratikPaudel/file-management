'use client';

import { Check, AlertTriangle, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KnowledgeBaseItemStatus } from '@/lib/types';

interface IndexStatusBadgeProps {
  status: KnowledgeBaseItemStatus;
  className?: string;
}

export function IndexStatusBadge({ status, className }: IndexStatusBadgeProps) {
  const getStatusDisplay = () => {
    switch (status.state) {
      case 'pristine':
        return null; // No badge for pristine state
        
      case 'indexing':
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          text: 'Indexing...',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
        
      case 'indexing-folder':
        const processed = status.filesProcessed || 0;
        const total = status.totalFiles;
        const progressText = total ? ` (${processed} files processed)` : '';
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          text: `Indexing folder...${progressText}`,
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
        
      case 'indexed':
        return {
          icon: <Check className="w-3 h-3" />,
          text: 'Indexed',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
        
      case 'indexed-full':
        const fullText = status.totalFiles 
          ? `Indexed (${status.totalFiles}/${status.totalFiles} files)`
          : 'Indexed';
        return {
          icon: <Check className="w-3 h-3" />,
          text: fullText,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
        
      case 'indexed-partial':
        const indexedCount = status.filesProcessed || 0;
        const totalCount = status.totalFiles || 0;
        return {
          icon: <AlertTriangle className="w-3 h-3" />,
          text: `Partially indexed (${indexedCount}/${totalCount} files)`,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
        
      case 'failed':
        return {
          icon: <X className="w-3 h-3" />,
          text: 'Failed',
          className: 'bg-red-100 text-red-800 border-red-200'
        };
        
      case 'deindexing':
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          text: 'De-indexing...',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        
      default:
        return null;
    }
  };

  const display = getStatusDisplay();
  
  if (!display) {
    return null;
  }

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium',
      display.className,
      className
    )}>
      {display.icon}
      <span>{display.text}</span>
    </div>
  );
}