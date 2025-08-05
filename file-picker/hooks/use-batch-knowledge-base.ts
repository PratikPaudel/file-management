
import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Resource } from '@/lib/types';
import { toast, TOAST_MESSAGES } from '@/lib/toast';
import { QUERY_KEYS } from '@/lib/constants';

export type KnowledgeBaseStatus = 'none' | 'adding' | 'added' | 'error';

interface UseBatchKnowledgeBaseReturn {
  status: KnowledgeBaseStatus;
  error: string | null;
  addResourcesToKnowledgeBase: (selectedResources: Resource[]) => Promise<void>;
  reset: () => void;
}

const KNOWLEDGE_BASE_ID = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_ID!;

export function useBatchKnowledgeBase(): UseBatchKnowledgeBaseReturn {
  const [status, setStatus] = useState<KnowledgeBaseStatus>('none');
  const [error, setError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState<string | null>(null);
  const [showLoadingToast, setShowLoadingToast] = useState(false);
  const queryClient = useQueryClient();

  // Handle toast messages in useEffect to avoid render cycle issues
  useEffect(() => {
    if (showLoadingToast) {
      toast.loading(TOAST_MESSAGES.ADDING_TO_KB);
      setShowLoadingToast(false);
    }
  }, [showLoadingToast]);

  useEffect(() => {
    if (showSuccessToast) {
      toast.success(TOAST_MESSAGES.ADDED_TO_KB_SUCCESS);
      setShowSuccessToast(false);
    }
  }, [showSuccessToast]);

  useEffect(() => {
    if (showErrorToast) {
      toast.error(showErrorToast);
      setShowErrorToast(null);
    }
  }, [showErrorToast]);

  const addResourcesToKnowledgeBase = useCallback(async (selectedResources: Resource[]) => {
    if (selectedResources.length === 0) {
      setError('Please select at least one resource to index');
      return;
    }

    setStatus('adding');
    setError(null);
    setShowLoadingToast(true);

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

      // Invalidate knowledge base queries to refresh the UI
      const knowledgeBaseQueryKey = QUERY_KEYS.knowledgeBase(KNOWLEDGE_BASE_ID);
      const knowledgeBasesQueryKey = QUERY_KEYS.knowledgeBases;
      
      await queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKey });
      await queryClient.invalidateQueries({ queryKey: knowledgeBasesQueryKey });

      setStatus('added');
      toast.dismiss();
      setShowSuccessToast(true);
      
      setTimeout(() => {
        setStatus('none');
      }, 3000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setStatus('error');
      toast.dismiss();
      setShowErrorToast(errorMessage);
    }
  }, [queryClient]);

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
