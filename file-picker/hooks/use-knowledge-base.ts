import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/constants';
import { ensureAbsolutePath } from '@/lib/utils';
import type { 
  KnowledgeBase, 
  CreateKnowledgeBaseParams,
  KnowledgeBaseItemStatus,
  Resource
} from '@/lib/types';

// This map will hold the states outside of React's lifecycle
// This prevents re-renders on every component from resetting the state
const resourceStates = new Map<string, KnowledgeBaseItemStatus>();

// Cache for created KBs to avoid creating duplicates
const knowledgeBaseCache = new Map<string, KnowledgeBase>();

// Hook to get or create the single KB for a connection
export function useKnowledgeBase(connectionId: string) {
  const queryClient = useQueryClient();

  // DISABLE the slow getKnowledgeBases call - it's too slow and unreliable
  const { data: knowledgeBases, isLoading: isLoadingKBs } = useQuery({
    queryKey: QUERY_KEYS.knowledgeBases,
    queryFn: api.getKnowledgeBases,
    enabled: false, // DISABLED - this API is too slow
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: api.getUserProfile,
    enabled: !!connectionId,
  });

  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: api.getCurrentOrganization,
    enabled: !!connectionId,
  });

  // Check cache first instead of calling the slow API
  const cachedKB = knowledgeBaseCache.get(connectionId);
  const existingKB = cachedKB;

  const createKBMutation = useMutation({
    mutationFn: (params: CreateKnowledgeBaseParams) => api.createKnowledgeBase(params),
    onSuccess: (newKB) => {
      // Cache the newly created KB
      knowledgeBaseCache.set(connectionId, newKB);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.knowledgeBases });
    }
  });

  const getOrCreateKB = useCallback(async (): Promise<KnowledgeBase> => {
    if (existingKB) {
      return existingKB;
    }
    if (createKBMutation.data) {
      return createKBMutation.data;
    }
    if (!userProfile?.email || !orgData?.org_id) {
      throw new Error('Missing user profile or organization data for KB creation.');
    }
    const kbParams: CreateKnowledgeBaseParams = {
      connection_id: connectionId,
      connection_source_ids: [],
      name: `${userProfile.email}'s Knowledge Base`,
      description: `Knowledge base for ${userProfile.email}'s Google Drive files`,
      indexing_params: { ocr: false, unstructured: true, embedding_params: { embedding_model: "text-embedding-ada-002", api_key: null }, chunker_params: { chunk_size: 1500, chunk_overlap: 500, chunker: "sentence" } },
      org_level_role: null,
      cron_job_id: null
    };
    const newKB = await createKBMutation.mutateAsync(kbParams);
    // Cache it immediately
    knowledgeBaseCache.set(connectionId, newKB);
    return newKB;
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
  const { getOrCreateKB } = useKnowledgeBase(connectionId);
  const [operationStates, setOperationStates] = useState<Map<string, KnowledgeBaseItemStatus>>(resourceStates);

  // We need a way to force re-renders when the map changes
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  const updateResourceStatus = useCallback((resourceId: string, status: KnowledgeBaseItemStatus) => {
    resourceStates.set(resourceId, status);
    forceUpdate();
  }, [forceUpdate]);

  const indexMutation = useMutation({
    mutationFn: async (params: { resourceId: string }) => {
      const kb = await getOrCreateKB();
      const orgData = await api.getCurrentOrganization();
      return api.indexResource({
        knowledgeBaseId: kb.knowledge_base_id,
        connectionId,
        resourceId: params.resourceId,
        orgId: orgData.org_id
      });
    },
  });

  const deindexMutation = useMutation({
    mutationFn: async (params: { resourcePath: string }) => {
      const kb = await getOrCreateKB();
      const absolutePath = ensureAbsolutePath(params.resourcePath);
      return api.deindexResource({
        knowledgeBaseId: kb.knowledge_base_id,
        resourcePath: absolutePath
      });
    }
  });

  const indexResource = useCallback(async (resource: Resource) => {
    const { resource_id, inode_type } = resource;
    const isFolder = inode_type === 'directory';
    const fileName = resource.inode_path.path.split('/').pop() || 'Unknown file';

    console.log('🚀 Starting indexing:', {
      name: resource.inode_path.path,
      type: inode_type,
      resource_id
    });

    // Show starting toast
    toast.loading(`Starting to index "${fileName}"...`, {
      id: `indexing-${resource_id}`,
    });

    updateResourceStatus(resource_id, {
      state: isFolder ? 'indexing-folder' : 'indexing'
    });

    try {
      await indexMutation.mutateAsync({ resourceId: resource_id });
      console.log('✅ Indexing started successfully for:', resource.inode_path.path);
      
      // Update toast to show processing
      toast.loading(`Indexing "${fileName}"... This may take a moment.`, {
        id: `indexing-${resource_id}`,
      });
      
      // The poller component will take over from here.
    } catch (error) {
      console.error('❌ Failed to start indexing:', resource.inode_path.path, error);
      
      // Show error toast
      toast.error(`Failed to start indexing "${fileName}"`, {
        id: `indexing-${resource_id}`,
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      
      updateResourceStatus(resource_id, {
        state: 'failed',
        error: error instanceof Error ? error.message : 'Index trigger failed'
      });
    }
  }, [indexMutation, updateResourceStatus]);

  const deindexResource = useCallback(async (resource: Resource) => {
    const { resource_id, inode_path } = resource;
    
    updateResourceStatus(resource_id, { state: 'deindexing' });

    try {
      await deindexMutation.mutateAsync({ resourcePath: inode_path.path });
      // On success, we remove it from the map to return to pristine
      resourceStates.delete(resource_id);
      forceUpdate();
    } catch (error) {
      updateResourceStatus(resource_id, {
        state: 'indexed', // Revert to previous state on failure
        error: error instanceof Error ? error.message : 'De-index failed'
      });
    }
  }, [deindexMutation, updateResourceStatus, forceUpdate]);

  const getResourceStatus = useCallback((resourceId: string): KnowledgeBaseItemStatus => {
    return operationStates.get(resourceId) || { state: 'pristine' };
  }, [operationStates]);

  return {
    indexResource,
    deindexResource,
    getResourceStatus,
    updateResourceStatus, // Expose this for the poller
    isIndexing: indexMutation.isPending,
    isDeindexing: deindexMutation.isPending,
  };
}