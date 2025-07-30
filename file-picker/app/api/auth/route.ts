import { NextResponse } from 'next/server';
import { DEFAULT_CREDENTIALS, API_CONFIG } from '@/lib/constants';

// This route securely handles authentication on the server-side.
export async function POST() {
  try {
    const { EMAIL, PASSWORD } = DEFAULT_CREDENTIALS;
    if (!EMAIL || !PASSWORD) {
      throw new Error('Server credentials (STACK_AI_EMAIL, STACK_AI_PASSWORD) are not configured in .env.local');
    }

    const requestUrl = `${API_CONFIG.SUPABASE_AUTH_URL}/auth/v1/token?grant_type=password`;
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Apikey': API_CONFIG.ANON_KEY,
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Authentication error from Supabase:", responseData);
      return NextResponse.json(
        { message: `Authentication failed: ${responseData.error_description || response.statusText}` },
        { status: response.status }
      );
    }

    const authHeaders = { Authorization: `Bearer ${responseData.access_token}` };
    
    return NextResponse.json(authHeaders);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error("Auth API route internal error:", message);
    return NextResponse.json({ message }, { status: 500 });
  }
}
