import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';
import { getStackAiApiAuthHeaders } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    // Use server-side authentication instead of client headers
    const authHeaders = await getStackAiApiAuthHeaders();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const knowledgeBaseId = searchParams.get('knowledge_base_id');
    const resourcePath = searchParams.get('resource_path') || '/';

    if (!knowledgeBaseId) {
      return NextResponse.json(
        { error: 'knowledge_base_id is required' },
        { status: 400 }
      );
    }

    // Get child resources from the knowledge base for the specified path
    const params = new URLSearchParams({ resource_path: resourcePath });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const kbResponse = await fetch(
      `${API_CONFIG.BASE_URL}/knowledge_bases/${knowledgeBaseId}/resources/children?${params}`,
      {
        method: 'GET',
        headers: authHeaders,
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);

    if (!kbResponse.ok) {
      // If the path isn't indexed, return empty array instead of failing
      if (kbResponse.status === 404) {
        return NextResponse.json({
          data: [],
          total: 0,
        });
      }
      throw new Error(`Failed to get KB resources: ${kbResponse.statusText}`);
    }

    const kbData = await kbResponse.json();

    // Extract just the file paths of indexed files (what the UI expects)
    const indexedFilePaths = (kbData.data || [])
      .map((item: { inode_path?: { path: string } }) => item.inode_path?.path)
      .filter((path: string | undefined) => path !== undefined);

    return NextResponse.json({
      indexedFilePaths,
    });
  } catch (error) {
    console.error('Failed to get indexing status:', error);
    
    // Return empty array on error to prevent UI breaking
    return NextResponse.json({
      indexedFilePaths: [],
    });
  }
}