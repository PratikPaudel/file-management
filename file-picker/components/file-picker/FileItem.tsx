'use client';

import { Folder, File, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Resource, IndexingStatus, FileAction, ViewMode } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/file-picker/StatusBadge';

interface FileItemProps {
  resource: Resource;
  selected: boolean;
  indexingStatus: IndexingStatus;
  onSelect: (selected: boolean) => void;
  onNavigate: () => void;
  onAction: (action: FileAction) => void;
  view: ViewMode;
}

export function FileItem({
  resource,
  selected,
  indexingStatus,
  onSelect,
  onNavigate,
  onAction,
  view,
}: FileItemProps) {
  const isFolder = resource.inode_type === 'directory';
  const fileName = resource.inode_path.path.split('/').pop() || 'Untitled';

  const handleClick = () => {
    if (isFolder) {
      onNavigate();
    } else {
      onSelect(!selected);
    }
  };

  const handleDoubleClick = () => {
    if (isFolder) {
      onNavigate();
    }
  };

  return (
    <Card
      className={cn(
        'group relative transition-all duration-200 cursor-pointer hover:shadow-md',
        selected && 'ring-2 ring-blue-500 bg-blue-50',
        view === 'grid' ? 'aspect-square' : 'h-auto'
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <CardContent className={cn(
        'p-4',
        view === 'grid' ? 'flex flex-col h-full' : 'flex items-center space-x-3'
      )}>
        {/* Selection checkbox */}
        {!isFolder && (
          <div className="absolute top-2 right-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(!selected);
              }}
              className={cn(
                'w-5 h-5 p-0 rounded border-2 flex items-center justify-center transition-colors',
                selected
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-300 hover:border-blue-400'
              )}
            >
              {selected && <CheckCircle className="w-3 h-3" />}
            </Button>
          </div>
        )}

        {/* File/Folder Icon */}
        <div className={cn(
          'flex items-center justify-center text-gray-600',
          view === 'grid' ? 'flex-1' : 'flex-shrink-0'
        )}>
          {isFolder ? (
            <Folder className={cn('text-blue-500', view === 'grid' ? 'w-12 h-12' : 'w-6 h-6')} />
          ) : (
            <File className={cn('text-gray-500', view === 'grid' ? 'w-12 h-12' : 'w-6 h-6')} />
          )}
        </div>

        {/* File Info */}
        <div className={cn(
          'flex flex-col',
          view === 'grid' ? 'items-center text-center mt-2' : 'flex-1 min-w-0'
        )}>
          <p className={cn(
            'font-medium text-gray-900 truncate',
            view === 'grid' ? 'text-sm' : 'text-base'
          )}>
            {fileName}
          </p>
          
          {!isFolder && (
            <div className={cn(
              'flex items-center gap-2',
              view === 'grid' ? 'mt-1' : 'mt-0'
            )}>
              <StatusBadge status={indexingStatus} />
            </div>
          )}
        </div>

        {/* Actions */}
        {!isFolder && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 rounded-lg transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('import');
                }}
                className="text-xs"
              >
                Import
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 