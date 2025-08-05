
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Resource, KnowledgeBase } from '@/lib/types';
import { toast } from '@/lib/toast';
import { QUERY_KEYS } from '@/lib/constants';

const KNOWLEDGE_BASE_ID = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_ID!;

// The API call function
async function addResourcesToKnowledgeBaseAPI(resource_ids: string[]) {
  const response = await fetch('/api/knowledge-base/add-resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource_ids }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to add resources');
  }

  return response.json();
}

export function useBatchKnowledgeBase(onSettled?: () => void) {
  const queryClient = useQueryClient();
  const knowledgeBaseQueryKey = QUERY_KEYS.knowledgeBase(KNOWLEDGE_BASE_ID);

  return useMutation({
    mutationFn: addResourcesToKnowledgeBaseAPI,

    onMutate: async (resource_ids: string[]) => {
      // Cancel any ongoing refetches for this query to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: knowledgeBaseQueryKey });

      // Snapshot the previous state of the knowledge base
      const previousKnowledgeBase = queryClient.getQueryData<KnowledgeBase>(knowledgeBaseQueryKey);

      // Optimistically update the cache by adding the new resources
      if (previousKnowledgeBase) {
        queryClient.setQueryData<KnowledgeBase>(knowledgeBaseQueryKey, {
          ...previousKnowledgeBase,
          connection_source_ids: [...previousKnowledgeBase.connection_source_ids, ...resource_ids],
        });
      }

      // Show loading toast
      toast.loading('Adding files to knowledge base...');

      // Return a context object with the snapshot. This will be used for rollback on error.
      return { previousKnowledgeBase };
    },

    onError: (err, variables, context) => {
      // If the mutation fails, use the context from onMutate to roll back to the previous state
      if (context?.previousKnowledgeBase) {
        queryClient.setQueryData(knowledgeBaseQueryKey, context.previousKnowledgeBase);
      }
      toast.dismiss(); // Dismiss the loading toast
      toast.error(`Failed to add files: ${err.message}`);
    },

    onSuccess: () => {
      toast.dismiss(); // Dismiss the loading toast
      toast.success('Files queued for indexing! They will be processed in the background.');
    },

    onSettled: () => {
      // Refetch data after the mutation to ensure consistency
      queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKey });
      queryClient.invalidateQueries({ queryKey: ['indexed-resources'] });
      
      // Call the onSettled callback if provided
      onSettled?.();
    },
  });
}
