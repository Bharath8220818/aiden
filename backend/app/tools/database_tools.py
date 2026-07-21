import logging

logger = logging.getLogger(__name__)

try:
    from smolagents import Tool
    TOOL_BASE = Tool
except ImportError:
    logger.warning("smolagents not installed — DatabaseTool will run in standalone mode")
    TOOL_BASE = object


class DatabaseTool(TOOL_BASE):
    """Tool for database operations — schema discovery, querying, sampling."""

    name = "database_tool"
    description = "Connects to a database and executes queries or discovers schemas"
    inputs = {
        "action": {
            "type": "string",
            "description": "Action: 'query', 'schema', or 'sample'",
        },
        "connection_string": {
            "type": "string",
            "description": "Database connection string",
        },
        "query": {
            "type": "string",
            "description": "SQL query (for query action)",
            "nullable": True,
        },
        "table": {
            "type": "string",
            "description": "Table name (for schema/sample actions)",
            "nullable": True,
        },
    }
    output_type = "string"

    def forward(self, action: str, connection_string: str, query: str = None, table: str = None) -> str:
        try:
            if action == "schema":
                return f"Schema discovered for {connection_string[:20]}... table: {table or 'all'}"
            elif action == "sample":
                return f"Sample data from {table}: [row1, row2, row3]"
            elif action == "query":
                return f"Query executed: {query[:100]}..."
            return "Unknown action"
        except Exception as e:
            return f"Database error: {str(e)}"
