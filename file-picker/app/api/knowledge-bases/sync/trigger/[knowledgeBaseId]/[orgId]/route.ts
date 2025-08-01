import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';

// URL: /api/knowledge-bases/sync/trigger/[knowledgeBaseId]/[orgId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ knowledgeBaseId: string; orgId: string }> }
) {
  try {
    // Get auth headers from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract parameters
    const { knowledgeBaseId, orgId } = await params;

    if (!knowledgeBaseId || !orgId) {
      return NextResponse.json(
        { error: 'knowledgeBaseId and orgId are required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Triggering sync for KB ${knowledgeBaseId} in org ${orgId}`);

    // Call Stack AI sync trigger endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const syncResponse = await fetch(
      `${API_CONFIG.BASE_URL}/knowledge_bases/sync/trigger/${knowledgeBaseId}/${orgId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!syncResponse.ok) {
      throw new Error(`Failed to trigger sync: ${syncResponse.status} ${syncResponse.statusText}`);
    }

    const result = await syncResponse.json();
    console.log('✅ Sync triggered successfully');

    return NextResponse.json({
      success: true,
      result,
      message: 'Knowledge base sync has been triggered'
    });
  } catch (error) {
    console.error('❌ Failed to trigger knowledge base sync:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger knowledge base sync',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}