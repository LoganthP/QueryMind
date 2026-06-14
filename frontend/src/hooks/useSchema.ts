/**
 * QueryMind — useSchema Hook
 * TanStack Query hook for fetching and caching database schema.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { SchemaResponse } from '../api/client';

export function useSchema(dbId: string) {
  const query = useQuery<SchemaResponse>({
    queryKey: ['schema', dbId],
    queryFn: () => api.getSchema(dbId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!dbId,
  });

  return {
    schema: query.data,
    tables: query.data?.tables ?? [],
    dialect: query.data?.dialect ?? 'sqlite',
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
