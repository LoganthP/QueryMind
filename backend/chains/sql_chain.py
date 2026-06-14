"""
QueryMind — LangChain SQL Chain
Core AI layer that converts natural language to SQL using Claude.

Architecture:
1. User sends natural language query
2. We build a prompt with full schema context + dialect + safety rules
3. Claude generates SQL via create_sql_query_chain
4. Safety validator checks the SQL
5. If safe, we execute and return results
6. A separate call generates a plain-English explanation

This module uses LangChain's create_sql_query_chain which:
- Automatically introspects the DB schema via SQLDatabase
- Builds a prompt with table definitions, column types, and sample rows
- Passes everything to the LLM for SQL generation
"""

import re
from typing import Optional, Tuple

from langchain_openai import ChatOpenAI
from langchain_community.utilities import SQLDatabase
from langchain.chains.sql_database.query import create_sql_query_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from config import settings
from chains.safety import SQLSafetyValidator


# ─── Custom prompt template for SQL generation ─────────────────
# This overrides LangChain's default to enforce our output format
# and safety rules. The {table_info} and {input} variables are
# filled in by create_sql_query_chain automatically.
SQL_GENERATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are QueryMind, an expert SQL assistant. Your job is to convert
natural language questions into syntactically correct {dialect} SQL queries.

SCHEMA:
{table_info}

RULES:
1. Output ONLY the raw SQL query — no markdown fences, no explanation, no comments.
2. {safety_rule}
3. Use proper {dialect} syntax and functions.
4. Always use double quotes for identifiers that might be reserved words.
5. For date/time operations, use {dialect}-appropriate functions.
6. Limit results to {top_k} rows unless the user specifies otherwise.
7. If the question is ambiguous, make reasonable assumptions and generate the best query.
8. Use table aliases for readability in JOINs.
9. Never use SELECT * in production queries — list specific columns when possible,
   unless the user explicitly asks for "all columns" or "everything".

CURRENT DATE/TIME CONTEXT:
Use CURRENT_TIMESTAMP or equivalent for "today", "now", "current" references."""),
    ("human", "{input}"),
])


# ─── Explanation prompt ─────────────────────────────────────────
# Used to generate a plain-English explanation of what the SQL does
EXPLANATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a SQL educator. Given a SQL query, explain what it does
in plain English. Be concise (2-3 sentences max). Focus on what data it retrieves
and any filtering/sorting/aggregation it performs. Do NOT repeat the SQL."""),
    ("human", "Explain this SQL query:\n{sql}"),
])


