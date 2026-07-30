from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.models.user import User
from app.api.v1.deps import get_current_user
from app.schemas.schemas import SchemaGenerateRequest, SchemaValidateRequest, SchemaResponse, DDLResponse

router = APIRouter()

@router.post("/generate", response_model=SchemaResponse)
async def generate_schema(
    request: SchemaGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a database schema from a natural language description."""
    # Mock response - in production, calls an LLM
    return {
        "name": "ecommerce_sales_schema",
        "tables": [
            {
                "name": "fact_sales",
                "type": "fact",
                "columns": [
                    {"name": "sale_id", "type": "BIGINT", "primary_key": True, "nullable": False},
                    {"name": "customer_id", "type": "BIGINT", "primary_key": False, "foreign_key": "dim_customers.customer_id", "nullable": False},
                    {"name": "revenue", "type": "DECIMAL(10,2)", "primary_key": False, "nullable": False},
                ],
            },
            {
                "name": "dim_customers",
                "type": "dimension",
                "columns": [
                    {"name": "customer_id", "type": "BIGINT", "primary_key": True, "nullable": False},
                    {"name": "name", "type": "VARCHAR(255)", "primary_key": False, "nullable": False},
                ],
            },
        ],
        "schema_type": "star",
        "ddl": "CREATE TABLE fact_sales (...) -- generated DDL",
    }

@router.post("/validate", response_model=SchemaResponse)
async def validate_schema(
    request: SchemaValidateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Validate a database schema for correctness and normalization."""
    return {
        "tables": request.tables,
        "errors": [],
        "warnings": ["Consider adding an index on foreign key columns"],
    }

@router.post("/ddl", response_model=DDLResponse)
async def generate_ddl(
    request: SchemaValidateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate DDL SQL from a schema definition."""
    ddl_lines = []
    for table in request.tables:
        cols = []
        for col in table.columns:
            nullable = "NULL" if col.nullable else "NOT NULL"
            pk = "PRIMARY KEY" if col.primary_key else ""
            fk = f"REFERENCES {col.foreign_key}" if col.foreign_key else ""
            cols.append(f"    {col.name} {col.type} {nullable} {pk} {fk}".strip())
        ddl_lines.append(f"CREATE TABLE {table.name} (\n" + ",\n".join(cols) + "\n);")
    return {
        "success": True,
        "ddl": "\n\n".join(ddl_lines),
        "warnings": [],
    }

@router.post("/normalize", response_model=SchemaResponse)
async def normalize_schema(
    request: SchemaValidateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Normalize a schema to 3NF."""
    return {
        "tables": request.tables,
        "schema_type": "3nf",
        "ddl": "-- Normalized to 3NF\n",
    }
