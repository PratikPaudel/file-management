import { API_CONFIG, DEFAULT_CREDENTIALS, validateAllEnvironmentVariables, validateClientEnvironmentVariables } from './constants';
import type { 
  AuthHeaders, 
  Connection, 
  Resource, 
  ResourcesResponse, 
  KnowledgeBase,
  GetConnectionFilesParams,
  GetKnowledgeBaseStatusParams,
  IndexFileParams,
  DeindexFileParams,
  ApiError 
} from './types';

class ApiClient {
  private authHeaders: AuthHeaders | null = null;
  private initialized = false;

  // Initialize and validate environment variables (context-aware)
  private initialize() {
    if (!this.initialized) {
      // Only validate appropriate variables based on execution context
      if (typeof window !== 'undefined') {
        // Client-side: only validate client environment variables
        validateClientEnvironmentVariables();
      } else {
        // Server-side: validate all environment variables
        validateAllEnvironmentVariables();
      }
      this.initialized = true;
    }
  }

  // Authentication
  async authenticate(): Promise<AuthHeaders> {
    this.initialize();
    
    // Call our secure, server-side authentication endpoint
    const response = await fetch('/api/auth', {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Authentication failed: ${errorData.message || response.statusText}`);
    }

    const authHeaders = await response.json();
    this.authHeaders = authHeaders;
    return authHeaders;
  }

  // Generic request method
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    this.initialize();
    
    if (!this.authHeaders) {
      await this.authenticate();
    }

    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = {
        message: `API request failed: ${response.statusText}`,
        status: response.status,
      };
      throw error;
    }

    return response.json();
  }

  // Get current organization
  async getCurrentOrganization(): Promise<{ org_id: string }> {
    return this.request('/organizations/me/current');
  }

  // Get connections
  async getConnections(provider: string = 'gdrive'): Promise<Connection[]> {
    interface RawConnection {
      connection_id: string;
      name: string;
      connection_provider: string;
      connection_provider_data: Record<string, unknown>;
    }
    
    const response = await this.request<RawConnection[]>('/connections');

    console.log('Raw connections response:', response);

    // Filter by provider if specified and map to our Connection interface
    const filteredConnections = provider 
      ? response.filter((conn: RawConnection) => conn.connection_provider === provider)
      : response;

    return filteredConnections.map((conn: RawConnection) => ({
      id: conn.connection_id, // Map connection_id to id
      name: conn.name,
      type: conn.connection_provider,
      status: 'connected' as const, // Assume connected if returned by API
      metadata: conn.connection_provider_data,
    }));
  }

  async getConnectionFiles({ connectionId, resourceId }: GetConnectionFilesParams): Promise<ResourcesResponse> {
    const endpoint = `/connections/${connectionId}/resources/children`;
    const params = resourceId ? `?${new URLSearchParams({ resource_id: resourceId })}` : '';
    return this.request(`${endpoint}${params}`);
  }

  async getConnectionResource(connectionId: string, resourceIds: string[]): Promise<Resource[]> {
    const params = new URLSearchParams();
    resourceIds.forEach(id => params.append('resource_ids', id));
    return this.request(`/connections/${connectionId}/resources?${params}`);
  }

  // Knowledge Base endpoints
  async getKnowledgeBases(): Promise<KnowledgeBase[]> {
    return this.request('/knowledge_bases');
  }

  async createKnowledgeBase(data: {
    connection_id: string;
    connection_source_ids: string[];
    name: string;
    description: string;
    indexing_params?: Record<string, unknown>;
  }): Promise<KnowledgeBase> {
    return this.request('/knowledge_bases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async syncKnowledgeBase(knowledgeBaseId: string, orgId: string): Promise<void> {
    return this.request(`/knowledge_bases/sync/trigger/${knowledgeBaseId}/${orgId}`);
  }

  async getKnowledgeBaseFiles(knowledgeBaseId: string, resourcePath: string = '/'): Promise<ResourcesResponse> {
    const params = new URLSearchParams({ resource_path: resourcePath });
    return this.request(`/knowledge_bases/${knowledgeBaseId}/resources/children?${params}`);
  }

  async indexFile({ knowledgeBaseId }: IndexFileParams): Promise<void> {
    // This would be implemented based on actual API - for now using sync as proxy
    const orgData = await this.getCurrentOrganization();
    return this.syncKnowledgeBase(knowledgeBaseId, orgData.org_id);
  }

  async deindexFile({ knowledgeBaseId, resourceId }: DeindexFileParams): Promise<void> {
    const params = new URLSearchParams({ resource_id: resourceId });
    return this.request(`/knowledge_bases/${knowledgeBaseId}/resources?${params}`, {
      method: 'DELETE',
    });
  }

  async getKnowledgeBaseStatus({ knowledgeBaseId, resourceIds }: GetKnowledgeBaseStatusParams): Promise<Resource[]> {
    // Get all KB files and filter by resource IDs to get status
    const allFiles = await this.getKnowledgeBaseFiles(knowledgeBaseId, '/');
    return allFiles.data.filter(file => resourceIds.includes(file.resource_id));
  }
}

// Singleton instance
const apiClient = new ApiClient();

export { apiClient };

// Export individual methods for easier use
export const api = {
  authenticate: () => apiClient.authenticate(),
  getCurrentOrganization: () => apiClient.getCurrentOrganization(),
  getConnections: (provider?: string) => apiClient.getConnections(provider),
  getConnectionFiles: (params: GetConnectionFilesParams) => apiClient.getConnectionFiles(params),
  getConnectionResource: (connectionId: string, resourceIds: string[]) => apiClient.getConnectionResource(connectionId, resourceIds),
  getKnowledgeBases: () => apiClient.getKnowledgeBases(),
  createKnowledgeBase: (data: { connection_id: string; connection_source_ids: string[]; name: string; description: string; indexing_params?: Record<string, unknown>; }) => apiClient.createKnowledgeBase(data),
  syncKnowledgeBase: (knowledgeBaseId: string, orgId: string) => apiClient.syncKnowledgeBase(knowledgeBaseId, orgId),
  getKnowledgeBaseFiles: (knowledgeBaseId: string, resourcePath?: string) => apiClient.getKnowledgeBaseFiles(knowledgeBaseId, resourcePath),
  indexFile: (params: IndexFileParams) => apiClient.indexFile(params),
  deindexFile: (params: DeindexFileParams) => apiClient.deindexFile(params),
  getKnowledgeBaseStatus: (params: GetKnowledgeBaseStatusParams) => apiClient.getKnowledgeBaseStatus(params),
}; 