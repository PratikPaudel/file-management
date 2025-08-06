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
import { FileText, Folder, Trash2, Search, Database, HardDrive } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { useDeindexResource } from '@/hooks/use-deindex-resource';

// API fetcher function
async function getIndexedResources(): Promise<Array<{
  resource_id: string;
  inode_type: string;
  inode_path: { path: string };
  size?: number;
  status?: string;
  created_at?: string;
  modified_at?: string;
}>> {
  // Use the dedicated API endpoint which handles server-side authentication
  const response = await fetch('/api/knowledge-base/indexed-resources');
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to fetch indexed resources.');
  }
  return response.json();
}

// Helper function to format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}



// Helper function to get file extension
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(lastDot + 1).toUpperCase() : '';
}

interface KnowledgeBaseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function KnowledgeBaseDialog({ isOpen, onOpenChange }: KnowledgeBaseDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: resources, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['indexed-resources'],
    queryFn: getIndexedResources,
    enabled: isOpen, // Only fetch when the dialog is open
    staleTime: 5 * 1000, // 5 seconds - very short to catch sync updates quickly
    refetchInterval: isOpen ? 5000 : false, // Auto-refresh every 5 seconds when open
    refetchIntervalInBackground: false, // Only refetch when dialog is focused
  });

  // Fetch knowledge base details to get authoritative indexed IDs
  const { data: knowledgeBase, isFetching: isKbFetching } = useQuery({
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
    staleTime: 5 * 1000, // 5 seconds - very short to catch sync updates quickly
    refetchInterval: isOpen ? 5000 : false, // Auto-refresh every 5 seconds when open
    refetchIntervalInBackground: false, // Only refetch when dialog is focused
  });

  const { mutate: deindexResource } = useDeindexResource();

  // --- NEW: Handle de-indexing with confirmation ---
  const handleDeindexClick = (resource: { resource_id: string; inode_type: string; inode_path: { path: string } }) => {
    const isFolder = resource.inode_type === 'directory';
    const name = resource.inode_path.path.split('/').pop() || 'this item';
    
    const message = isFolder 
      ? `Are you sure you want to de-index the entire "${name}" folder and all its contents? This action cannot be undone.`
      : `Are you sure you want to de-index the file "${name}"?`;

    if (window.confirm(message)) {
      deindexResource(resource.resource_id);
    }
  };

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
    // Also search in the directory path for better filtering
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
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[80vw] h-[85vh] flex flex-col">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-6 h-6 text-blue-600" />
            <DialogTitle className="text-2xl font-semibold text-gray-900">
              Knowledge Base Resources
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600">
            Manage all files and folders currently indexed in your knowledge base. Folders show their full path for context.
          </DialogDescription>
          
          {/* Sync Status Indicator */}
          {syncStatus && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-800 font-medium">
                  Sync Status: {syncStatus.totalAvailable} of {syncStatus.totalQueued} resources available
                </span>
                <div className="flex items-center gap-2 text-blue-600">
                  {(syncStatus.isSyncing || isFetching || isKbFetching) && (
                    <>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span>
                        {syncStatus.isSyncing ? 'Indexing in progress...' : 'Checking for updates...'}
                      </span>
                    </>
                  )}
                </div>
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

        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
          {isLoading && (
            <div className="p-4">
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
            </div>
          )}

          {isError && (
            <Alert variant="destructive" className="m-4">
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
            <div className={isFetching || isKbFetching ? 'opacity-75 transition-opacity' : ''}>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Name</TableHead>
                  <TableHead className="w-[15%]">Type</TableHead>
                  <TableHead className="w-[15%]">Size</TableHead>
                  <TableHead className="w-[20%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.map((resource: { 
                  resource_id: string; 
                  inode_type: string; 
                  inode_path: { path: string }; 
                  size?: number; 
                  status?: string;
                  created_at?: string;
                  modified_at?: string;
                }) => {
                  const isFolder = resource.inode_type === 'directory';
                  const fullPath = resource.inode_path.path;
                  const fileName = fullPath.split('/').pop() || 'Untitled';
                  const directory = fullPath.includes('/') ? fullPath.substring(0, fullPath.lastIndexOf('/')) : '';
                  const Icon = isFolder ? Folder : FileText;
                  
                  return (
                    <TableRow key={resource.resource_id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Icon className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {fileName}
                            </span>
                            {directory && (
                              <span className="text-xs text-gray-500 truncate flex items-center gap-1">
                                <Folder className="w-3 h-3" />
                                {directory}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isFolder ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              Folder
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-600">
                              {getFileExtension(fileName)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <HardDrive className="w-3 h-3" />
                          {formatFileSize(resource.size)}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        {/* --- NEW: Use the de-index handler with confirmation --- */}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeindexClick(resource)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 