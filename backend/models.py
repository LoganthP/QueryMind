"""
QueryMind Pydantic Models
Request/response schemas for all API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


# ─── Connection Models ─────────────────────────────────────────

class ConnectionRequest(BaseModel):
    """Request to establish a database connection."""
    db_type: str = Field(..., description="Database type: sqlite, postgresql, mysql")
    connection_string: str = Field(default="", description="Connection string (for pg/mysql)")
    name: str = Field(default="default", description="Friendly name for this connection")
    # For SQLite file uploads, the file is sent via multipart form


class ConnectionResponse(BaseModel):
    """Response after establishing a database connection."""
    db_id: str
    status: str = Field(..., description="connected | error")
    tables: list[str] = []
    message: str = ""
    table_count: int = 0
    column_count: int = 0


class ConnectionStatus(BaseModel):
    """Health status of a database connection."""
    db_id: str
    status: str = Field(..., description="green | yellow | red")
    latency_ms: float = 0.0


# ─── Schema Models ─────────────────────────────────────────────

class ColumnSchema(BaseModel):
    """Schema information for a single column."""
    name: str
    type: str
    nullable: bool = True
    primary_key: bool = False
    default: Optional[str] = None
    foreign_key: Optional[str] = None  # e.g. "orders.user_id"


class TableSchema(BaseModel):
    """Schema information for a single table."""
    name: str
    columns: list[ColumnSchema] = []
    row_count: int = 0


class SchemaResponse(BaseModel):
    """Full database schema response."""
    db_id: str
    tables: list[TableSchema] = []
    dialect: str = "sqlite"


# ─── Query Models ──────────────────────────────────────────────

class QueryRequest(BaseModel):
    """Request to convert natural language to SQL and execute."""
    natural_language: str = Field(..., min_length=1, max_length=2000)
    db_id: str = Field(default="default")
    write_mode: bool = Field(default=False, description="Allow destructive SQL")
    model_id: Optional[str] = Field(default=None, description="OpenRouter model ID")


class ModelInfo(BaseModel):
    """Information about an available OpenRouter model."""
    id: str
    name: str


class ModelsResponse(BaseModel):
    """Response containing available models."""
    models: list[ModelInfo] = []


class QueryResponse(BaseModel):
    """Response containing generated SQL, results, and explanation."""
    sql: str = ""
    explanation: str = ""
    results: list[dict[str, Any]] = []
    columns: list[str] = []
    row_count: int = 0
    error: Optional[str] = None
    execution_time_ms: float = 0.0


# ─── History Models ────────────────────────────────────────────

class HistoryEntry(BaseModel):
    """A single query history entry."""
    id: str
    natural_language: str
    sql: str
    row_count: int = 0
    timestamp: str
    session_id: str
    error: Optional[str] = None


class HistoryResponse(BaseModel):
    """Response containing query history."""
    entries: list[HistoryEntry] = []
    total: int = 0
