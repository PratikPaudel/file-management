
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from '@/lib/toast';
import { QUERY_KEYS } from '@/lib/constants';

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

  const mutation = useMutation({
    mutationFn: deindexResource,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.knowledgeBase(KNOWLEDGE_BASE_ID),
      });
    },
  });

  // Handle toast messages in useEffect to avoid render cycle issues
  useEffect(() => {
    if (mutation.isSuccess) {
      toast.success('File successfully removed from the knowledge base.');
    }
  }, [mutation.isSuccess]);

  useEffect(() => {
    if (mutation.isError && mutation.error) {
      toast.error(mutation.error.message);
    }
  }, [mutation.isError, mutation.error]);

  return mutation;
}
