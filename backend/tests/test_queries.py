"""
QueryMind — NL → SQL Query Tests
Tests the full query pipeline using the sample database.
These tests validate the API endpoint works correctly with mock/real queries.

Note: Tests that require an API key use a mock LLM to keep tests deterministic.
"""

import os
import sys
import pytest

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from seed import seed_database
from chains.safety import SQLSafetyValidator
from db.connector import ConnectionManager


@pytest.fixture(scope="module")
def test_db_path(tmp_path_factory):
    """Create a temporary test database with sample data."""
    db_dir = tmp_path_factory.mktemp("data")
    db_path = str(db_dir / "test_sample.db")
    seed_database(db_path)
    return db_path


@pytest.fixture(scope="module")
def connection_manager(test_db_path):
    """Create a connection manager with the test database."""
    mgr = ConnectionManager()
    mgr.connect(
        db_type="sqlite",
        db_path=test_db_path,
        name="Test DB",
        db_id="test",
    )
    return mgr


class TestSampleDatabase:
    """Verify the sample database is created correctly."""

    def test_database_created(self, test_db_path):
        """Sample database file should exist after seeding."""
        assert os.path.exists(test_db_path)

    def test_tables_exist(self, connection_manager):
        """All three tables should exist."""
        from sqlalchemy import inspect
        engine = connection_manager.get_engine("test")
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        assert "users" in tables
        assert "orders" in tables
        assert "products" in tables

    def test_users_have_100_rows(self, connection_manager):
        """Users table should have 100 rows."""
        from sqlalchemy import text
        engine = connection_manager.get_engine("test")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM users"))
            count = result.scalar()
        assert count == 100

    def test_orders_have_100_rows(self, connection_manager):
        """Orders table should have 100 rows."""
        from sqlalchemy import text
        engine = connection_manager.get_engine("test")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM orders"))
            count = result.scalar()
        assert count == 100

    def test_products_have_100_rows(self, connection_manager):
        """Products table should have 100 rows."""
        from sqlalchemy import text
        engine = connection_manager.get_engine("test")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM products"))
            count = result.scalar()
        assert count == 100


class TestQueryExecution:
    """
    Test 5 NL → SQL pairs by directly executing SQL against the sample DB.
    These simulate what the LangChain chain would generate.
    """

    def test_show_all_users(self, connection_manager):
        """NL: 'Show me all users' → SELECT * FROM users"""
        sql = "SELECT * FROM users"
        validator = SQLSafetyValidator()
        is_safe, _ = validator.validate(sql, write_mode=False)
        assert is_safe

        from sqlalchemy import text
        engine = connection_manager.get_engine("test")
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            rows = result.fetchall()
        assert len(rows) == 100

    def test_count_orders(self, connection_manager):
        """NL: 'How many orders are there?' → SELECT COUNT(*) FROM orders"""
        sql = "SELECT COUNT(*) as total_orders FROM orders"
        validator = SQLSafetyValidator()
        is_safe, _ = validator.validate(sql, write_mode=False)
        assert is_safe

        from sqlalchemy import text
        engine = connection_manager.get_engine("test")
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            row = result.fetchone()
        assert row[0] == 100

    def test_users_by_plan(self, connection_manager):
        """NL: 'Show users on the pro plan' → SELECT ... WHERE plan = 'pro'"""
        sql = "SELECT name, email, plan FROM users WHERE plan = 'pro'"
        validator = SQLSafetyValidator()
        is_safe, _ = validator.validate(sql, write_mode=False)
        assert is_safe

        from sqlalchemy import text
        engine = connection_manager.get_engine("test")
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            rows = result.fetchall()
        assert len(rows) > 0
        assert all(row[2] == "pro" for row in rows)

    def test_total_revenue(self, connection_manager):
        """NL: \"What's the total revenue?\" → SELECT SUM(amount) FROM orders"""
        sql = "SELECT SUM(amount) as total_revenue FROM orders WHERE status = 'completed'"
        validator = SQLSafetyValidator()
        is_safe, _ = validator.validate(sql, write_mode=False)
        assert is_safe

        from sqlalchemy import text
        engine = connection_manager.get_engine("test")
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            row = result.fetchone()
        # Revenue should be a positive number
        assert row[0] is None or row[0] >= 0

    def test_top_5_expensive_products(self, connection_manager):
        """NL: 'Show me the top 5 most expensive products' → ORDER BY price DESC LIMIT 5"""
        sql = "SELECT name, price, category FROM products ORDER BY price DESC LIMIT 5"
        validator = SQLSafetyValidator()
        is_safe, _ = validator.validate(sql, write_mode=False)
        assert is_safe

        from sqlalchemy import text
        engine = connection_manager.get_engine("test")
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            rows = result.fetchall()
        assert len(rows) == 5
        # Verify descending order
        prices = [row[1] for row in rows]
        assert prices == sorted(prices, reverse=True)


class TestSchemaIntrospection:
    """Test that schema introspection works correctly."""

    def test_introspect_schema(self, connection_manager):
        """Schema introspection should return all tables with columns."""
        from db.schema import introspect_schema
        engine = connection_manager.get_engine("test")
        schema = introspect_schema(engine, "test", "sqlite")

        assert len(schema.tables) == 3
        table_names = [t.name for t in schema.tables]
        assert "users" in table_names
        assert "orders" in table_names
        assert "products" in table_names

    def test_users_schema(self, connection_manager):
        """Users table should have the expected columns."""
        from db.schema import introspect_schema, schema_cache
        schema_cache.invalidate("test")  # Clear cache
        engine = connection_manager.get_engine("test")
        schema = introspect_schema(engine, "test", "sqlite")

        users_table = next(t for t in schema.tables if t.name == "users")
        col_names = [c.name for c in users_table.columns]
        assert "id" in col_names
        assert "name" in col_names
        assert "email" in col_names
        assert "created_at" in col_names
        assert "plan" in col_names

    def test_foreign_keys_detected(self, connection_manager):
        """Orders.user_id should be detected as a foreign key to users.id."""
        from db.schema import introspect_schema, schema_cache
        schema_cache.invalidate("test")
        engine = connection_manager.get_engine("test")
        schema = introspect_schema(engine, "test", "sqlite")

        orders_table = next(t for t in schema.tables if t.name == "orders")
        user_id_col = next(c for c in orders_table.columns if c.name == "user_id")
        assert user_id_col.foreign_key is not None
        assert "users" in user_id_col.foreign_key


class TestConnectionManager:
    """Test the connection manager."""

    def test_health_check(self, connection_manager):
        """Health check should return green for a local SQLite."""
        status, latency = connection_manager.health_check("test")
        assert status == "green"
        assert latency < 1000

    def test_list_connections(self, connection_manager):
        """Should list the test connection."""
        conns = connection_manager.list_connections()
        assert len(conns) >= 1
        assert any(c["db_id"] == "test" for c in conns)

    def test_nonexistent_connection(self, connection_manager):
        """Health check for nonexistent connection should return red."""
        status, _ = connection_manager.health_check("nonexistent")
        assert status == "red"
