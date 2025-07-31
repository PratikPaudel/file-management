'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useKnowledgeBase, useKnowledgeBaseOperations } from '@/hooks/use-knowledge-base';
import { api } from '@/lib/api';
import { ensureAbsolutePath } from '@/lib/utils';
import { ANIMATION } from '@/lib/constants';
import type { Resource, ResourcesResponse } from '@/lib/types';

interface ResourceStatusPollerProps {
  resource: Resource;
  connectionId: string;
}

// This is an invisible component that handles the polling logic for a single resource.
export function ResourceStatusPoller({ resource, connectionId }: ResourceStatusPollerProps) {
  const { getOrCreateKB } = useKnowledgeBase(connectionId);
  const { updateResourceStatus } = useKnowledgeBaseOperations(connectionId);

  const { resource_id, inode_path, inode_type } = resource;
  const isFolder = inode_type === 'directory';

  const { data: statusData, error } = useQuery<ResourcesResponse>({
    queryKey: ['kb_resource_status', resource_id],
    
    queryFn: async (): Promise<ResourcesResponse> => {
      const kb = await getOrCreateKB();
      const absolutePath = ensureAbsolutePath(inode_path.path);
      
      // For folders, poll their own path. For files, poll the parent directory.
      const pollingPath = isFolder 
        ? absolutePath 
        : absolutePath.substring(0, absolutePath.lastIndexOf('/')) || '/';
        
      return api.getKnowledgeBaseStatus({
        knowledgeBaseId: kb.knowledge_base_id,
        resourcePath: pollingPath,
      });
    },

    // Polling will refetch every X seconds
    refetchInterval: ANIMATION.POLLING_INTERVAL,
    // Only enabled when this component is mounted (which happens when status is 'indexing')
    enabled: true, 
  });

  // Handle successful data updates
  useEffect(() => {
    if (!statusData) return;

    if (isFolder) {
      // --- Folder Logic ---
      const folderFiles = statusData.data.filter(file => 
        ensureAbsolutePath(file.inode_path.path).startsWith(ensureAbsolutePath(inode_path.path)) && file.inode_type === 'file'
      );
      const indexedFiles = folderFiles.filter(file => file.status === 'indexed');
      const failedFiles = folderFiles.filter(file => file.status === 'failed');
      const totalKnownFiles = folderFiles.length; // The total number of files the backend knows about so far
      const processedFiles = indexedFiles.length + failedFiles.length;

      // NOTE: We can't know the true "total" until the backend is done.
      // We can assume the job is "done" when every file the API returns has a final status.
      const isJobDone = totalKnownFiles > 0 && processedFiles === totalKnownFiles;
      
              if (isJobDone) {
          const finalState = failedFiles.length === 0 ? 'indexed-full' : 'indexed-partial';
          const folderName = resource.inode_path.path.split('/').pop() || 'Unknown folder';
          
          if (finalState === 'indexed-full') {
            // Show success toast for fully indexed folder
            toast.success(`Folder "${folderName}" indexed successfully!`, {
              id: `indexing-${resource_id}`,
              description: `All ${indexedFiles.length} files are now searchable`,
            });
          } else {
            // Show warning toast for partially indexed folder
            toast.warning(`Folder "${folderName}" partially indexed`, {
              id: `indexing-${resource_id}`,
              description: `${indexedFiles.length}/${totalKnownFiles} files indexed successfully`,
            });
          }
          
          updateResourceStatus(resource_id, {
            state: finalState,
            filesProcessed: indexedFiles.length,
            totalFiles: totalKnownFiles,
          });
        } else {
        // Still processing, just update the progress
        updateResourceStatus(resource_id, {
          state: 'indexing-folder',
          filesProcessed: processedFiles,
          totalFiles: undefined, // Total isn't known yet
        });
      }

    } else {
      // --- File Logic ---
      const fileStatus = statusData.data.find(file => file.resource_id === resource_id);
      
              if (fileStatus?.status === 'indexed') {
          console.log('🎉 File indexed successfully:', resource.inode_path.path);
          const fileName = resource.inode_path.path.split('/').pop() || 'Unknown file';
          
          // Show success toast
          toast.success(`"${fileName}" indexed successfully!`, {
            id: `indexing-${resource_id}`,
            description: 'File is now searchable in your knowledge base',
          });
          
          updateResourceStatus(resource_id, { state: 'indexed' });
        } else if (fileStatus?.status === 'failed') {
          console.log('❌ File indexing failed:', resource.inode_path.path);
          const fileName = resource.inode_path.path.split('/').pop() || 'Unknown file';
          
          // Show error toast
          toast.error(`Failed to index "${fileName}"`, {
            id: `indexing-${resource_id}`,
            description: 'Please try again or check the file format',
          });
          
          updateResourceStatus(resource_id, { state: 'failed', error: 'Indexing failed' });
        }
    }
  }, [statusData, isFolder, resource_id, inode_path.path, updateResourceStatus]);

  useEffect(() => {
    if (error) {
      console.error(`Polling failed for resource ${resource_id}:`, error);
      // On any query error, mark the resource as failed to stop polling.
      updateResourceStatus(resource_id, {
        state: 'failed',
        error: 'Polling failed',
      });
    }
  }, [error, resource_id, updateResourceStatus]);

  // This component renders nothing in the DOM
  return null;
}