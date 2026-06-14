"""
QueryMind — Multi-Database Connection Manager
Manages connections to SQLite, PostgreSQL, and MySQL databases.
Each connection is tracked by a unique db_id and includes health monitoring.
"""

import uuid
import time
from typing import Dict, Optional, Tuple
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine import Engine
from langchain_community.utilities import SQLDatabase


class ConnectionInfo:
    """Tracks a single database connection and its metadata."""

    def __init__(self, engine: Engine, db: SQLDatabase, db_type: str, name: str):
        self.engine = engine
        self.db = db
        self.db_type = db_type
        self.name = name
        self.created_at = time.time()
        self.last_used = time.time()

    def touch(self):
        """Update last-used timestamp."""
        self.last_used = time.time()

    @property
    def age_seconds(self) -> float:
        return time.time() - self.created_at

    @property
    def idle_seconds(self) -> float:
        return time.time() - self.last_used


class ConnectionManager:
    """
    Manages multiple database connections identified by db_id.
    Supports SQLite, PostgreSQL, and MySQL.
    Connections auto-expire after 1 hour of inactivity.
    """

    # Connection timeout: 1 hour
    IDLE_TIMEOUT = 3600

    def __init__(self):
        self._connections: Dict[str, ConnectionInfo] = {}

    def connect(
        self,
        db_type: str,
        connection_string: str = "",
        db_path: str = "",
        name: str = "default",
        db_id: Optional[str] = None,
    ) -> Tuple[str, list[str]]:
        """
        Establish a new database connection.

        Args:
            db_type: One of 'sqlite', 'postgresql', 'mysql'.
            connection_string: Full connection URI (for pg/mysql).
            db_path: File path for SQLite databases.
            name: Friendly name for the connection.
            db_id: Optional custom ID; auto-generated if not provided.

        Returns:
            Tuple of (db_id, list_of_table_names).

        Raises:
            ValueError: If db_type is unsupported or connection fails.
        """
        # Build the SQLAlchemy URI based on database type
        if db_type == "sqlite":
            if not db_path:
                raise ValueError("SQLite requires a file path (db_path).")
            uri = f"sqlite:///{db_path}"
        elif db_type == "postgresql":
            if not connection_string:
                raise ValueError("PostgreSQL requires a connection string.")
            uri = connection_string
            if not uri.startswith("postgresql"):
                uri = f"postgresql://{uri}"
        elif db_type == "mysql":
            if not connection_string:
                raise ValueError("MySQL requires a connection string.")
            uri = connection_string
            if not uri.startswith("mysql"):
                uri = f"mysql+pymysql://{uri}"
        else:
            raise ValueError(f"Unsupported database type: {db_type}")

        # Create the SQLAlchemy engine and LangChain SQLDatabase wrapper
        engine = create_engine(uri, echo=False)

        # Verify connection works
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        # Create the LangChain SQLDatabase for schema introspection
        db = SQLDatabase.from_uri(uri)

        # Generate or use provided db_id
        final_id = db_id or str(uuid.uuid4())[:8]

        # Store the connection
        self._connections[final_id] = ConnectionInfo(
            engine=engine, db=db, db_type=db_type, name=name
        )

        # Get table names
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        return final_id, tables

    def get(self, db_id: str) -> Optional[ConnectionInfo]:
        """Get a connection by ID, updating its last-used timestamp."""
        conn = self._connections.get(db_id)
        if conn:
            conn.touch()
        return conn

    def get_engine(self, db_id: str) -> Optional[Engine]:
        """Get the SQLAlchemy engine for a connection."""
        conn = self.get(db_id)
        return conn.engine if conn else None

    def get_langchain_db(self, db_id: str) -> Optional[SQLDatabase]:
        """Get the LangChain SQLDatabase for a connection."""
        conn = self.get(db_id)
        return conn.db if conn else None

    def health_check(self, db_id: str) -> Tuple[str, float]:
        """
        Check the health of a connection.

        Returns:
            Tuple of (status, latency_ms).
            Status is 'green' (<100ms), 'yellow' (<500ms), or 'red' (failed/slow).
        """
        conn = self._connections.get(db_id)
        if not conn:
            return "red", 0.0

        try:
            start = time.time()
            with conn.engine.connect() as c:
                c.execute(text("SELECT 1"))
            latency = (time.time() - start) * 1000  # ms

            if latency < 100:
                return "green", latency
            elif latency < 500:
                return "yellow", latency
            else:
                return "red", latency
        except Exception:
            return "red", 0.0

    def disconnect(self, db_id: str) -> bool:
        """Remove a connection."""
        conn = self._connections.pop(db_id, None)
        if conn:
            conn.engine.dispose()
            return True
        return False

    def cleanup_stale(self):
        """Remove connections that have been idle beyond the timeout."""
        stale_ids = [
            db_id
            for db_id, conn in self._connections.items()
            if conn.idle_seconds > self.IDLE_TIMEOUT
        ]
        for db_id in stale_ids:
            self.disconnect(db_id)
        return stale_ids

    def list_connections(self) -> list[dict]:
        """List all active connections."""
        return [
            {
                "db_id": db_id,
                "name": conn.name,
                "db_type": conn.db_type,
                "idle_seconds": round(conn.idle_seconds),
            }
            for db_id, conn in self._connections.items()
        ]

    @property
    def count(self) -> int:
        return len(self._connections)


# Singleton connection manager
connection_manager = ConnectionManager()
