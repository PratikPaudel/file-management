import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly define environment variables for client-side
  env: {
    NEXT_PUBLIC_STACK_AI_BASE_URL: process.env.NEXT_PUBLIC_STACK_AI_BASE_URL,
    NEXT_PUBLIC_SUPABASE_AUTH_URL: process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default nextConfig;