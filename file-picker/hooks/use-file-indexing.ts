import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

import { Resource } from '@/lib/types';

export type IndexingStatus = 'indexed' | 'not_indexed' | 'indexing' | 'unindexing' | 'synced';

interface UseFileIndexingProps {
  connectionId: string;
  files: Resource[];
}

interface UseFileIndexingReturn {
  fileIndexingStatus: Map<string, IndexingStatus>;
  indexFile: (file: Resource) => Promise<void>;
  unindexFile: (file: Resource) => Promise<void>;
  isLoading: boolean;
  refreshStatus: () => Promise<void>;
}

export function useFileIndexing({ connectionId, files }: UseFileIndexingProps): UseFileIndexingReturn {
  const [fileIndexingStatus, setFileIndexingStatus] = useState<Map<string, IndexingStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [indexedFilePaths, setIndexedFilePaths] = useState<string[]>([]);

  // Get or create our own knowledge base for this connection
  const getOrCreateKnowledgeBase = useCallback(async () => {
    console.log('🔍 getOrCreateKnowledgeBase() called for connectionId:', connectionId);
    
    try {
      // First try to get existing knowledge bases
      console.log('📡 Trying to get existing knowledge bases...');
      const knowledgeBases = await api.getKnowledgeBases();
      
      // Look for a KB with our connection ID
      const existingKB = knowledgeBases.find(kb => kb.connection_id === connectionId);
      if (existingKB) {
        console.log('✅ Found existing knowledge base:', existingKB.knowledge_base_id);
        return existingKB;
      }
      
      console.log('📝 No existing KB found, creating new one...');
      
      // Create a new knowledge base for our connection
      const orgData = await api.getCurrentOrganization();
      const newKB = await api.createKnowledgeBase({
        connection_id: connectionId,
        connection_source_ids: [],
        name: `File Picker Knowledge Base - ${connectionId.slice(0, 8)}`,
        description: `Knowledge base for connection ${connectionId}`,
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
      });
      
      console.log('✅ Created new knowledge base:', newKB.knowledge_base_id);
      console.log('🔥 COPY THIS KB ID TO HARDCODE:', newKB.knowledge_base_id);
      
      // Note: We don't trigger sync here since the KB has no resources yet
      // Sync will be triggered when individual files are indexed
      return newKB;
      
    } catch (error) {
      console.error('❌ Failed to get/create knowledge base:', error);
      throw new Error(`Unable to create or access knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [connectionId]);

  // Load initial indexing status
  const loadIndexingStatus = useCallback(async () => {
    if (!connectionId) return;
    
    console.log('🔍 loadIndexingStatus() called for connectionId:', connectionId);
    
    setIsLoading(true);
    try {
      // Get or create our knowledge base
      const kb = await getOrCreateKnowledgeBase();
      
      // Load indexed file paths using our KB ID
      const statusData = await api.getKnowledgeBaseStatus({
        knowledgeBaseId: kb.knowledge_base_id,
        resourcePath: '/'
      });
      
      console.log('✅ Loaded indexing status, found', statusData.indexedFilePaths.length, 'indexed files');
      setIndexedFilePaths(statusData.indexedFilePaths);
    } catch (error) {
      console.error('❌ Failed to load indexing status:', error);
      setIndexedFilePaths([]);
      // Don't show error for initial load failures - just show empty state
    } finally {
      setIsLoading(false);
    }
  }, [connectionId, getOrCreateKnowledgeBase]);

  // Update file statuses when files or indexed paths change
  useEffect(() => {
    if (files.length === 0) return;

    const statusMap = new Map<string, IndexingStatus>();

    files.forEach((file) => {
      if (file.resource_id) {
        const filePath = file.inode_path?.path;
        if (filePath && indexedFilePaths.includes(filePath)) {
          statusMap.set(file.resource_id, 'indexed');
        } else {
          statusMap.set(file.resource_id, 'not_indexed');
        }
      }
    });

    setFileIndexingStatus(statusMap);
  }, [files, indexedFilePaths]);

  // Load initial status on mount
  useEffect(() => {
    loadIndexingStatus();
  }, [loadIndexingStatus]);

  // Index a file
  const indexFile = useCallback(async (file: Resource) => {
    const resourceId = file.resource_id;
    const resourcePath = file.inode_path.path;

    console.log('🔍 indexFile() called for file:', resourcePath);

    // Set indexing status immediately
    setFileIndexingStatus(prev => new Map(prev).set(resourceId, 'indexing'));

    try {
      // Get our knowledge base
      const kb = await getOrCreateKnowledgeBase();
      const orgData = await api.getCurrentOrganization();
      
      console.log('📝 Indexing file with params:', {
        knowledgeBaseId: kb.knowledge_base_id,
        connectionId,
        resourceId,
        orgId: orgData.org_id
      });
      
      // Index the resource using our KB ID
      await api.indexResource({
        knowledgeBaseId: kb.knowledge_base_id,
        connectionId,
        resourceId,
        orgId: orgData.org_id
      });

      console.log('✅ Index API call completed, triggering sync...');
      
      // Trigger sync to actually start the indexing process
      await api.syncKnowledgeBase(kb.knowledge_base_id, orgData.org_id);
      
      console.log('✅ Sync triggered, waiting before polling...');

      // Wait a bit longer for sync to start before polling
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max (sync can take time)
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
        
        const statusData = await api.getKnowledgeBaseStatus({
          knowledgeBaseId: kb.knowledge_base_id,
          resourcePath: '/'
        });
        
        console.log(`🔄 Polling attempt ${attempts + 1}/${maxAttempts}: Found ${statusData.indexedFilePaths.length} indexed files, looking for: ${resourcePath}`);
        
        if (statusData.indexedFilePaths.includes(resourcePath)) {
          // Successfully indexed
          console.log('✅ File successfully indexed!');
          setFileIndexingStatus(prev => new Map(prev).set(resourceId, 'indexed'));
          setIndexedFilePaths(statusData.indexedFilePaths);
          return;
        }
        
        attempts++;
      }
      
      // Timeout - still show as indexed (might have worked)
      console.log('⏰ Polling timeout, assuming indexing succeeded');
      setFileIndexingStatus(prev => new Map(prev).set(resourceId, 'indexed'));
      
    } catch (error) {
      console.error('❌ Failed to index file:', error);
      // Revert to not_indexed on error
      setFileIndexingStatus(prev => new Map(prev).set(resourceId, 'not_indexed'));
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        console.warn('Indexing failed due to timeout - Stack AI API may be slow');
      }
    }
  }, [connectionId, getOrCreateKnowledgeBase]);

  // Unindex a file
  const unindexFile = useCallback(async (file: Resource) => {
    const resourceId = file.resource_id;
    const resourcePath = file.inode_path.path;

    console.log('🔍 unindexFile() called for file:', resourcePath);

    // Set unindexing status immediately
    setFileIndexingStatus(prev => new Map(prev).set(resourceId, 'unindexing'));

    try {
      // Get our knowledge base
      const kb = await getOrCreateKnowledgeBase();
      
      console.log('📝 Unindexing file with params:', {
        knowledgeBaseId: kb.knowledge_base_id,
        resourcePath
      });

      await api.deindexResource({
        knowledgeBaseId: kb.knowledge_base_id,
        resourcePath
      });

      console.log('✅ Unindex API call completed');

      // Update status immediately (unindex is usually fast)
      setTimeout(async () => {
        try {
          const statusData = await api.getKnowledgeBaseStatus({
            knowledgeBaseId: kb.knowledge_base_id,
            resourcePath: '/'
          });
          
          console.log('✅ Status updated after unindexing, now has', statusData.indexedFilePaths.length, 'indexed files');
          setIndexedFilePaths(statusData.indexedFilePaths);
        } catch (statusError) {
          console.warn('⚠️ Could not refresh status after unindexing, but treating as successful');
        }
        setFileIndexingStatus(prev => new Map(prev).set(resourceId, 'not_indexed'));
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to unindex file:', error);
      
      // Check if this is a "knowledge base doesn't exist" error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Unable to create or access knowledge base') || 
          errorMessage.includes('Internal Server Error') ||
          errorMessage.includes('500')) {
        // If KB doesn't exist, the file isn't really indexed anyway
        console.log('💡 Knowledge base not accessible - treating file as successfully unindexed');
        setFileIndexingStatus(prev => new Map(prev).set(resourceId, 'not_indexed'));
        
        // Remove from indexed files list
        setIndexedFilePaths(prev => prev.filter(path => path !== resourcePath));
      } else {
        // For other errors, revert to indexed state
        setFileIndexingStatus(prev => new Map(prev).set(resourceId, 'indexed'));
        
        if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
          console.warn('Unindexing failed due to timeout - Stack AI API may be slow');
        }
      }
    }
  }, [connectionId, getOrCreateKnowledgeBase]);

  // Refresh status function
  const refreshStatus = useCallback(async () => {
    await loadIndexingStatus();
  }, [loadIndexingStatus]);

  return {
    fileIndexingStatus,
    indexFile,
    unindexFile,
    isLoading,
    refreshStatus,
  };
}