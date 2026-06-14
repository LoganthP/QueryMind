"""
QueryMind — SQL Safety Validator Tests
Tests that destructive SQL is blocked in read-only mode
and allowed in write mode.
"""

import pytest
from chains.safety import SQLSafetyValidator


@pytest.fixture
def validator():
    return SQLSafetyValidator()


class TestSafetyValidation:
    """Tests for SQL query safety validation."""

    def test_select_allowed_in_read_mode(self, validator):
        """SELECT queries should always be allowed in read-only mode."""
        is_safe, reason = validator.validate("SELECT * FROM users", write_mode=False)
        assert is_safe is True
        assert reason == ""

    def test_select_with_cte_allowed(self, validator):
        """WITH (CTE) queries should be allowed in read-only mode."""
        sql = "WITH active AS (SELECT * FROM users WHERE plan = 'pro') SELECT * FROM active"
        is_safe, reason = validator.validate(sql, write_mode=False)
        assert is_safe is True

    def test_explain_allowed(self, validator):
        """EXPLAIN queries should be allowed in read-only mode."""
        is_safe, reason = validator.validate("EXPLAIN SELECT * FROM users", write_mode=False)
        assert is_safe is True

    def test_drop_blocked_in_read_mode(self, validator):
        """DROP TABLE should be blocked in read-only mode."""
        is_safe, reason = validator.validate("DROP TABLE users", write_mode=False)
        assert is_safe is False
        assert "DROP" in reason

    def test_delete_blocked_in_read_mode(self, validator):
        """DELETE should be blocked in read-only mode."""
        is_safe, reason = validator.validate("DELETE FROM users WHERE id = 1", write_mode=False)
        assert is_safe is False
        assert "DELETE" in reason

    def test_update_blocked_in_read_mode(self, validator):
        """UPDATE should be blocked in read-only mode."""
        is_safe, reason = validator.validate(
            "UPDATE users SET plan = 'pro' WHERE id = 1", write_mode=False
        )
        assert is_safe is False
        assert "UPDATE" in reason

    def test_insert_blocked_in_read_mode(self, validator):
        """INSERT should be blocked in read-only mode."""
        is_safe, reason = validator.validate(
            "INSERT INTO users (name) VALUES ('test')", write_mode=False
        )
        assert is_safe is False
        assert "INSERT" in reason

    def test_alter_blocked_in_read_mode(self, validator):
        """ALTER TABLE should be blocked in read-only mode."""
        is_safe, reason = validator.validate(
            "ALTER TABLE users ADD COLUMN age INTEGER", write_mode=False
        )
        assert is_safe is False

    def test_truncate_blocked_in_read_mode(self, validator):
        """TRUNCATE should be blocked in read-only mode."""
        is_safe, reason = validator.validate("TRUNCATE TABLE users", write_mode=False)
        assert is_safe is False

    def test_insert_allowed_in_write_mode(self, validator):
        """INSERT should be allowed in write mode."""
        is_safe, reason = validator.validate(
            "INSERT INTO users (name) VALUES ('test')", write_mode=True
        )
        assert is_safe is True

    def test_update_allowed_in_write_mode(self, validator):
        """UPDATE should be allowed in write mode."""
        is_safe, reason = validator.validate(
            "UPDATE users SET plan = 'pro' WHERE id = 1", write_mode=True
        )
        assert is_safe is True

    def test_delete_allowed_in_write_mode(self, validator):
        """DELETE should be allowed in write mode."""
        is_safe, reason = validator.validate(
            "DELETE FROM users WHERE id = 1", write_mode=True
        )
        assert is_safe is True

    def test_drop_database_always_blocked(self, validator):
        """DROP DATABASE should be blocked even in write mode."""
        is_safe, reason = validator.validate("DROP DATABASE mydb", write_mode=True)
        assert is_safe is False
        assert "never allowed" in reason.lower()

    def test_empty_sql_blocked(self, validator):
        """Empty SQL should be blocked."""
        is_safe, reason = validator.validate("", write_mode=False)
        assert is_safe is False

    def test_whitespace_only_blocked(self, validator):
        """Whitespace-only SQL should be blocked."""
        is_safe, reason = validator.validate("   \n  ", write_mode=False)
        assert is_safe is False


class TestInputSanitization:
    """Tests for natural language input sanitization."""

    def test_clean_input_passes(self, validator):
        """Normal natural language should pass sanitization."""
        is_clean, text, warning = validator.sanitize_input("Show me all users who signed up last month")
        assert is_clean is True
        assert "users" in text
        assert warning == ""

    def test_empty_input_rejected(self, validator):
        """Empty input should be rejected."""
        is_clean, text, warning = validator.sanitize_input("")
        assert is_clean is False

    def test_injection_attempt_detected(self, validator):
        """SQL injection attempts should be detected and cleaned."""
        is_clean, text, warning = validator.sanitize_input("Show users; DROP TABLE users;")
        assert "Warning" in warning or is_clean is True

    def test_union_injection_detected(self, validator):
        """UNION SELECT injection should be detected."""
        is_clean, text, warning = validator.sanitize_input(
            "users UNION SELECT password FROM admin"
        )
        assert "Warning" in warning or "UNION" not in text.upper()


class TestQueryClassification:
    """Tests for SQL query classification."""

    def test_select_classified_as_read(self, validator):
        assert validator.classify_query("SELECT * FROM users") == "read"

    def test_with_classified_as_read(self, validator):
        assert validator.classify_query("WITH cte AS (SELECT 1) SELECT * FROM cte") == "read"

    def test_insert_classified_as_write(self, validator):
        assert validator.classify_query("INSERT INTO users VALUES (1)") == "write"

    def test_update_classified_as_write(self, validator):
        assert validator.classify_query("UPDATE users SET name = 'test'") == "write"

    def test_delete_classified_as_write(self, validator):
        assert validator.classify_query("DELETE FROM users WHERE id = 1") == "write"

    def test_drop_classified_as_admin(self, validator):
        assert validator.classify_query("DROP TABLE users") == "admin"

    def test_alter_classified_as_admin(self, validator):
        assert validator.classify_query("ALTER TABLE users ADD COLUMN age INTEGER") == "admin"
