
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

  return useMutation({
    mutationFn: deindexResource,
    onSuccess: () => {
      toast.success('File successfully removed from the knowledge base.');
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.knowledgeBase(KNOWLEDGE_BASE_ID),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
