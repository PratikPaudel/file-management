
import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';
import type { KnowledgeBase } from '@/lib/types';
import { getStackAiApiAuthHeaders } from '@/lib/server-auth';

// Environment variables
const KNOWLEDGE_BASE_ID = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_ID!;
const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!;

// Helper function to check if a resource is actually indexed
async function isResourceIndexed(resourceId: string, authHeaders: Record<string, string>): Promise<boolean> {
  try {
    const params = new URLSearchParams({ resource_path: '/' });
    const kbResourcesUrl = `${API_CONFIG.BASE_URL}/knowledge_bases/${KNOWLEDGE_BASE_ID}/resources/children?${params}`;
    
    const response = await fetch(kbResourcesUrl, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const resources = data.data || [];
    
    // Check if the resource is actually available in the knowledge base
    return resources.some((r: { resource_id: string }) => r.resource_id === resourceId);
  } catch (error) {
    console.warn('Failed to check resource indexing status:', error);
    return false;
  }
}

// Helper function to wait for sync completion
async function waitForSyncCompletion(resourceIds: string[], authHeaders: Record<string, string>, maxAttempts: number = 10): Promise<boolean> {
  console.log('🔄 Waiting for sync completion...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`📊 Sync check attempt ${attempt}/${maxAttempts}`);
    
    // Wait a bit before checking
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if all resources are indexed
    const allIndexed = await Promise.all(
      resourceIds.map(id => isResourceIndexed(id, authHeaders))
    );
    
    if (allIndexed.every(indexed => indexed)) {
      console.log('✅ All resources are now indexed!');
      return true;
    }
    
    console.log(`⏳ Still waiting for indexing... (${allIndexed.filter(Boolean).length}/${resourceIds.length} complete)`);
  }
  
  console.log('⚠️ Sync timeout - some resources may not be fully indexed yet');
  return false;
}

export async function POST(request: Request) {
  try {
    console.log('🔍 Starting add-resources API call');
    
    const { resource_ids } = await request.json();
    console.log('📝 Received resource_ids:', resource_ids);

    if (!resource_ids || !Array.isArray(resource_ids)) {
        console.log('❌ Invalid resource_ids format');
        return NextResponse.json({ message: 'Invalid resource_ids in request body' }, { status: 400 });
    }

    console.log('🔐 Getting auth headers...');
    const authHeaders = await getStackAiApiAuthHeaders();
    console.log('✅ Got auth headers');

    console.log('📡 Fetching current knowledge base...');
    const kbResponse = await fetch(`${API_CONFIG.BASE_URL}/knowledge_bases/${KNOWLEDGE_BASE_ID}`, {
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
    });
    
    console.log('📡 KB response status:', kbResponse.status);
    
    if (!kbResponse.ok) {
        const errorData = await kbResponse.json();
        console.log('❌ Failed to fetch KB:', errorData);
        return NextResponse.json({ message: 'Failed to fetch knowledge base', details: errorData }, { status: kbResponse.status });
    }

    const currentKB: KnowledgeBase = await kbResponse.json();
    console.log('✅ Got current KB, existing IDs:', currentKB.connection_source_ids);

    const existingIds = currentKB.connection_source_ids || [];
    const updatedIds = [...new Set([...existingIds, ...resource_ids])];
    console.log('📝 Updated IDs:', updatedIds);

    const updatedKB = {
        ...currentKB,
        connection_source_ids: updatedIds,
    };
    console.log('📝 Updating KB with new IDs...');

    const updateResponse = await fetch(`${API_CONFIG.BASE_URL}/knowledge_bases/${KNOWLEDGE_BASE_ID}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedKB),
    });

    console.log('📡 Update response status:', updateResponse.status);

    if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.log('❌ Failed to update KB:', errorData);
        return NextResponse.json({ message: 'Failed to update knowledge base', details: errorData }, { status: updateResponse.status });
    }
    console.log('✅ KB updated successfully');

    console.log('🔄 Triggering sync...');
    const syncResponse = await fetch(`${API_CONFIG.BASE_URL}/knowledge_bases/sync/trigger/${KNOWLEDGE_BASE_ID}/${ORG_ID}`, {
        method: 'GET',
        headers: authHeaders,
    });

    console.log('📡 Sync response status:', syncResponse.status);

    if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        console.log('❌ Failed to trigger sync:', errorData);
        return NextResponse.json({ message: 'Failed to trigger knowledge base sync', details: errorData }, { status: syncResponse.status });
    }

    console.log('✅ Sync triggered successfully');
    
    // Wait for sync completion
    const syncCompleted = await waitForSyncCompletion(resource_ids, authHeaders);
    
    if (syncCompleted) {
        console.log('✅ All resources successfully indexed and available');
        return NextResponse.json({ 
            message: 'Resources added and sync completed successfully',
            status: 'completed'
        });
    } else {
        console.log('⚠️ Sync may still be in progress');
        return NextResponse.json({ 
            message: 'Resources added and sync triggered. Indexing may still be in progress.',
            status: 'in_progress'
        });
    }

  } catch (error) {
    console.log('❌ Error in add-resources API:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
