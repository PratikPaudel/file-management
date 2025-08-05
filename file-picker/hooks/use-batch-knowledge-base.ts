
import { useState, useCallback } from 'react';
import { Resource } from '@/lib/types';
import { toast, TOAST_MESSAGES } from '@/lib/toast';

export type KnowledgeBaseStatus = 'none' | 'adding' | 'added' | 'error';

interface UseBatchKnowledgeBaseReturn {
  status: KnowledgeBaseStatus;
  error: string | null;
  addResourcesToKnowledgeBase: (selectedResources: Resource[]) => Promise<void>;
  reset: () => void;
}

export function useBatchKnowledgeBase(): UseBatchKnowledgeBaseReturn {
  const [status, setStatus] = useState<KnowledgeBaseStatus>('none');
  const [error, setError] = useState<string | null>(null);

  const addResourcesToKnowledgeBase = useCallback(async (selectedResources: Resource[]) => {
    if (selectedResources.length === 0) {
      setError('Please select at least one resource to index');
      return;
    }

    setStatus('adding');
    setError(null);
    toast.loading(TOAST_MESSAGES.ADDING_TO_KB);

    try {
      const resource_ids = selectedResources
        .filter(resource => resource.inode_type === 'file')
        .map(resource => resource.resource_id);

      if (resource_ids.length === 0) {
        throw new Error('Please select at least one file (not just folders) to index');
      }
      
      const response = await fetch('/api/knowledge-base/add-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resource_ids }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add resources');
      }

      setStatus('added');
      toast.dismiss();
      toast.success(TOAST_MESSAGES.ADDED_TO_KB_SUCCESS);
      
      setTimeout(() => {
        setStatus('none');
      }, 3000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setStatus('error');
      toast.dismiss();
      toast.error(errorMessage);
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('none');
    setError(null);
  }, []);

  return {
    status,
    error,
    addResourcesToKnowledgeBase,
    reset,
  };
}
