"""
QueryMind — Table Inspector Router
Provides detailed table info, data preview, and statistics endpoints.
"""

import logging
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text, inspect

from db.connector import connection_manager

logger = logging.getLogger("querymind")

router = APIRouter(prefix="/api/schema", tags=["table-inspector"])


# ─── Response models (inline, lightweight) ─────────────────────

from pydantic import BaseModel


class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool = True
    primary_key: bool = False
    default: Optional[str] = None
    foreign_key: Optional[str] = None


class TableInfoResponse(BaseModel):
    table_name: str
    columns: list[ColumnInfo] = []


class TablePreviewResponse(BaseModel):
    columns: list[str] = []
    rows: list[dict[str, Any]] = []
    total_count: int = 0


class TableStatsResponse(BaseModel):
    row_count: int = 0
    col_count: int = 0
    sample_values: dict[str, list[Any]] = {}
    null_ratios: dict[str, float] = {}


# ─── Helpers ───────────────────────────────────────────────────

def _get_engine(db_id: str):
    conn_info = connection_manager.get(db_id)
    if not conn_info:
        raise HTTPException(status_code=404, detail=f"No connection found for db_id: {db_id}")
    return conn_info.engine, conn_info.db_type


def _quote_ident(name: str) -> str:
    """Quote a table or column name to prevent SQL injection."""
    # Double any existing double-quotes and wrap in double-quotes
    return '"' + name.replace('"', '""') + '"'


# ─── Endpoints ─────────────────────────────────────────────────

@router.get("/{db_id}/table/{table_name}/info", response_model=TableInfoResponse)
async def get_table_info(db_id: str, table_name: str):
    """Get detailed column information for a table."""
    engine, db_type = _get_engine(db_id)

    try:
        insp = inspect(engine)
        # Verify table exists
        if table_name not in insp.get_table_names():
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")

        # Get primary keys
        pk_info = insp.get_pk_constraint(table_name)
        pk_columns = set(pk_info.get("constrained_columns", [])) if pk_info else set()

        # Get foreign keys
        fk_map: dict[str, str] = {}
        for fk in insp.get_foreign_keys(table_name):
            for col, ref_col in zip(
                fk.get("constrained_columns", []),
                fk.get("referred_columns", []),
            ):
                ref_table = fk.get("referred_table", "")
                fk_map[col] = f"{ref_table}.{ref_col}"

        columns = []
        for col_info in insp.get_columns(table_name):
            columns.append(ColumnInfo(
                name=col_info["name"],
                type=str(col_info["type"]),
                nullable=col_info.get("nullable", True),
                primary_key=col_info["name"] in pk_columns,
                default=str(col_info["default"]) if col_info.get("default") else None,
                foreign_key=fk_map.get(col_info["name"]),
            ))

        return TableInfoResponse(table_name=table_name, columns=columns)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Table info failed for {table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{db_id}/table/{table_name}/preview", response_model=TablePreviewResponse)
async def get_table_preview(
    db_id: str,
    table_name: str,
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0, ge=0),
):
    """Get a data preview (rows) for a table."""
    engine, db_type = _get_engine(db_id)

    quoted_table = _quote_ident(table_name)

    try:
        with engine.connect() as conn:
            # Get total count
            count_result = conn.execute(text(f"SELECT COUNT(*) FROM {quoted_table}"))
            total_count = count_result.scalar() or 0

            # Get rows
            result = conn.execute(text(
                f"SELECT * FROM {quoted_table} LIMIT :limit OFFSET :offset"
            ), {"limit": limit, "offset": offset})

            columns = list(result.keys())
            rows = [dict(zip(columns, row)) for row in result.fetchall()]

        return TablePreviewResponse(
            columns=columns,
            rows=rows,
            total_count=total_count,
        )

    except Exception as e:
        logger.error(f"Table preview failed for {table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{db_id}/table/{table_name}/stats", response_model=TableStatsResponse)
async def get_table_stats(db_id: str, table_name: str):
    """Get statistics for a table: row count, sample values, null ratios."""
    engine, db_type = _get_engine(db_id)

    quoted_table = _quote_ident(table_name)

    try:
        insp = inspect(engine)
        if table_name not in insp.get_table_names():
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")

        col_infos = insp.get_columns(table_name)
        col_count = len(col_infos)

        with engine.connect() as conn:
            # Row count
            count_result = conn.execute(text(f"SELECT COUNT(*) FROM {quoted_table}"))
            row_count = count_result.scalar() or 0

            sample_values: dict[str, list[Any]] = {}
            null_ratios: dict[str, float] = {}

            for col_info in col_infos:
                col_name = col_info["name"]
                quoted_col = _quote_ident(col_name)

                # Sample distinct values (up to 5)
                try:
                    sample_result = conn.execute(text(
                        f"SELECT DISTINCT {quoted_col} FROM {quoted_table} "
                        f"WHERE {quoted_col} IS NOT NULL LIMIT 5"
                    ))
                    samples = [row[0] for row in sample_result.fetchall()]
                    # Convert to JSON-safe values
                    sample_values[col_name] = [
                        str(v) if not isinstance(v, (int, float, bool, type(None))) else v
                        for v in samples
                    ]
                except Exception:
                    sample_values[col_name] = []

                # Null ratio
                try:
                    if row_count > 0:
                        null_result = conn.execute(text(
                            f"SELECT COUNT(*) FROM {quoted_table} WHERE {quoted_col} IS NULL"
                        ))
                        null_count = null_result.scalar() or 0
                        null_ratios[col_name] = round(null_count / row_count, 4)
                    else:
                        null_ratios[col_name] = 0.0
                except Exception:
                    null_ratios[col_name] = 0.0

        return TableStatsResponse(
            row_count=row_count,
            col_count=col_count,
            sample_values=sample_values,
            null_ratios=null_ratios,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Table stats failed for {table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
