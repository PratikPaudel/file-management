import { API_CONFIG, DEFAULT_CREDENTIALS } from '@/lib/constants';

// This function is for SERVER-SIDE use only.
export async function getStackAiApiAuthHeaders() {
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

  if (!response.ok) {
    console.error('Stack AI server-side authentication failed.');
    throw new Error('Authentication failed');
  }

  const { access_token } = await response.json();
  return { Authorization: `Bearer ${access_token}` };
} 