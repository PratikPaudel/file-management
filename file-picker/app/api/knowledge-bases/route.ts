import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';
import { getStackAiApiAuthHeaders } from '@/lib/server-auth';

export async function GET() {
  try {
    console.log('🔍 GET /api/knowledge-bases - Starting request');
    
    // Use server-side authentication instead of client headers
    const authHeaders = await getStackAiApiAuthHeaders();
    console.log('✅ Server-side auth successful, making API call to Stack AI');

    // Get knowledge bases from Stack AI API (with extended timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    let response: Response | null = null;
    let retries = 2;

    while (retries >= 0) {
      try {
        response = await fetch(`${API_CONFIG.BASE_URL}/knowledge_bases`, {
          method: 'GET',
          headers: authHeaders,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }

        break; // Success, exit retry loop

      } catch (error) {
        clearTimeout(timeoutId);
        retries--;

        if (retries < 0) {
          // Final retry failed, throw the error
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timeout - Stack AI knowledge bases API is very slow');
          }
          throw error;
        }

        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`⚠️ Retrying knowledge bases API call, ${retries} attempts remaining...`);
      }
    }

    if (!response) {
      throw new Error('Failed to get response after retries');
    }

    console.log(`📡 Stack AI API response status: ${response.status}`);

    const data = await response.json();
    console.log(`✅ Successfully fetched ${data.length || 0} knowledge bases`);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Failed to fetch knowledge bases:', error);
    
    let errorMessage = 'Failed to fetch knowledge bases';
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Request timed out - Stack AI API is responding slowly';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST /api/knowledge-bases - Starting request');
    
    // Use server-side authentication instead of client headers
    const authHeaders = await getStackAiApiAuthHeaders();
    console.log('✅ Server-side auth successful, making API call to Stack AI');

    // Parse request body
    const data = await request.json();
    console.log('📝 Creating knowledge base with data:', JSON.stringify(data, null, 2));

    // Support both formats: app/ format and file-picker/ format
    let transformedData;
    if (data.connectionId && data.connectionSourceIds) {
      // app/ format - transform to Stack AI format
      transformedData = {
        connection_id: data.connectionId,
        connection_source_ids: data.connectionSourceIds,
        name: data.name,
        description: data.description || `Knowledge base for selected resources`,
        indexing_params: {
          ocr: false,
          unstructured: true,
          embedding_params: {
            embedding_model: "text-embedding-ada-002",
            api_key: null
          },
          chunker_params: {
            chunk_size: 1500,
            chunk_overlap: 500,
            chunker: "sentence"
          }
        },
        org_level_role: null,
        cron_job_id: null
      };
    } else {
      // file-picker/ format - use as is
      transformedData = data;
    }

    // Create knowledge base via Stack AI API (with extended timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    let response: Response | null = null;

    try {
      response = await fetch(`${API_CONFIG.BASE_URL}/knowledge_bases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(transformedData),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log(`📡 Stack AI API response status: ${response.status}`);

      if (!response.ok) {
        console.log(`❌ Stack AI API error: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to create knowledge base: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - Stack AI knowledge bases API is very slow');
      }
      throw error;
    }

    if (!response) {
      throw new Error('Failed to get response');
    }

    const result = await response.json();
    console.log('✅ Successfully created knowledge base:', result.knowledge_base_id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Failed to create knowledge base:', error);
    
    let errorMessage = 'Failed to create knowledge base';
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Request timed out - Stack AI API is responding slowly';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}