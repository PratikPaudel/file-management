import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    // Get auth headers from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { knowledgeBaseId, resourcePath } = await request.json();

    if (!knowledgeBaseId || !resourcePath) {
      return NextResponse.json(
        { error: 'knowledgeBaseId and resourcePath are required' },
        { status: 400 }
      );
    }

    // Delete the resource from the knowledge base
    const params = new URLSearchParams({ resource_path: resourcePath });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const deleteResponse = await fetch(
      `${API_CONFIG.BASE_URL}/knowledge_bases/${knowledgeBaseId}/resources?${params}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader,
        },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);

    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete resource: ${deleteResponse.statusText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to unindex resource:', error);
    return NextResponse.json(
      { error: 'Failed to unindex resource' },
      { status: 500 }
    );
  }
}