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
}

export interface Connection {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  metadata?: Record<string, unknown>;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ResourcesResponse {
  data: Resource[];
  total: number;
  page?: number;
  limit?: number;
}

// UI State Types
export type IndexingStatus = 'indexed' | 'not-indexed' | 'indexing' | 'error';

export type FileAction = 'import' | 'view' | 'download' | 'delete';

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
  resourceIds: string[];
}

export interface IndexFileParams {
  knowledgeBaseId: string;
  resourceId: string;
  connectionId?: string;
}

export interface DeindexFileParams {
  knowledgeBaseId: string;
  resourceId: string;
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