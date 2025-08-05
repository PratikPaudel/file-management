
import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';
import type { KnowledgeBase } from '@/lib/types';
import { getStackAiApiAuthHeaders } from '@/lib/server-auth';

// Environment variables
const KNOWLEDGE_BASE_ID = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_ID!;
const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!;

export async function POST(request: Request) {
  try {
    const { resource_id } = await request.json();

    if (!resource_id) {
        return NextResponse.json({ message: 'Invalid resource_id in request body' }, { status: 400 });
    }

    const authHeaders = await getStackAiApiAuthHeaders();

    const kbResponse = await fetch(`${API_CONFIG.BASE_URL}/knowledge_bases/${KNOWLEDGE_BASE_ID}`, {
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
    });
    
    if (!kbResponse.ok) {
        const errorData = await kbResponse.json();
        return NextResponse.json({ message: 'Failed to fetch knowledge base', details: errorData }, { status: kbResponse.status });
    }

    const currentKB: KnowledgeBase = await kbResponse.json();

    const updatedIds = (currentKB.connection_source_ids || []).filter(id => id !== resource_id);

    const updatedKB = {
        ...currentKB,
        connection_source_ids: updatedIds,
    };

    const updateResponse = await fetch(`${API_CONFIG.BASE_URL}/knowledge_bases/${KNOWLEDGE_BASE_ID}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedKB),
    });

    if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        return NextResponse.json({ message: 'Failed to update knowledge base', details: errorData }, { status: updateResponse.status });
    }

    const syncResponse = await fetch(`${API_CONFIG.BASE_URL}/knowledge_bases/sync/trigger/${KNOWLEDGE_BASE_ID}/${ORG_ID}`, {
        method: 'GET',
        headers: authHeaders,
    });

    if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        return NextResponse.json({ message: 'Failed to trigger knowledge base sync', details: errorData }, { status: syncResponse.status });
    }

    return NextResponse.json({ message: 'Resource removed and sync triggered successfully' });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
