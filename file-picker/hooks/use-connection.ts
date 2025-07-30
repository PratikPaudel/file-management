import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/constants';
import type { Connection, GetConnectionFilesParams } from '@/lib/types';

export function useConnections(provider: string = 'gdrive') {
  return useQuery({
    queryKey: [...QUERY_KEYS.connections, provider],
    queryFn: () => api.getConnections(provider),
  });
}

export function useConnectionFiles(params: GetConnectionFilesParams) {
  return useQuery({
    queryKey: QUERY_KEYS.connectionFiles(params.connectionId, params.resourceId),
    queryFn: () => api.getConnectionFiles(params),
    enabled: !!params.connectionId,
  });
} 