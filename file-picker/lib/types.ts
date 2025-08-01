// Core API Types
export interface Resource {
  resource_id: string;
  inode_path: {
    path: string;
  };
  inode_type: 'file' | 'directory';
  created_at?: string;
  modified_at?: string;
  size?: number;
  status?: KnowledgeBaseResourceStatus;
}

export interface Connection {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  metadata?: Record<string, unknown>;
}

export interface KnowledgeBase {
  knowledge_base_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  connection_id: string;
  connection_source_ids: string[];
}

export interface CreateKnowledgeBaseParams {
  connection_id: string;
  connection_source_ids: string[];
  name: string;
  description: string;
  indexing_params?: {
    ocr?: boolean;
    unstructured?: boolean;
    embedding_params?: {
      embedding_model: string;
      api_key?: string | null;
    };
    chunker_params?: {
      chunk_size: number;
      chunk_overlap: number;
      chunker: string;
    };
  };
  org_level_role?: string | null;
  cron_job_id?: string | null;
}

// Batch Knowledge Base Creation - following exact notebook workflow
export interface BatchCreateKnowledgeBaseParams {
  connectionId: string;
  connectionSourceIds: string[];
  name: string;
  description?: string;
}

export interface ResourcesResponse {
  data: Resource[];
  total: number;
  page?: number;
  limit?: number;
}

// Knowledge Base Status Types (from API)
export type KnowledgeBaseResourceStatus = 'pending' | 'indexed' | 'failed' | 'processing';

// UI State Types - Detailed states matching implementation plan
export type KnowledgeBaseUIState = 
  | 'pristine'           // Not indexed - shows + Index button
  | 'indexing'           // File indexing - shows spinner + "Indexing..."
  | 'indexing-folder'    // Folder indexing - shows spinner + "Indexing folder... (X files processed)"
  | 'indexed'            // File indexed - shows green checkmark + "Indexed" + trash icon
  | 'indexed-full'       // Folder fully indexed - shows green checkmark + "Indexed (X/X files)" + trash icon
  | 'indexed-partial'    // Folder partially indexed - shows yellow warning + "Partially indexed (Y/X files)" + trash icon
  | 'failed'             // Failed - shows red error + "Failed" + Retry button
  | 'deindexing';        // De-indexing - shows spinner + "De-indexing..."

export interface KnowledgeBaseItemStatus {
  state: KnowledgeBaseUIState;
  filesProcessed?: number;  // For folder progress tracking
  totalFiles?: number;      // For folder progress tracking
  error?: string;           // Error message if failed
}

export type IndexingStatus = 'indexed' | 'not-indexed' | 'indexing' | 'error'; // Keep for backward compatibility

export type FileAction = 'import' | 'view' | 'download' | 'delete' | 'index' | 'deindex' | 'retry';

export type ViewMode = 'list' | 'grid';

export type SortOption = 'name' | 'date' | 'type' | 'size';

export type SortOrder = 'asc' | 'desc';

export type SortDirection = 'asc' | 'desc' | null;

export interface Breadcrumb {
  name: string;
  path: string;
  resourceId?: string;
}

// API Request/Response Types
export interface AuthHeaders {
  Authorization: string;
}

export interface GetConnectionFilesParams {
  connectionId: string;
  resourceId?: string;
  limit?: number;
  offset?: number;
}

export interface GetKnowledgeBaseStatusParams {
  knowledgeBaseId: string;
  resourcePath?: string;
}

export interface IndexResourceParams {
  knowledgeBaseId: string;
  connectionId: string;
  resourceId: string;
  orgId: string;
}

export interface DeindexResourceParams {
  knowledgeBaseId: string;
  resourcePath: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Component Props Types
export interface FilePickerProps {
  connectionId: string;
  knowledgeBaseId?: string;
  onSelectionChange?: (files: Resource[]) => void;
  mode?: 'browse' | 'manage';
  allowMultiSelect?: boolean;
  maxSelections?: number;
} 