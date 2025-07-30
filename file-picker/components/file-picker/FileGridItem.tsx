'use client';

import { Folder, FileText } from 'lucide-react';
import { Resource, FileAction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FileGridItemProps {
  resource: Resource;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onNavigate: () => void;
  onAction: (action: FileAction) => void;
}

export function FileGridItem({
  resource,
  selected,
  onSelect,
  onNavigate,
  onAction,
}: FileGridItemProps) {
  const isFolder = resource.inode_type === 'directory';
  const fileName = resource.inode_path.path.split('/').pop() || 'Untitled';

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
        
        {/* Import Button - shown on hover, positioned at bottom-right */}
        {!isFolder && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="outline"
              size="sm" 
              className="text-xs h-6 px-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onAction('import');
              }}
            >
              Import
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 