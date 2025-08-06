
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';

const KNOWLEDGE_BASE_ID = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_ID!;

// The fetch function now points to our new, specific endpoint
async function fetchKnowledgeBaseById(id: string) {
  if (!id) {
    throw new Error('Knowledge Base ID is not configured');
  }
  const response = await fetch(`/api/knowledge-bases/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch knowledge base details from the new endpoint.');
  }
  return response.json();
}

export function useKnowledgeBase() {
  return useQuery({
    // The query key uniquely identifies this data request
    queryKey: QUERY_KEYS.knowledgeBase(KNOWLEDGE_BASE_ID),
    // We pass the ID to our new fetch function
    queryFn: () => fetchKnowledgeBaseById(KNOWLEDGE_BASE_ID),
    // Only run this query if the ID is actually present
    enabled: !!KNOWLEDGE_BASE_ID,
    // Keep data fresh, but not excessively
    staleTime: 60 * 1000, // 1 minute
  });
}
