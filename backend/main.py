"""
QueryMind — FastAPI Application
Main entry point for the backend API.

Endpoints:
  POST /api/query      — Convert NL to SQL, execute, return results
  POST /api/connect    — Establish a database connection
  POST /api/upload-db  — Upload a SQLite file
  GET  /api/schema/:id — Get full schema for a connection
  GET  /api/history    — Get query history
  GET  /api/health     — Health check
  GET  /health         — Simple health check for Docker
"""

import os
import time
import uuid
import shutil
import logging
from collections import defaultdict
from datetime import datetime
from typing import Optional
from pathlib import Path
import httpx

from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text, inspect

from config import settings
from models import (
    QueryRequest, QueryResponse,
    ConnectionRequest, ConnectionResponse, ConnectionStatus,
    SchemaResponse,
    HistoryEntry, HistoryResponse,
    ModelsResponse, ModelInfo,
)
from db.connector import connection_manager
from db.schema import introspect_schema, schema_cache
from chains.sql_chain import QueryMindChain
from chains.safety import SQLSafetyValidator
from seed import seed_database
from routers.table_inspector import router as table_inspector_router


# ─── Logging setup ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("querymind")


# ─── FastAPI app ───────────────────────────────────────────────
app = FastAPI(
    title="QueryMind API",
    description="AI-powered natural language to SQL assistant",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(table_inspector_router)


# ─── In-memory stores ─────────────────────────────────────────
# Query history (server-side log, last 50 per session)
query_history: list[HistoryEntry] = []

# Rate limiter: session_id -> list of timestamps
rate_limits: dict[str, list[float]] = defaultdict(list)


# ─── Rate limiting middleware ──────────────────────────────────
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Enforce rate limiting: max N requests/min per session on /api/query."""
    if request.url.path == "/api/query" and request.method == "POST":
        session_id = request.headers.get("x-session-id", "anonymous")
        now = time.time()

        # Clean old timestamps (older than 60 seconds)
        rate_limits[session_id] = [
            ts for ts in rate_limits[session_id] if now - ts < 60
        ]

        if len(rate_limits[session_id]) >= settings.rate_limit_per_minute:
            return JSONResponse(
                status_code=429,
                content={
                    "error": f"Rate limit exceeded. Maximum {settings.rate_limit_per_minute} "
                    f"requests per minute. Please wait and try again."
                },
            )

        rate_limits[session_id].append(now)

    return await call_next(request)


# ─── Startup event ─────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Initialize the app: seed sample DB and create default connection."""
    logger.info("Starting QueryMind API...")

    # Seed sample database if needed
    db_path = os.path.abspath(settings.default_db_path)
    was_seeded = seed_database(db_path)
    if was_seeded:
        logger.info(f"Created sample database at {db_path}")
    else:
        logger.info(f"Using existing database at {db_path}")

    # Create default connection to sample DB
    try:
        db_id, tables = connection_manager.connect(
            db_type="sqlite",
            db_path=db_path,
            name="Sample Database",
            db_id="default",
        )
        logger.info(f"Default connection '{db_id}' established with tables: {tables}")
    except Exception as e:
        logger.error(f"Failed to connect to default database: {e}")

    # Check API key status
    if settings.has_api_key:
        logger.info("OpenRouter API key configured — AI features enabled")
    else:
        logger.warning(
            "No OpenRouter API key configured — AI features will be unavailable. "
            "Set OPENROUTER_API_KEY in your .env file."
        )


# ─── Health check ──────────────────────────────────────────────
@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Simple health check endpoint."""
    return {
        "status": "healthy",
        "api_key_configured": settings.has_api_key,
        "connections": connection_manager.count,
        "timestamp": datetime.now().isoformat(),
    }


# ─── Connection endpoints ─────────────────────────────────────
@app.post("/api/connect", response_model=ConnectionResponse)
async def connect_database(request: ConnectionRequest):
    """
    Establish a new database connection.
    Supports SQLite (path), PostgreSQL, and MySQL.
    """
    try:
        db_id, tables = connection_manager.connect(
            db_type=request.db_type,
            connection_string=request.connection_string,
            db_path=request.connection_string if request.db_type == "sqlite" else "",
            name=request.name,
        )
        # Count columns across all tables
        col_count = 0
        try:
            insp = inspect(connection_manager.get(db_id).engine)
            for t in tables:
                col_count += len(insp.get_columns(t))
        except Exception:
            pass

        logger.info(f"New connection '{db_id}' ({request.db_type}): {tables}")
        return ConnectionResponse(
            db_id=db_id,
            status="connected",
            tables=tables,
            message=f"Connected to {request.name} ({request.db_type})",
            table_count=len(tables),
            column_count=col_count,
        )
    except Exception as e:
        logger.error(f"Connection failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/upload-db", response_model=ConnectionResponse)
async def upload_database(file: UploadFile = File(...)):
    """Upload a SQLite database file and connect to it."""
    valid_extensions = (".db", ".sqlite", ".sqlite3")
    if not file.filename or not any(file.filename.endswith(ext) for ext in valid_extensions):
        raise HTTPException(status_code=400, detail="Only .db, .sqlite, .sqlite3 files are accepted.")

    # Save the uploaded file
    upload_dir = Path("./uploads")
    upload_dir.mkdir(exist_ok=True)
    db_path = upload_dir / f"{uuid.uuid4().hex[:8]}_{file.filename}"

    with open(db_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        db_id, tables = connection_manager.connect(
            db_type="sqlite",
            db_path=str(db_path.absolute()),
            name=file.filename,
        )
        # Count columns across all tables
        col_count = 0
        try:
            insp = inspect(connection_manager.get(db_id).engine)
            for t in tables:
                col_count += len(insp.get_columns(t))
        except Exception:
            pass

        return ConnectionResponse(
            db_id=db_id,
            status="connected",
            tables=tables,
            message=f"Uploaded and connected to {file.filename}",
            table_count=len(tables),
            column_count=col_count,
        )
    except Exception as e:
        # Clean up the file on failure
        db_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/connection-status/{db_id}", response_model=ConnectionStatus)
async def connection_status(db_id: str):
    """Check the health status of a database connection."""
    status, latency = connection_manager.health_check(db_id)
    return ConnectionStatus(db_id=db_id, status=status, latency_ms=round(latency, 2))


# ─── Schema endpoint ──────────────────────────────────────────
@app.get("/api/schema/{db_id}", response_model=SchemaResponse)
async def get_schema(db_id: str):
    """Get the full schema for a connected database."""
    conn_info = connection_manager.get(db_id)
    if not conn_info:
        raise HTTPException(status_code=404, detail=f"No connection found for db_id: {db_id}")

    try:
        schema = introspect_schema(
            engine=conn_info.engine,
            db_id=db_id,
            db_type=conn_info.db_type,
        )
        return schema
    except Exception as e:
        logger.error(f"Schema introspection failed for '{db_id}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Query endpoint ───────────────────────────────────────────
@app.post("/api/query", response_model=QueryResponse)
async def execute_query(
    request: QueryRequest,
    x_session_id: Optional[str] = Header(default=None),
):
    """
    Core endpoint: Convert natural language to SQL, validate, execute, and return results.

    Pipeline:
    1. Validate the connection exists
    2. Sanitize the NL input
    3. Generate SQL via LangChain + Claude
    4. Validate SQL safety
    5. Execute the query
    6. Return results with explanation
    """
    session_id = x_session_id or "anonymous"
    start_time = time.time()

    # Step 1: Get the database connection
    conn_info = connection_manager.get(request.db_id)
    if not conn_info:
        raise HTTPException(
            status_code=404,
            detail=f"No connection found for db_id: {request.db_id}. "
            f"Please connect to a database first.",
        )

    # Check write mode permissions
    if request.write_mode and not settings.write_mode_enabled:
        raise HTTPException(
            status_code=403,
            detail="Write mode is disabled globally. Set WRITE_MODE_ENABLED=true in .env to enable.",
        )

    try:
        # Step 2-4: Generate SQL, validate, and get explanation
        chain = QueryMindChain(db=conn_info.db, dialect=conn_info.db_type, model_id=request.model_id)
        sql, explanation, is_safe, safety_msg = chain.generate_and_validate(
            natural_language=request.natural_language,
            write_mode=request.write_mode,
        )

        if not is_safe:
            # Log the blocked query
            _log_query(session_id, request.natural_language, sql, 0, safety_msg)
            return QueryResponse(
                sql=sql,
                explanation="",
                error=safety_msg,
                execution_time_ms=_elapsed_ms(start_time),
            )

        # Step 5: Execute the SQL query
        results = []
        columns = []
        row_count = 0

        try:
            with conn_info.engine.connect() as connection:
                result = connection.execute(text(sql))

                # Get column names from the cursor
                if result.returns_rows:
                    columns = list(result.keys())
                    rows = result.fetchmany(settings.max_rows_returned)
                    results = [dict(zip(columns, row)) for row in rows]
                    row_count = len(results)

                    # If there might be more rows, get the total count
                    # (we already fetched up to max_rows_returned)
                    remaining = result.fetchall()
                    row_count += len(remaining)
                else:
                    row_count = result.rowcount if result.rowcount >= 0 else 0
        except Exception as exec_err:
            error_msg = str(exec_err)
            logger.error(f"SQL execution error: {error_msg}")
            _log_query(session_id, request.natural_language, sql, 0, error_msg)

            # Provide helpful error suggestions
            suggestion = _suggest_fix(error_msg)

            return QueryResponse(
                sql=sql,
                explanation=explanation,
                error=f"SQL execution error: {error_msg}\n\n{suggestion}",
                execution_time_ms=_elapsed_ms(start_time),
            )

        # Step 6: Log and return results
        elapsed = _elapsed_ms(start_time)
        _log_query(session_id, request.natural_language, sql, row_count)

        return QueryResponse(
            sql=sql,
            explanation=explanation,
            results=results[:settings.max_rows_returned],
            columns=columns,
            row_count=row_count,
            execution_time_ms=elapsed,
        )

    except RuntimeError as e:
        # API key not configured
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Query processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# ─── History endpoint ──────────────────────────────────────────
@app.get("/api/history", response_model=HistoryResponse)
async def get_history(
    x_session_id: Optional[str] = Header(default=None),
    limit: int = 50,
):
    """Get query history for the current session."""
    session_id = x_session_id or "anonymous"

    # Filter by session
    session_history = [
        entry for entry in query_history
        if entry.session_id == session_id
    ]

    # Return most recent first, limited
    recent = list(reversed(session_history[-limit:]))

    return HistoryResponse(entries=recent, total=len(session_history))


# ─── Models endpoint ─────────────────────────────────────────────
@app.get("/api/models", response_model=ModelsResponse)
async def get_models():
    """Fetch available models from OpenRouter."""
    if not settings.has_api_key:
        return ModelsResponse(models=[ModelInfo(id=settings.model_id, name="Default Model (No API Key)")])
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
                timeout=5.0
            )
            response.raise_for_status()
            data = response.json()
            models = []
            for item in data.get("data", []):
                # Filter to common models to keep the list manageable if desired,
                # or return all. We return all here.
                models.append(ModelInfo(id=item["id"], name=item.get("name", item["id"])))
            
            # Sort alphabetically by name
            models.sort(key=lambda m: m.name)
            return ModelsResponse(models=models)
    except Exception as e:
        logger.error(f"Failed to fetch OpenRouter models: {e}")
        # Fallback to default
        return ModelsResponse(models=[ModelInfo(id=settings.model_id, name="Default Model (Fallback)")])


# ─── Helper functions ──────────────────────────────────────────
def _log_query(
    session_id: str,
    natural_language: str,
    sql: str,
    row_count: int,
    error: Optional[str] = None,
):
    """Log a query to server-side history."""
    entry = HistoryEntry(
        id=uuid.uuid4().hex[:12],
        natural_language=natural_language,
        sql=sql,
        row_count=row_count,
        timestamp=datetime.now().isoformat(),
        session_id=session_id,
        error=error,
    )
    query_history.append(entry)

    # Keep only the last 500 entries total (across all sessions)
    while len(query_history) > 500:
        query_history.pop(0)

    # Server-side log
    logger.info(
        f"[{session_id[:8]}] NL: \"{natural_language[:60]}\" | "
        f"SQL: \"{sql[:80]}\" | Rows: {row_count}"
        + (f" | Error: {error[:50]}" if error else "")
    )


def _elapsed_ms(start: float) -> float:
    """Calculate elapsed time in milliseconds."""
    return round((time.time() - start) * 1000, 2)


def _suggest_fix(error_msg: str) -> str:
    """Provide helpful suggestions based on common SQL errors."""
    msg = error_msg.lower()

    if "no such table" in msg:
        return "Suggestion: Check the schema tree to verify table names. Table names are case-sensitive in some databases."
    elif "no such column" in msg:
        return "Suggestion: Verify column names in the schema tree. Try rephrasing your question with exact column names."
    elif "syntax error" in msg:
        return "Suggestion: The generated SQL has a syntax error. Try rephrasing your question more specifically."
    elif "ambiguous column" in msg:
        return "Suggestion: Multiple tables have a column with this name. Try specifying which table you mean."
    elif "near" in msg:
        return "Suggestion: There's a syntax issue near the indicated position. Try simplifying your question."
    else:
        return "Suggestion: Try rephrasing your question or check the database schema for correct table/column names."
