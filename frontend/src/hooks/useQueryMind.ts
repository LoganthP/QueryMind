/**
 * QueryMind — useQueryMind Hook
 * TanStack Query mutation for the NL → SQL → execute pipeline.
 */

import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import type { QueryRequest, QueryResponse } from '../api/client';

export function useQueryMind() {
  const mutation = useMutation<QueryResponse, Error, QueryRequest>({
    mutationFn: (req) => api.query(req),
  });

  return {
    runQuery: mutation.mutate,
    runQueryAsync: mutation.mutateAsync,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