class QueryMindChain:
    """
    Wraps LangChain's SQL chain with OpenRouter/OpenAI as the LLM backbone.

    Usage:
        chain = QueryMindChain(db, model_id="anthropic/claude-sonnet-4")
        sql, explanation = chain.generate(
            "Show me all users who signed up last month"
        )
    """

    def __init__(self, db: SQLDatabase, dialect: str = "sqlite", model_id: Optional[str] = None):
        """
        Initialize the chain with a LangChain SQLDatabase.

        Args:
            db: LangChain SQLDatabase instance (already connected).
            dialect: SQL dialect name for prompt context.
            model_id: OpenRouter model string (overrides config).
        """
        self.db = db
        self.dialect = dialect
        self.validator = SQLSafetyValidator()

        # Initialize OpenRouter LLM — temperature=0 for deterministic SQL output
        # We check for API key availability and create LLM only if present
        self.llm: Optional[ChatOpenAI] = None
        if settings.has_api_key:
            selected_model = model_id or settings.model_id
            self.llm = ChatOpenAI(
                model=selected_model,
                api_key=settings.openrouter_api_key,
                base_url="https://openrouter.ai/api/v1",
                temperature=0,
                max_tokens=2048,
                default_headers={
                    "HTTP-Referer": settings.app_referer,
                    "X-Title": settings.app_title,
                },
            )

    def _get_safety_rule(self, write_mode: bool) -> str:
        """Build the safety rule string for the prompt based on write mode."""
        if write_mode:
            return (
                "Write mode is ENABLED. You may generate INSERT, UPDATE, and DELETE "
                "statements if the user's question requires data modification."
            )
        return (
            "CRITICAL: Generate ONLY SELECT queries (and WITH/CTEs). "
            "Do NOT generate INSERT, UPDATE, DELETE, DROP, ALTER, or any "
            "data-modifying statements under any circumstances."
        )

    def generate_sql(
        self,
        natural_language: str,
        write_mode: bool = False,
    ) -> str:
        """
        Convert natural language to SQL using Claude.

        This method:
        1. Builds the prompt with schema context and safety rules
        2. Sends to Claude via create_sql_query_chain
        3. Cleans the output (strips markdown fences if any)

        Args:
            natural_language: The user's question in plain English.
            write_mode: Whether to allow write operations.

        Returns:
            Raw SQL query string.

        Raises:
            RuntimeError: If no API key is configured.
        """
        if not self.llm:
            raise RuntimeError(
                "OpenRouter API key is not configured. "
                "Set OPENROUTER_API_KEY in your .env file."
            )

        # create_sql_query_chain automatically injects {table_info} from the DB
        # and passes {input} from our invocation. We customize the prompt to
        # include our safety rules and dialect context.
        chain = create_sql_query_chain(
            llm=self.llm,
            db=self.db,
            prompt=SQL_GENERATION_PROMPT,
        )

        # Invoke the chain with our custom variables
        raw_output = chain.invoke({
            "question": natural_language,
            "dialect": self.dialect,
            "safety_rule": self._get_safety_rule(write_mode),
            "top_k": settings.max_rows_returned,
        })

        # Clean the output — sometimes LLMs wrap SQL in markdown fences
        sql = self._clean_sql_output(raw_output)
        return sql

    def generate_explanation(self, sql: str) -> str:
        """
        Generate a plain-English explanation of a SQL query.

        Uses a separate Claude call with the EXPLANATION_PROMPT template.

        Args:
            sql: The SQL query to explain.

        Returns:
            Plain-English explanation string.
        """
        if not self.llm:
            return "AI explanation unavailable — no API key configured."

        # Build a simple chain: prompt → LLM → string parser
        explanation_chain = EXPLANATION_PROMPT | self.llm | StrOutputParser()
        return explanation_chain.invoke({"sql": sql})

    def generate_and_validate(
        self,
        natural_language: str,
        write_mode: bool = False,
    ) -> Tuple[str, str, bool, str]:
        """
        Full pipeline: NL → SQL → validate → explain.

        Args:
            natural_language: User's question.
            write_mode: Allow write operations.

        Returns:
            Tuple of (sql, explanation, is_safe, safety_message).
        """
        # Step 1: Sanitize the natural language input
        is_clean, cleaned_input, warning = self.validator.sanitize_input(natural_language)
        if not is_clean:
            return "", "", False, warning

        # Step 2: Generate SQL from the cleaned input
        sql = self.generate_sql(cleaned_input, write_mode)

        # Step 3: Validate the generated SQL against safety rules
        is_safe, safety_msg = self.validator.validate(sql, write_mode)
        if not is_safe:
            return sql, "", False, safety_msg

        # Step 4: Generate plain-English explanation
        explanation = self.generate_explanation(sql)

        return sql, explanation, True, ""

    @staticmethod
    def _clean_sql_output(raw: str) -> str:
        """
        Clean LLM output to extract pure SQL.
        Removes markdown code fences, leading/trailing whitespace,
        and any "SQL:" or "Query:" prefixes.
        """
        text = raw.strip()

        # Remove markdown SQL fences: ```sql ... ```
        text = re.sub(r"^```(?:sql)?\s*\n?", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\n?```\s*$", "", text)

        # Remove common prefixes like "SQL:", "Query:", "SQLQuery:"
        text = re.sub(r"^(?:SQL|SQLQuery|Query)\s*:\s*", "", text, flags=re.IGNORECASE)

        return text.strip()
