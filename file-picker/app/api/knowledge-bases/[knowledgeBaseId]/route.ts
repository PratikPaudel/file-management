import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';
import { getStackAiApiAuthHeaders } from '@/lib/server-auth';

// This is our new, fast endpoint: GET /api/knowledge-bases/[knowledgeBaseId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ knowledgeBaseId: string }> }
) {
  try {
    const { knowledgeBaseId } = await params;
    if (!knowledgeBaseId) {
      return NextResponse.json({ error: 'Knowledge Base ID is required' }, { status: 400 });
    }

    console.log(`🔍 GET /api/knowledge-bases/${knowledgeBaseId} - Starting request`);
    const authHeaders = await getStackAiApiAuthHeaders();
    console.log('✅ Server-side auth successful, making API call to Stack AI');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${API_CONFIG.BASE_URL}/knowledge_bases/${knowledgeBaseId}`, {
      method: 'GET',
      headers: authHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`📡 Stack AI API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Stack AI API error: ${response.status} ${errorText}`);
      throw new Error(`Failed to get knowledge base: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully fetched knowledge base:', data.knowledge_base_id);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Failed to fetch specific knowledge base:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 