'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Folder, Trash2 } from 'lucide-react';
import type { Resource } from '@/lib/types';
import { Button } from '../ui/button';
import { useDeindexResource } from '@/hooks/use-deindex-resource';

// API fetcher function
async function getIndexedResources(): Promise<any[]> {
  // Use the dedicated API endpoint which handles server-side authentication
  const response = await fetch('/api/knowledge-base/indexed-resources');
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch indexed resources.');
  }
  return response.json();
}

// A single item in the list
function IndexedFileItem({ resource, onDeindex }: { resource: any; onDeindex: (resourceId: string) => void; }) {
  const isFolder = resource.inode_type === 'directory';
  const fullPath = resource.inode_path.path;
  const fileName = fullPath.split('/').pop() || 'Untitled';
  const directory = fullPath.includes('/') ? fullPath.substring(0, fullPath.lastIndexOf('/')) : '';
  const Icon = isFolder ? Folder : FileText;
  
  // Check multiple possible status indicators
  const isIndexed = resource.status === 'indexed' || 
                   (resource.indexed_at !== null && resource.indexed_at !== undefined);

  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium text-gray-800 truncate">{fileName}</span>
          {directory && (
            <span className="text-xs text-blue-600 font-medium truncate">{directory}/</span>
          )}
          {resource.size && (
            <span className="text-xs text-gray-400">
              {Math.round(resource.size / 1024)} KB
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isIndexed && resource.status === 'indexed' && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            Indexed
          </span>
        )}
        {isIndexed && resource.status === 'error' && (
          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
            Indexed (Error)
          </span>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDeindex(resource.resource_id)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          De-index
        </Button>
      </div>
    </div>
  );
}

interface KnowledgeBaseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function KnowledgeBaseDialog({ isOpen, onOpenChange }: KnowledgeBaseDialogProps) {
  const { data: resources, isLoading, isError, error } = useQuery({
    queryKey: ['indexed-resources'],
    queryFn: getIndexedResources,
    enabled: isOpen, // Only fetch when the dialog is open
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { mutate: deindexResource } = useDeindexResource();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Knowledge Base Resources</DialogTitle>
          <DialogDescription>
            This is a complete list of all files and folders currently indexed in your knowledge base.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-4 border-t pt-4">
          {isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="w-6 h-6 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Error: {error.message}
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && resources?.length === 0 && (
            <div className="text-center text-gray-500 py-16">
              <p className="font-medium">No Resources Indexed</p>
              <p className="text-sm mt-1">Your knowledge base is empty. Add files to get started.</p>
            </div>
          )}

          {!isLoading && !isError && resources && resources.length > 0 && (
            <div className="space-y-1">
              {resources.map((resource) => (
                <IndexedFileItem key={resource.resource_id} resource={resource} onDeindex={deindexResource} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 