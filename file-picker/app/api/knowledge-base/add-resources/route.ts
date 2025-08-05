
import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';
import type { KnowledgeBase } from '@/lib/types';
import { getStackAiApiAuthHeaders } from '@/lib/server-auth';

// Environment variables
const KNOWLEDGE_BASE_ID = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_ID!;
const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!;

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
        // Even if sync fails, the KB was updated, so don't throw a hard error
        console.warn('⚠️ Failed to trigger knowledge base sync, but resources were added.', errorData);
    }

    console.log('✅ Resources added and sync triggered. Responding to client immediately.');

    // Respond immediately! Do not wait for the sync to complete.
    // The client will get this response in milliseconds, not seconds.
    return NextResponse.json({ 
        message: 'Resources have been queued for indexing.',
        status: 'in_progress' // Let the client know the job has started.
    });

  } catch (error) {
    console.log('❌ Error in add-resources API:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
