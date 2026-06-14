/**
 * QueryMind — useConnection Hook
 * Manages active database connection state and health polling.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { ConnectionRequest, ConnectionResponse, ConnectionStatus } from '../api/client';

export function useConnection() {
  const [dbId, setDbId] = useState<string>('default');
  const [dbName, setDbName] = useState<string>('Sample Database');
  const [lastConnectionData, setLastConnectionData] = useState<ConnectionResponse | null>(null);

  // Connection mutation
  const connectMutation = useMutation<ConnectionResponse, Error, ConnectionRequest>({
    mutationFn: (req) => api.connect(req),
    onSuccess: (data) => {
      setDbId(data.db_id);
      setDbName(data.message);
      setLastConnectionData(data);
    },
  });

  // Upload mutation
  const uploadMutation = useMutation<ConnectionResponse, Error, File>({
    mutationFn: (file) => api.uploadDb(file),
    onSuccess: (data) => {
      setDbId(data.db_id);
      setDbName(data.message);
      setLastConnectionData(data);
    },
  });

  // Health check polling (every 30 seconds)
  const healthQuery = useQuery<ConnectionStatus>({
    queryKey: ['connection-status', dbId],
    queryFn: () => api.getConnectionStatus(dbId),
    refetchInterval: 30_000,
    enabled: !!dbId,
  });

  const connect = useCallback(
    (req: ConnectionRequest) => connectMutation.mutateAsync(req),
    [connectMutation],
  );

  const uploadDb = useCallback(
    (file: File) => uploadMutation.mutateAsync(file),
    [uploadMutation],
  );

  return {
    dbId,
    dbName,
    status: healthQuery.data?.status ?? 'yellow',
    latency: healthQuery.data?.latency_ms ?? 0,
    connect,
    uploadDb,
    isConnecting: connectMutation.isPending || uploadMutation.isPending,
    connectionError: connectMutation.error || uploadMutation.error,
    connectionData: lastConnectionData,
  };
}
