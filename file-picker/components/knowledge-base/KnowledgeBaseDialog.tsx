'use client';

import { useState, useMemo } from 'react';
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
import { FileText, Folder, Trash2, Search, Database } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useDeindexResource } from '@/hooks/use-deindex-resource';

// API fetcher function
async function getIndexedResources(): Promise<Array<{
  resource_id: string;
  inode_type: string;
  inode_path: { path: string };
  size?: number;
  status?: string;
}>> {
  // Use the dedicated API endpoint which handles server-side authentication
  const response = await fetch('/api/knowledge-base/indexed-resources');
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch indexed resources.');
  }
  return response.json();
}

// A single item in the list
function IndexedFileItem({ 
  resource, 
  onDeindex, 
  indexedResourceIds 
}: { 
  resource: { 
    resource_id: string; 
    inode_type: string; 
    inode_path: { path: string }; 
    size?: number; 
    status?: string; 
  }; 
  onDeindex: (resourceId: string) => void;
  indexedResourceIds: Set<string>;
}) {
  const isFolder = resource.inode_type === 'directory';
  const fullPath = resource.inode_path.path;
  const fileName = fullPath.split('/').pop() || 'Untitled';
  const directory = fullPath.includes('/') ? fullPath.substring(0, fullPath.lastIndexOf('/')) : '';
  const Icon = isFolder ? Folder : FileText;
  
  // Use the same logic as the main file picker - check if resource_id is in the authoritative list
  const isIndexed = indexedResourceIds.has(resource.resource_id);

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors duration-200">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-semibold text-gray-900 truncate">{fileName}</span>
          {directory && (
            <span className="text-xs text-blue-600 font-medium truncate flex items-center gap-1">
              <Folder className="w-3 h-3" />
              {directory}
            </span>
          )}
          {resource.size && (
            <span className="text-xs text-gray-500 mt-1">
              {Math.round(resource.size / 1024)} KB
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {isIndexed && (
          <span className="text-xs text-green-700 bg-green-100 px-3 py-1 rounded-full font-medium">
            Available
          </span>
        )}
        {resource.status === 'error' && (
          <span className="text-xs text-orange-700 bg-orange-100 px-3 py-1 rounded-full font-medium">
            Error
          </span>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300"
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
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: resources, isLoading, isError, error } = useQuery({
    queryKey: ['indexed-resources'],
    queryFn: getIndexedResources,
    enabled: isOpen, // Only fetch when the dialog is open
    staleTime: 30 * 1000, // 30 seconds - shorter to catch sync updates
    refetchInterval: isOpen ? 10000 : false, // Auto-refresh every 10 seconds when open
  });

  // Fetch knowledge base details to get authoritative indexed IDs
  const { data: knowledgeBase } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: async () => {
      const response = await fetch('/api/knowledge-bases');
      if (!response.ok) {
        throw new Error('Failed to fetch knowledge base details');
      }
      const data = await response.json();
      return data[0]; // Assuming we have one knowledge base
    },
    enabled: isOpen,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: isOpen ? 10000 : false, // Auto-refresh every 10 seconds when open
  });

  const { mutate: deindexResource } = useDeindexResource();

  // Create a Set of indexed resource IDs for efficient lookup
  const indexedResourceIds = useMemo(() => {
    return new Set((knowledgeBase?.connection_source_ids || []) as string[]);
  }, [knowledgeBase]);

  // Calculate sync status
  const syncStatus = useMemo(() => {
    if (!knowledgeBase || !resources) return null;
    
    const totalQueued = knowledgeBase.connection_source_ids?.length || 0;
    const totalAvailable = resources.length;
    const pendingCount = totalQueued - totalAvailable;
    
    return {
      totalQueued,
      totalAvailable,
      pendingCount,
      isSyncing: pendingCount > 0
    };
  }, [knowledgeBase, resources]);

  // Filter resources based on search query
  const filteredResources = useMemo(() => {
    if (!resources || !searchQuery.trim()) return resources;
    
    const query = searchQuery.toLowerCase();
    return resources.filter((resource: { inode_path: { path: string } }) => {
      const fileName = resource.inode_path.path.toLowerCase();
      const directory = resource.inode_path.path.includes('/') 
        ? resource.inode_path.path.substring(0, resource.inode_path.path.lastIndexOf('/')).toLowerCase()
        : '';
      
      return fileName.includes(query) || directory.includes(query);
    });
  }, [resources, searchQuery]);



  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-6 h-6 text-blue-600" />
            <DialogTitle className="text-2xl font-semibold text-gray-900">
              Knowledge Base Resources
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600">
            Manage all files and folders currently indexed in your knowledge base.
          </DialogDescription>
          
          {/* Sync Status Indicator */}
          {syncStatus && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-800 font-medium">
                  Sync Status: {syncStatus.totalAvailable} of {syncStatus.totalQueued} resources available
                </span>
                {syncStatus.isSyncing && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <span>Indexing in progress...</span>
                  </div>
                )}
              </div>
              {syncStatus.pendingCount > 0 && (
                <div className="mt-1 text-xs text-blue-600">
                  {syncStatus.pendingCount} resource(s) queued for indexing
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Results Count */}
        {!isLoading && !isError && resources && (
          <div className="text-sm text-gray-500 mb-3 px-1">
            {filteredResources?.length || 0} of {resources.length} available resources
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 -mr-4 border-t border-gray-200 pt-4">
          {isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
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
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                Error: {error.message}
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && filteredResources?.length === 0 && (
            <div className="text-center text-gray-500 py-16">
              {searchQuery ? (
                <>
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="font-medium text-lg">No matching resources</p>
                  <p className="text-sm mt-1">Try adjusting your search terms.</p>
                </>
              ) : (
                <>
                  <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="font-medium text-lg">No Resources Available</p>
                  <p className="text-sm mt-1">
                    {syncStatus?.isSyncing 
                      ? 'Resources are being indexed. Check back in a moment.'
                      : 'Your knowledge base is empty. Add files to get started.'
                    }
                  </p>
                </>
              )}
            </div>
          )}

          {!isLoading && !isError && filteredResources && filteredResources.length > 0 && (
            <div className="space-y-2">
              {filteredResources.map((resource: { 
                resource_id: string; 
                inode_type: string; 
                inode_path: { path: string }; 
                size?: number; 
                status?: string; 
              }) => (
                <IndexedFileItem 
                  key={resource.resource_id} 
                  resource={resource} 
                  onDeindex={deindexResource}
                  indexedResourceIds={indexedResourceIds}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 