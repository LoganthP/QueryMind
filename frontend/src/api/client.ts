/**
 * QueryMind — API Client
 * Type-safe fetch wrapper for all backend endpoints.
 * Handles session tracking, error parsing, and base URL configuration.
 */

// ─── Types (matching backend Pydantic models) ─────────────────

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  default: string | null;
  foreign_key: string | null;
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  row_count: number;
}

export interface SchemaResponse {
  db_id: string;
  tables: TableSchema[];
  dialect: string;
}

export interface QueryRequest {
  natural_language: string;
  db_id: string;
  write_mode: boolean;
  model_id?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
}

export interface ModelsResponse {
  models: ModelInfo[];
}

export interface QueryResponse {
  sql: string;
  explanation: string;
  results: Record<string, unknown>[];
  columns: string[];
  row_count: number;
  error: string | null;
  execution_time_ms: number;
}

export interface ConnectionRequest {
  db_type: string;
  connection_string: string;
  name: string;
}

export interface ConnectionResponse {
  db_id: string;
  status: string;
  tables: string[];
  message: string;
  table_count: number;
  column_count: number;
}

export interface ConnectionStatus {
  db_id: string;
  status: 'green' | 'yellow' | 'red';
  latency_ms: number;
}

export interface HistoryEntry {
  id: string;
  natural_language: string;
  sql: string;
  row_count: number;
  timestamp: string;
  session_id: string;
  error: string | null;
}

export interface HistoryResponse {
  entries: HistoryEntry[];
  total: number;
}

export interface HealthCheck {
  status: string;
  api_key_configured: boolean;
  connections: number;
  timestamp: string;
}

// ─── Table Inspector Types ────────────────────────────────────

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  default: string | null;
  foreign_key: string | null;
}

export interface TableInfoResponse {
  table_name: string;
  columns: ColumnInfo[];
}

export interface TablePreviewResponse {
  columns: string[];
  rows: Record<string, unknown>[];
  total_count: number;
}

export interface TableStatsResponse {
  row_count: number;
  col_count: number;
  sample_values: Record<string, unknown[]>;
  null_ratios: Record<string, number>;
}

// ─── Session Management ───────────────────────────────────────

const SESSION_KEY = 'querymind_session_id';

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// ─── API Client ───────────────────────────────────────────────

const BASE_URL = '/api';

class ApiError extends Error {
  status: number;
  constructor(
    status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const sessionId = getSessionId();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail || body.error || 'Unknown error');
  }

  return res.json();
}

// ─── API Functions ────────────────────────────────────────────

export const api = {
  /** Convert natural language to SQL and execute */
  query(req: QueryRequest): Promise<QueryResponse> {
    return request<QueryResponse>('/query', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /** Establish a database connection */
  connect(req: ConnectionRequest): Promise<ConnectionResponse> {
    return request<ConnectionResponse>('/connect', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /** Upload a SQLite database file */
  async uploadDb(file: File): Promise<ConnectionResponse> {
    const sessionId = getSessionId();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/upload-db`, {
      method: 'POST',
      headers: { 'X-Session-ID': sessionId },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new ApiError(res.status, body.detail || 'Upload failed');
    }

    return res.json();
  },

  /** Get schema for a connected database */
  getSchema(dbId: string): Promise<SchemaResponse> {
    return request<SchemaResponse>(`/schema/${dbId}`);
  },

  /** Check connection health */
  getConnectionStatus(dbId: string): Promise<ConnectionStatus> {
    return request<ConnectionStatus>(`/connection-status/${dbId}`);
  },

  /** Get query history */
  getHistory(limit = 50): Promise<HistoryResponse> {
    return request<HistoryResponse>(`/history?limit=${limit}`);
  },

  /** Get OpenRouter models */
  getModels(): Promise<ModelsResponse> {
    return request<ModelsResponse>('/models');
  },

  /** Health check */
  healthCheck(): Promise<HealthCheck> {
    return request<HealthCheck>('/health');
  },

  /** Table Inspector: column info */
  getTableInfo(dbId: string, tableName: string): Promise<TableInfoResponse> {
    return request<TableInfoResponse>(`/schema/${dbId}/table/${encodeURIComponent(tableName)}/info`);
  },

  /** Table Inspector: data preview */
  getTablePreview(dbId: string, tableName: string, limit = 50, offset = 0): Promise<TablePreviewResponse> {
    return request<TablePreviewResponse>(`/schema/${dbId}/table/${encodeURIComponent(tableName)}/preview?limit=${limit}&offset=${offset}`);
  },

  /** Table Inspector: statistics */
  getTableStats(dbId: string, tableName: string): Promise<TableStatsResponse> {
    return request<TableStatsResponse>(`/schema/${dbId}/table/${encodeURIComponent(tableName)}/stats`);
  },
};

export { ApiError, getSessionId };
