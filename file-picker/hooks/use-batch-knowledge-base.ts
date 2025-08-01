import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Resource } from '@/lib/types';
import { toast, TOAST_MESSAGES } from '@/lib/toast';

export type KnowledgeBaseStatus = 'none' | 'creating' | 'created' | 'syncing' | 'synced' | 'error';

interface UseBatchKnowledgeBaseProps {
  connectionId: string;
}

interface UseBatchKnowledgeBaseReturn {
  knowledgeBaseId: string | null;
  status: KnowledgeBaseStatus;
  error: string | null;
  createKnowledgeBaseWithResources: (selectedResources: Resource[], onFileStatusUpdate?: (resourceIds: string[], status: 'indexed' | 'synced') => void) => Promise<void>;
  triggerSync: (onFileStatusUpdate?: (resourceIds: string[], status: 'synced') => void) => Promise<void>;
  resetKnowledgeBase: () => void;
  setKnowledgeBaseId: (id: string | null) => void;
  setStatus: (status: KnowledgeBaseStatus) => void;
}

export function useBatchKnowledgeBase({ connectionId }: UseBatchKnowledgeBaseProps): UseBatchKnowledgeBaseReturn {
  const [knowledgeBaseId, setKnowledgeBaseId] = useState<string | null>(null);
  const [status, setStatus] = useState<KnowledgeBaseStatus>('none');
  const [error, setError] = useState<string | null>(null);

  // Create knowledge base with all selected resources at once (following notebook workflow)
  const createKnowledgeBaseWithResources = useCallback(async (selectedResources: Resource[], onFileStatusUpdate?: (resourceIds: string[], status: 'indexed' | 'synced') => void) => {
    if (selectedResources.length === 0) {
      setError('Please select at least one resource to index');
      return;
    }

    setStatus('creating');
    setError(null);
    
    // Show loading toast
    toast.loading(TOAST_MESSAGES.ADDING_TO_KB);

    try {
      console.log('🔍 Creating knowledge base with selected resources:', selectedResources.length);

      // Get only file resource IDs (leaf nodes), not folders
      // Following the app/ implementation pattern
      const leafResourceIds = selectedResources
        .filter(resource => resource.inode_type === 'file')
        .map(resource => resource.resource_id);

      if (leafResourceIds.length === 0) {
        throw new Error('Please select at least one file (not just folders) to index');
      }

      console.log('📝 Creating KB with leaf resource IDs:', leafResourceIds);

      // Create knowledge base with ALL selected connection_source_ids at once
      // This follows the exact workflow from Knowledge_Base_Workflow.ipynb
      const knowledgeBase = await api.createBatchKnowledgeBase({
        connectionId,
        connectionSourceIds: leafResourceIds,
        name: `File Picker Knowledge Base - ${new Date().toLocaleString()}`,
        description: `Knowledge base created with ${leafResourceIds.length} selected files`,
      });

      console.log('✅ Knowledge base created:', knowledgeBase.knowledge_base_id);
      
      setKnowledgeBaseId(knowledgeBase.knowledge_base_id);
      setStatus('created');

      // Update individual file statuses to 'indexed'
      if (onFileStatusUpdate) {
        onFileStatusUpdate(leafResourceIds, 'indexed');
      }
      
      // Show success toast
      toast.dismiss();
      toast.success(TOAST_MESSAGES.ADDED_TO_KB);

    } catch (err) {
      console.error('❌ Failed to create knowledge base:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create knowledge base';
      setError(errorMessage);
      setStatus('error');
      
      // Show error toast
      toast.dismiss();
      toast.error(TOAST_MESSAGES.ERROR_ADDING);
    }
  }, [connectionId]);

  // Trigger sync for the knowledge base (following notebook workflow)
  const triggerSync = useCallback(async (onFileStatusUpdate?: (resourceIds: string[], status: 'synced') => void) => {
    if (!knowledgeBaseId) {
      setError('No knowledge base to sync');
      return;
    }

    setStatus('syncing');
    setError(null);
    
    // Show syncing toast
    toast.loading(TOAST_MESSAGES.SYNCING);

    try {
      console.log('🔄 Triggering sync for knowledge base:', knowledgeBaseId);

      // Get organization ID
      const orgData = await api.getCurrentOrganization();
      
      // Trigger sync - this is the critical step from the notebook
      await api.syncKnowledgeBase(knowledgeBaseId, orgData.org_id);

      console.log('✅ Sync triggered successfully');
      setStatus('synced');

      // Note: We could update individual file statuses here,
      // but we don't have the specific resource IDs in this context.
      // The FilePicker component will handle updating the file statuses.
      
      // Show success toast
      toast.dismiss();
      toast.success(TOAST_MESSAGES.SYNCED);

      // Reset to allow adding more files after a delay
      setTimeout(() => {
        setStatus('none');
        setError(null);
      }, 3000);

    } catch (err) {
      console.error('❌ Failed to trigger sync:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to trigger sync';
      setError(errorMessage);
      setStatus('error');
      
      // Show error toast
      toast.dismiss();
      toast.error(TOAST_MESSAGES.ERROR_SYNCING);
    }
  }, [knowledgeBaseId]);

  // Reset state for creating a new knowledge base
  const resetKnowledgeBase = useCallback(() => {
    setKnowledgeBaseId(null);
    setStatus('none');
    setError(null);
  }, []);

  return {
    knowledgeBaseId,
    status,
    error,
    createKnowledgeBaseWithResources,
    triggerSync,
    resetKnowledgeBase,
    setKnowledgeBaseId,
    setStatus,
  };
}