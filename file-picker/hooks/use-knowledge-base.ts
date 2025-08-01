import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { QUERY_KEYS, ANIMATION } from '@/lib/constants';
import type { 
  KnowledgeBase, 
  CreateKnowledgeBaseParams,
  IndexResourceParams,
  DeindexResourceParams,
  KnowledgeBaseItemStatus,
  KnowledgeBaseUIState,
  Resource
} from '@/lib/types';

// Hook to get or create the single KB for a connection
export function useKnowledgeBase(connectionId: string) {
  const queryClient = useQueryClient();

  // Get existing KBs
  const { data: knowledgeBases, isLoading: isLoadingKBs } = useQuery({
    queryKey: QUERY_KEYS.knowledgeBases,
    queryFn: api.getKnowledgeBases,
    enabled: !!connectionId,
  });

  // Get user profile for email-based naming
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: api.getUserProfile,
    enabled: !!connectionId,
  });

  // Get org info for KB creation
  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: api.getCurrentOrganization,
    enabled: !!connectionId,
  });

  // Find existing KB for this connection
  const existingKB = knowledgeBases?.find(kb => kb.connection_id === connectionId);

  // Create KB mutation
  const createKBMutation = useMutation({
    mutationFn: (params: CreateKnowledgeBaseParams) => api.createKnowledgeBase(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.knowledgeBases });
    }
  });

  // Get or create KB
  const getOrCreateKB = useCallback(async (): Promise<KnowledgeBase> => {
    if (existingKB) {
      return existingKB;
    }

    if (!userProfile?.email || !orgData?.org_id) {
      throw new Error('Missing user profile or organization data');
    }

    // Create new KB with email-based naming
    const kbParams: CreateKnowledgeBaseParams = {
      connection_id: connectionId,
      connection_source_ids: [], // Start empty, resources added on first index
      name: `${userProfile.email}'s Knowledge Base`,
      description: `Knowledge base for ${userProfile.email}'s Google Drive files`,
      indexing_params: {
        ocr: false,
        unstructured: true,
        embedding_params: {
          embedding_model: "text-embedding-ada-002",
          api_key: null
        },
        chunker_params: {
          chunk_size: 1500,
          chunk_overlap: 500,
          chunker: "sentence"
        }
      },
      org_level_role: null,
      cron_job_id: null
    };

    return createKBMutation.mutateAsync(kbParams);
  }, [existingKB, userProfile, orgData, connectionId, createKBMutation]);

  return {
    knowledgeBase: existingKB,
    isLoading: isLoadingKBs || createKBMutation.isPending,
    getOrCreateKB,
    error: createKBMutation.error,
  };
}

