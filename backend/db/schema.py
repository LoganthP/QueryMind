"""
QueryMind — Schema Introspection
Extracts detailed schema information from connected databases
including tables, columns, types, foreign keys, and row counts.
"""

import time
from typing import Optional
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from models import TableSchema, ColumnSchema, SchemaResponse


class SchemaCache:
    """Simple TTL cache for schema data."""

    def __init__(self, ttl_seconds: int = 300):
        self._cache: dict[str, tuple[float, SchemaResponse]] = {}
        self._ttl = ttl_seconds

    def get(self, db_id: str) -> Optional[SchemaResponse]:
        """Get cached schema if not expired."""
        if db_id in self._cache:
            timestamp, schema = self._cache[db_id]
            if time.time() - timestamp < self._ttl:
                return schema
            # Expired, remove
            del self._cache[db_id]
        return None

    def set(self, db_id: str, schema: SchemaResponse):
        """Cache a schema response."""
        self._cache[db_id] = (time.time(), schema)

    def invalidate(self, db_id: str):
        """Remove a cached schema."""
        self._cache.pop(db_id, None)


# Singleton cache
schema_cache = SchemaCache()


def introspect_schema(engine: Engine, db_id: str, db_type: str = "sqlite") -> SchemaResponse:
    """
    Introspect the full schema of a database.

    Uses SQLAlchemy's inspect() to extract tables, columns, types,
    primary keys, foreign keys, and approximate row counts.

    Args:
        engine: SQLAlchemy engine for the target database.
        db_id: The connection identifier.
        db_type: Database dialect ('sqlite', 'postgresql', 'mysql').

    Returns:
        SchemaResponse with complete schema information.
    """
    # Check cache first
    cached = schema_cache.get(db_id)
    if cached:
        return cached

    inspector = inspect(engine)
    tables: list[TableSchema] = []

    for table_name in inspector.get_table_names():
        # Get columns
        columns: list[ColumnSchema] = []
        pk_columns = set()

        # Get primary keys
        pk_info = inspector.get_pk_constraint(table_name)
        if pk_info:
            pk_columns = set(pk_info.get("constrained_columns", []))

        # Get foreign keys for quick lookup
        fk_map: dict[str, str] = {}
        for fk in inspector.get_foreign_keys(table_name):
            for col, ref_col in zip(
                fk.get("constrained_columns", []),
                fk.get("referred_columns", []),
            ):
                ref_table = fk.get("referred_table", "")
                fk_map[col] = f"{ref_table}.{ref_col}"

        # Build column list
        for col_info in inspector.get_columns(table_name):
            col = ColumnSchema(
                name=col_info["name"],
                type=str(col_info["type"]),
                nullable=col_info.get("nullable", True),
                primary_key=col_info["name"] in pk_columns,
                default=str(col_info["default"]) if col_info.get("default") else None,
                foreign_key=fk_map.get(col_info["name"]),
            )
            columns.append(col)

        # Get approximate row count
        row_count = 0
        try:
            with engine.connect() as conn:
                result = conn.execute(text(f"SELECT COUNT(*) FROM \"{table_name}\""))
                row_count = result.scalar() or 0
        except Exception:
            pass  # Some tables may not be queryable

        tables.append(TableSchema(
            name=table_name,
            columns=columns,
            row_count=row_count,
        ))

    schema = SchemaResponse(
        db_id=db_id,
        tables=tables,
        dialect=db_type,
    )

    # Cache the result
    schema_cache.set(db_id, schema)

    return schema
