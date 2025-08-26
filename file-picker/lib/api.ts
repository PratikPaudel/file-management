import { API_CONFIG, validateAllEnvironmentVariables, validateClientEnvironmentVariables } from './constants';
import type { 
  AuthHeaders, 
  Connection, 
  Resource, 
  ResourcesResponse, 
  KnowledgeBase,
  CreateKnowledgeBaseParams,
  BatchCreateKnowledgeBaseParams,
  GetConnectionFilesParams,
  GetKnowledgeBaseStatusParams,
  IndexResourceParams,
  DeindexResourceParams,
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
    console.log('🔍 ApiClient.authenticate() called');
    this.initialize();
    
    // Call our secure, server-side authentication endpoint
    console.log('📡 Making auth request to /api/auth');
    const response = await fetch('/api/auth', {
      method: 'POST',
    });

    console.log('📡 Auth response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ Auth failed:', errorData);
      throw new Error(`Authentication failed: ${errorData.message || response.statusText}`);
    }

    const authHeaders = await response.json();
    console.log('✅ Auth successful, got headers');
    this.authHeaders = authHeaders;
    return authHeaders;
  }

  // Generic request method
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    console.log('🔍 ApiClient.request() called with endpoint:', endpoint);
    this.initialize();
    
    if (!this.authHeaders) {
      console.log('🔐 No auth headers, authenticating...');
      await this.authenticate();
    } else {
      console.log('✅ Auth headers already available');
    }

    // If endpoint starts with /api/, it's a Next.js API route - use relative URL
    // Otherwise, it's a direct Stack AI API call - use full URL
    const url = endpoint.startsWith('/api/') 
      ? endpoint 
      : `${API_CONFIG.BASE_URL}${endpoint}`;
    
    console.log('📡 Making request to:', url);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders,
        ...options.headers,
      },
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      console.log('❌ Request failed with status:', response.status, response.statusText);
      const error: ApiError = {
        message: `API request failed: ${response.statusText}`,
        status: response.status,
      };
      throw error;
    }

    const data = await response.json();
    console.log('✅ Request successful, got data');
    return data;
  }

  // Get current organization
  async getCurrentOrganization(): Promise<{ org_id: string }> {
    console.log('🔍 ApiClient.getCurrentOrganization() called');
    return this.request('/api/organizations/me/current');
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
    const endpoint = `/api/connections/${connectionId}/resources/children`;
    const params = resourceId ? `?${new URLSearchParams({ resource_id: resourceId })}` : '';
    return this.request(`${endpoint}${params}`);
  }

  async getConnectionResource(connectionId: string, resourceIds: string[]): Promise<Resource[]> {
    const params = new URLSearchParams();
    resourceIds.forEach(id => params.append('resource_ids', id));
    return this.request(`/api/connections/${connectionId}/resources?${params}`);
  }

  // Knowledge Base endpoints
  async getKnowledgeBases(): Promise<KnowledgeBase[]> {
    console.log('🔍 ApiClient.getKnowledgeBases() called');
    return this.request('/api/knowledge-bases');
  }

  async createKnowledgeBase(data: CreateKnowledgeBaseParams): Promise<KnowledgeBase> {
    console.log('🔍 ApiClient.createKnowledgeBase() called with data:', data);
    return this.request('/api/knowledge-bases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Batch Knowledge Base Creation - following exact notebook workflow
  async createBatchKnowledgeBase(data: BatchCreateKnowledgeBaseParams): Promise<KnowledgeBase> {
    console.log('🔍 ApiClient.createBatchKnowledgeBase() called with data:', data);
    
    // Transform to match app/ implementation format
    const payload = {
      connectionId: data.connectionId,
      connectionSourceIds: data.connectionSourceIds,
      name: data.name,
      description: data.description || `Knowledge base for selected resources`,
    };
    
    return this.request('/api/knowledge-bases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async syncKnowledgeBase(knowledgeBaseId: string, orgId: string): Promise<void> {
    return this.request(`/api/knowledge-bases/sync/trigger/${knowledgeBaseId}/${orgId}`);
  }

  async getKnowledgeBaseFiles(knowledgeBaseId: string, resourcePath: string = '/'): Promise<ResourcesResponse> {
    const params = new URLSearchParams({ resource_path: resourcePath });
    return this.request(`/knowledge_bases/${knowledgeBaseId}/resources/children?${params}`);
  }

  // Get a single knowledge base by ID
  async getKnowledgeBase(knowledgeBaseId: string): Promise<KnowledgeBase> {
    return this.request(`/knowledge_bases/${knowledgeBaseId}`);
  }

  // Update a knowledge base (requires complete object)
  async updateKnowledgeBase(knowledgeBaseId: string, kbData: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    return this.request(`/knowledge_bases/${knowledgeBaseId}`, {
      method: 'PUT',
      body: JSON.stringify(kbData),
    });
  }

  // Trigger sync for a knowledge base
  async triggerKnowledgeBaseSync(knowledgeBaseId: string, orgId: string): Promise<void> {
    const url = `/knowledge_bases/sync/trigger/${knowledgeBaseId}/${orgId}`;
    return this.request(url);
  }

  async indexResource({ knowledgeBaseId, resourceId, orgId }: IndexResourceParams): Promise<void> {
    // NEW WORKFLOW: Get KB → Update KB → Trigger Sync
    
    // Step 1: Get current KB state
    const currentKB = await this.getKnowledgeBase(knowledgeBaseId);
    
    // Step 2: Add new resource ID if not already present
    const existingIds = currentKB.connection_source_ids || [];
    if (!existingIds.includes(resourceId)) {
      const updatedIds = [...existingIds, resourceId];
      
      // Step 3: Update KB with new resource ID
      const updatedKB = {
        connection_id: currentKB.connection_id,
        connection_source_ids: updatedIds,
        website_sources: currentKB.website_sources || [],
        name: currentKB.name,
        description: currentKB.description,
        indexing_params: currentKB.indexing_params,
        org_level_role: currentKB.org_level_role,
        cron_job_id: currentKB.cron_job_id,
        user_metadata_schema: currentKB.user_metadata_schema,
        dataloader_metadata_schema: currentKB.dataloader_metadata_schema,
      };
      
      await this.updateKnowledgeBase(knowledgeBaseId, updatedKB);
    }
    
    // Step 4: Trigger sync
    await this.triggerKnowledgeBaseSync(knowledgeBaseId, orgId);
  }

  async deindexResource({ knowledgeBaseId, resourcePath }: DeindexResourceParams): Promise<void> {
    return this.request('/api/knowledge-base/unindex', {
      method: 'POST',
      body: JSON.stringify({ knowledgeBaseId, resourcePath }),
    });
  }

  async getKnowledgeBaseStatus({ knowledgeBaseId, resourcePath = '/' }: GetKnowledgeBaseStatusParams): Promise<{ indexedFilePaths: string[] }> {
    const params = new URLSearchParams({ 
      knowledge_base_id: knowledgeBaseId, 
      resource_path: resourcePath 
    });
    return this.request(`/api/knowledge-base/status?${params}`);
  }

  // Get user profile for email-based KB naming
  async getUserProfile(): Promise<{ email: string; [key: string]: unknown }> {
    return this.request('/users/me');
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
  getKnowledgeBase: (knowledgeBaseId: string) => apiClient.getKnowledgeBase(knowledgeBaseId),
  updateKnowledgeBase: (knowledgeBaseId: string, kbData: Partial<KnowledgeBase>) => apiClient.updateKnowledgeBase(knowledgeBaseId, kbData),
  triggerKnowledgeBaseSync: (knowledgeBaseId: string, orgId: string) => apiClient.triggerKnowledgeBaseSync(knowledgeBaseId, orgId),
  createKnowledgeBase: (data: CreateKnowledgeBaseParams) => apiClient.createKnowledgeBase(data),
  createBatchKnowledgeBase: (data: BatchCreateKnowledgeBaseParams) => apiClient.createBatchKnowledgeBase(data),
  syncKnowledgeBase: (knowledgeBaseId: string, orgId: string) => apiClient.syncKnowledgeBase(knowledgeBaseId, orgId),
  getKnowledgeBaseFiles: (knowledgeBaseId: string, resourcePath?: string) => apiClient.getKnowledgeBaseFiles(knowledgeBaseId, resourcePath),
  indexResource: (params: IndexResourceParams) => apiClient.indexResource(params),
  deindexResource: (params: DeindexResourceParams) => apiClient.deindexResource(params),
  getKnowledgeBaseStatus: (params: GetKnowledgeBaseStatusParams) => apiClient.getKnowledgeBaseStatus(params),
  getUserProfile: () => apiClient.getUserProfile(),
}; 