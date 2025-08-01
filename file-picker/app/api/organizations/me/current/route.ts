import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/organizations/me/current - Starting request');
    
    // Get auth headers from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('❌ No authorization header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Auth header found, making API call to Stack AI');

    // Get current organization from Stack AI API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/organizations/me/current`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    console.log(`📡 Stack AI API response status: ${response.status}`);

    if (!response.ok) {
      console.log(`❌ Stack AI API error: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to get current organization: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully fetched current organization:', data.org_id);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Failed to fetch current organization:', error);
    
    let errorMessage = 'Failed to fetch current organization';
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