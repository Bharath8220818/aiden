import asyncpg
from typing import Dict, List, Any, Optional

class ExternalDatabaseService:
    """Service for connecting to and querying external databases"""
    
    @staticmethod
    async def connect_postgres(
        host: str,
        port: int,
        database: str,
        user: str,
        password: str
    ) -> Optional[asyncpg.Connection]:
        """Connect to PostgreSQL database"""
        try:
            conn = await asyncpg.connect(
                host=host,
                port=port,
                database=database,
                user=user,
                password=password,
                timeout=10
            )
            return conn
        except Exception as e:
            print(f"Failed to connect to PostgreSQL: {e}")
            return None
    
    @staticmethod
    async def get_schema(conn: asyncpg.Connection, table: str = None) -> Dict:
        """Get schema information from database"""
        schema_info = {}
        
        if table:
            query = """
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position
            """
            rows = await conn.fetch(query, table)
            schema_info[table] = [dict(row) for row in rows]
        else:
            tables_query = """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """
            tables = await conn.fetch(tables_query)
            
            for table_row in tables:
                table_name = table_row['table_name']
                query = """
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                """
                rows = await conn.fetch(query, table_name)
                schema_info[table_name] = [dict(row) for row in rows]
        
        return schema_info
    
    @staticmethod
    async def sample_data(conn: asyncpg.Connection, table: str, limit: int = 100) -> List[Dict]:
        """Get sample data from table"""
        try:
            query = f'SELECT * FROM {table} LIMIT {limit}'
            rows = await conn.fetch(query)
            return [dict(row) for row in rows]
        except Exception as e:
            print(f"Failed to fetch sample data: {e}")
            return []
    
    @staticmethod
    async def test_connection(
        host: str,
        port: int,
        database: str,
        user: str,
        password: str
    ) -> bool:
        """Test database connection"""
        try:
            conn = await asyncpg.connect(
                host=host,
                port=port,
                database=database,
                user=user,
                password=password,
                timeout=5
            )
            await conn.close()
            return True
        except:
            return False
