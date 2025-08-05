
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/constants';

const KNOWLEDGE_BASE_ID = '93041540-e2f2-409e-a54c-316fb5949713';

async function fetchKnowledgeBase() {
  if (!KNOWLEDGE_BASE_ID) {
    throw new Error('Knowledge Base ID is not configured');
  }
  return api.getKnowledgeBase(KNOWLEDGE_BASE_ID);
}

export function useKnowledgeBase() {
  return useQuery({
    queryKey: QUERY_KEYS.knowledgeBase(KNOWLEDGE_BASE_ID),
    queryFn: fetchKnowledgeBase,
    enabled: !!KNOWLEDGE_BASE_ID,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
