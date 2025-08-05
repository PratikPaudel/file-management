import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/constants';
import { getStackAiApiAuthHeaders } from '@/lib/server-auth';

export async function GET() {
  try {
    console.log('🔍 GET /api/organizations/me/current - Starting request');
    
    // Use server-side authentication instead of client headers
    const authHeaders = await getStackAiApiAuthHeaders();
    console.log('✅ Server-side auth successful, making API call to Stack AI');

    // Get current organization from Stack AI API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/organizations/me/current`, {
      method: 'GET',
      headers: authHeaders,
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