import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';
import { getStackAiApiAuthHeaders } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    // Use server-side authentication instead of client headers
    const authHeaders = await getStackAiApiAuthHeaders();

    // Parse request body
    const { knowledgeBaseId, connectionId, resourceId, orgId } = await request.json();

    if (!knowledgeBaseId || !connectionId || !resourceId || !orgId) {
      return NextResponse.json(
        { error: 'knowledgeBaseId, connectionId, resourceId, and orgId are required' },
        { status: 400 }
      );
    }

    // First, get the current knowledge base data to update connection_source_ids
    const controller1 = new AbortController();
    const timeoutId1 = setTimeout(() => controller1.abort(), 30000);
    
    const getKbResponse = await fetch(`${API_CONFIG.BASE_URL}/knowledge_bases/${knowledgeBaseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      signal: controller1.signal,
    });
    
    clearTimeout(timeoutId1);

    if (!getKbResponse.ok) {
      throw new Error(`Failed to get knowledge base: ${getKbResponse.status} ${getKbResponse.statusText}`);
    }

    const kbData = await getKbResponse.json();

    // Add the resource to connection_source_ids if not already there
    const currentSourceIds = new Set(kbData.connection_source_ids || []);
    currentSourceIds.add(resourceId);

    // Update the knowledge base with new source IDs
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 30000);
    
    const updateKbResponse = await fetch(`${API_CONFIG.BASE_URL}/knowledge_bases/${knowledgeBaseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        connection_id: kbData.connection_id,
        connection_source_ids: Array.from(currentSourceIds),
        website_sources: kbData.website_sources || [],
        name: kbData.name,
        description: kbData.description,
        indexing_params: kbData.indexing_params,
        org_level_role: kbData.org_level_role,
        cron_job_id: kbData.cron_job_id,
      }),
      signal: controller2.signal,
    });
    
    clearTimeout(timeoutId2);

    if (!updateKbResponse.ok) {
      throw new Error(`Failed to update knowledge base: ${updateKbResponse.status} ${updateKbResponse.statusText}`);
    }

    // Trigger sync to index the new resource
    const controller3 = new AbortController();
    const timeoutId3 = setTimeout(() => controller3.abort(), 30000);
    
    const syncResponse = await fetch(`${API_CONFIG.BASE_URL}/knowledge_bases/sync/trigger/${knowledgeBaseId}/${orgId}`, {
      method: 'GET', // Based on the reference implementation pattern
      headers: authHeaders,
      signal: controller3.signal,
    });
    
    clearTimeout(timeoutId3);

    if (!syncResponse.ok) {
      console.warn(`Sync trigger failed: ${syncResponse.statusText}, but resource was added to KB`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to index resource:', error);
    return NextResponse.json(
      { error: 'Failed to index resource' },
      { status: 500 }
    );
  }
}