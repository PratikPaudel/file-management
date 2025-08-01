import { useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Resource } from '@/lib/types';

interface UseKnowledgeBasePersistenceProps {
  connectionId: string;
  files: Resource[];
  setMultipleFileStatuses: (resourceIds: string[], status: 'indexed' | 'synced') => void;
  setKnowledgeBaseId: (id: string | null) => void;
  setStatus: (status: 'none' | 'creating' | 'created' | 'syncing' | 'synced' | 'error') => void;
}

export function useKnowledgeBasePersistence({
  connectionId,
  files,
  setMultipleFileStatuses,
  setKnowledgeBaseId,
  setStatus,
}: UseKnowledgeBasePersistenceProps) {

  const loadExistingKnowledgeBase = useCallback(async () => {
    try {
      console.log('🔍 Checking for existing knowledge bases...');
      
      // Get existing knowledge bases for this connection
      const knowledgeBases = await api.getKnowledgeBases();
      
      // Find knowledge bases that contain files from this connection
      const connectionKB = knowledgeBases.find((kb: any) => 
        kb.connection_id === connectionId
      );
      
      if (connectionKB) {
        console.log('✅ Found existing knowledge base:', connectionKB.knowledge_base_id);
        
        // Set the knowledge base ID and status
        setKnowledgeBaseId(connectionKB.knowledge_base_id);
        setStatus('synced'); // Assume it's synced if it exists
        
        // Get the knowledge base status to see which files are indexed
        const statusData = await api.getKnowledgeBaseStatus({ knowledgeBaseId: connectionKB.knowledge_base_id });
        
        if (statusData.indexedFilePaths && statusData.indexedFilePaths.length > 0) {
          // Match indexed file paths with current files
          const indexedResourceIds: string[] = [];
          
          files.forEach(file => {
            const filePath = file.inode_path?.path;
            if (filePath && statusData.indexedFilePaths.includes(filePath)) {
              indexedResourceIds.push(file.resource_id);
            }
          });
          
          if (indexedResourceIds.length > 0) {
            console.log('🔄 Restoring synced status for files:', indexedResourceIds);
            setMultipleFileStatuses(indexedResourceIds, 'synced');
          }
        }
      }
    } catch (err) {
      console.log('ℹ️ No existing knowledge base found or error loading:', err);
      // This is expected for new connections, not an error
    }
  }, [connectionId, files, setMultipleFileStatuses, setKnowledgeBaseId, setStatus]);

  // Load existing knowledge base on mount and when files change
  useEffect(() => {
    if (connectionId && files.length > 0) {
      loadExistingKnowledgeBase();
    }
  }, [connectionId, files.length, loadExistingKnowledgeBase]);

  return { loadExistingKnowledgeBase };
}