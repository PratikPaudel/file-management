// API Configuration - Using environment variables (no fallbacks for security)
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_STACK_AI_BASE_URL!,
  SUPABASE_AUTH_URL: process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
  ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  TIMEOUT: parseInt(process.env.API_TIMEOUT || '10000', 10),
} as const;

// Default Credentials - Using environment variables (NEVER commit actual values!)
export const DEFAULT_CREDENTIALS = {
  EMAIL: process.env.STACK_AI_EMAIL!,
  PASSWORD: process.env.STACK_AI_PASSWORD!,
} as const;

// Validation functions split by environment context
export const validateClientEnvironmentVariables = () => {
  // Check environment variables directly (works in Next.js client bundle)
  const missing = [];
  
  if (!process.env.NEXT_PUBLIC_STACK_AI_BASE_URL || process.env.NEXT_PUBLIC_STACK_AI_BASE_URL.trim() === '') {
    missing.push('NEXT_PUBLIC_STACK_AI_BASE_URL');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL || process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL.trim() === '') {
    missing.push('NEXT_PUBLIC_SUPABASE_AUTH_URL');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim() === '') {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  if (missing.length > 0) {
    throw new Error(
      `❌ Missing client environment variables: ${missing.join(', ')}\n\n` +
      '🔧 These should be in your .env.local file with NEXT_PUBLIC_ prefix'
    );
  }

  // URL validation using direct environment variable access
  if (!process.env.NEXT_PUBLIC_STACK_AI_BASE_URL!.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_STACK_AI_BASE_URL must be a valid HTTPS URL');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_AUTH_URL must be a valid HTTPS URL');
  }
};

export const validateServerEnvironmentVariables = () => {
  // Only validate server-side variables (not available in browser)
  const required = [
    'STACK_AI_EMAIL',
    'STACK_AI_PASSWORD'
  ];
  
  const missing = required.filter(key => !process.env[key] || process.env[key]?.trim() === '');
  
  if (missing.length > 0) {
    throw new Error(
      `❌ Missing server environment variables: ${missing.join(', ')}\n\n` +
      '🔧 These should be in your .env.local file (without NEXT_PUBLIC_ prefix)'
    );
  }
};

// Combined validation for server-side use
export const validateAllEnvironmentVariables = () => {
  validateClientEnvironmentVariables();
  validateServerEnvironmentVariables();
};

// UI Constants
export const VIEW_MODES = {
  grid: {
    itemHeight: 120,
    itemsPerRow: 4,
    gap: 16,
  },
  list: {
    itemHeight: 60,
    itemsPerRow: 1,
    gap: 8,
  },
} as const;

// File Icons mapping
export const FILE_ICONS = {
  // Folders
  directory: 'folder',
  
  // Documents
  'application/pdf': 'file-text',
  'application/msword': 'file-text',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file-text',
  'text/plain': 'file-text',
  'text/markdown': 'file-text',
  
  // Images
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/svg+xml': 'image',
  
  // Default
  default: 'file',
} as const;

// Status Colors
export const STATUS_COLORS = {
  indexed: 'bg-green-500 text-white',
  indexing: 'bg-amber-500 text-white',
  not_indexed: 'bg-gray-400 text-white',
  error: 'bg-red-500 text-white',
  pending: 'bg-blue-500 text-white',
} as const;

// Animation Durations
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  HOVER_DEBOUNCE: 300,
  POLLING_INTERVAL: 2000,
} as const;

// Query Keys
export const QUERY_KEYS = {
  connections: ['connections'],
  connectionFiles: (connectionId: string, folderId?: string) => 
    ['connection-files', connectionId, folderId],
  knowledgeBases: ['knowledge-bases'],
  knowledgeBaseStatus: (knowledgeBaseId: string, resourceIds: string[]) => 
    ['kb-status', knowledgeBaseId, resourceIds],
  knowledgeBaseFiles: (knowledgeBaseId: string, resourcePath?: string) => 
    ['kb-files', knowledgeBaseId, resourcePath],
} as const;

// Cache Times
export const CACHE_TIME = {
  STALE_TIME: 30 * 1000, // 30 seconds
  CACHE_TIME: 5 * 60 * 1000, // 5 minutes
  PREFETCH_STALE_TIME: 60 * 1000, // 1 minute
} as const;

// Note: Previous implementation used hardcoded values as a simplification,
// but this implementation properly creates knowledge bases dynamically 