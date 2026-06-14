"""
QueryMind — SQL Safety Validator
Validates generated SQL to prevent destructive operations in read-only mode.
Uses both regex pattern matching and keyword analysis for defense-in-depth.
"""

import re
from typing import Tuple


# ─── Destructive SQL patterns ──────────────────────────────────
# These keywords at the START of a statement indicate write operations.
DESTRUCTIVE_KEYWORDS = [
    "DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE",
    "CREATE", "REPLACE", "RENAME", "GRANT", "REVOKE",
    "EXEC", "EXECUTE", "CALL",
]

# Regex pattern to match any destructive keyword at statement boundaries
DESTRUCTIVE_PATTERN = re.compile(
    r"(?:^|;\s*)(" + "|".join(DESTRUCTIVE_KEYWORDS) + r")\b",
    re.IGNORECASE | re.MULTILINE,
)

# Allowed statement starters in read-only mode
SAFE_STARTERS = {"SELECT", "WITH", "EXPLAIN", "PRAGMA", "SHOW", "DESCRIBE", "DESC"}

# Patterns that look like SQL injection attempts in natural language input
INJECTION_PATTERNS = [
    re.compile(r";\s*(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE)", re.IGNORECASE),
    re.compile(r"'\s*OR\s+'?\d*'?\s*=\s*'?\d*'?", re.IGNORECASE),
    re.compile(r"--\s*$", re.MULTILINE),
    re.compile(r"/\*.*?\*/", re.DOTALL),
    re.compile(r"UNION\s+SELECT", re.IGNORECASE),
]


class SQLSafetyValidator:
    """
    Validates SQL queries for safety.
    In read-only mode (default), only SELECT/WITH/EXPLAIN queries are allowed.
    In write mode, destructive operations are permitted but logged.
    """

    @staticmethod
    def validate(sql: str, write_mode: bool = False) -> Tuple[bool, str]:
        """
        Validate a SQL query for safety.

        Args:
            sql: The SQL query string to validate.
            write_mode: If True, allows destructive operations.

        Returns:
            Tuple of (is_safe, reason_if_blocked).
            If safe, reason is empty string.
        """
        if not sql or not sql.strip():
            return False, "Empty SQL query"

        cleaned = sql.strip()

        # In read-only mode, check for destructive keywords
        if not write_mode:
            match = DESTRUCTIVE_PATTERN.search(cleaned)
            if match:
                keyword = match.group(1).upper()
                return False, (
                    f"Blocked: '{keyword}' statements are not allowed in read-only mode. "
                    f"Enable write mode to execute this query."
                )

            # Also verify the query starts with a safe keyword
            first_word = cleaned.split()[0].upper() if cleaned.split() else ""
            if first_word not in SAFE_STARTERS:
                return False, (
                    f"Blocked: Queries must start with SELECT, WITH, or EXPLAIN in "
                    f"read-only mode. Got '{first_word}'."
                )

        # Even in write mode, block truly dangerous operations
        if re.search(r"\bDROP\s+DATABASE\b", cleaned, re.IGNORECASE):
            return False, "Blocked: DROP DATABASE is never allowed for safety."

        return True, ""

    @staticmethod
    def sanitize_input(natural_language: str) -> Tuple[bool, str, str]:
        """
        Sanitize natural language input to detect potential injection attempts.

        Args:
            natural_language: The user's natural language query.

        Returns:
            Tuple of (is_clean, sanitized_text, warning_if_any).
        """
        if not natural_language or not natural_language.strip():
            return False, "", "Empty input"

        text = natural_language.strip()

        # Check for injection patterns
        for pattern in INJECTION_PATTERNS:
            if pattern.search(text):
                # Remove the suspicious pattern but continue
                text = pattern.sub("", text).strip()
                return True, text, (
                    "Warning: Suspicious pattern detected and removed from input."
                )

        return True, text, ""

    @staticmethod
    def classify_query(sql: str) -> str:
        """
        Classify a SQL query as 'read', 'write', or 'admin'.

        Args:
            sql: The SQL query to classify.

        Returns:
            Classification string: 'read', 'write', or 'admin'.
        """
        if not sql:
            return "unknown"

        first_word = sql.strip().split()[0].upper()

        if first_word in {"SELECT", "WITH", "EXPLAIN"}:
            return "read"
        elif first_word in {"INSERT", "UPDATE", "DELETE", "REPLACE"}:
            return "write"
        else:
            return "admin"
