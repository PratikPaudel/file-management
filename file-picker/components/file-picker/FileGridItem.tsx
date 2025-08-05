'use client';

import { Folder, FileText } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Resource, FileAction, IndexingStatus } from '@/lib/types';
import { SimpleIndexingBadge } from './SimpleIndexingBadge';
import { SimpleIndexingActions } from './SimpleIndexingActions';
import { cn } from '@/lib/utils';


interface FileGridItemProps {
  resource: Resource;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onNavigate: () => void;
  onAction: (action: FileAction) => void;
  indexingStatus: IndexingStatus;
  onUnindexFile: (file: Resource) => Promise<void>;
}

export function FileGridItem({
  resource,
  selected,
  onSelect,
  onNavigate,
  indexingStatus,
  onUnindexFile,
}: FileGridItemProps) {
  const isFolder = resource.inode_type === 'directory';
  const fileName = resource.inode_path.path.split('/').pop() || 'Untitled';




  // KB action handlers
  const handleDeindex = () => {
    onUnindexFile(resource);
  };

  const handleClick = () => {
    if (isFolder) {
      onNavigate();
    }
  };

  const getFileIcon = () => {
    if (isFolder) {
      return <Folder className="w-12 h-12 text-gray-900" />;
    }
    
    // PDF files get a red icon
    if (fileName.endsWith('.pdf')) {
      return <FileText className="w-12 h-12 text-red-500" />;
    }
    
    return <FileText className="w-12 h-12 text-gray-500" />;
  };

    return (
    <Card 
      className={cn(
        "group relative hover:bg-gray-100 transition-colors cursor-pointer",
        "h-32 w-full", // Taller for better grid layout
        selected && "bg-blue-50 hover:bg-blue-100 ring-2 ring-blue-500"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-3 flex flex-col items-center justify-center h-full space-y-2">
        {/* Checkbox - positioned at top-left */}
        <div className="absolute top-2 left-2">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4"
          />
        </div>
        
        {/* File Icon - centered */}
        <div className="flex-shrink-0">
          {getFileIcon()}
        </div>
        
        {/* File Name - bottom center */}
        <div className="w-full px-2">
          <p className="text-xs text-gray-900 truncate font-medium text-center">
            {fileName}
          </p>
        </div>
        
        {/* Knowledge Base Status - positioned at top-right */}
        <div className="absolute top-2 right-2">
          <SimpleIndexingBadge status={indexingStatus} />
        </div>
        
        {/* Knowledge Base Actions - shown on hover, positioned at bottom-right */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <SimpleIndexingActions
            status={indexingStatus}
            onUnindex={handleDeindex}
          />
        </div>
      </CardContent>
    </Card>
  );
} 