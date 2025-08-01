'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useKnowledgeBase, useKnowledgeBaseOperations } from '@/hooks/use-knowledge-base';
import { api } from '@/lib/api';
import { ensureAbsolutePath } from '@/lib/utils';
import { ANIMATION } from '@/lib/constants';
import type { Resource } from '@/lib/types';

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

  const { data: statusData, error } = useQuery<{ indexedFilePaths: string[] }>({
    queryKey: ['kb_resource_status', resource_id],
    
    queryFn: async (): Promise<{ indexedFilePaths: string[] }> => {
      const kb = await getOrCreateKB();
      const pollingPath = '/';
        
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
      // Find all files that are inside this folder
      const folderPath = ensureAbsolutePath(inode_path.path);
      const indexedFiles = statusData.indexedFilePaths.filter(path => 
        path.startsWith(folderPath) && path !== folderPath
      );
      const totalKnownFiles = indexedFiles.length;
      const processedFiles = indexedFiles.length;

      // For simplicity, assume job is done if we have indexed files
      const isJobDone = totalKnownFiles > 0;
      
              if (isJobDone) {
          const finalState = 'indexed-full';
          const folderName = inode_path.path.split('/').pop() || 'Unknown folder';
          
          if (finalState === 'indexed-full') {
            // Show success toast for fully indexed folder
            toast.success(`Folder "${folderName}" indexed successfully!`, {
              id: `indexing-${resource_id}`,
              description: `All ${indexedFiles.length} files are now searchable`,
              duration: 5000, // Show for 5 seconds
            });
          } else {
            // Show warning toast for partially indexed folder
            toast.warning(`Folder "${folderName}" partially indexed`, {
              id: `indexing-${resource_id}`,
              description: `${indexedFiles.length}/${totalKnownFiles} files indexed successfully`,
              duration: 5000, // Show for 5 seconds
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
      // Check if this file's path is in the indexed files list
      const filePath = ensureAbsolutePath(inode_path.path);
      const isIndexed = statusData.indexedFilePaths.includes(filePath);
      
              if (isIndexed) {
          console.log('🎉 File indexed successfully:', inode_path.path);
          const fileName = inode_path.path.split('/').pop() || 'Unknown file';
          
          // Show success toast
          toast.success(`"${fileName}" indexed successfully!`, {
            id: `indexing-${resource_id}`,
            description: 'File is now searchable in your knowledge base',
            duration: 5000, // Show for 5 seconds
          });
          
          updateResourceStatus(resource_id, { state: 'indexed' });
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