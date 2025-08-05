import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';
import { getStackAiApiAuthHeaders } from '@/lib/server-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    // Use server-side authentication instead of client headers
    const authHeaders = await getStackAiApiAuthHeaders();

    // Get the connection ID from the route params
    const { connectionId } = await params;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resource_id');
    const cursor = searchParams.get('cursor');
    const pageSize = parseInt(searchParams.get('page_size') || '100', 10);
    const searchQuery = searchParams.get('search_query');

    // Build API URL
    let apiUrl: string;
    const queryParams = new URLSearchParams();
    
    if (searchQuery) {
      // Use search endpoint if search query is provided
      apiUrl = `${API_CONFIG.BASE_URL}/connections/${connectionId}/resources/search`;
      queryParams.append('search_query', searchQuery);
    } else {
      // Use children endpoint to get files in a directory
      apiUrl = `${API_CONFIG.BASE_URL}/connections/${connectionId}/resources/children`;
    }

    // Add optional parameters
    if (resourceId) {
      queryParams.append('resource_id', resourceId);
    }
    if (cursor) {
      queryParams.append('cursor', cursor);
    }
    queryParams.append('page_size', pageSize.toString());

    // Make the API call with timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response | null = null;
    let retries = 2;
    
    while (retries >= 0) {
      try {
        response = await fetch(`${apiUrl}?${queryParams}`, {
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
            throw new Error('Request timeout - Stack AI API is not responding');
          }
          throw error;
        }
        
        // Wait 1 second before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`Retrying API call, ${retries} attempts remaining...`);
      }
    }

    if (!response) {
      throw new Error('Failed to get response after retries');
    }

    const data = await response.json();

    // Transform the response to match expected format
    const files = Array.isArray(data) ? data : (data.data || []);
    const hasMore = files.length === pageSize;

    return NextResponse.json({
      data: files,
      total: files.length,
      hasMore,
      cursor: hasMore ? `next-${cursor || 'start'}` : null,
    });
  } catch (error) {
    console.error('Failed to fetch connection files:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch files';
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Request timed out - Stack AI API is responding slowly. Please try again.';
      } else if (error.message.includes('ECONNRESET') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}