// Hook for managing resource indexing/de-indexing operations
export function useKnowledgeBaseOperations(connectionId: string) {
  const queryClient = useQueryClient();
  const { getOrCreateKB } = useKnowledgeBase(connectionId);
  
  // Track operation states for each resource
  const [operationStates, setOperationStates] = useState<Record<string, KnowledgeBaseItemStatus>>({});
  
  // Polling intervals for status updates
  const pollingIntervals = useRef<Record<string, NodeJS.Timeout>>({});

  // Index resource mutation
  const indexMutation = useMutation({
    mutationFn: async (params: { resourceId: string; resourcePath: string }) => {
      const kb = await getOrCreateKB();
      const orgData = await api.getCurrentOrganization();
      
      return api.indexResource({
        knowledgeBaseId: kb.knowledge_base_id,
        connectionId,
        resourceId: params.resourceId,
        orgId: orgData.org_id
      });
    }
  });

  // De-index resource mutation  
  const deindexMutation = useMutation({
    mutationFn: async (params: { resourcePath: string }) => {
      const kb = await getOrCreateKB();
      
      return api.deindexResource({
        knowledgeBaseId: kb.knowledge_base_id,
        resourcePath: params.resourcePath
      });
    }
  });

  // Start polling for resource status
  const startPolling = useCallback((resourceId: string, resourcePath: string, isFolder: boolean) => {
    if (pollingIntervals.current[resourceId]) {
      clearInterval(pollingIntervals.current[resourceId]);
    }

    pollingIntervals.current[resourceId] = setInterval(async () => {
      try {
        const kb = await getOrCreateKB();
        const statusData = await api.getKnowledgeBaseStatus({
          knowledgeBaseId: kb.knowledge_base_id,
          resourcePath: isFolder ? resourcePath : '/'
        });

        if (isFolder) {
          // For folders, check if any files in the folder path are indexed
          const folderIndexedFiles = statusData.indexedFilePaths.filter(path => 
            path.startsWith(resourcePath) && path !== resourcePath
          );
          const isIndexed = folderIndexedFiles.length > 0;

          if (isIndexed) {
            // Folder has indexed files
            clearInterval(pollingIntervals.current[resourceId]);
            delete pollingIntervals.current[resourceId];

            const state: KnowledgeBaseUIState = 'indexed-full'; // Simplified for now
            setOperationStates(prev => ({
              ...prev,
              [resourceId]: {
                state,
                filesProcessed: folderIndexedFiles.length,
                totalFiles: folderIndexedFiles.length
              }
            }));
          } else {
            // Still processing
            setOperationStates(prev => ({
              ...prev,
              [resourceId]: {
                ...prev[resourceId],
                filesProcessed: folderIndexedFiles.length,
                totalFiles: Math.max(folderIndexedFiles.length + 1, prev[resourceId]?.totalFiles || 1)
              }
            }));
          }
        } else {
          // For files, check if indexed
          if (statusData.indexedFilePaths.includes(resourcePath)) {
            clearInterval(pollingIntervals.current[resourceId]);
            delete pollingIntervals.current[resourceId];
            
            setOperationStates(prev => ({
              ...prev,
              [resourceId]: { state: 'indexed' }
            }));
          } else {
            // File not indexed yet or failed - simplified approach
            clearInterval(pollingIntervals.current[resourceId]);
            delete pollingIntervals.current[resourceId];
            
            setOperationStates(prev => ({
              ...prev,
              [resourceId]: { state: 'failed' }
            }));
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(pollingIntervals.current[resourceId]);
        delete pollingIntervals.current[resourceId];
        
        setOperationStates(prev => ({
          ...prev,  
          [resourceId]: { state: 'failed', error: 'Status check failed' }
        }));
      }
    }, ANIMATION.POLLING_INTERVAL);
  }, [getOrCreateKB]);

  // Index a resource
  const indexResource = useCallback(async (resource: Resource) => {
    const resourceId = resource.resource_id;
    const resourcePath = resource.inode_path.path;
    const isFolder = resource.inode_type === 'directory';

    // Set initial indexing state
    setOperationStates(prev => ({
      ...prev,
      [resourceId]: {
        state: isFolder ? 'indexing-folder' : 'indexing',
        filesProcessed: 0,
        totalFiles: isFolder ? undefined : 1
      }
    }));

    try {
      await indexMutation.mutateAsync({ resourceId, resourcePath });
      
      // Start polling for status updates
      startPolling(resourceId, resourcePath, isFolder);
      
    } catch (error) {
      setOperationStates(prev => ({
        ...prev,
        [resourceId]: { 
          state: 'failed', 
          error: error instanceof Error ? error.message : 'Index failed' 
        }
      }));
    }
  }, [indexMutation, startPolling]);

  // De-index a resource
  const deindexResource = useCallback(async (resource: Resource) => {
    const resourceId = resource.resource_id;
    const resourcePath = resource.inode_path.path;

    // Set de-indexing state
    setOperationStates(prev => ({
      ...prev,
      [resourceId]: { state: 'deindexing' }
    }));

    try {
      await deindexMutation.mutateAsync({ resourcePath });
      
      // Remove from state (back to pristine)
      setOperationStates(prev => {
        const newState = { ...prev };
        delete newState[resourceId];
        return newState;
      });
      
    } catch (error) {
      // Revert to previous indexed state on error
      setOperationStates(prev => ({
        ...prev,
        [resourceId]: { 
          state: 'indexed',
          error: error instanceof Error ? error.message : 'De-index failed' 
        }
      }));
    }
  }, [deindexMutation]);

  // Get current status for a resource
  const getResourceStatus = useCallback((resourceId: string): KnowledgeBaseItemStatus => {
    return operationStates[resourceId] || { state: 'pristine' };
  }, [operationStates]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals.current).forEach(interval => {
        clearInterval(interval);
      });
    };
  }, []);

  return {
    indexResource,
    deindexResource,
    getResourceStatus,
    isIndexing: indexMutation.isPending,
    isDeindexing: deindexMutation.isPending,
    indexError: indexMutation.error,
    deindexError: deindexMutation.error,
  };
}