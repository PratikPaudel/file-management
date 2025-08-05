
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from '@/lib/toast';
import { QUERY_KEYS } from '@/lib/constants';
import { KnowledgeBase } from '@/lib/types';

const KNOWLEDGE_BASE_ID = '93041540-e2f2-409e-a54c-316fb5949713';

async function deindexResource(resourceId: string) {
  const response = await fetch('/api/knowledge-base/remove-resource', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resource_id: resourceId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to deindex resource');
  }

  return response.json();
}

export function useDeindexResource() {
  const queryClient = useQueryClient();
  const knowledgeBaseQueryKey = QUERY_KEYS.knowledgeBase(KNOWLEDGE_BASE_ID);
  const indexedResourcesQueryKey = ['indexed-resources']; // Define the key for clarity

  const mutation = useMutation({
    mutationFn: deindexResource,
    // onMutate is called before the mutation function
    onMutate: async (resourceIdToRemove: string) => {
      // 1. Cancel ongoing refetches to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: knowledgeBaseQueryKey });

      // 2. Snapshot the previous value
      const previousKnowledgeBase = queryClient.getQueryData<KnowledgeBase>(knowledgeBaseQueryKey);

      // 3. Optimistically update to the new value
      if (previousKnowledgeBase) {
        queryClient.setQueryData<KnowledgeBase>(knowledgeBaseQueryKey, {
          ...previousKnowledgeBase,
          connection_source_ids: previousKnowledgeBase.connection_source_ids.filter(
            (id) => id !== resourceIdToRemove
          ),
        });
      }
      
      // 4. Return a context object with the snapshot
      return { previousKnowledgeBase };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, variables, context) => {
      if (context?.previousKnowledgeBase) {
        queryClient.setQueryData(knowledgeBaseQueryKey, context.previousKnowledgeBase);
      }
      // Toast logic for error will be handled by the useEffect below
    },
    // Always refetch both queries after the mutation is complete
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKey });
      queryClient.invalidateQueries({ queryKey: indexedResourcesQueryKey });
    },
  });

  // Keep these useEffects for toast notifications
  useEffect(() => {
    if (mutation.isSuccess) {
      toast.success('File removed from knowledge base. Syncing...');
    }
  }, [mutation.isSuccess]);

  useEffect(() => {
    if (mutation.isError && mutation.error) {
      toast.error(`Failed to remove file: ${mutation.error.message}`);
    }
  }, [mutation.isError, mutation.error]);

  return mutation;
}
